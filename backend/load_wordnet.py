import requests
from rdflib import Graph
API = "http://localhost:8001"
TTL_FILE = "/home/sanmyaku/falkorMG-ui/backend/english-wordnet-2024.ttl"

def local_name(uri):
    uri = str(uri)
    return uri.split("#")[-1].split("/")[-1]

def main():
    print("Parsing WordNet TTL...")
    g = Graph()
    g.parse(TTL_FILE, format="turtle")
    print(f"Loaded {len(g)} triples")

    nodes = set()
    edges = []

    for s, p, o in g:
        s_name = local_name(s)
        p_name = local_name(p)
        o_name = local_name(o)
        if s_name and o_name and s_name != o_name:
            nodes.add(s_name)
            nodes.add(o_name)
            edges.append((s_name, o_name, p_name))

    print(f"Unique nodes: {len(nodes)}, Edges: {len(edges)}")

    resp = requests.post(f"{API}/metagraph", json={"generator_set": list(nodes)})
    resp.raise_for_status()
    graph_id = resp.json()["id"]
    print(f"Created metagraph: {graph_id}")

    count = 0
    failed = 0
    for i, (inv, out, label) in enumerate(edges):
        r = requests.post(f"{API}/metagraph/{graph_id}/edge", json={
            "invertex": [inv],
            "outvertex": [out],
            "label": label
        })
        if r.status_code == 200:
            count += 1
        else:
            failed += 1
        if i % 10000 == 0:
            print(f"  Progress: {i}/{len(edges)} ({failed} failed)")

    print(f"Done! Loaded {count} edges, {failed} failed")
    print(f"Graph ID to save: {graph_id}")

if __name__ == "__main__":
    main()
