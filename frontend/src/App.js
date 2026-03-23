import React, { useState, useEffect, useRef } from 'react';
import GraphView from './GraphView';
import Panel from './Panel';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8000';

const GRAPH_COLORS = [
  '#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2'
];

function App() {
  const [graphs, setGraphs] = useState(() => {
    try {
      const saved = localStorage.getItem('falkorMG_graphs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeGraphId, setActiveGraphId] = useState(() => {
    try {
      const saved = localStorage.getItem('falkorMG_graphs');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch { return null; }
  });
  const activeGraphIdRef = useRef(activeGraphId);
  const graphsRef = useRef(graphs);
  const [elements, setElements] = useState([]);
  const [status, setStatus] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeEdges, setNodeEdges] = useState([]);
  const [highlightEdges, setHighlightEdges] = useState([]);

  const handleSetActiveGraph = (id) => {
    activeGraphIdRef.current = id;
    setActiveGraphId(id);
    setHighlightEdges([]);
    setSelectedNode(null);
    setNodeEdges([]);
  };

  useEffect(() => {
    localStorage.setItem('falkorMG_graphs', JSON.stringify(graphs));
    graphsRef.current = graphs;
  }, [graphs]);

  useEffect(() => {
    if (graphs.length > 0) {
      refreshAllGraphs(graphs);
    }
  }, []);

  const refreshAllGraphs = async (graphList) => {
    if (graphList.length === 0) {
      setElements([]);
      return;
    }

    const res = await axios.post(`${API}/multigraph`, {
      graph_ids: graphList.map(g => g.id)
    });

    const allNodes = new Map();
    const allEdgeNodes = [];
    const allEdgeLinks = [];

    res.data.graphs.forEach((graph) => {
      const color = graphList.find(g => g.id === graph.graph_id)?.color || '#4F46E5';

      graph.edges.forEach(e => {
        e.invertex.forEach(n => {
          if (!allNodes.has(n)) {
            allNodes.set(n, {
              data: { id: n, label: n, type: 'element', graphId: graph.graph_id, color }
            });
          }
        });
        e.outvertex.forEach(n => {
          if (!allNodes.has(n)) {
            allNodes.set(n, {
              data: { id: n, label: n, type: 'element', graphId: graph.graph_id, color }
            });
          }
        });

        const midId = `edge_${graph.graph_id}_${e.edge_id}`;
        allEdgeNodes.push({
          data: {
            id: midId,
            label: e.label || e.edge_id,
            type: 'edge',
            graphId: graph.graph_id,
            borderColor: color,
            color
          }
        });

        e.invertex.forEach((n, i) => {
          allEdgeLinks.push({
            data: { id: `in_${graph.graph_id}_${e.edge_id}_${i}`, source: n, target: midId }
          });
        });

        e.outvertex.forEach((n, i) => {
          allEdgeLinks.push({
            data: { id: `out_${graph.graph_id}_${e.edge_id}_${i}`, source: midId, target: n }
          });
        });
      });
    });

    setElements([...allNodes.values(), ...allEdgeNodes, ...allEdgeLinks]);
  };

  const handleNodeClick = async (nodeId) => {
    if (!nodeId || !activeGraphIdRef.current) {
      setSelectedNode(null);
      setNodeEdges([]);
      return;
    }
    const res = await axios.get(`${API}/metagraph/${activeGraphIdRef.current}/edges`);
    const related = res.data.edges.filter(e =>
      e.invertex.includes(nodeId) || e.outvertex.includes(nodeId)
    );
    setSelectedNode(nodeId);
    setNodeEdges(related);
  };

  const handleCreate = async (generatorSet) => {
    const res = await axios.post(`${API}/metagraph`, {
      generator_set: generatorSet
    });
    const color = GRAPH_COLORS[graphsRef.current.length % GRAPH_COLORS.length];
    const newGraph = { id: res.data.id, label: `Graph ${graphsRef.current.length + 1}`, color };
    const updated = [...graphsRef.current, newGraph];
    setGraphs(updated);
    handleSetActiveGraph(res.data.id);
    setStatus(`Metagraph created: ${res.data.id}`);
    await refreshAllGraphs(updated);
  };

  const handleLoad = async (graphId) => {
    if (graphsRef.current.find(g => g.id === graphId)) {
      handleSetActiveGraph(graphId);
      setStatus(`Switched to: ${graphId}`);
      return;
    }
    const color = GRAPH_COLORS[graphsRef.current.length % GRAPH_COLORS.length];
    const newGraph = { id: graphId, label: `Graph ${graphsRef.current.length + 1}`, color };
    const updated = [...graphsRef.current, newGraph];
    setGraphs(updated);
    handleSetActiveGraph(graphId);
    setStatus(`Loaded: ${graphId}`);
    await refreshAllGraphs(updated);
  };

  const handleAddEdge = async (invertex, outvertex, label) => {
    await axios.post(`${API}/metagraph/${activeGraphIdRef.current}/edge`, {
      invertex, outvertex, label
    });
    setStatus('Edge added');
    await refreshAllGraphs(graphsRef.current);
  };

  const handleDelete = async () => {
    await axios.delete(`${API}/metagraph/${activeGraphIdRef.current}`);
    const updated = graphsRef.current.filter(g => g.id !== activeGraphIdRef.current);
    setGraphs(updated);
    handleSetActiveGraph(updated.length > 0 ? updated[0].id : null);
    setStatus('Metagraph deleted');
    setSelectedNode(null);
    setNodeEdges([]);
    await refreshAllGraphs(updated);
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>falkorMG</h2>

        {graphs.length > 0 && (
          <div className="section">
            <h3>Metagraphs</h3>
            {graphs.map(g => (
              <div
                key={g.id}
                className={`graph-tag ${g.id === activeGraphId ? 'active' : ''}`}
                style={{ borderColor: g.color }}
                onClick={() => handleSetActiveGraph(g.id)}
              >
                <span className="dot" style={{ background: g.color }} />
                {g.label}
                <span className="graph-id">{g.id}</span>
              </div>
            ))}
          </div>
        )}

        <Panel
          graphId={activeGraphId}
          onCreate={handleCreate}
          onAddEdge={handleAddEdge}
          onDelete={handleDelete}
          onRefresh={() => refreshAllGraphs(graphsRef.current)}
          onLoad={handleLoad}
          onHighlightPath={setHighlightEdges}
        />

        {status && <p className="status">{status}</p>}

        {selectedNode && (
          <div className="node-info">
            <h3>Node: {selectedNode}</h3>
            {nodeEdges.length === 0 ? (
              <p className="muted">No edges found</p>
            ) : (
              nodeEdges.map(e => (
                <div className="edge-card" key={e.edge_id}>
                  <span className="edge-label">{e.label || e.edge_id}</span>
                  <p>{e.invertex.join(', ')} → {e.outvertex.join(', ')}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="graph-area">
        <GraphView
          elements={elements}
          onNodeClick={handleNodeClick}
          highlightEdges={highlightEdges}
          activeGraphId={activeGraphId}
        />
      </div>
    </div>
  );
}

export default App;
