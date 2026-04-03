import requests
from rdflib import Graph, OWL, RDFS, RDF

API = "http://localhost:8000"
OWL_FILE = r"C:\falkorMG-ui\backend\dolce-lite.owl"

def local_name(uri):
    uri = str(uri)
    return uri.split("#")[-1].split("/")[-1]

def main():
    print("Parsing DOLCE-Lite OWL...")
    g = Graph()
    g.parse(OWL_FILE, format="xml")

    # Collect all classes
    classes = set()
    for c in g.subjects(RDF.type, OWL.Class):
        name = local_name(c)
        if name:
            classes.add(name)

    print(f"Found {len(classes)} classes")

    # Create metagraph
    resp = requests.post(f"{API}/metagraph", json={"generator_set": list(classes)})
    resp.raise_for_status()
    graph_id = resp.json()["id"]
    print(f"Created metagraph: {graph_id}")

    # Add subClassOf edges
    count = 0
    for child, _, parent in g.triples((None, RDFS.subClassOf, None)):
        child_name = local_name(child)
        parent_name = local_name(parent)
        if not child_name or not parent_name:
            continue
        if child_name == parent_name:
            continue
        payload = {
            "invertex": [child_name],
            "outvertex": [parent_name],
            "label": "subClassOf"
        }
        r = requests.post(f"{API}/metagraph/{graph_id}/edge", json=payload)
        if r.status_code == 200:
            count += 1
        else:
            print(f"  WARN: {child_name} -> {parent_name} failed: {r.text}")

    print(f"Loaded {count} edges into graph '{graph_id}'")
    print(f"Done! Graph ID to save: {graph_id}")

if __name__ == "__main__":
    main()