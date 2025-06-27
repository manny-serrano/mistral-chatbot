import pandas as pd
import json
import os
import ast
import csv
from pathlib import Path
from neo4j import GraphDatabase

# Load IP enrichment data from CSV
def load_ip_dictionary(csv_path):
    ip_dict = {}
    try:
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                ip = row.get('ip') or row.get('IP')
                if ip:
                    ip_dict[ip] = row
    except Exception as e:
        print(f"Could not load IP dictionary: {e}")
    return ip_dict

# Load flow field definitions from Excel
def load_field_definitions(xlsx_path):
    try:
        df = pd.read_excel(xlsx_path)
        field_map = dict(zip(df.iloc[:, 0], df.iloc[:, 1]))
        return field_map
    except Exception as e:
        print(f"Could not load field definitions: {e}")
        return {}

# Load protocol mapping from CSV
def load_protocol_map(csv_path):
    protocol_map = {}
    try:
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                value = row.get('Decimal')
                name = row.get('Keyword')
                if value and name and name != '':
                    try:
                        protocol_map[int(value)] = name.lower()
                    except Exception:
                        continue
    except Exception as e:
        print(f"Could not load protocol map: {e}")
    return protocol_map

# Load port->service name mapping from CSV
def load_port_service_map(csv_path):
    port_service_map = {}
    try:
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                port = row.get('Port Number') or row.get('port') or row.get('Port')
                service = row.get('Service Name') or row.get('service') or row.get('Service')
                if port and service:
                    try:
                        port_service_map[int(port)] = service.lower()
                    except Exception:
                        continue
    except Exception as e:
        print(f"Could not load port service map: {e}")
    return port_service_map

PORT_SERVICE_MAP = load_port_service_map('enrichment_data/service-names-port-numbers (1).csv')
IP_DICTIONARY = load_ip_dictionary('enrichment_data/ip_dictionary.csv')
FIELD_DEFINITIONS = load_field_definitions('enrichment_data/mistral_flow_fields.xlsx')
PROTOCOL_MAP = load_protocol_map('enrichment_data/protocol-numbers.csv')

# Extract protocol name from flow
def extract_protocol(flow):
    proto_id = flow.get("protocolIdentifier")
    if proto_id is not None:
        try:
            proto_int = int(proto_id)
            proto_name = PROTOCOL_MAP.get(proto_int)
            if proto_name:
                return proto_name
            else:
                print(f"[INFO] Unknown protocol number: {proto_int}")
                return f"protocol_{proto_int}".lower()
        except Exception:
            return f"protocol_{proto_id}".lower()
    proto = flow.get("protocol")
    if proto:
        return str(proto).lower()
    return "unknown"

