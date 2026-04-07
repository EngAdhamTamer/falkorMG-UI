# FalkorMG UI

A full-stack application for building and visualizing a rule-based intelligence system grounded in semantic knowledge graphs. Built on top of [FalkorDB](https://falkordb.com) using a custom metagraph library.

---

## Project Overview

FalkorMG UI is the interface layer of a larger **rule-based intelligence system** — not LLM-based. The system understands language through structured knowledge graphs (DOLCE ontology, WordNet, FrameNet) and processes text into a structured semantic graph called a **DocGraph**.

The architecture is inspired by spaCy — modular, where every component is a class, every class depends on another, and any piece can be swapped without breaking the system.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Graph Database | FalkorDB (Docker) |
| Backend | Python 3, FastAPI, uvicorn |
| NLP | spaCy (`en_core_web_sm`) |
| Frontend | React, Cytoscape.js |
| Metagraph Library | [falkorMG](https://github.com/EngAdhamTamer/falkorMG) |

---

## Knowledge Graphs Loaded

| Graph | Description | Size |
|-------|-------------|------|
| DOLCE | Upper ontology — entity class hierarchies | 93 classes, 272 edges |
| OntoWordNet | WordNet → DOLCE mappings | 162 edges |
| WordNet | Full English lexical database | 1,626,547 nodes, 3,854,624 edges |

---

## Features

- Multi-graph visualization with per-graph colors
- Node info sidebar with connected edges grouped by label
- Metapath finding between graphs
- Adjacency and closure matrix computation
- Right-click to hide node, double-click to expand/collapse
- Ctrl+Z undo / Ctrl+Y redo
- localStorage persistence
- Inline graph renaming
- Load existing metagraphs from FalkorDB dropdown
- Remove from View (does not delete from FalkorDB)
- NLP Pipeline section:
  - Tokens + POS tags (color coded)
  - Lemmas, Named Entities, Sentences

---

## Project Structure

```
falkorMG-ui/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routes.py                # All API routes + GRAPH_NAMES
│   ├── nlp_routes.py            # NLP pipeline endpoints (spaCy)
│   ├── load_dul.py              # DOLCE ontology loader
│   ├── load_ontowordnet.py      # OntoWordNet loader
│   ├── load_wordnet.py          # WordNet loader
│   ├── generic_rdf_loader.py    # RDF loader (patched — won't wipe if nodes > 1000)
│   ├── requirements.txt
│   └── ...
├── frontend/
│   └── src/
│       ├── App.js               # Main app, graph state, API calls
│       ├── App.css              # All styles
│       ├── GraphView.jsx        # Cytoscape.js graph rendering
│       └── Panel.jsx            # Sidebar controls + NLP Pipeline section
└── start_falkorMG.sh            # Start both backend and frontend
```

---

## Setup & Running

### Prerequisites

- Docker (for FalkorDB)
- Python 3.10+
- Node.js + npm
- spaCy: `python3 -m spacy download en_core_web_sm`
- falkorMG library: `pip install -e /path/to/falkorMG_lib`

### 1. Start FalkorDB

```bash
docker run -p 6379:6379 falkordb/falkordb
```

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --port 8001 --host 0.0.0.0
```

### 3. Start Frontend

```bash
cd frontend
npm install
PORT=3003 npm start
```

### 4. Or use the start script

```bash
~/start_falkorMG.sh
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/graphs` | List all metagraphs |
| POST | `/metagraph` | Create a new metagraph |
| POST | `/metagraph/{id}/edge` | Add edge to metagraph |
| GET | `/metagraph/{id}/nodes` | Get all nodes |
| GET | `/metagraph/{id}/metapaths` | Find metapaths |
| POST | `/nlp/analyze` | Full NLP analysis (tokens, POS, entities, sentences) |
| POST | `/nlp/tokenize` | Tokenize text |
| POST | `/nlp/pos` | POS tagging |
| POST | `/nlp/sentences` | Sentence segmentation |

API docs available at: `http://localhost:8001/docs`

---

## Loading Knowledge Graphs

### DOLCE

```bash
cd backend && python3 load_dul.py
```

### OntoWordNet

```bash
cd backend && python3 load_ontowordnet.py
```

### WordNet (takes ~3 hours)

```bash
cd backend && nohup python3 load_wordnet.py > ~/wordnet_load.log 2>&1 &
```

> **Warning:** Never delete DOLCE, OntoWordNet, or wordnet_full from FalkorDB accidentally.
> The "Remove from View" button only removes from the UI — it does NOT delete from FalkorDB.
> To permanently delete a graph use:
> ```python
> from falkordb import FalkorDB
> FalkorDB(host='localhost', port=6379).select_graph('GRAPH_ID').delete()
> ```

---

## Related Repositories

- [falkorMG](https://github.com/EngAdhamTamer/falkorMG) — Core metagraph library (FalkorDB-native reimplementation of mgtoolkit)
- [wordnet-falkordb-project](https://github.com/EngAdhamTamer/wordnet-falkordb-project) — WordNet loader for FalkorDB

---

## Architecture (Intelligence System)

This UI is part of a larger 5-layer intelligence system:

```
Layer 5 — Language Interface
         Vocabulary → TokenType → Tokenizer → LexicalLinker → DocGraph
Layer 4 — Reasoning & Interpretation (future)
         SenseDisambiguator, FrameMapper, InferenceEngine
Layer 3 — Runtime Capacities
         Perceiver, Pipeline, LexicalLinker, SentenceBuilder, DocGraphBuilder
Layer 2 — Knowledge Resources
         Ontology (DOLCE), Lexicon (WordNet), Concepts (FrameNet)
Layer 1 — MetaGraph Infrastructure
         Vertex, Edge, Graph, MetaGraph, MetaEdge, MetaPath (falkorMG library)
```

---

## License

Private project. All rights reserved.
