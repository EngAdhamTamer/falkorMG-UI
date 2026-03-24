# falkorMG-ui

A visual interface for exploring and managing metagraphs powered by [falkorMG](https://github.com/EngAdhamTamer/falkorMG) and FalkorDB.

## Features

- Create and load metagraphs
- Add edges with invertex and outvertex sets
- Interactive graph visualization with Cytoscape.js
- Multiple metagraphs on the same canvas with different colors
- Click a node to see its connected edges in the right sidebar
- Right click a node to hide it
- Double click a node to expand/collapse connected nodes
- Ctrl+Z to undo last action
- Find metapaths between nodes
- View adjacency and closure matrices
- Graphs persist across page refreshes

## Requirements

- Python 3.10+
- Node.js 18+
- FalkorDB running via Docker
- falkorMG library at `C:\falkorMG_lib`

## Setup

**1. Start FalkorDB:**
```bash
docker run -p 6380:6379 -d falkordb/falkordb
```

**2. Start backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**3. Start frontend:**
```bash
cd frontend
npm install
npm start
```

## Project Structure
```
falkorMG-ui/
├── backend/
│   ├── main.py        ← FastAPI app
│   ├── routes.py      ← API endpoints
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.js         ← Main app with state management
        ├── GraphView.jsx  ← Cytoscape graph canvas
        ├── Panel.jsx      ← Left sidebar controls
        └── App.css        ← Styles
```

## Tech Stack

- **Frontend:** React + Cytoscape.js
- **Backend:** FastAPI + falkorMG
- **Database:** FalkorDB