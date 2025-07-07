#!/usr/bin/env python3
"""clear_neo4j.py — Clear all data from Neo4j database

Works with both Docker and local setups:
- From host machine: uses localhost:7687
- From within container: uses neo4j:7687
- Custom connection via environment variables

Usage:
    python clear_neo4j.py                    # Interactive mode
    python clear_neo4j.py --force            # Non-interactive mode

This is irreversible — use with care!
"""

import os
import sys
from neo4j import GraphDatabase

# Get connection parameters from environment or use defaults
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

def confirm_deletion():
    """Ask user to confirm deletion of all data."""
    print("\n⚠️  WARNING: You are about to permanently delete ALL data from Neo4j!")
    print("\n🔥 This action is IRREVERSIBLE!")
    response = input("Type 'DELETE' to confirm, or anything else to cancel: ").strip()
    return response == "DELETE"

def clear_neo4j(driver):
    """Clear all data from Neo4j in small batches."""
    with driver.session() as session:
        # First get counts for reporting
        counts = {}
        for label in ['Host', 'Flow', 'Port', 'Protocol', 'ProcessedFile']:
            result = session.run(f"MATCH (n:{label}) RETURN count(n) as count")
            counts[label] = result.single()['count']
        
        print("\nCurrent data in Neo4j:")
        for label, count in counts.items():
            print(f"  • {label}: {count:,} nodes")
        
        # Delete data in stages to avoid memory issues
        print("\n🗑️  Deleting data in stages...")
        
        # 1. First delete relationships in batches
        print("  • Deleting relationships...", end=" ", flush=True)
        while True:
            result = session.run("MATCH ()-[r]->() WITH r LIMIT 10000 DELETE r RETURN count(r) as deleted")
            deleted = result.single()["deleted"]
            if deleted == 0:
                break
        print("✅")
        
        # 2. Delete Flow nodes in batches
        print("  • Deleting Flow nodes...", end=" ", flush=True)
        while True:
            result = session.run("MATCH (n:Flow) WITH n LIMIT 10000 DELETE n RETURN count(n) as deleted")
            deleted = result.single()["deleted"]
            if deleted == 0:
                break
        print("✅")
        
        # 3. Delete Port nodes in batches
        print("  • Deleting Port nodes...", end=" ", flush=True)
        while True:
            result = session.run("MATCH (n:Port) WITH n LIMIT 10000 DELETE n RETURN count(n) as deleted")
            deleted = result.single()["deleted"]
            if deleted == 0:
                break
        print("✅")
        
        # 4. Delete remaining nodes in batches
        print("  • Deleting remaining nodes...", end=" ", flush=True)
        while True:
            result = session.run("MATCH (n) WITH n LIMIT 10000 DELETE n RETURN count(n) as deleted")
            deleted = result.single()["deleted"]
            if deleted == 0:
                break
        print("✅")
        
        # Verify deletion
        result = session.run("MATCH (n) RETURN count(n) as count")
        remaining = result.single()['count']
        if remaining == 0:
            print("\n✅ Database is now empty.")
        else:
            print(f"\n⚠️  Warning: {remaining} nodes still remain!")

def main():
    force = len(sys.argv) > 1 and sys.argv[1] == '--force'
    
    print(f"🔌 Connecting to Neo4j at {URI} ...", end=" ")
    try:
        driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
        # Test connection
        with driver.session() as session:
            session.run("RETURN 1")
        print("✅ connected.")
    except Exception as e:
        print("❌ failed!")
        print(f"Error: {e}")
        print("\nTroubleshooting:")
        print("- If running from host: ensure Docker services are up")
        print("- If running in container: use NEO4J_URI=bolt://neo4j:7687")
        print("- Check if Neo4j service is healthy: docker-compose ps")
        return 1

    try:
        if force or confirm_deletion():
            clear_neo4j(driver)
        else:
            print("👋 Operation cancelled.")
    finally:
        driver.close()

    return 0

if __name__ == "__main__":
    sys.exit(main()) 