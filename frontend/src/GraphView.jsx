import React, { useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

const stylesheet = [
  {
    selector: 'node[type = "element"]',
    style: {
      label: 'data(label)',
      color: '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      width: 50,
      height: 50,
      'font-size': 12,
    }
  },
  {
    selector: 'node[type = "edge"]',
    style: {
      label: 'data(label)',
      'background-color': '#0F172A',
      'border-width': 2,
      color: '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      width: 40,
      height: 40,
      'font-size': 11,
      shape: 'diamond',
    }
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'line-color': '#334155',
      'target-arrow-color': '#334155',
      width: 2,
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 3,
      'border-color': '#fff',
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#818CF8',
      'target-arrow-color': '#818CF8',
      width: 3,
    }
  },
  {
    selector: 'node.path-highlight',
    style: {
      'border-width': 3,
      'border-color': '#22C55E',
    }
  },
  {
    selector: 'edge.path-highlight',
    style: {
      'line-color': '#22C55E',
      'target-arrow-color': '#22C55E',
      width: 3,
    }
  },
  {
    selector: 'node.dimmed',
    style: { opacity: 0.3 }
  },
  {
    selector: 'edge.dimmed',
    style: { opacity: 0.3 }
  },
  {
    selector: 'node.hidden',
    style: { display: 'none' }
  },
  {
    selector: 'edge.hidden',
    style: { display: 'none' }
  },
  {
    selector: 'node.collapsed',
    style: { display: 'none' }
  },
  {
    selector: 'edge.collapsed',
    style: { display: 'none' }
  }
];

function GraphView({ elements, onNodeClick, highlightEdges, activeGraphId, onHideNode, cyRef }) {
  const internalCyRef = useRef(null);
  const collapsedRef = useRef(new Set());

  React.useEffect(() => {
    if (!internalCyRef.current || !highlightEdges) return;
    const cy = internalCyRef.current;

    cy.elements().removeClass('path-highlight dimmed');

    if (highlightEdges.length === 0) return;

    cy.elements().addClass('dimmed');

    highlightEdges.forEach(edgeLabel => {
      const edgeNode = cy.nodes().filter(n =>
        n.data('type') === 'edge' &&
        n.data('graphId') === activeGraphId &&
        (n.data('label') === edgeLabel || n.id().includes(edgeLabel))
      );

      if (edgeNode.length > 0) {
        edgeNode.removeClass('dimmed').addClass('path-highlight');
        edgeNode.connectedEdges().removeClass('dimmed').addClass('path-highlight');
        edgeNode.connectedEdges().connectedNodes().removeClass('dimmed').addClass('path-highlight');
      }
    });
  }, [highlightEdges, activeGraphId]);

  return (
    <CytoscapeComponent
      elements={elements}
      stylesheet={stylesheet}
      layout={{
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }}
      style={{ width: '100%', height: '100vh' }}
      cy={(cy) => {
        internalCyRef.current = cy;
        if (cyRef) cyRef.current = cy;

        cy.removeAllListeners();

        cy.on('add', 'node', (evt) => {
          const node = evt.target;
          if (node.data('color')) {
            node.style('background-color', node.data('color'));
          }
          if (node.data('borderColor')) {
            node.style('border-color', node.data('borderColor'));
          }
        });

        cy.on('tap', 'node[type = "element"]', (evt) => {
          const node = evt.target;
          cy.elements().removeClass('highlighted');
          node.connectedEdges().addClass('highlighted');
          node.connectedEdges().connectedNodes().addClass('highlighted');
          if (onNodeClick) onNodeClick(node.id(), node.data());
        });

        cy.on('tap', function(evt) {
          if (evt.target === cy) {
            cy.elements().removeClass('highlighted path-highlight dimmed');
            if (onNodeClick) onNodeClick(null, null);
          }
        });

        // Right click — hide node and track for undo
        cy.on('cxttap', 'node', (evt) => {
          const node = evt.target;
          const nodeId = node.id();
          node.addClass('hidden');
          node.connectedEdges().addClass('hidden');
          if (onHideNode) onHideNode(nodeId);
        });

        // Double click — expand/collapse connected nodes + restore hidden ones
        cy.on('dblclick', 'node[type = "element"]', (evt) => {
          const node = evt.target;
          const nodeId = node.id();

          const connectedEdgeNodes = node.connectedEdges().connectedNodes()
            .filter(n => n.data('type') === 'edge');

          const connectedElements = connectedEdgeNodes
            .union(connectedEdgeNodes.connectedEdges())
            .union(connectedEdgeNodes.connectedEdges().connectedNodes())
            .not(node);

          if (collapsedRef.current.has(nodeId)) {
            // Expand — show collapsed and restore hidden
            connectedElements.removeClass('collapsed');
            connectedElements.removeClass('hidden');
            node.connectedEdges().removeClass('hidden');
            collapsedRef.current.delete(nodeId);
          } else {
            // Collapse
            connectedElements.addClass('collapsed');
            collapsedRef.current.add(nodeId);
          }
        });
      }}
    />
  );
}

export default GraphView;