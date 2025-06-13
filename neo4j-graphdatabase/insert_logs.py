import json
import os
from pathlib import Path
from neo4j import GraphDatabase
from datetime import datetime

class Neo4jLogIngester:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="password123"):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def create_constraints(self):
        with self.driver.session() as session:
            # Create constraints for uniqueness
            session.run("CREATE CONSTRAINT ip_address IF NOT EXISTS FOR (i:IP) REQUIRE i.address IS UNIQUE")
            session.run("CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE")
            session.run("CREATE CONSTRAINT log_uuid IF NOT EXISTS FOR (l:Log) REQUIRE l.uuid IS UNIQUE")

    def process_log(self, log_data):
        with self.driver.session() as session:
            # Create or merge IP nodes and relationship
            query = """
            MERGE (src:IP {address: $src_ip})
            MERGE (dst:IP {address: $dst_ip})
            WITH src, dst
            MERGE (src)-[r:CONNECTED_TO {
                uuid: $uuid,
                timestamp: datetime($timestamp),
                src_port: $src_port,
                dst_port: $dst_port,
                protocol: $protocol
            }]->(dst)
            WITH src, dst, r
            UNWIND $tags AS tag
            MERGE (t:Tag {name: tag})
            MERGE (src)-[:HAS_TAG {tag: tag}]->(t)
            """
            
            session.run(query, {
                "src_ip": log_data["src_ip"],
                "dst_ip": log_data["dst_ip"],
                "uuid": log_data["uuid"],
                "timestamp": log_data["timestamp"],
                "src_port": log_data["src_port"],
                "dst_port": log_data["dst_port"],
                "protocol": log_data["protocol"],
                "tags": log_data.get("tags", [])
            })

    def process_logs_directory(self, directory_path):
        log_dir = Path(directory_path)
        if not log_dir.exists():
            print(f"Directory {directory_path} does not exist")
            return

        # Create constraints before processing logs
        self.create_constraints()

        # Process all JSON files in the directory
        for json_file in log_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    log_data = json.load(f)
                    self.process_log(log_data)
                print(f"Processed {json_file}")
            except Exception as e:
                print(f"Error processing {json_file}: {str(e)}")

def main():
    # Initialize the ingester
    ingester = Neo4jLogIngester()
    
    try:
        # Process logs from the logs-json directory
        ingester.process_logs_directory("logs-json")
    finally:
        ingester.close()

if __name__ == "__main__":
    main() 