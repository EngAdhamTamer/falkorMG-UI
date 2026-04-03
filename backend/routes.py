from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import redis as redis_client

sys.path.append("/home/sanmyaku/falkorMG_lib")
from falkorMG import Metagraph

router = APIRouter()

# ── Graph Names ───────────────────────────────────────────────────────────────

GRAPH_NAMES = {
    '5831c01b': 'DOLCE',
    '7e319e3f': 'OntoWordNet',
    'wordnet_full': 'WordNet',
}

# ── Models ────────────────────────────────────────────────────────────────────

class CreateMetagraphRequest(BaseModel):
    generator_set: List[str]

class AddEdgeRequest(BaseModel):
    invertex: List[str]
    outvertex: List[str]
    label: Optional[str] = None

class MetapathRequest(BaseModel):
    source: List[str]
    target: List[str]

class MultiGraphRequest(BaseModel):
    graph_ids: List[str]

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/graphs")
def list_graphs():
    try:
        r = redis_client.Redis(host='localhost', port=6379)
        graphs = r.execute_command('GRAPH.LIST')
        graph_ids = [g.decode() if isinstance(g, bytes) else g for g in graphs]
        return {
            "graphs": [
                {"id": gid, "name": GRAPH_NAMES.get(gid, gid)}
                for gid in graph_ids
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/metagraph")
def create_metagraph(req: CreateMetagraphRequest):
    mg = Metagraph(set(req.generator_set))
    return {"id": mg.id, "generator_set": list(mg.generator_set)}


@router.post("/metagraph/{graph_id}/edge")
def add_edge(graph_id: str, req: AddEdgeRequest):
    mg = Metagraph(set(), graph_id=graph_id)
    edge_id = mg.add_edge(set(req.invertex), set(req.outvertex), req.label)
    return {"edge_id": edge_id}


@router.get("/metagraph/{graph_id}/edges")
def get_edges(graph_id: str):
    mg = Metagraph(set(), graph_id=graph_id)
    edges = mg.get_edges()
    return {"edges": [
        {
            "edge_id": e["edge_id"],
            "invertex": list(e["invertex"]),
            "outvertex": list(e["outvertex"]),
            "label": e["label"]
        } for e in edges
    ]}


@router.get("/metagraph/{graph_id}/adjacency")
def get_adjacency(graph_id: str):
    mg = Metagraph(set(), graph_id=graph_id)
    return mg.adjacency_matrix()


@router.get("/metagraph/{graph_id}/closure")
def get_closure(graph_id: str):
    mg = Metagraph(set(), graph_id=graph_id)
    return mg.get_closure()


@router.post("/metagraph/{graph_id}/metapaths")
def get_metapaths(graph_id: str, req: MetapathRequest):
    mg = Metagraph(set(), graph_id=graph_id)
    paths = mg.get_all_metapaths_from(set(req.source), set(req.target))
    return {"metapaths": paths}


@router.delete("/metagraph/{graph_id}/edge/{edge_id}")
def delete_edge(graph_id: str, edge_id: str):
    mg = Metagraph(set(), graph_id=graph_id)
    mg.graph.query(f"""
        MATCH (me:MetagraphEdge {{id: '{edge_id}'}})
        DETACH DELETE me
    """)
    return {"deleted": True, "edge_id": edge_id}


@router.delete("/metagraph/{graph_id}")
def delete_metagraph(graph_id: str):
    mg = Metagraph(set(), graph_id=graph_id)
    mg.delete()
    return {"deleted": True}


@router.post("/multigraph")
def get_multigraph(req: MultiGraphRequest):
    result = []
    for graph_id in req.graph_ids:
        try:
            mg = Metagraph(set(), graph_id=graph_id)
            edges = mg.get_edges()
            result.append({
                "graph_id": graph_id,
                "edges": [
                    {
                        "edge_id": e["edge_id"],
                        "invertex": list(e["invertex"]),
                        "outvertex": list(e["outvertex"]),
                        "label": e["label"]
                    } for e in edges
                ]
            })
        except:
            pass
    return {"graphs": result}