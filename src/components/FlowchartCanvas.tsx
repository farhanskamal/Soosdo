import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Node, Connection, CanvasState, NodeType } from '../types';
import { validateNode, validateConnection, withErrorHandling } from '../utils/validation';
import { 
  calculateConnectorPath, 
  getConnectionPorts, 
  createConnection, 
  canCreateConnection,
  getConnectionPoint,
  getNodeAtPosition,
  isPointInNode,
  validateConnectionForRendering
} from '../utils/connectors';

interface FlowchartCanvasProps {
  nodes: Node[];
  connections: Connection[];
  selectedNode: string | null;
  canvasState: CanvasState;
  onNodeAdd: (type: NodeType, x: number, y: number) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onConnectionCreate: (fromNode: string, toNode: string, fromPoint: any, toPoint: any) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<Connection>) => void;
  onCanvasUpdate: (updates: Partial<CanvasState>) => void;
  activeTool: 'select' | 'move';
  onToolChange: (tool: 'select' | 'move') => void;
  onNodeMoveEnd: (nodeId: string, from: { x: number; y: number }, to: { x: number; y: number }) => void;
}

const FlowchartCanvas = ({
  nodes,
  connections,
  selectedNode,
  canvasState,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  onNodeSelect,
  onConnectionCreate,
  onConnectionDelete,
  onCanvasUpdate,
  activeTool,
  onToolChange,
  onNodeMoveEnd,
  onConnectionUpdate
}: FlowchartCanvasProps) => {
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [connecting, setConnecting] = useState<{ fromNode: string; startPoint: { x: number; y: number } } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [connectionTarget, setConnectionTarget] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [editingConnection, setEditingConnection] = useState<{ id: string; text: string } | null>(null);
  const [reconnecting, setReconnecting] = useState<{ connectionId: string; fromNode: string } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Enhanced keyboard handlers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        if (selectedNode) {
          onNodeDelete(selectedNode);
        } else if (hoveredConnection) {
          onConnectionDelete(hoveredConnection);
          setHoveredConnection(null);
        }
      }
      if (e.key === 'Escape') {
        setConnecting(null);
        setIsPanning(false);
        setIsDraggingCanvas(false);
        onNodeSelect(null);
        setHoveredConnection(null);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.max(50, Math.min(200, canvasState.zoom + delta));
      onCanvasUpdate({ zoom: newZoom });
    };

    window.addEventListener('keydown', handleKeyPress);
    canvasRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      canvasRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [selectedNode, hoveredConnection, onNodeDelete, onConnectionDelete, canvasState.zoom, onCanvasUpdate]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedNode(nodeId);
    onNodeSelect(nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Start panning with middle mouse, space+drag, or move tool
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey)) || activeTool === 'move') {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasState.panX, y: e.clientY - canvasState.panY });
      return;
    }

    onNodeSelect(null);
    
    // Add node on shift+click or right-click
    if (e.shiftKey || e.button === 2) {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - canvasState.panX) / (canvasState.zoom / 100);
        const y = (e.clientY - rect.top - canvasState.panY) / (canvasState.zoom / 100);
        
        // Cycle through node types for variety
        const nodeTypes: NodeType[] = ['start', 'end', 'process', 'decision', 'loop', 'variable'];
        const currentType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        onNodeAdd(currentType, x, y);
      }
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning || (activeTool === 'move' && e.buttons === 1)) {
      if (canvasRef.current) {
        const newPanX = e.clientX - panStart.x;
        const newPanY = e.clientY - panStart.y;
        onCanvasUpdate({ panX: newPanX, panY: newPanY });
      }
      return;
    }

    if (draggedNode && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = ((e.clientX - canvasRect.left - canvasState.panX) / (canvasState.zoom / 100)) - dragOffset.x;
      const newY = ((e.clientY - canvasRect.top - canvasState.panY) / (canvasState.zoom / 100)) - dragOffset.y;

      // Snap to grid for better alignment
      const gridSize = 10;
      const snappedX = Math.max(0, Math.round(newX / gridSize) * gridSize);
      const snappedY = Math.max(0, Math.round(newY / gridSize) * gridSize);

      onNodeUpdate(draggedNode, {
        x: snappedX,
        y: snappedY
      });
    }

    if (connecting && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - canvasRect.left - canvasState.panX) / (canvasState.zoom / 100),
        y: (e.clientY - canvasRect.top - canvasState.panY) / (canvasState.zoom / 100)
      });
    }
  }, [isPanning, panStart, draggedNode, dragOffset, canvasState, onCanvasUpdate, onNodeUpdate, connecting, activeTool]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode && dragStartPos) {
      const node = nodes.find(n => n.id === draggedNode);
      if (node) {
        const to = { x: node.x, y: node.y };
        if (to.x !== dragStartPos.x || to.y !== dragStartPos.y) {
          onNodeMoveEnd(draggedNode, dragStartPos, to);
        }
      }
    }
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setConnecting(null);
    setReconnecting(null);
    setIsPanning(false);
    setIsDraggingCanvas(false);
  }, [draggedNode, dragStartPos, nodes, onNodeMoveEnd]);

  const handleNodeDoubleClick = (nodeId: string, currentText: string) => {
    setEditingNode(nodeId);
    setEditingText(currentText);
  };

  const handleTextSave = () => {
    if (editingNode) {
      onNodeUpdate(editingNode, { text: editingText });
    }
    setEditingNode(null);
    setEditingText('');
  };

  const handleNodeConnection = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const validatedNode = validateNode(node);
      const ports = getConnectionPorts(validatedNode);
      
      setConnecting({
        fromNode: nodeId,
        startPoint: {
          x: ports.output.x,
          y: ports.output.y
        }
      });
    } catch (error) {
      console.warn('Error starting node connection:', error);
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    // If right-click or meta/ctrl, start connection
    if (e.button === 2 || e.ctrlKey || e.metaKey) {
      handleNodeConnection(nodeId, e);
      return;
    }
    
    // Otherwise, start dragging
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDragStartPos({ x: node.x, y: node.y });
    }
    handleMouseDown(e, nodeId);
  };

  const handleNodeConnectionStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const validatedNode = validateNode(node);
      const ports = getConnectionPorts(validatedNode);
      
      setConnecting({
        fromNode: nodeId,
        startPoint: {
          x: ports.output.x,
          y: ports.output.y
        }
      });
      setConnectionTarget(null);
    } catch (error) {
      console.warn('Error starting node connection:', error);
    }
  };

  const handleNodeConnectionEnd = (targetNodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!connecting) return;
      if (connecting.fromNode === targetNodeId) {
        // ignore self-connection attempts
        setConnecting(null);
        setConnectionTarget(null);
        return;
      }
      if (connecting && connecting.fromNode !== targetNodeId) {
        // Create the connection with improved validation
        const fromNode = nodes.find(n => n.id === connecting.fromNode);
        const targetNode = nodes.find(n => n.id === targetNodeId);
        
        if (fromNode && targetNode) {
          const validation = canCreateConnection(fromNode, targetNode, connections);
          
          if (validation.canCreate) {
            const newConnection = createConnection(
              fromNode,
              targetNode,
              connections,
              connecting.startPoint
            );
            
            if (newConnection) {
              onConnectionCreate(
                newConnection.fromNode,
                newConnection.toNode,
                newConnection.fromPoint,
                newConnection.toPoint
              );
            }
          } else {
            console.warn('Cannot create connection:', validation.reason);
          }
        }
      }
      setConnecting(null);
      setConnectionTarget(null);
    } catch (error) {
      console.warn('Error ending node connection:', error);
      setConnecting(null);
      setConnectionTarget(null);
    }
  };

  const handleNodeHover = (nodeId: string, isHovering: boolean) => {
    if (connecting && nodeId !== connecting.fromNode) {
      setConnectionTarget(isHovering ? nodeId : null);
    }
  };

  const getNodeShape = (node: Node) => {
    const baseClasses = `absolute cursor-move border-2 border-gray-300 ${node.color} flex items-center justify-center text-center px-2 shadow-lg`;
    
    switch (node.type) {
      case 'start':
        return `${baseClasses} rounded-full`;
      case 'end':
        return `${baseClasses} rounded-full border-red-600`;
      case 'process':
        return `${baseClasses} rounded-lg`;
      case 'decision':
        return `${baseClasses} rotate-45`;
      case 'loop':
        return `${baseClasses} rounded-lg border-dashed`;
      case 'variable':
        return `${baseClasses} rounded-lg border-2 border-orange-600`;
      default:
        return `${baseClasses} rounded`;
    }
  };

  const getNodeDefaultDimensions = (type: NodeType) => {
    switch (type) {
      case 'start':
      case 'end':
        return { width: 120, height: 60 };
      case 'decision':
        return { width: 150, height: 80 };
      case 'loop':
        return { width: 180, height: 100 };
      case 'variable':
        return { width: 140, height: 70 };
      case 'process':
      default:
        return { width: 180, height: 80 };
    }
  };

  const renderConnection = (connection: Connection) => {
    try {
      // Validate connection for rendering
      const validatedConnection = validateConnectionForRendering(connection, nodes);
      if (!validatedConnection) return null;
      
      const fromNode = nodes.find(n => n.id === validatedConnection.fromNode);
      const toNode = nodes.find(n => n.id === validatedConnection.toNode);
      
      if (!fromNode || !toNode) return null;
      
      // Calculate connector path based on LIVE node positions (ignore cached from/to points)
      const path = calculateConnectorPath(fromNode, toNode);
      
      // Calculate ports and midpoint for label/handles
      const fromPorts = getConnectionPorts(fromNode);
      const toPorts = getConnectionPorts(toNode);
      const midX = (fromPorts.output.x + toPorts.input.x) / 2;
      const midY = (fromPorts.output.y + toPorts.input.y) / 2;

      const isHovered = hoveredConnection === validatedConnection.id;

      return (
        <g key={validatedConnection.id}>
          <path
            d={path}
            stroke="#64748b"
            strokeWidth={isHovered ? "3" : "2"}
            fill="none"
            markerEnd="url(#arrowhead)"
            className="cursor-pointer transition-all duration-200"
            onMouseEnter={() => setHoveredConnection(validatedConnection.id)}
            onMouseLeave={() => setHoveredConnection(null)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingConnection({ id: validatedConnection.id, text: validatedConnection.label || '' });
            }}
          />

          {/* Label */}
          {validatedConnection.label && !editingConnection && (
            <text x={midX} y={midY - 8} textAnchor="middle" className="fill-gray-700 text-[12px] select-none">
              {validatedConnection.label}
            </text>
          )}

          {/* Label editor */}
          {editingConnection?.id === validatedConnection.id && (
            <foreignObject x={midX - 80} y={midY - 18} width="160" height="36">
              <div className="bg-white border border-gray-300 rounded px-2 py-1 shadow">
                <input
                  className="w-full text-xs outline-none"
                  value={editingConnection.text}
                  onChange={(e) => setEditingConnection({ id: validatedConnection.id, text: e.target.value })}
                  onBlur={() => {
                    onConnectionUpdate(validatedConnection.id, { label: editingConnection.text });
                    setEditingConnection(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onConnectionUpdate(validatedConnection.id, { label: editingConnection.text });
                      setEditingConnection(null);
                    } else if (e.key === 'Escape') {
                      setEditingConnection(null);
                    }
                  }}
                  autoFocus
                />
              </div>
            </foreignObject>
          )}

          {/* Reconnect handle at target */}
          {isHovered && (
            <circle
              cx={toPorts.input.x}
              cy={toPorts.input.y}
              r="6"
              fill="#F9DF74"
              stroke="#334155"
              className="cursor-crosshair"
              onMouseDown={(e) => {
                e.stopPropagation();
                setReconnecting({ connectionId: validatedConnection.id, fromNode: validatedConnection.fromNode });
              }}
            />
          )}

          {/* Delete button on hover */}
          {isHovered && (
            <foreignObject x={midX - 12} y={midY + 8} width="24" height="24">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionDelete(validatedConnection.id);
                  setHoveredConnection(null);
                }}
                className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md border border-white"
                title="Delete connector (X)"
              >
                <X size={14} />
              </button>
            </foreignObject>
          )}
        </g>
      );
    } catch (error) {
      console.warn('Error rendering connection:', error, connection);
      return null;
    }
  };

  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ 
        backgroundColor: '#EDF7FD', 
        cursor: (isPanning || activeTool === 'move') ? 'grab' : 'default' 
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === ' ' && e.type === 'keydown') {
          onToolChange('move');
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ') {
          onToolChange('select');
        }
      }}
    >
      {/* Enhanced Endless Dotted Pattern Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          backgroundRepeat: 'repeat',
          transform: `translate(${canvasState.panX}px, ${canvasState.panY}px)`
        }}
      />

      {/* SVG for connections */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{
          transform: `scale(${canvasState.zoom / 100}) translate(${canvasState.panX * (canvasState.zoom / 100)}px, ${canvasState.panY * (canvasState.zoom / 100)}px)`,
          transformOrigin: '0 0'
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#64748b"
            />
          </marker>
        </defs>
        {connections.map(renderConnection)}
        
        {/* Active connection preview */}
        {connecting && (() => {
          try {
            const fromNode = nodes.find(n => n.id === connecting.fromNode);
            if (!fromNode) return null;
            
            const tempNode = { ...fromNode, x: mousePosition.x, y: mousePosition.y } as Node;
            const path = calculateConnectorPath(fromNode, tempNode);
            
            return (
              <path
                d={path}
                stroke="#E2711D"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead)"
                className="pointer-events-none"
              />
            );
          } catch (error) {
            console.warn('Error rendering connection preview:', error);
            return null;
          }
        })()}

        {/* Reconnection preview */}
        {reconnecting && (() => {
          try {
            const fromNode = nodes.find(n => n.id === reconnecting.fromNode);
            if (!fromNode) return null;
            const tempNode = { ...fromNode, x: mousePosition.x, y: mousePosition.y } as Node;
            const path = calculateConnectorPath(fromNode, tempNode);
            return (
              <path
                d={path}
                stroke="#22c55e"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead)"
                className="pointer-events-none"
              />
            );
          } catch (error) {
            console.warn('Error rendering reconnection preview:', error);
            return null;
          }
        })()}
      </svg>

      {/* Enhanced Nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          className={`
            ${getNodeShape(node)}
            ${selectedNode === node.id ? 'ring-4 ring-soodo-cocoa-brown ring-opacity-75 shadow-xl transform scale-105' : 'hover:shadow-xl hover:scale-102'}
            ${draggedNode === node.id ? 'z-30 ring-2 ring-blue-400 ring-opacity-75 scale-110' : 'z-20'}
            ${connecting?.fromNode === node.id ? 'ring-4 ring-green-400 ring-opacity-75' : ''}
            transition-all duration-200 ease-in-out transform-gpu
          `}
          style={{
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
            transform: `scale(${canvasState.zoom / 100}) translate(${canvasState.panX * (canvasState.zoom / 100)}px, ${canvasState.panY * (canvasState.zoom / 100)}px)`,
            transformOrigin: 'center',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
          onDoubleClick={() => handleNodeDoubleClick(node.id, node.text)}
>
          {/* When connecting or reconnecting, allow dropping anywhere on target node */}
          {(connecting || reconnecting) && (
            <div
              className="absolute inset-0"
              onMouseUp={(e) => {
                if (connecting) handleNodeConnectionEnd(node.id, e);
                if (reconnecting) {
                  // Rewire existing connection
                  const conn = connections.find(c => c.id === reconnecting.connectionId);
                  if (conn && conn.fromNode !== node.id) {
                    onConnectionUpdate(conn.id, { toNode: node.id });
                  }
                  setReconnecting(null);
                }
              }}
            />
          )}
          {editingNode === node.id ? (
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={handleTextSave}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSave();
                }
              }}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-center p-1"
              autoFocus
            />
          ) : (
            <span className={`
              text-sm font-medium text-center
              ${node.type === 'decision' ? 'transform -rotate-45' : ''}
              whitespace-pre-line
            `}>
              {node.text}
            </span>
          )}
          
          {/* Enhanced Connection Points */}
          <div 
            className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-soodo-cocoa-brown rounded-full opacity-0 hover:opacity-100 transition-all duration-200 cursor-crosshair border-2 border-white shadow-md z-30 animate-pulse"
            onMouseDown={(e) => handleNodeConnectionStart(node.id, e)}
            title="Drag to create connection"
          />
          {node.type !== 'start' && (
            <div 
              className={`absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-200 cursor-crosshair border-white shadow-md z-30 ${
                connectionTarget === node.id ? 'bg-green-500 opacity-100 scale-110' : 'bg-gray-400 hover:bg-gray-600 opacity-60'
              }`}
              onMouseUp={(e) => handleNodeConnectionEnd(node.id, e)}
              onMouseEnter={() => handleNodeHover(node.id, true)}
              onMouseLeave={() => handleNodeHover(node.id, false)}
              title="Drop to create connection"
            />
          )}
        </div>
      ))}

      {/* Enhanced Instructions */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 p-4 rounded-lg shadow-lg text-sm text-gray-700 border border-gray-200">
        <div className="space-y-2">
          <div className="font-semibold text-soodo-oxford-blue mb-2">Canvas Controls</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><strong>Shift+Click:</strong> Add node</div>
            <div><strong>Middle Mouse:</strong> Pan canvas</div>
            <div><strong>Ctrl+Drag:</strong> Pan canvas</div>
            <div><strong>Scroll:</strong> Zoom in/out</div>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><strong>Drag:</strong> Move nodes</div>
              <div><strong>Double-click:</strong> Edit text</div>
              <div><strong>Delete:</strong> Remove node</div>
              <div><strong>Right Drag:</strong> Connect</div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><strong>Hover Connector:</strong> See options</div>
              <div><strong>Delete (Hovered):</strong> Remove connector</div>
              <div><strong>Double-click:</strong> Edit label</div>
              <div><strong>Hover Icon:</strong> Reconnect</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            <div>Zoom: {canvasState.zoom}% | Pan: ({Math.round(canvasState.panX)}, {Math.round(canvasState.panY)})</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowchartCanvas;