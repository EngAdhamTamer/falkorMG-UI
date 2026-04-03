import requests
from rdflib import Graph, OWL, RDFS, RDF, URIRef
API = "http://localhost:8000"
OWL_FILE = r"C:\falkorMG-ui\backend\ontowordnet.owl"
DOLCE_NS = "http://www.loa-cnr.it/ontologies/DOLCE-Lite.owl#"

def local_name(uri):
    uri = str(uri)
    return uri.split("#")[-1].split("/")[-1]

def main():
    print("Parsing OntoWordNet OWL...")
    g = Graph()
    g.parse(OWL_FILE, format="xml")
    print(f"Loaded {len(g)} triples")

    # Collect all nodes (both WordNet synsets and DOLCE classes)
    nodes = set()
    mappings = []  # (wordnet_synset, dolce_class)

    for child, _, parent in g.triples((None, RDFS.subClassOf, None)):
        child_name = local_name(child)
        parent_uri = str(parent)
        parent_name = local_name(parent)

        if not child_name or not parent_name:
            continue
        if child_name == parent_name:
            continue

        # If parent is a DOLCE class, this is a mapping edge
        if DOLCE_NS in parent_uri:
            nodes.add(child_name)
            nodes.add(parent_name)
            mappings.append((child_name, parent_name))

    print(f"Found {len(mappings)} WordNet->DOLCE mappings")
    print(f"Unique nodes: {len(nodes)}")

    # Create metagraph
    resp = requests.post(f"{API}/metagraph", json={"generator_set": list(nodes)})
    resp.raise_for_status()
    graph_id = resp.json()["id"]
    print(f"Created metagraph: {graph_id}")

    # Add mapping edges
    count = 0
    failed = 0
    for wordnet_synset, dolce_class in mappings:
        r = requests.post(f"{API}/metagraph/{graph_id}/edge", json={
            "invertex": [wordnet_synset],
            "outvertex": [dolce_class],
            "label": "mapsTo"
        })
        if r.status_code == 200:
            count += 1
        else:
            failed += 1
            print(f"  WARN: {wordnet_synset} -> {dolce_class} failed: {r.text}")

    print(f"Loaded {count} mapping edges ({failed} failed)")
    print(f"Done! Graph ID to save: {graph_id}")

if __name__ == "__main__":
    main()