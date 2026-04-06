from generic_rdf_loader import load_any_rdf_to_falkordb

print("Starting full WordNet load into FalkorDB...")
print("This will take approximately 2 hours.")
print("="*60)

result = load_any_rdf_to_falkordb(
    rdf_file_path='/home/sanmyaku/falkorMG-ui/backend/english-wordnet-2024.ttl',
    graph_name='wordnet_full',
    host='localhost',
    port=6379,
    sample_size=None
)

print(f"\nFinal result: {result}")
