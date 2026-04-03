import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://100.103.196.14:8001';

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

  // NLP state
  const [nlpText, setNlpText] = useState('');
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpError, setNlpError] = useState('');

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

  const handleNlpAnalyze = async () => {
    if (!nlpText.trim()) return;
    setNlpLoading(true);
    setNlpError('');
    setNlpResult(null);
    try {
      const res = await axios.post(`${API}/nlp/analyze`, { text: nlpText });
      setNlpResult(res.data);
    } catch (err) {
      setNlpError('Analysis failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setNlpLoading(false);
    }
  };

  const POS_COLORS = {
    NOUN: '#4F46E5',
    VERB: '#059669',
    ADJ: '#D97706',
    ADV: '#7C3AED',
    PROPN: '#0891B2',
    NUM: '#DC2626',
    PUNCT: '#475569',
  };

  const getPosColor = (pos) => POS_COLORS[pos] || '#334155';

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
            <button className="danger" onClick={onDelete}>Remove from View</button>
          </div>
        </>
      )}

      {/* NLP Section */}
      <div className="section">
        <h3>NLP Pipeline</h3>
        <textarea
          className="nlp-input"
          placeholder="Type a sentence to analyze..."
          value={nlpText}
          onChange={e => setNlpText(e.target.value)}
          rows={3}
        />
        <button onClick={handleNlpAnalyze} disabled={nlpLoading}>
          {nlpLoading ? 'Analyzing...' : 'Analyze'}
        </button>

        {nlpError && <p className="nlp-error">{nlpError}</p>}

        {nlpResult && (
          <div className="nlp-results">

            {/* Tokens + POS */}
            {nlpResult.tokens && (
              <div className="nlp-card">
                <p className="result-title">Tokens & POS Tags</p>
                <div className="nlp-tokens">
                  {nlpResult.tokens.filter(tok => tok.pos !== 'SPACE').map((tok, i) => (
                    <div key={i} className="nlp-token">
                      <span className="nlp-token-text">{tok.text}</span>
                      <span
                        className="nlp-token-pos"
                        style={{ background: getPosColor(tok.pos) }}
                      >
                        {tok.pos}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lemmas */}
            {nlpResult.tokens && (
              <div className="nlp-card">
                <p className="result-title">Lemmas</p>
                <div className="nlp-tokens">
                  {nlpResult.tokens.filter(tok => tok.pos !== 'SPACE').map((tok, i) => (
                    tok.lemma !== tok.text.toLowerCase() ? (
                      <div key={i} className="nlp-token">
                        <span className="nlp-token-text">{tok.text}</span>
                        <span className="nlp-token-lemma">→ {tok.lemma}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {/* Named Entities */}
            {nlpResult.entities && nlpResult.entities.length > 0 && (
              <div className="nlp-card">
                <p className="result-title">Named Entities</p>
                {nlpResult.entities.map((ent, i) => (
                  <div key={i} className="nlp-entity">
                    <span className="nlp-entity-text">{ent.text}</span>
                    <span className="nlp-entity-label">{ent.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sentences */}
            {nlpResult.sentences && nlpResult.sentences.length > 1 && (
              <div className="nlp-card">
                <p className="result-title">Sentences ({nlpResult.sentences.length})</p>
                {nlpResult.sentences.map((s, i) => (
                  <p key={i} className="nlp-sentence">{i + 1}. {s}</p>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}

export default Panel;