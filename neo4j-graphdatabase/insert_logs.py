import json
import os
from pathlib import Path
from neo4j import GraphDatabase


class Neo4jFlowIngester:
    def __init__(self, uri=None, user=None, password=None, batch_size=1000):
        """
        Initialize Neo4j driver connection and batch settings.
        """
        # Use environment variables with fallbacks
        uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = user or os.getenv("NEO4J_USER", "neo4j")
        password = password or os.getenv("NEO4J_PASSWORD", "password123")
        
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size
        self.skipped_logs = []

    def close(self):
        self.driver.close()

    def create_constraints(self):
        with self.driver.session() as session:
            session.run("CREATE CONSTRAINT host_ip IF NOT EXISTS FOR (h:Host) REQUIRE h.ip IS UNIQUE")
            session.run("CREATE CONSTRAINT port_num IF NOT EXISTS FOR (p:Port) REQUIRE p.port IS UNIQUE")
            session.run("CREATE CONSTRAINT flow_id IF NOT EXISTS FOR (f:Flow) REQUIRE f.flowId IS UNIQUE")
            session.run("CREATE CONSTRAINT file_name IF NOT EXISTS FOR (pf:ProcessedFile) REQUIRE pf.name IS UNIQUE")

    def is_valid_flow(self, flow):
        required = ["sourceIPv4Address", "destinationIPv4Address", "sourceTransportPort", "destinationTransportPort"]
        return all(flow.get(field) is not None for field in required)

    def process_flow_batch(self, flows_batch):
        with self.driver.session() as session:
            cypher_flows = []
            for flow_data in flows_batch:
                flow = flow_data.get("flows", {})
                if not self.is_valid_flow(flow):
                    self.skipped_logs.append(flow_data)
                    continue
                flow_id = f"{flow.get('sourceIPv4Address')}-{flow.get('sourceTransportPort')}-{flow.get('destinationIPv4Address')}-{flow.get('destinationTransportPort')}-{flow.get('flowStartMilliseconds')}"
                cypher_flows.append({
                    "flowId": flow_id,
                    "src_ip": flow.get("sourceIPv4Address"),
                    "dst_ip": flow.get("destinationIPv4Address"),
                    "src_port": flow.get("sourceTransportPort"),
                    "dst_port": flow.get("destinationTransportPort"),
                    "props": flow
                })
            if not cypher_flows:
                return
            query = """
            UNWIND $flows AS flow
            MERGE (src:Host {ip: flow.src_ip})
            MERGE (dst:Host {ip: flow.dst_ip})
            MERGE (srcPort:Port {port: flow.src_port})
            MERGE (dstPort:Port {port: flow.dst_port})
            MERGE (f:Flow {flowId: flow.flowId})
            SET f += flow.props
            MERGE (src)-[:SENT]->(f)
            MERGE (dst)-[:RECEIVED]->(f)
            MERGE (f)-[:USES_SRC_PORT]->(srcPort)
            MERGE (f)-[:USES_DST_PORT]->(dstPort)
            """
            try:
                session.run(query, flows=cypher_flows)
                print(f"Successfully processed batch of {len(cypher_flows)} flows")
            except Exception as e:
                print(f"Error processing batch: {str(e)}")

    def has_been_processed(self, filename):
        with self.driver.session() as session:
            result = session.run(
                "MATCH (pf:ProcessedFile {name: $filename}) RETURN pf LIMIT 1",
                filename=filename
            )
            return result.single() is not None

    def mark_processed(self, filename):
        with self.driver.session() as session:
            session.run("MERGE (pf:ProcessedFile {name: $filename})", filename=filename)

    def process_flows_directory(self, directory_path):
        self.create_constraints()
        log_dir = Path(directory_path)
        if not log_dir.exists():
            print(f"Directory {directory_path} does not exist")
            return
        batch = []
        total_processed = 0
        for json_file in log_dir.glob("*.json"):
            fname = str(json_file.resolve())
            if self.has_been_processed(fname):
                print(f"Skipping already processed file: {fname}")
                continue
            print(f"Processing file: {fname}")
            try:
                with open(json_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            flow_data = json.loads(line)
                            batch.append(flow_data)
                        except Exception as e:
                            print(f"Error parsing line in {json_file}: {e}")
                        if len(batch) >= self.batch_size:
                            self.process_flow_batch(batch)
                            total_processed += len(batch)
                            batch.clear()
                self.mark_processed(fname)
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
        if batch:
            self.process_flow_batch(batch)
            total_processed += len(batch)
        print(f"Final total flows processed: {total_processed}")
        print(f"Skipped flows due to missing fields: {len(self.skipped_logs)}")
        if self.skipped_logs:
            with open("skipped_flows.json", "w") as f:
                json.dump(self.skipped_logs, f, indent=2)
            print("Skipped flows saved to skipped_flows.json")

def main():
    ingester = Neo4jFlowIngester(batch_size=1000)
    try:
        ingester.process_flows_directory("logs-json")  # <--- update this if your folder name changes
    finally:
        ingester.close()

if __name__ == "__main__":
    main()
