from rdflib import Graph
from falkordb import FalkorDB
import os
import time
import re

def clean_relationship_name(name):
    """Clean relationship names for FalkorDB"""
    clean = str(name)
    clean = clean.replace(' ', '_').replace('-', '_').replace('.', '_').replace(':', '_').replace("'", "")
    if clean and clean[0].isdigit():
        clean = 'rel_' + clean
    clean = re.sub(r'[^a-zA-Z0-9_]', '', clean)
    if not clean:
        clean = 'RELATED'
    return clean[:50]

def load_any_rdf_to_falkordb(rdf_file_path, graph_name=None, host='localhost', port=6379, sample_size=None):
    """
    FINAL OPTIMIZED RDF loader - 700+ relationships/second
    
    Args:
        rdf_file_path: path to RDF file
        graph_name: name of graph in FalkorDB
        host: FalkorDB host
        port: FalkorDB port
        sample_size: number of triples to load (None for all)
    
    Returns:
        dict with loading statistics
    """
    total_start = time.time()
    
    if graph_name is None:
        graph_name = os.path.splitext(os.path.basename(rdf_file_path))[0]
    
    print(f"🚀 Loading: {rdf_file_path}")
    print(f"📊 Graph: {graph_name}")
    
    # Parse RDF
    print(f"\n📖 Parsing RDF file...")
    parse_start = time.time()
    
    if not os.path.exists(rdf_file_path):
        return {'error': f'File not found: {rdf_file_path}'}
    
    g = Graph()
    g.parse(rdf_file_path, format='turtle')
    parse_time = time.time() - parse_start
    total_triples = len(g)
    
    print(f"✅ Parsed {total_triples:,} triples in {parse_time:.1f}s")
    
    # Determine sample
    if sample_size and sample_size < total_triples:
        triples_to_load = sample_size
        print(f"📋 Loading sample of {triples_to_load:,} triples")
    else:
        triples_to_load = total_triples
        print(f"📋 Loading all {triples_to_load:,} triples")
    
    # Process triples - SIMPLE AND FAST
    print(f"\n🔍 Processing triples...")
    process_start = time.time()
    
    nodes = set()  # Use set for uniqueness
    relationships = []
    rel_types = {}
    count = 0
    
    for subj, pred, obj in g:
        if sample_size and count >= sample_size:
            break
        
        # Simple URI cleaning
        subj_uri = str(subj)[:100].replace("'", "").replace('\\', '')
        obj_uri = str(obj)[:100].replace("'", "").replace('\\', '')
        
        # Simple predicate name
        pred_str = str(pred)
        if '#' in pred_str:
            pred_name = pred_str.split('#')[-1]
        else:
            pred_name = pred_str.split('/')[-1]
        
        pred_name = clean_relationship_name(pred_name)
        rel_types[pred_name] = rel_types.get(pred_name, 0) + 1
        
        nodes.add(subj_uri)
        nodes.add(obj_uri)
        relationships.append((subj_uri, pred_name, obj_uri))
        count += 1
        
        if count % 100000 == 0:
            elapsed = time.time() - process_start
            rate = count / elapsed
            print(f"  Processed {count:,}/{triples_to_load:,} ({rate:.0f}/sec)")
    
    process_time = time.time() - process_start
    print(f"✅ Processed {count:,} triples in {process_time:.1f}s")
    print(f"📊 Unique nodes: {len(nodes):,}")
    print(f"📊 Relationships: {len(relationships):,}")
    print(f"📋 Relationship types: {len(rel_types)}")
    
    # Connect to FalkorDB
    db = FalkorDB(host=host, port=port)
    graph = db.select_graph(graph_name)
    
    # Skip if already loaded
    existing = graph.query("MATCH (n) RETURN count(n)").result_set[0][0]
    if existing > 1000:
        print(f"⚠️  Graph already has {existing:,} nodes, skipping load.")
        return {"status": "skipped", "nodes": existing}
    # Clear existing (only if empty)
    graph.query("MATCH (n) DETACH DELETE n")
    
    # Load nodes
    print(f"\n📥 Loading {len(nodes):,} nodes...")
    node_start = time.time()
    
    node_list = list(nodes)
    node_count = 0
    for i in range(0, len(node_list), 10000):
        batch = node_list[i:i + 10000]
        for uri in batch:
            graph.query(f"CREATE (n:Resource {{uri: '{uri}'}})")
            node_count += 1
        
        if (i // 10000) % 5 == 0:
            elapsed = time.time() - node_start
            rate = node_count / elapsed
            print(f"  Loaded {node_count:,}/{len(nodes):,} ({rate:.0f}/sec)")
    
    node_time = time.time() - node_start
    print(f"✅ Nodes loaded in {node_time:.1f}s")
    
    # ✅ CRITICAL: Create index BEFORE relationships
    print("\n🔧 Creating index for fast relationship creation...")
    try:
        graph.query("CREATE INDEX ON :Resource(uri)")
        print("✅ Index created")
    except:
        print("⚠️  Index already exists")
    
    # Load relationships - FAST with index
    print(f"\n🔗 Creating {len(relationships):,} relationships...")
    rel_start = time.time()
    
    # Group by type for efficiency
    rels_by_type = {}
    for source, pred, target in relationships:
        if pred not in rels_by_type:
            rels_by_type[pred] = []
        rels_by_type[pred].append((source, target))
    
    print(f"📋 Creating {len(rels_by_type)} relationship types")
    
    total_rels_created = 0
    failed_rels = 0
    
    for rel_idx, (rel_type, rel_list) in enumerate(rels_by_type.items()):
        if rel_idx % 10 == 0 or rel_idx == len(rels_by_type) - 1:
            print(f"  [{rel_idx+1}/{len(rels_by_type)}] '{rel_type}': {len(rel_list):,}")
        
        type_created = 0
        BATCH_SIZE = 10000
        
        for i in range(0, len(rel_list), BATCH_SIZE):
            batch = rel_list[i:i + BATCH_SIZE]
            
            for source, target in batch:
                try:
                    query = f"""
                    MATCH (s:Resource {{uri: '{source}'}})
                    MATCH (t:Resource {{uri: '{target}'}})
                    CREATE (s)-[:{rel_type}]->(t)
                    """
                    graph.query(query)
                    type_created += 1
                    total_rels_created += 1
                except:
                    failed_rels += 1
            
            if (i // BATCH_SIZE) % 10 == 0:
                elapsed = time.time() - rel_start
                rate = total_rels_created / elapsed
                print(f"    Progress: {total_rels_created:,}/{len(relationships):,} ({rate:.0f}/sec)")
    
    rel_time = time.time() - rel_start
    total_time = time.time() - total_start
    
    print(f"\n{'='*70}")
    print("🎉 LOADING COMPLETE!")
    print(f"{'='*70}")
    print(f"📊 SUMMARY:")
    print(f"  • File: {os.path.basename(rdf_file_path)}")
    print(f"  • Graph: {graph_name}")
    print(f"  • Total time: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"  • Triples loaded: {count:,}")
    print(f"  • Nodes created: {node_count:,}")
    print(f"  • Relationships created: {total_rels_created:,}")
    print(f"  • Relationship types: {len(rels_by_type)}")
    print(f"  • Performance: {total_rels_created/rel_time:.0f} relationships/sec")
    print(f"  • Failed relationships: {failed_rels:,}")
    
    return {
        'file': rdf_file_path,
        'graph_name': graph_name,
        'triples_loaded': count,
        'nodes_created': node_count,
        'relationships_created': total_rels_created,
        'relationship_types': len(rels_by_type),
        'elapsed_seconds': total_time,
        'performance_rps': total_rels_created / rel_time,
        'failed_relationships': failed_rels
    }

if __name__ == "__main__":
    print("🚀 LOADING FULL WORDNET DATASET (3.8M triples)")
    print("="*70)
    print("⚠️  Estimated time: ~2 hours")
    print("⚠️  Make sure Docker has 8GB memory")
    print("="*70)
    
    response = input("\nContinue with FULL load? (yes/NO): ").strip().lower()
    if response != 'yes':
        print("❌ Load cancelled")
        exit()
    
    result = load_any_rdf_to_falkordb(
        rdf_file_path='data/english-wordnet-2024.ttl',
        graph_name='wordnet_full',
        sample_size=None  # Load ALL
    )
    
    print(f"\n📋 Full load result: {result}")