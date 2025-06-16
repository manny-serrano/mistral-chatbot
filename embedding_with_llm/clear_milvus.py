#!/usr/bin/env python3
"""clear_milvus.py — Drop collections to wipe Milvus data

Run inside the *app* container, e.g.

    docker compose exec app python clear_milvus.py           # drop every collection
    docker compose exec app python clear_milvus.py sbert_embeddings other_col

If no collection names are given the script enumerates *all* collections and
removes them.  It connects to the default Milvus instance used in docker-compose
(`host=standalone`, `port=19530`).

This is irreversible — use with care!
"""

import sys
from pymilvus import connections, utility, Collection

HOST = "standalone"  # docker-compose service name for milvus
PORT = "19530"


def drop_collection(name: str) -> None:
    """Drop a single collection if it exists."""
    if name not in utility.list_collections():
        print(f"Collection '{name}' does not exist — skipping.")
        return

    print(f"Dropping collection '{name}' …", end=" ")
    try:
        Collection(name).drop()
        print("done.")
    except Exception as exc:
        print("failed!")
        print(f"  → {exc}")


def main(argv):
    # Connect to Milvus
    print(f"Connecting to Milvus at {HOST}:{PORT} …", end=" ")
    connections.connect(alias="default", host=HOST, port=PORT)
    print("connected.")

    targets = argv[1:]  # collection names passed on CLI

    if not targets:
        targets = utility.list_collections()
        if not targets:
            print("No collections found — database already empty.")
            return
        print("No collection names supplied — will drop ALL collections:")
        for n in targets:
            print(f"  • {n}")
        print()

    for coll in targets:
        drop_collection(coll)


if __name__ == "__main__":
    main(sys.argv) 