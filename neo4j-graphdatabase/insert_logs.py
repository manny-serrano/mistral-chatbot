import json
import os
import ast
from pathlib import Path
from neo4j import GraphDatabase
# This script is used to insert the logs into the Neo4j database.


class Neo4jFlowIngester:
    def __init__(self, uri=None, user=None, password=None, batch_size=1000): # This is the constructor for the Neo4jFlowIngester class.
        uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = user or os.getenv("NEO4J_USER", "neo4j")
        password = password or os.getenv("NEO4J_PASSWORD", "password123")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size
        self.skipped_logs = []
        #

    def close(self):
        self.driver.close()

    def create_constraints(self):# This function is used to create the constraints for the Neo4j database.
        with self.driver.session() as session:
            session.run("CREATE CONSTRAINT host_ip IF NOT EXISTS FOR (h:Host) REQUIRE h.ip IS UNIQUE")
            session.run("CREATE CONSTRAINT port_num IF NOT EXISTS FOR (p:Port) REQUIRE p.port IS UNIQUE")
            session.run("CREATE CONSTRAINT flow_id IF NOT EXISTS FOR (f:Flow) REQUIRE f.flowId IS UNIQUE")
            session.run("CREATE CONSTRAINT file_name IF NOT EXISTS FOR (pf:ProcessedFile) REQUIRE pf.name IS UNIQUE")

    def is_valid_flow(self, flow):#Check if flow is valid by checking if all the required fields are present.
        honeypot_required = ["src_ip", "dst_ip", "src_port", "dst_port", "start_time"]
        netflow_required = ["sourceIPv4Address", "destinationIPv4Address", "sourceTransportPort", "destinationTransportPort", "flowStartMilliseconds"]
        return (
            all(flow.get(field) is not None for field in honeypot_required) or
            all(flow.get(field) is not None for field in netflow_required)
        )

    def flatten_dict(self, d, parent_key='', sep='_'):
        """
        Recursively flattens a nested dictionary for Neo4j property storage.
        Lists of dicts or any list containing dicts are converted to JSON strings.
        Lists of primitives are left as-is.
        """
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self.flatten_dict(v, new_key, sep=sep).items())
            elif isinstance(v, list):
                if len(v) > 0 and any(isinstance(i, dict) for i in v):
                    items.append((new_key, json.dumps(v)))
                else:
                    items.append((new_key, v))
            else:
                items.append((new_key, v))
        return dict(items)

    def process_flow_batch(self, flows_batch):
        with self.driver.session() as session:
            cypher_flows = []
            for flow in flows_batch:
                # Determine which format this flow is
                honeypot = all(flow.get(field) is not None for field in ["src_ip", "dst_ip", "src_port", "dst_port", "start_time"])
                netflow = all(flow.get(field) is not None for field in ["sourceIPv4Address", "destinationIPv4Address", "sourceTransportPort", "destinationTransportPort", "flowStartMilliseconds"])
                if not (honeypot or netflow):
                    self.skipped_logs.append(flow)
                    continue

                if honeypot:
                    flow_id = (
                        f"{flow['src_ip']}-{flow['src_port']}-"
                        f"{flow['dst_ip']}-{flow['dst_port']}-"
                        f"{flow.get('start_time', flow.get('@timestamp', ''))}"
                    )
                    src_ip = flow["src_ip"]
                    dst_ip = flow["dst_ip"]
                    src_port = flow["src_port"]
                    dst_port = flow["dst_port"]
                else:
                    flow_id = (
                        f"{flow['sourceIPv4Address']}-{flow['sourceTransportPort']}-"
                        f"{flow['destinationIPv4Address']}-{flow['destinationTransportPort']}-"
                        f"{flow.get('flowStartMilliseconds', '')}"
                    )
                    src_ip = flow["sourceIPv4Address"]
                    dst_ip = flow["destinationIPv4Address"]
                    src_port = flow["sourceTransportPort"]
                    dst_port = flow["destinationTransportPort"]

                # Flatten all properties (nested dicts and lists)
                flow_props = {}
                for k, v in flow.items():
                    if isinstance(v, dict):
                        flat = self.flatten_dict(v, parent_key=k)
                        flow_props.update(flat)
                    else:
                        flow_props[k] = v

                cypher_flows.append({
                    "flowId": flow_id,
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "props": flow_props
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
                        flow_data = None
                        try:
                            flow_data = json.loads(line)
                        except json.JSONDecodeError:
                            try:
                                flow_data = ast.literal_eval(line)
                            except Exception as e2:
                                print(f"Error parsing line in {json_file} (literal_eval): {e2}")
                                continue
                        except Exception as e:
                            print(f"Unexpected error parsing line in {json_file}: {e}")
                            continue

                        # --- Robust logic for both formats ---
                        if isinstance(flow_data, dict) and "flows" in flow_data and isinstance(flow_data["flows"], dict):
                            batch.append(flow_data["flows"])    # NetFlow/IPFIX
                        elif isinstance(flow_data, dict):
                            batch.append(flow_data)             # Honeypot/STINGAR
                        else:
                            self.skipped_logs.append(flow_data)

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
        ingester.process_flows_directory("logs-json")
    finally:
        ingester.close()

if __name__ == "__main__":
    main()
