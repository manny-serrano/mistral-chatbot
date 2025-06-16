import json
from pathlib import Path
from neo4j import GraphDatabase
from datetime import datetime

class Neo4jLogIngester:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="password123", batch_size=1000):
        """
        Initialize Neo4j driver connection and batch settings.
        """
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size
        self.skipped_logs = []  # Store logs that are invalid or failed processing

    def close(self):
        """
        Close the Neo4j driver connection.
        """
        self.driver.close()

    def create_constraints(self):
        """
        Create uniqueness constraints on IP addresses, tags, and log UUIDs.
        These constraints help ensure data integrity and improve query performance.
        """
        with self.driver.session() as session:
            session.run("CREATE CONSTRAINT ip_address IF NOT EXISTS FOR (i:IP) REQUIRE i.address IS UNIQUE")
            session.run("CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE")
            session.run("CREATE CONSTRAINT log_uuid IF NOT EXISTS FOR (l:Log) REQUIRE l.uuid IS UNIQUE")

    def nested_get(self, d, keys, default=None):
        """
        Safely get a nested dictionary value.
        Args:
            d (dict): The dictionary to search.
            keys (list): List of keys representing the path.
            default: Default value if any key is missing.
        Returns:
            The nested value or default if not found.
        """
        for key in keys:
            if isinstance(d, dict) and key in d:
                d = d[key]
            else:
                return default
        return d

    def extract_tags(self, log_data):
        """
        Extract tags from various potential fields in the log data.
        Tags can come from 'tags' list, nested sensor tags, 'app', or 'protocol'.
        Returns a list of unique tags.
        """
        tags = set()
        if isinstance(log_data.get('tags'), list):
            tags.update(log_data['tags'])
        misc_tags = self.nested_get(log_data, ['sensor', 'tags', 'misc'], [])
        if isinstance(misc_tags, list):
            tags.update(misc_tags)
        if log_data.get('app'):
            tags.add(log_data['app'])
        if log_data.get('protocol'):
            tags.add(log_data['protocol'].lower())
        return list(tags)

    def extract_timestamp(self, log_data):
        """
        Extract timestamp from multiple possible fields in log data.
        Falls back to current time if none are found.
        """
        return (log_data.get('@timestamp') or 
                log_data.get('timestamp') or 
                log_data.get('start_time') or 
                log_data.get('time') or 
                datetime.now().isoformat())

    def is_valid_log(self, log):
        """
        Check if the log has all required fields.
        Returns True if valid, False otherwise.
        """
        required_fields = ["src_ip", "dst_ip", "src_port", "dst_port", "protocol"]
        return all(log.get(field) is not None for field in required_fields)

    def process_log_batch(self, logs_batch):
        """
        Process a batch of logs:
        - Extract and normalize necessary fields.
        - Filter out invalid logs.
        - Run a Cypher query to merge data into Neo4j.
        """
        with self.driver.session() as session:
            cypher_logs = []

            for log_data in logs_batch:
                try:
                    # Extract normalized log fields with fallbacks for different key variants
                    log = {
                        "src_ip": (log_data.get("src_ip") or 
                                   log_data.get("source_ip") or 
                                   log_data.get("src")),
                        "dst_ip": (log_data.get("dst_ip") or 
                                   log_data.get("dest_ip") or 
                                   log_data.get("dst")),
                        "uuid": (self.nested_get(log_data, ["sensor", "uuid"]) or 
                                 log_data.get("uuid") or 
                                 log_data.get("id") or ""),
                        "timestamp": self.extract_timestamp(log_data),
                        "src_port": (log_data.get("src_port") or 
                                     log_data.get("source_port")),
                        "dst_port": (log_data.get("dst_port") or 
                                     log_data.get("dest_port")),
                        "protocol": log_data.get("protocol"),
                        "con_type": (self.nested_get(log_data, ["hp_data", "con_type"]) or
                                     log_data.get("connection_type")),
                        "transport": (self.nested_get(log_data, ["hp_data", "transport"]) or
                                      log_data.get("transport")),
                        "tags": self.extract_tags(log_data)
                    }

                    if self.is_valid_log(log):
                        cypher_logs.append(log)
                    else:
                        # Keep track of logs missing required fields
                        self.skipped_logs.append(log)

                except Exception as e:
                    print(f"Error processing log entry: {str(e)}")
                    self.skipped_logs.append(log_data)  # Append raw data on failure
                    continue

            # If no valid logs, skip query execution
            if not cypher_logs:
                return

            # Cypher query merges IP nodes, connections, and tags, creating relationships
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
                protocol: log.protocol
            }]->(dst)
            WITH src, log
            UNWIND log.tags AS tag
            MERGE (t:Tag {name: tag})
            MERGE (src)-[:HAS_TAG]->(t)
            """

            try:
                session.run(query, logs=cypher_logs)
                print(f"Successfully processed batch of {len(cypher_logs)} logs")
            except Exception as e:
                print(f"Error processing batch: {str(e)}")

    def process_logs_directory(self, directory_path):
        """
        Main processing loop:
        - Walk through all JSON files in the directory.
        - Parse logs, accumulate in batches.
        - Process batches until all logs are ingested.
        """
        log_dir = Path(directory_path)
        if not log_dir.exists():
            print(f"Directory {directory_path} does not exist")
            return

        self.create_constraints()  # Ensure DB constraints exist before ingesting

        batch = []
        total_processed = 0

        # Iterate over all JSON files in the directory
        for json_file in log_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    try:
                        log_data = json.load(f)
                        if isinstance(log_data, list):
                            batch.extend(log_data)  # Add all logs from list
                        else:
                            batch.append(log_data)  # Single log dict

                    except json.JSONDecodeError as e:
                        print(f"Error decoding JSON in {json_file}: {str(e)}")
                        continue

                    # Process batch if batch size is reached
                    if len(batch) >= self.batch_size:
                        self.process_log_batch(batch)
                        total_processed += len(batch)
                        batch.clear()

            except Exception as e:
                print(f"Error reading {json_file}: {str(e)}")

        # Process remaining logs in batch if any
        if batch:
            self.process_log_batch(batch)
            total_processed += len(batch)

        # Summary output
        print(f"Final total logs processed: {total_processed}")
        print(f"Skipped logs due to missing required fields: {len(self.skipped_logs)}")

        # Save skipped logs for analysis if any
        if self.skipped_logs:
            with open("skipped_logs.json", "w") as f:
                json.dump(self.skipped_logs, f, indent=2)
            print("Skipped logs saved to skipped_logs.json")


def main():
    """
    Entry point for running the log ingester.
    """
    ingester = Neo4jLogIngester(batch_size=1000)
    try:
        ingester.process_logs_directory("logs-json")
    finally:
        ingester.close()


if __name__ == "__main__":
    main()
