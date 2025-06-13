import json
from pathlib import Path
from neo4j import GraphDatabase

class Neo4jLogIngester:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="password123", batch_size=1000):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size

    def close(self):
        self.driver.close()

    def create_constraints(self):
        with self.driver.session() as session:
            # Create constraints for uniqueness
            session.run("CREATE CONSTRAINT ip_address IF NOT EXISTS FOR (i:IP) REQUIRE i.address IS UNIQUE")
            session.run("CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE")
            session.run("CREATE CONSTRAINT log_uuid IF NOT EXISTS FOR (l:Log) REQUIRE l.uuid IS UNIQUE")

    def process_log_batch(self, logs_batch):
        with self.driver.session() as session:
            # Prepare data for Cypher UNWIND
            cypher_logs = []
            for log_data in logs_batch:
                sensor_tags = []
                try:
                    misc_tags = log_data.get('sensor', {}).get('tags', {}).get('misc', [])
                    if isinstance(misc_tags, list):
                        sensor_tags.extend([tag for tag in misc_tags if tag])
                except Exception:
                    pass
                if 'app' in log_data and log_data['app']:
                    sensor_tags.append(log_data['app'])

                timestamp = log_data.get('@timestamp') or log_data.get('start_time')

                cypher_logs.append({
                    "src_ip": log_data.get("src_ip"),
                    "dst_ip": log_data.get("dst_ip"),
                    "uuid": log_data.get("sensor", {}).get("uuid") or log_data.get("uuid", ""),
                    "timestamp": timestamp,
                    "src_port": log_data.get("src_port"),
                    "dst_port": log_data.get("dst_port"),
                    "protocol": log_data.get("protocol"),
                    "con_type": log_data.get("hp_data", {}).get("con_type"),
                    "transport": log_data.get("hp_data", {}).get("transport"),
                    "tags": sensor_tags
                })

            query = """
            UNWIND $logs AS log
            MERGE (src:IP {address: log.src_ip})
            MERGE (dst:IP {address: log.dst_ip})
            WITH src, dst, log
            MERGE (src)-[r:CONNECTED_TO {
                uuid: log.uuid,
                timestamp: datetime(log.timestamp),
                src_port: log.src_port,
                dst_port: log.dst_port,
                protocol: log.protocol,
                con_type: log.con_type,
                transport: log.transport
            }]->(dst)
            WITH src, log
            UNWIND log.tags AS tag
            MERGE (t:Tag {name: tag})
            MERGE (src)-[:HAS_TAG]->(t)
            """

            session.run(query, logs=cypher_logs)

    def process_logs_directory(self, directory_path):
        log_dir = Path(directory_path)
        if not log_dir.exists():
            print(f"Directory {directory_path} does not exist")
            return

        # Create constraints before processing logs
        self.create_constraints()

        batch = []
        for json_file in log_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    log_data = json.load(f)
                    batch.append(log_data)

                    if len(batch) >= self.batch_size:
                        self.process_log_batch(batch)
                        print(f"Processed batch of {len(batch)} logs")
                        batch.clear()
            except Exception as e:
                print(f"Error processing {json_file}: {str(e)}")

        # Process any remaining logs in the last batch
        if batch:
            self.process_log_batch(batch)
            print(f"Processed final batch of {len(batch)} logs")

def main():
    # Initialize the ingester
    ingester = Neo4jLogIngester(batch_size=1000)
    
    try:
        # Process logs from the logs-json directory
        ingester.process_logs_directory("logs-json")
    finally:
        ingester.close()

if __name__ == "__main__":
    main() 