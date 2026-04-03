import React, { useState, useEffect, useRef, useCallback } from 'react';
import GraphView from './GraphView';
import Panel from './Panel';
import axios from 'axios';
import './App.css';

const API = 'http://100.103.196.14:8001';

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
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [nodeEdges, setNodeEdges] = useState([]);
  const [highlightEdges, setHighlightEdges] = useState([]);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const cyUndoRef = useRef(null);
  const [editingGraphId, setEditingGraphId] = useState(null);
  const [availableGraphs, setAvailableGraphs] = useState([]);

  const handleSetActiveGraph = (id) => {
    activeGraphIdRef.current = id;
    setActiveGraphId(id);
    setHighlightEdges([]);
    setSelectedNode(null);
    setSelectedNodeData(null);
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
    axios.get(`${API}/graphs`).then(res => setAvailableGraphs(res.data.graphs || []))
      .catch(() => setAvailableGraphs([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAllGraphs = async (graphList) => {
    if (graphList.length === 0) {
      setElements([]);
      return;
    }

    try {
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
      setStatus(`Loaded ${res.data.graphs.length} graph(s)`);
    } catch (err) {
      setStatus(`Error loading graphs: ${err.message}`);
    }
  };

  // ── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    const history = historyRef.current;
    if (history.length === 0) {
      setStatus('Nothing to undo');
      return;
    }

    const last = history[history.length - 1];
    historyRef.current = history.slice(0, -1);
    redoRef.current = [...redoRef.current, last];

    if (last.type === 'add_edge') {
      await axios.delete(`${API}/metagraph/${last.graphId}/edge/${last.edgeId}`);
      setStatus(`Undid: add edge ${last.edgeId}`);
      await refreshAllGraphs(graphsRef.current);
    } else if (last.type === 'hide_node') {
      if (cyUndoRef.current) {
        const cy = cyUndoRef.current;
        cy.getElementById(last.nodeId).removeClass('hidden');
        cy.getElementById(last.nodeId).connectedEdges().removeClass('hidden');
      }
      setStatus(`Undid: hide node ${last.nodeId}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redo ──────────────────────────────────────────────────────────────────
  const handleRedo = useCallback(async () => {
    const redo = redoRef.current;
    if (redo.length === 0) {
      setStatus('Nothing to redo');
      return;
    }

    const last = redo[redo.length - 1];
    redoRef.current = redo.slice(0, -1);
    historyRef.current = [...historyRef.current, last];

    if (last.type === 'add_edge') {
      const res = await axios.post(`${API}/metagraph/${last.graphId}/edge`, {
        invertex: last.invertex,
        outvertex: last.outvertex,
        label: last.edgeId
      });
      setStatus(`Redid: add edge ${res.data.edge_id}`);
      await refreshAllGraphs(graphsRef.current);
    } else if (last.type === 'hide_node') {
      if (cyUndoRef.current) {
        const cy = cyUndoRef.current;
        cy.getElementById(last.nodeId).addClass('hidden');
        cy.getElementById(last.nodeId).connectedEdges().addClass('hidden');
      }
      setStatus(`Redid: hide node ${last.nodeId}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleNodeClick = async (nodeId, nodeData) => {
    if (!nodeId || !activeGraphIdRef.current) {
      setSelectedNode(null);
      setSelectedNodeData(null);
      setNodeEdges([]);
      return;
    }
    setSelectedNode(nodeId);
    setSelectedNodeData(nodeData);
    const res = await axios.get(`${API}/metagraph/${activeGraphIdRef.current}/edges`);
    const related = res.data.edges.filter(e =>
      e.invertex.includes(nodeId) || e.outvertex.includes(nodeId)
    );
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

  const handleLoad = async (graphId, name) => {
    if (graphsRef.current.find(g => g.id === graphId)) {
      handleSetActiveGraph(graphId);
      setStatus(`Switched to: ${graphId}`);
      await refreshAllGraphs(graphsRef.current);
      return;
    }
    const color = GRAPH_COLORS[graphsRef.current.length % GRAPH_COLORS.length];
    const newGraph = { id: graphId, label: name || `Graph ${graphsRef.current.length + 1}`, color };
    const updated = [...graphsRef.current, newGraph];
    setGraphs(updated);
    handleSetActiveGraph(graphId);
    setStatus(`Loaded: ${graphId}`);
    await refreshAllGraphs(updated);
  };

  const handleAddEdge = async (invertex, outvertex, label) => {
    const res = await axios.post(`${API}/metagraph/${activeGraphIdRef.current}/edge`, {
      invertex, outvertex, label
    });
    historyRef.current = [
      ...historyRef.current,
      {
        type: 'add_edge',
        graphId: activeGraphIdRef.current,
        edgeId: res.data.edge_id,
        invertex,
        outvertex
      }
    ];
    redoRef.current = [];
    setStatus('Edge added');
    await refreshAllGraphs(graphsRef.current);
  };

  const handleHideNode = (nodeId) => {
    historyRef.current = [
      ...historyRef.current,
      { type: 'hide_node', nodeId }
    ];
    redoRef.current = [];
  };

  const handleDelete = async () => {
    const updated = graphsRef.current.filter(g => g.id !== activeGraphIdRef.current);
    setGraphs(updated);
    handleSetActiveGraph(updated.length > 0 ? updated[0].id : null);
    setStatus('Removed from view');
    setSelectedNode(null);
    setSelectedNodeData(null);
    setNodeEdges([]);
    await refreshAllGraphs(updated);
  };

  const activeGraph = graphs.find(g => g.id === activeGraphId);

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
                {editingGraphId === g.id ? (
                  <input
                    className="graph-rename-input"
                    defaultValue={g.label}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val) setGraphs(prev => prev.map(x => x.id === g.id ? { ...x, label: val } : x));
                      setEditingGraphId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') setEditingGraphId(null);
                    }}
                  />
                ) : (
                  <div className="graph-tag-label">
                    <span onDoubleClick={e => { e.stopPropagation(); setEditingGraphId(g.id); }}>
                      {g.label}
                    </span>
                    <span className="graph-id">{g.id}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <h3>Load Existing</h3>
          <select
            className="graph-select"
            defaultValue=""
            onChange={e => {
              const id = e.target.value;
              if (!id) return;
              const graph = availableGraphs.find(g => g.id === id);
              const defaultName = graph?.name || id;
              const name = window.prompt('Name for this graph:', defaultName);
              if (name === null) { e.target.value = ''; return; }
              handleLoad(id, name || defaultName);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Select a graph...</option>
            {availableGraphs.map(g => {
              const loaded = graphs.find(x => x.id === g.id);
              return <option key={g.id} value={g.id}>{loaded ? `${loaded.label} (${g.id})` : g.name}</option>;
            })}
          </select>
        </div>

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
      </div>

      <div className="graph-area">
        <div className="graph-hint">
          Right click to hide · Double click to expand/collapse · Ctrl+Z to undo · Ctrl+Y to redo
        </div>
        <GraphView
          elements={elements}
          onNodeClick={handleNodeClick}
          highlightEdges={highlightEdges}
          activeGraphId={activeGraphId}
          onHideNode={handleHideNode}
          cyRef={cyUndoRef}
        />
      </div>

      <div className="right-sidebar">
        {selectedNode ? (
          <>
            <div className="node-header">
              <div
                className="node-color-dot"
                style={{ background: activeGraph?.color || '#4F46E5' }}
              />
              <h3>{selectedNode}</h3>
            </div>
            <p className="node-meta">
              Graph: <span>{activeGraph?.label || activeGraphId}</span>
            </p>
            <p className="node-meta">
              ID: <span>{activeGraphId}</span>
            </p>

            <div className="divider" />

            <h4>Connected Edges</h4>
            {nodeEdges.length === 0 ? (
              <p className="muted">No edges found</p>
            ) : (
              (() => {
                const grouped = nodeEdges.reduce((acc, e) => {
                  const key = e.label || e.edge_id;
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {});
                return Object.entries(grouped).map(([label, count]) => (
                  <div className="edge-card" key={label}>
                    <span className="edge-label">{label}</span>
                    <p className="edge-count">× {count} connection{count > 1 ? 's' : ''}</p>
                  </div>
                ));
              })()
            )}
          </>
        ) : (
          <div className="no-selection">
            <p>Click a node to see its details</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;