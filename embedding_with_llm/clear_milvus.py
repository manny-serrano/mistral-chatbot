#!/usr/bin/env python3
"""clear_milvus.py — Drop collections to wipe Milvus data

Works with both Docker and local setups:
- From host machine: uses localhost:19530  
- From within container: uses milvus:19530
- Custom connection via environment variables

Usage:
    python clear_milvus.py                    # Interactive mode - shows all collections
    python clear_milvus.py mistralData        # Drop specific collection  
    python clear_milvus.py honeypotData       # Drop honeypot data
    python clear_milvus.py --all             # Drop all collections (non-interactive)

    # Using environment variables:
    MILVUS_HOST=milvus python clear_milvus.py

This is irreversible — use with care!
"""

import sys
import os
from pymilvus import connections, utility, Collection

# Get connection parameters from environment or use defaults
HOST = os.getenv("MILVUS_HOST", "localhost")
PORT = int(os.getenv("MILVUS_PORT", "19530"))

def drop_collection(name: str) -> bool:
    """Drop a single collection if it exists. Returns True if dropped, False if skipped."""
    if name not in utility.list_collections():
        print(f"❌ Collection '{name}' does not exist — skipping.")
        return False

    print(f"🗑️  Dropping collection '{name}' …", end=" ")
    try:
        Collection(name).drop()
        print("✅ done.")
        return True
    except Exception as exc:
        print("❌ failed!")
        print(f"   → {exc}")
        return False

def confirm_deletion(collections):
    """Ask user to confirm deletion of collections."""
    print(f"\n⚠️  WARNING: You are about to permanently delete {len(collections)} collection(s):")
    for name in collections:
        coll = Collection(name) if name in utility.list_collections() else None
        entity_count = coll.num_entities if coll else 0
        print(f"   • {name} ({entity_count:,} entities)")
    
    print(f"\n🔥 This action is IRREVERSIBLE!")
    response = input("Type 'DELETE' to confirm, or anything else to cancel: ").strip()
    return response == "DELETE"

def interactive_mode():
    """Interactive mode to select collections to delete."""
    collections = utility.list_collections()
    if not collections:
        print("✅ No collections found — database is already empty.")
        return

    print(f"\nFound {len(collections)} collection(s):")
    for idx, col in enumerate(collections, 1):
        coll = Collection(col)
        entity_count = coll.num_entities
        collection_type = ""
        if col == "mistralData":
            collection_type = " (General security data)"
        elif col == "honeypotData":
            collection_type = " (Honeypot attack logs)"
        
        print(f"  {idx}. {col}{collection_type} — {entity_count:,} entities")

    print(f"\n📋 Options:")
    print(f"  • Enter collection numbers (e.g., '1,3' or '1 3')")
    print(f"  • Enter collection names (e.g., 'mistralData')")
    print(f"  • Enter 'all' to delete everything")
    print(f"  • Enter 'quit' to exit")
    
    user_input = input(f"\nWhat would you like to delete? ").strip()
    
    if user_input.lower() in ['quit', 'exit', 'q']:
        print("👋 Cancelled.")
        return
    
    if user_input.lower() == 'all':
        targets = collections
    else:
        targets = []
        # Parse user input (numbers or names)
        parts = user_input.replace(',', ' ').split()
        for part in parts:
            if part.isdigit():
                idx = int(part) - 1
                if 0 <= idx < len(collections):
                    targets.append(collections[idx])
                else:
                    print(f"⚠️  Invalid index: {part}")
            elif part in collections:
                targets.append(part)
            else:
                print(f"⚠️  Collection not found: {part}")
    
    if not targets:
        print("❌ No valid collections selected.")
        return
    
    if confirm_deletion(targets):
        deleted_count = 0
        for coll in targets:
            if drop_collection(coll):
                deleted_count += 1
        print(f"\n✅ Successfully deleted {deleted_count}/{len(targets)} collections.")
    else:
        print("👋 Deletion cancelled.")

def main(argv):
    print(f"🔌 Connecting to Milvus at {HOST}:{PORT} …", end=" ")
    try:
        connections.connect(alias="default", host=HOST, port=PORT)
        print("✅ connected.")
    except Exception as e:
        print("❌ failed!")
        print(f"Error: {e}")
        print("\nTroubleshooting:")
        print("- If running from host: ensure Docker services are up")
        print("- If running in container: use MILVUS_HOST=milvus")
        print("- Check if Milvus service is healthy: docker-compose ps")
        return 1

    targets = argv[1:]  # collection names passed on CLI

    # Handle special flags
    if "--all" in targets:
        targets = utility.list_collections()
        if not targets:
            print("✅ No collections found — database already empty.")
            return 0
        
        print("🔥 --all flag specified — will drop ALL collections:")
        for name in targets:
            coll = Collection(name) if name in utility.list_collections() else None
            entity_count = coll.num_entities if coll else 0
            print(f"  • {name} ({entity_count:,} entities)")
        
        if confirm_deletion(targets):
            deleted_count = 0
            for coll in targets:
                if drop_collection(coll):
                    deleted_count += 1
            print(f"\n✅ Successfully deleted {deleted_count}/{len(targets)} collections.")
        else:
            print("👋 Deletion cancelled.")
        return 0

    if not targets:
        # No arguments provided - enter interactive mode
        interactive_mode()
        return 0

    # Specific collections provided
    existing_collections = utility.list_collections()
    if not existing_collections:
        print("✅ No collections found — database already empty.")
        return 0

    # Validate all targets exist
    valid_targets = []
    for target in targets:
        if target in existing_collections:
            valid_targets.append(target)
        else:
            print(f"⚠️  Collection '{target}' does not exist.")
            print(f"Available collections: {', '.join(existing_collections)}")

    if not valid_targets:
        print("❌ No valid collections to delete.")
        return 1

    # Confirm and delete
    if confirm_deletion(valid_targets):
        deleted_count = 0
        for coll in valid_targets:
            if drop_collection(coll):
                deleted_count += 1
        print(f"\n✅ Successfully deleted {deleted_count}/{len(valid_targets)} collections.")
    else:
        print("👋 Deletion cancelled.")

    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv)) 