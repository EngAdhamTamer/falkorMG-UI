# falkorMG UI

A visual interface for the [falkorMG](https://github.com/EngAdhamTamer/falkorMG) metagraph library, built on top of FalkorDB, FastAPI, and React + Cytoscape.js.

## Overview

This project is part of a larger "thinking machine" system that reasons from ontological rules rather than statistical patterns. The foundation is built on:

- **DOLCE** (Descriptive Ontology for Linguistic and Cognitive Engineering)
- **WordNet** (1.6M+ synsets, 3.8M+ relationships)
- **OntoWordNet** (mapping between WordNet synsets and DOLCE classes)

## Features

- 🔵 **Multi-graph visualization** — load and view multiple metagraphs simultaneously
- 🔍 **Node highlight** — click a node to highlight only its connections
- 📂 **Load Existing** — dropdown to load pre-stored graphs by name
- ✏️ **Graph renaming** — double-click a graph tag to rename it
- 🧠 **NLP Pipeline** — analyze sentences with spaCy (tokens, POS tags, lemmas, named entities)
- 🔗 **Metapath finding** — find all metapaths between two sets of nodes
- 📊 **Adjacency & Closure matrices**
- ↩️ **Undo/Redo** — Ctrl+Z / Ctrl+Y
- 👁️ **Hide/Show nodes** — right-click to hide, Ctrl+Z to restore
- 💾 **localStorage persistence** — graphs persist across browser sessions

## Tech Stack

| Layer | Technology |
|---|---|
| Knowledge Graph DB | FalkorDB (Redis-based) |
| Graph Library | falkorMG (custom Python) |
| Backend | FastAPI + uvicorn |
| Frontend | React + Cytoscape.js |
| NLP | spaCy (en_core_web_sm) |
| Deployment | Ubuntu 24, Mac Mini via Tailscale |

## Project Structure

```
falkorMG-ui/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── routes.py            # API routes + GRAPH_NAMES mapping
│   ├── nlp_routes.py        # NLP pipeline endpoints
│   ├── load_dul.py          # DOLCE loader
│   ├── load_ontowordnet.py  # OntoWordNet mapping loader
│   ├── run_wordnet_load.py  # Full WordNet loader (1-3 hours)
│   ├── generic_rdf_loader.py# Generic RDF → FalkorDB loader
│   ├── dul.owl              # DOLCE ontology
│   ├── ontowordnet.owl      # OntoWordNet OWL file
│   └── english-wordnet-2024.ttl # Full WordNet dataset (203MB)
└── frontend/
    └── src/
        ├── App.js           # Main React app
        ├── App.css          # Styles
        ├── GraphView.jsx    # Cytoscape.js graph component
        └── Panel.jsx        # Sidebar controls + NLP section
```

## Running Locally

### Prerequisites
- Docker Desktop
- Python 3.8+
- Node.js 16+
- falkorMG library at `C:\falkorMG_lib`

### Start FalkorDB
```powershell
docker run -p 6380:6379 -d falkordb/falkordb
```

### Start Backend
```powershell
cd C:\falkorMG-ui\backend; uvicorn main:app --reload --port 8000
```

### Start Frontend
```powershell
cd C:\falkorMG-ui\frontend; npm start
```

## Deployed Instance

The system is deployed on a Mac Mini (Ubuntu 24) accessible via Tailscale:

- **Frontend**: http://100.103.196.14:3003
- **Backend API**: http://100.103.196.14:8001
- **API Docs**: http://100.103.196.14:8001/docs

## Loaded Graphs

| Graph | Description | Nodes | Edges |
|---|---|---|---|
| DOLCE | DOLCE+DnS Ultralite ontology | 93 classes | 272 |
| OntoWordNet | WordNet→DOLCE class mappings | 179 | 162 |
| WordNet | Full Open English WordNet 2024 | 1,626,547 | 3,854,624 |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/graphs` | List all graphs with names |
| POST | `/metagraph` | Create new metagraph |
| GET | `/metagraph/{id}/edges` | Get all edges |
| POST | `/metagraph/{id}/edge` | Add edge |
| DELETE | `/metagraph/{id}/edge/{edge_id}` | Delete edge |
| GET | `/metagraph/{id}/adjacency` | Adjacency matrix |
| GET | `/metagraph/{id}/closure` | Closure matrix |
| POST | `/metagraph/{id}/metapaths` | Find metapaths |
| POST | `/multigraph` | Load multiple graphs at once |
| POST | `/nlp/analyze` | Full NLP analysis |
| POST | `/nlp/tokenize` | Tokenization |
| POST | `/nlp/pos` | POS tagging |
| POST | `/nlp/sentences` | Sentence segmentation |

## Roadmap

- [ ] Mental Model Graph — parse a sentence into a knowledge graph
- [ ] WordNet search/browse — search a word, see its synset and connections
- [ ] FOL automation — first-order logic reasoning section
- [ ] FOL engine integration (tau-lang)
- [ ] Auto-reload startup script for data persistence
