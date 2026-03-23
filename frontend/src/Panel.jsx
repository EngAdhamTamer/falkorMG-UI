import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

function Panel({ graphId, onCreate, onAddEdge, onDelete, onRefresh, onLoad, onHighlightPath }) {
  const [genSet, setGenSet] = useState('');
  const [loadId, setLoadId] = useState('');
  const [invertex, setInvertex] = useState('');
  const [outvertex, setOutvertex] = useState('');
  const [label, setLabel] = useState('');
  const [metaSource, setMetaSource] = useState('');
  const [metaTarget, setMetaTarget] = useState('');
  const [metapaths, setMetapaths] = useState([]);
  const [adjacency, setAdjacency] = useState(null);
  const [closure, setClosure] = useState(null);
  const [showAdjacency, setShowAdjacency] = useState(false);
  const [showClosure, setShowClosure] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);

  const handleCreate = () => {
    const items = genSet.split(',').map(s => s.trim()).filter(Boolean);
    onCreate(items);
    setGenSet('');
  };

  const handleLoad = () => {
    if (loadId.trim()) {
      onLoad(loadId.trim());
      setLoadId('');
    }
  };

  const handleAddEdge = () => {
    const inv = invertex.split(',').map(s => s.trim()).filter(Boolean);
    const out = outvertex.split(',').map(s => s.trim()).filter(Boolean);
    onAddEdge(inv, out, label || null);
    setInvertex('');
    setOutvertex('');
    setLabel('');
  };

  const handleMetapaths = async () => {
    const source = metaSource.split(',').map(s => s.trim()).filter(Boolean);
    const target = metaTarget.split(',').map(s => s.trim()).filter(Boolean);
    const res = await axios.post(`${API}/metagraph/${graphId}/metapaths`, { source, target });
    setMetapaths(res.data.metapaths);
    setSelectedPath(null);
  };

  const handleSelectPath = (path, index) => {
    setSelectedPath(index);
    if (onHighlightPath) onHighlightPath(path.edges);
  };

  const handleAdjacency = async () => {
    const res = await axios.get(`${API}/metagraph/${graphId}/adjacency`);
    setAdjacency(res.data);
    setShowAdjacency(true);
    setShowClosure(false);
  };

  const handleClosure = async () => {
    const res = await axios.get(`${API}/metagraph/${graphId}/closure`);
    setClosure(res.data);
    setShowClosure(true);
    setShowAdjacency(false);
  };

  return (
    <div className="panel">
      <div className="section">
        <h3>Create Metagraph</h3>
        <input
          placeholder="Generator set (comma separated)"
          value={genSet}
          onChange={e => setGenSet(e.target.value)}
        />
        <button onClick={handleCreate}>Create</button>
      </div>

      <div className="section">
        <h3>Load Existing</h3>
        <input
          placeholder="Metagraph ID"
          value={loadId}
          onChange={e => setLoadId(e.target.value)}
        />
        <button onClick={handleLoad}>Load</button>
      </div>

      {graphId && (
        <>
          <div className="section">
            <h3>Add Edge</h3>
            <input
              placeholder="Invertex (comma separated)"
              value={invertex}
              onChange={e => setInvertex(e.target.value)}
            />
            <input
              placeholder="Outvertex (comma separated)"
              value={outvertex}
              onChange={e => setOutvertex(e.target.value)}
            />
            <input
              placeholder="Label (optional)"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            <button onClick={handleAddEdge}>Add Edge</button>
          </div>

          <div className="section">
            <h3>Metapaths</h3>
            <input
              placeholder="Source (comma separated)"
              value={metaSource}
              onChange={e => setMetaSource(e.target.value)}
            />
            <input
              placeholder="Target (comma separated)"
              value={metaTarget}
              onChange={e => setMetaTarget(e.target.value)}
            />
            <button onClick={handleMetapaths}>Find Metapaths</button>
            {metapaths.length > 0 && (
              <div className="results">
                <p className="result-title">{metapaths.length} path(s) found</p>
                {metapaths.map((p, i) => (
                  <div
                    className={`edge-card clickable ${selectedPath === i ? 'selected-path' : ''}`}
                    key={i}
                    onClick={() => handleSelectPath(p, i)}
                  >
                    <span className="edge-label">Path {i + 1}</span>
                    <p>{p.edges.join(' → ')}</p>
                  </div>
                ))}
              </div>
            )}
            {metapaths.length === 0 && metaSource && metaTarget && (
              <p className="muted">No paths found</p>
            )}
          </div>

          <div className="section">
            <h3>Operations</h3>
            <button onClick={handleAdjacency}>Adjacency Matrix</button>
            <button onClick={handleClosure}>Closure Matrix</button>
          </div>

          {showAdjacency && adjacency && (
            <div className="matrix-section">
              <p className="result-title">Adjacency Matrix</p>
              <div className="matrix-scroll">
                <table className="matrix">
                  <thead>
                    <tr>
                      <th></th>
                      {adjacency.elements.map(el => <th key={el}>{el}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {adjacency.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="row-label">{adjacency.elements[i]}</td>
                        {row.map((cell, j) => (
                          <td key={j} className={cell ? 'cell-one' : 'cell-zero'}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showClosure && closure && (
            <div className="matrix-section">
              <p className="result-title">Closure Matrix</p>
              <div className="matrix-scroll">
                <table className="matrix">
                  <thead>
                    <tr>
                      <th></th>
                      {closure.elements.map(el => <th key={el}>{el}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {closure.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="row-label">{closure.elements[i]}</td>
                        {row.map((cell, j) => (
                          <td key={j} className={cell ? 'cell-one' : 'cell-zero'}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="section">
            <button onClick={onRefresh}>Refresh Graph</button>
            <button className="danger" onClick={onDelete}>Delete Metagraph</button>
          </div>
        </>
      )}
    </div>
  );
}

export default Panel;