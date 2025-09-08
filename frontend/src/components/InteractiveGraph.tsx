'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Node {
  id: string;
  label: string;
  type: string;
  description?: string;
  size: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  type: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface InteractiveGraphProps {
  data: GraphData;
  width?: number;
  height?: number;
}

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({ 
  data, 
  width = 800, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<Node | null>(null);

  // Initialize positions and simulation
  useEffect(() => {
    if (!data || !data.nodes) return;

    // Initialize node positions using force-directed layout simulation
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35; // Increased radius for more spacing

    const initializedNodes = data.nodes.map((node, index) => {
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      // Add some random offset to prevent perfect circle alignment
      const randomOffset = (Math.random() - 0.5) * 40;
      return {
        ...node,
        x: centerX + Math.cos(angle) * (radius + randomOffset),
        y: centerY + Math.sin(angle) * (radius + randomOffset),
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initializedNodes);
    setEdges(data.edges || []);

    // Simple force simulation
    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        
        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          const node = newNodes[i];
          if (!node.x || !node.y) continue;

          let fx = 0, fy = 0;

          // Repulsion from other nodes
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            const other = newNodes[j];
            if (!other.x || !other.y) continue;

            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = 120; // Increased minimum distance to prevent overlap
            
            if (distance > 0 && distance < minDistance) {
              const force = 500 / (distance * distance);
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }

          // Attraction to connected nodes
          data.edges?.forEach(edge => {
            let connectedNode = null;
            if (edge.from === node.id) {
              connectedNode = newNodes.find(n => n.id === edge.to);
            } else if (edge.to === node.id) {
              connectedNode = newNodes.find(n => n.id === edge.from);
            }

            if (connectedNode && connectedNode.x && connectedNode.y && node.x && node.y) {
              const dx = connectedNode.x - node.x;
              const dy = connectedNode.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 100) {
                const force = 0.1;
                fx += (dx / distance) * force;
                fy += (dy / distance) * force;
              }
            }
          });

          // Center attraction
          const centerDx = centerX - node.x;
          const centerDy = centerY - node.y;
          fx += centerDx * 0.01;
          fy += centerDy * 0.01;

          // Update velocity and position
          node.vx = (node.vx || 0) * 0.8 + fx * 0.1;
          node.vy = (node.vy || 0) * 0.8 + fy * 0.1;
          
          node.x = (node.x || 0) + (node.vx || 0);
          node.y = (node.y || 0) + (node.vy || 0);

          // Keep nodes within bounds
          node.x = Math.max(50, Math.min(width - 50, node.x || 0));
          node.y = Math.max(50, Math.min(height - 50, node.y || 0));
        }

        return newNodes;
      });
    };

    // Run simulation
    const interval = setInterval(simulate, 50);
    setTimeout(() => clearInterval(interval), 3000); // Stop after 3 seconds

    return () => clearInterval(interval);
  }, [data, width, height]);

  const getNodeColor = (node: Node) => {
    switch (node.type) {
      case 'central': return '#f97316'; // orange-500
      case 'key': return '#3b82f6'; // blue-500
      case 'support': return '#10b981'; // emerald-500
      case 'application': return '#8b5cf6'; // violet-500
      case 'bridge': return '#f59e0b'; // amber-500
      default: return '#6b7280'; // gray-500
    }
  };

  const getNodeSize = (node: Node) => {
    switch (node.size) {
      case 'large': return 35;
      case 'medium': return 28;
      case 'small': return 22;
      default: return 25;
    }
  };

  const handleMouseDown = (node: Node, event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    setDragNode(node);
    setSelectedNode(node);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !dragNode) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === dragNode.id
          ? { ...node, x, y, vx: 0, vy: 0 }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragNode(null);
  };

  return (
    <div className="interactive-graph relative bg-white rounded-lg border border-gray-200">
      <div className="absolute top-4 left-4 z-10">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Interactive Concept Graph</h4>
        <p className="text-sm text-gray-600">Click and drag nodes to explore relationships</p>
      </div>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Define gradients and patterns */}
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#00000020"/>
          </filter>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
        </defs>

        {/* Render edges */}
        {edges.map((edge, index) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          
          if (!fromNode || !toNode || !fromNode.x || !fromNode.y || !toNode.x || !toNode.y) {
            return null;
          }

          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const unitX = dx / length;
          const unitY = dy / length;
          
          const fromRadius = getNodeSize(fromNode);
          const toRadius = getNodeSize(toNode);
          
          const startX = fromNode.x + unitX * fromRadius;
          const startY = fromNode.y + unitY * fromRadius;
          const endX = toNode.x - unitX * toRadius;
          const endY = toNode.y - unitY * toRadius;

          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="url(#edgeGradient)"
                strokeWidth={edge.type === 'primary' ? 3 : 2}
                strokeDasharray={edge.type === 'cross_link' ? '5,5' : 'none'}
                opacity={0.7}
              />
              
              {/* Edge label - positioned with background */}
              {edge.label && length > 80 && (
                <g>
                  <rect
                    x={(startX + endX) / 2 - (edge.label.length * 3)}
                    y={(startY + endY) / 2 - 8}
                    width={edge.label.length * 6}
                    height={16}
                    fill="white"
                    fillOpacity="0.9"
                    rx="8"
                    stroke="gray"
                    strokeWidth="0.5"
                  />
                  <text
                    x={(startX + endX) / 2}
                    y={(startY + endY) / 2}
                    textAnchor="middle"
                    className="edge-label fill-gray-700 pointer-events-none font-medium"
                    dy="3"
                    style={{ fontSize: '10px' }}
                  >
                    {edge.label.length > 8 ? `${edge.label.substring(0, 6)}...` : edge.label}
                  </text>
                </g>
              )}
              
              {/* Arrow */}
              <polygon
                points={`${endX},${endY} ${endX - 8 * unitX + 3 * unitY},${endY - 8 * unitY - 3 * unitX} ${endX - 8 * unitX - 3 * unitY},${endY - 8 * unitY + 3 * unitX}`}
                fill="#9ca3af"
                opacity={0.7}
              />
            </g>
          );
        })}

        {/* Render nodes */}
        {nodes.map((node) => {
          if (!node.x || !node.y) return null;
          
          const radius = getNodeSize(node);
          const color = getNodeColor(node);
          const isSelected = selectedNode?.id === node.id;

          return (
            <g key={node.id}>
              {/* Node background */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + (isSelected ? 4 : 0)}
                fill={color}
                opacity={0.9}
                filter="url(#shadow)"
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(node, e)}
                stroke={isSelected ? '#1f2937' : 'white'}
                strokeWidth={isSelected ? 3 : 2}
              />
              
              {/* Node label - positioned below the node */}
              <text
                x={node.x}
                y={node.y + radius + 16}
                textAnchor="middle"
                className="node-label fill-gray-800 pointer-events-none select-none font-medium"
                style={{ fontSize: '12px' }}
              >
                {node.label.length > 15 ? `${node.label.substring(0, 13)}...` : node.label}
              </text>
              
              {/* Node type indicator inside the circle */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                className="fill-white pointer-events-none select-none font-bold"
                dy="0.3em"
                style={{ fontSize: '10px' }}
              >
                {node.type === 'central' ? 'C' : 
                 node.type === 'key' ? 'K' : 
                 node.type === 'support' ? 'S' : 
                 node.type === 'application' ? 'A' : '•'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Node details panel */}
      {selectedNode && (
        <div className="node-details-panel absolute top-4 right-4 rounded-lg p-4 max-w-xs z-10">
          <div className="flex items-center mb-2">
            <div 
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: getNodeColor(selectedNode) }}
            ></div>
            <h5 className="font-semibold text-gray-900">{selectedNode.label}</h5>
          </div>
          {selectedNode.description && (
            <p className="text-sm text-gray-600 mb-2">{selectedNode.description}</p>
          )}
          <div className="text-xs text-gray-500">
            Type: <span className="font-medium">{selectedNode.type}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="graph-legend absolute bottom-4 left-4 rounded-lg p-3">
        <h6 className="text-sm font-semibold text-gray-800 mb-2">Legend</h6>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
            <span>Central Concept</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Key Concept</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
            <span>Supporting Detail</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-violet-500 mr-2"></div>
            <span>Application</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveGraph;