class Neo4jFlowIngester:
    # Initialize ingester and Neo4j connection
    def __init__(self, uri=None, user=None, password=None, batch_size=1000):
        uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = user or os.getenv("NEO4J_USER", "neo4j")
        password = password or os.getenv("NEO4J_PASSWORD", "password123")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size
        self.skipped_logs = []
        self.seen_fields = set()

    def close(self):
        self.driver.close()

    # Create constraints to ensure unique keys in Neo4j
    def create_constraints(self):
        with self.driver.session() as session:
            session.run("CREATE CONSTRAINT host_ip IF NOT EXISTS FOR (h:Host) REQUIRE h.ip IS UNIQUE")
            session.run("CREATE CONSTRAINT port_num IF NOT EXISTS FOR (p:Port) REQUIRE p.port IS UNIQUE")
            session.run("CREATE CONSTRAINT flow_id IF NOT EXISTS FOR (f:Flow) REQUIRE f.flowId IS UNIQUE")
            session.run("CREATE CONSTRAINT file_name IF NOT EXISTS FOR (pf:ProcessedFile) REQUIRE pf.name IS UNIQUE")
            session.run("CREATE CONSTRAINT proto_name IF NOT EXISTS FOR (proto:Protocol) REQUIRE proto.name IS UNIQUE")

    # Check if a flow is valid (for honeypot or netflow schema)
    def is_valid_flow(self, flow):
        honeypot_required = ["src_ip", "dst_ip", "src_port", "dst_port", "start_time"]
        netflow_required = ["sourceIPv4Address", "destinationIPv4Address", "sourceTransportPort", "destinationTransportPort", "flowStartMilliseconds"]
        return (
            all(flow.get(field) is not None for field in honeypot_required) or
            all(flow.get(field) is not None for field in netflow_required)
        )

    # Flatten nested dicts for Neo4j properties
    def flatten_dict(self, d, parent_key='', sep='_'):
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

    # Batch process and insert flows into Neo4j
    def process_flow_batch(self, flows_batch, malicious_honeypot=False):
        with self.driver.session() as session:
            cypher_flows = []
            for flow in flows_batch:
                # Determine if this flow is honeypot or netflow style
                honeypot = all(flow.get(field) is not None for field in ["src_ip", "dst_ip", "src_port", "dst_port", "start_time"])
                netflow = all(flow.get(field) is not None for field in ["sourceIPv4Address", "destinationIPv4Address", "sourceTransportPort", "destinationTransportPort", "flowStartMilliseconds"])
                if not (honeypot or netflow):
                    self.skipped_logs.append(flow)
                    continue

                # Standardize flow keys
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

                # Get port/service names for both src and dst
                try:
                    src_service = PORT_SERVICE_MAP.get(int(src_port), None)
                except Exception:
                    src_service = None
                try:
                    dst_service = PORT_SERVICE_MAP.get(int(dst_port), None)
                except Exception:
                    dst_service = None

                flow_props = self.flatten_dict(flow)
                for k in flow_props:
                    self.seen_fields.add(k)

                protocol_name = extract_protocol(flow)
                src_info = IP_DICTIONARY.get(src_ip, {})
                dst_info = IP_DICTIONARY.get(dst_ip, {})

                # Mark honeypot/malicious flows
                flow_props['malicious'] = bool(malicious_honeypot)
                flow_props['honeypot'] = bool(malicious_honeypot)

                cypher_flows.append({
                    "flowId": flow_id,
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "src_service": src_service,
                    "dst_service": dst_service,
                    "props": flow_props,
                    "protocol": protocol_name,
                    "src_info": src_info,
                    "dst_info": dst_info,
                })

            if not cypher_flows:
                return

            # Choose node labels for malicious honeypot flows
            if malicious_honeypot:
                labels = ":Flow:Malicious:Honeypot"
            else:
                labels = ":Flow"

            # Cypher query for inserting flow and its relations
            query = f"""
            UNWIND $flows AS flow
            MERGE (src:Host {{ip: flow.src_ip}})
            SET src += flow.src_info
            MERGE (dst:Host {{ip: flow.dst_ip}})
            SET dst += flow.dst_info
            MERGE (srcPort:Port {{port: flow.src_port}})
            SET srcPort.service = flow.src_service
            MERGE (dstPort:Port {{port: flow.dst_port}})
            SET dstPort.service = flow.dst_service
            MERGE (f{labels} {{flowId: flow.flowId}})
            SET f += flow.props
            MERGE (proto:Protocol {{name: flow.protocol}})
            MERGE (f)-[:USES_PROTOCOL]->(proto)
            MERGE (f)-[:USES_SRC_PORT]->(srcPort)
            MERGE (f)-[:USES_DST_PORT]->(dstPort)
            MERGE (src)-[:SENT]->(f)
            MERGE (dst)-[:RECEIVED]->(f)
            """
            try:
                session.run(query, flows=cypher_flows)
                print(f"Successfully processed batch of {len(cypher_flows)} flows (labels: {labels})")
            except Exception as e:
                print(f"Error processing batch: {str(e)}")

    # Check if a file has already been processed
    def has_been_processed(self, filename):
        with self.driver.session() as session:
            result = session.run(
                "MATCH (pf:ProcessedFile {name: $filename}) RETURN pf LIMIT 1",
                filename=filename
            )
            return result.single() is not None

    # Mark a file as processed in Neo4j
    def mark_processed(self, filename):
        with self.driver.session() as session:
            session.run("MERGE (pf:ProcessedFile {name: $filename})", filename=filename)

    # Main function: scan directory, ingest JSON logs in batches
    def process_flows_directory(self, directory_path):
        self.create_constraints()
        log_dir = Path(directory_path)
        if not log_dir.exists():
            print(f"Directory {directory_path} does not exist")
            return
        total_processed = 0
        for json_file in log_dir.glob("*.json"):
            fname = os.path.basename(str(json_file.resolve()))
            if self.has_been_processed(fname):
                print(f"Skipping already processed file: {fname}")
                continue
            print(f"Processing file: {fname}")

            is_malicious_honeypot = (fname == "sampleSTINGAR.json")
            batch = []

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

                        if isinstance(flow_data, dict) and "flows" in flow_data and isinstance(flow_data["flows"], dict):
                            batch.append(flow_data["flows"])
                        elif isinstance(flow_data, dict):
                            batch.append(flow_data)
                        else:
                            self.skipped_logs.append(flow_data)

                        if len(batch) >= self.batch_size:
                            self.process_flow_batch(batch, malicious_honeypot=is_malicious_honeypot)
                            total_processed += len(batch)
                            batch.clear()
                # Process remaining flows in last batch
                if batch:
                    self.process_flow_batch(batch, malicious_honeypot=is_malicious_honeypot)
                    total_processed += len(batch)
                self.mark_processed(fname)
            except Exception as e:
                print(f"Error reading {json_file}: {e}")

        print(f"Final total flows processed: {total_processed}")
        print(f"Skipped flows due to missing fields: {len(self.skipped_logs)}")
        if self.skipped_logs:
            with open("skipped_flows.json", "w") as f:
                json.dump(self.skipped_logs, f, indent=2)
            print("Skipped flows saved to skipped_flows.json")

        print("\n=== Audit: All flow property fields seen ===")
        for field in sorted(self.seen_fields):
            definition = FIELD_DEFINITIONS.get(field, "")
            print(f"{field}: {definition}")

def main():
    ingester = Neo4jFlowIngester(batch_size=1000)
    try:
        ingester.process_flows_directory("logs-json")
    finally:
        ingester.close()

if __name__ == "__main__":
    main()
