import gzip
import requests
import xml.etree.ElementTree as ET
from collections import deque

API = "http://localhost:8000"
WN_FILE = r"C:\falkorMG-ui\backend\wordnet.xml.gz"
ROOT_SYNSET = "oewn-00001740-n"
MAX_SYNSETS = 500

def extract_label(members_str):
    # Take first member, strip prefix and POS suffix
    first = members_str.strip().split()[0]
    # e.g. oewn-physical_entity-n -> physical_entity
    parts = first.replace("oewn-", "").rsplit("-", 1)
    return parts[0].replace("_", " ")

def main():
    print("Parsing WordNet XML...")
    with gzip.open(WN_FILE, "rt", encoding="utf-8") as f:
        tree = ET.parse(f)
    root = tree.getroot()

    # Build synset map: id -> label, and hypernym adjacency
    synsets = {}    # id -> label
    hypernyms = {}  # id -> list of parent ids

    for synset in root.iter("Synset"):
        sid = synset.get("id")
        pos = synset.get("partOfSpeech")
        members = synset.get("members", "")
        if pos != "n" or not members:
            continue
        label = extract_label(members)
        synsets[sid] = label
        hypernyms[sid] = []
        for rel in synset:
            if rel.get("relType") == "hypernym":
                hypernyms[sid].append(rel.get("target"))

    print(f"Total noun synsets: {len(synsets)}")

    # BFS from root, cap at MAX_SYNSETS
    # Build reverse map: parent -> children
    children = {sid: [] for sid in synsets}
    for sid, parents in hypernyms.items():
        for p in parents:
            if p in children:
                children[p].append(sid)

    visited = set()
    queue = deque([ROOT_SYNSET])
    order = []
    while queue and len(visited) < MAX_SYNSETS:
        sid = queue.popleft()
        if sid in visited or sid not in synsets:
            continue
        visited.add(sid)
        order.append(sid)
        for child in children.get(sid, []):
            if child not in visited:
                queue.append(child)

    print(f"BFS selected {len(visited)} synsets")

    # Collect generator set (all unique labels)
    gen_set = list({synsets[sid] for sid in visited})

    # Create metagraph
    resp = requests.post(f"{API}/metagraph", json={"generator_set": gen_set})
    resp.raise_for_status()
    graph_id = resp.json()["id"]
    print(f"Created metagraph: {graph_id}")

    # Add hypernym edges within our visited set
    count = 0
    for sid in visited:
        child_label = synsets[sid]
        for parent_id in hypernyms.get(sid, []):
            if parent_id not in visited:
                continue
            parent_label = synsets[parent_id]
            if child_label == parent_label:
                continue
            r = requests.post(f"{API}/metagraph/{graph_id}/edge", json={
                "invertex": [child_label],
                "outvertex": [parent_label],
                "label": "hypernym"
            })
            if r.status_code == 200:
                count += 1
            else:
                print(f"  WARN: {child_label} -> {parent_label}: {r.text}")

    print(f"Loaded {count} edges into graph '{graph_id}'")
    print(f"Done! Graph ID: {graph_id}")

if __name__ == "__main__":
    main()