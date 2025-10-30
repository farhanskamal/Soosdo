import React, { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import BoardSidebar from './components/BoardSidebar';
import AIAssistant from './components/AIAssistant';
import FlowchartCanvas from './components/FlowchartCanvas';
import Toolbar from './components/Toolbar';
import TutorialOverlay from './components/TutorialOverlay';
import SettingsModal from './components/SettingsModal';
import { Board, Node, Connection, CanvasState, Action, ActionType, NodeType, BoardData } from './types';
import { HistoryManager } from './utils/historyManager';

const INITIAL_CANVAS_STATE: CanvasState = {
  zoom: 100,
  panX: 0,
  panY: 0
};

function App() {
  // Enhanced state management with board-specific data
  const [boards, setBoards] = useState<Board[]>([
    { 
      id: '1', 
      name: 'Login System', 
      isActive: true, 
      createdAt: new Date(),
      data: {
        nodes: [
          {
            id: 'node1',
            type: 'start',
            x: 100,
            y: 100,
            width: 120,
            height: 60,
            text: 'START',
            color: 'bg-green-500'
          },
          {
            id: 'node2',
            type: 'process',
            x: 300,
            y: 100,
            width: 180,
            height: 80,
            text: 'Input username\nand password',
            color: 'bg-yellow-400'
          },
          {
            id: 'node3',
            type: 'decision',
            x: 600,
            y: 100,
            width: 150,
            height: 80,
            text: 'Valid\ncredentials?',
            color: 'bg-blue-500'
          }
        ],
        connections: [],
        canvasState: { ...INITIAL_CANVAS_STATE }
      }
    },
    { 
      id: '2', 
      name: 'Movement System', 
      isActive: false, 
      createdAt: new Date(),
      data: {
        nodes: [
          {
            id: 'node4',
            type: 'start',
            x: 100,
            y: 100,
            width: 120,
            height: 60,
            text: 'START',
            color: 'bg-green-500'
          }
        ],
        connections: [],
        canvasState: { ...INITIAL_CANVAS_STATE }
      }
    },
    { 
      id: '3', 
      name: 'Combat System', 
      isActive: false, 
      createdAt: new Date(),
      data: {
        nodes: [
          {
            id: 'node5',
            type: 'start',
            x: 100,
            y: 100,
            width: 120,
            height: 60,
            text: 'START',
            color: 'bg-green-500'
          }
        ],
        connections: [],
        canvasState: { ...INITIAL_CANVAS_STATE }
      }
    },
  ]);

  const [activeBoardId, setActiveBoardId] = useState<string>('1');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'move'>('select');
  const [showTutorial, setShowTutorial] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // History management
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  // Get current board data
  const currentBoard = boards.find(b => b.id === activeBoardId)!;
  const { nodes, connections, canvasState } = currentBoard.data;

  // Enhanced history management functions
  const undo = useCallback(() => {
    setBoards(prev => {
      const result = HistoryManager.undo(prev, activeBoardId);
      setSelectedNode(result.selectedNode);
      setHistoryState({ canUndo: result.canUndo, canRedo: result.canRedo });
      return result.boards;
    });
  }, [activeBoardId]);

  const redo = useCallback(() => {
    setBoards(prev => {
      const result = HistoryManager.redo(prev, activeBoardId);
      setSelectedNode(result.selectedNode);
      setHistoryState({ canUndo: result.canUndo, canRedo: result.canRedo });
      return result.boards;
    });
  }, [activeBoardId]);

  const importBoards = useCallback((newBoards: Board[]) => {
    if (newBoards.length === 0) return;
    
    setBoards(prev => {
      // Add new boards and ensure only one is active
      const updatedNewBoards = newBoards.map(b => ({ ...b, isActive: false }));
      const allBoards = [...prev, ...updatedNewBoards];
      
      // Set first imported board as active
      return allBoards.map((b, idx) => ({
        ...b,
        isActive: b.id === updatedNewBoards[0].id
      }));
    });
    
    // Switch to first imported board
    if (newBoards.length > 0) {
      setActiveBoardId(newBoards[0].id);
      setSelectedNode(null);
    }
    
    HistoryManager.clearHistory();
    setHistoryState({ canUndo: false, canRedo: false });
  }, []);

  const handleNodeAdd = useCallback((type: NodeType, x: number, y: number) => {
    const newNode: Node = {
      id: `node${Date.now()}`,
      type,
      x,
      y,
      width: type === 'decision' ? 150 : type === 'start' ? 120 : 180,
      height: type === 'decision' ? 80 : type === 'start' ? 60 : 80,
      text: getNodeDefaultText(type),
      color: getNodeColor(type)
    };

    setBoards(prev => prev.map(board => 
      board.id === activeBoardId 
        ? { ...board, data: { ...board.data, nodes: [...board.data.nodes, newNode] } }
        : board
    ));

    HistoryManager.recordNodeAdd(newNode, activeBoardId);
    setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
  }, [activeBoardId]);

  const getNodeDefaultText = (type: NodeType): string => {
    switch (type) {
      case 'start': return 'START';
      case 'end': return 'END';
      case 'process': return 'Process';
      case 'decision': return 'Decision';
      case 'loop': return 'Loop';
      case 'variable': return 'Variable';
      default: return 'Node';
    }
  };

  const getNodeColor = (type: NodeType): string => {
    switch (type) {
      case 'start': return 'bg-green-500';
      case 'end': return 'bg-red-500';
      case 'process': return 'bg-yellow-400';
      case 'decision': return 'bg-blue-500';
      case 'loop': return 'bg-purple-500';
      case 'variable': return 'bg-orange-400';
      default: return 'bg-gray-400';
    }
  };

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<Node>) => {
    const board = boards.find(b => b.id === activeBoardId);
    const prevNode = board?.data.nodes.find(n => n.id === nodeId);
    setBoards(prev => prev.map(board => 
      board.id === activeBoardId 
        ? { 
            ...board, 
            data: { 
              ...board.data, 
              nodes: board.data.nodes.map(node => 
                node.id === nodeId ? { ...node, ...updates } : node
              )
            }
          }
        : board
    ));
    // Record non-pos updates (e.g., text changes)
    if (prevNode) {
      const nonPosKeys = Object.keys(updates).filter(k => !['x','y'].includes(k));
      if (nonPosKeys.length > 0) {
        const oldState: Partial<Node> = {};
        const newState: Partial<Node> = {};
        for (const k of nonPosKeys as (keyof Node)[]) {
          // @ts-expect-error index access by key
          oldState[k] = prevNode[k];
          // @ts-expect-error index access by key
          newState[k] = updates[k];
        }
        HistoryManager.recordNodeUpdate(nodeId, oldState, newState, activeBoardId);
        setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
      }
    }
  }, [activeBoardId, boards]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    const board = boards.find(b => b.id === activeBoardId);
    const nodeToDelete = board?.data.nodes.find(n => n.id === nodeId);
    
    setBoards(prev => prev.map(board => 
      board.id === activeBoardId 
        ? { 
            ...board, 
            data: { 
              ...board.data,
              nodes: board.data.nodes.filter(node => node.id !== nodeId),
              connections: board.data.connections.filter(
                conn => conn.fromNode !== nodeId && conn.toNode !== nodeId
              )
            }
          }
        : board
    ));
    
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
    
    if (nodeToDelete) {
      HistoryManager.recordNodeDelete(nodeId, nodeToDelete, activeBoardId);
      setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
    }
  }, [activeBoardId, selectedNode, boards]);

  const handleConnectionCreate = useCallback((fromNode: string, toNode: string, fromPoint: any, toPoint: any) => {
    const newConnection: Connection = {
      id: `conn${Date.now()}`,
      fromNode,
      toNode,
      fromPoint,
      toPoint,
      label: undefined,
      curvature: 1
    };

    setBoards(prev => prev.map(board => 
      board.id === activeBoardId 
        ? { ...board, data: { ...board.data, connections: [...board.data.connections, newConnection] } }
        : board
    ));

    HistoryManager.recordConnectionAdd(newConnection, activeBoardId);
    setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
  }, [activeBoardId]);

  const handleCanvasUpdate = useCallback((canvasUpdates: Partial<CanvasState>) => {
    setBoards(prev => {
      const prevCanvas = prev.find(b => b.id === activeBoardId)?.data.canvasState;
      const updated = prev.map(board => 
        board.id === activeBoardId 
          ? { ...board, data: { ...board.data, canvasState: { ...board.data.canvasState, ...canvasUpdates } } }
          : board
      );
      
      if (prevCanvas) {
        if (typeof canvasUpdates.panX === 'number' || typeof canvasUpdates.panY === 'number') {
          const newState = { panX: canvasUpdates.panX ?? prevCanvas.panX, panY: canvasUpdates.panY ?? prevCanvas.panY } as CanvasState;
          HistoryManager.recordCanvasMove(prevCanvas, { ...prevCanvas, ...newState }, activeBoardId);
        }
        if (typeof canvasUpdates.zoom === 'number') {
          HistoryManager.recordZoomChange(prevCanvas.zoom, canvasUpdates.zoom, activeBoardId);
        }
        setHistoryState({ canUndo: HistoryManager.getHistoryStats().canUndo, canRedo: HistoryManager.getHistoryStats().canRedo });
      }
      
      return updated;
    });
  }, [activeBoardId]);

  const handleBoardCreate = useCallback((name: string) => {
    const newBoard: Board = {
      id: `board${Date.now()}`,
      name,
      isActive: false,
      createdAt: new Date(),
      data: {
        nodes: [],
        connections: [],
        canvasState: { ...INITIAL_CANVAS_STATE }
      }
    };
    setBoards(prev => [...prev, newBoard]);
  }, []);

  const handleBoardSwitch = useCallback((boardId: string) => {
    setBoards(prev => prev.map(board => ({
      ...board,
      isActive: board.id === boardId
    })));
    setActiveBoardId(boardId);
    setSelectedNode(null);
  }, []);

  const handleBoardRename = useCallback((boardId: string, newName: string) => {
    setBoards(prev => prev.map(board => 
      board.id === boardId ? { ...board, name: newName } : board
    ));
  }, []);

  const handleBoardDelete = useCallback((boardId: string) => {
    setBoards(prev => {
      const filtered = prev.filter(b => b.id !== boardId);
      // If deleted board was active, switch to first available board
      if (activeBoardId === boardId && filtered.length > 0) {
        setActiveBoardId(filtered[0].id);
        return filtered.map(b => ({
          ...b,
          isActive: b.id === filtered[0].id
        }));
      }
      return filtered;
    });
  }, [activeBoardId]);

  const handleConnectionDelete = useCallback((connectionId: string) => {
    setBoards(prev => prev.map(board => 
      board.id === activeBoardId 
        ? { ...board, data: { ...board.data, connections: board.data.connections.filter(conn => conn.id !== connectionId) } }
        : board
    ));
    
    const connectionToDelete = boards.find(b => b.id === activeBoardId)?.data.connections.find(c => c.id === connectionId);
    
    if (connectionToDelete) {
      HistoryManager.recordConnectionDelete(connectionId, connectionToDelete, activeBoardId);
      setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
    }
  }, [activeBoardId, boards]);

  const handleToolChange = useCallback((tool: 'select' | 'move') => {
    setActiveTool(tool);
  }, []);

  // Enhanced keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      } else if (e.key === 'Delete' && selectedNode) {
        handleNodeDelete(selectedNode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, undo, redo, handleNodeDelete, boards]);

  // Update history state when boards change
  React.useEffect(() => {
    const stats = HistoryManager.getHistoryStats();
    setHistoryState({ canUndo: stats.canUndo, canRedo: stats.canRedo });
  }, [boards]);

  const activeBoard = boards.find(b => b.id === activeBoardId)!;

  return (
    <div className="h-screen w-full soodo-alice-bg font-body overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Header */}
      <Header 
        activeBoard={activeBoard}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        onBoardRename={handleBoardRename}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <BoardSidebar
          isOpen={isLeftSidebarOpen}
          boards={boards}
          onClose={() => setIsLeftSidebarOpen(false)}
          onBoardCreate={handleBoardCreate}
          onBoardSwitch={handleBoardSwitch}
          onBoardRename={handleBoardRename}
          onBoardDelete={handleBoardDelete}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <FlowchartCanvas
            nodes={nodes}
            connections={connections}
            selectedNode={selectedNode}
            canvasState={canvasState}
            onNodeAdd={handleNodeAdd}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onNodeSelect={setSelectedNode}
            onConnectionCreate={handleConnectionCreate}
            onConnectionDelete={handleConnectionDelete}
            onConnectionUpdate={(connectionId, updates) => {
              const board = boards.find(b => b.id === activeBoardId);
              const prev = board?.data.connections.find(c => c.id === connectionId);
              if (prev) {
                const oldState: Partial<Connection> = {};
                const newState: Partial<Connection> = {};
                for (const k of Object.keys(updates) as (keyof Connection)[]) {
                  // @ts-expect-error index access by key
                  oldState[k] = prev[k];
                  // @ts-expect-error index access by key
                  newState[k] = updates[k];
                }
                HistoryManager.recordConnectionUpdate(connectionId, oldState, newState, activeBoardId);
              }
              setBoards(prevBoards => prevBoards.map(board =>
                board.id === activeBoardId
                  ? {
                      ...board,
                      data: {
                        ...board.data,
                        connections: board.data.connections.map(c => c.id === connectionId ? { ...c, ...updates } : c)
                      }
                    }
                  : board
              ));
              setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
            }}
            onCanvasUpdate={handleCanvasUpdate}
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onNodeMoveEnd={(nodeId, from, to) => {
              HistoryManager.recordNodeMove(nodeId, from, to, activeBoardId);
              setHistoryState({ canUndo: true, canRedo: HistoryManager.getHistoryStats().canRedo });
            }}
          />
          
          {/* Enhanced Floating Toolbar */}
          <Toolbar 
            nodes={nodes}
            boards={boards}
            activeBoardId={activeBoardId}
            onNodeAdd={handleNodeAdd}
            onUndo={undo}
            onRedo={redo}
            onCanvasUpdate={handleCanvasUpdate}
            onImportBoards={importBoards}
            canvasState={canvasState}
            canUndo={historyState.canUndo}
            canRedo={historyState.canRedo}
            selectedNode={selectedNode}
            onDeleteSelected={() => selectedNode && handleNodeDelete(selectedNode)}
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />
        </div>

        {/* Right Sidebar - AI Assistant */}
        <AIAssistant
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
          nodes={nodes}
          connections={connections}
          boardName={activeBoard.name}
        />
      </div>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isVisible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;