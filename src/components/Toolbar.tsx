import { Play, Trash2, Undo, Redo, ZoomIn, ZoomOut, Upload, Download, Users, Hand, Plus, Circle, Square, Diamond, RotateCcw, Variable, Save, FolderOpen } from 'lucide-react';
import React, { useState } from 'react';
import { Node, NodeType, CanvasState, Board } from '../types';
import { FileOperations } from '../utils/fileOperations';

interface ToolbarProps {
  nodes: Node[];
  boards: Board[];
  activeBoardId: string;
  onNodeAdd: (type: NodeType, x: number, y: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCanvasUpdate: (updates: Partial<CanvasState>) => void;
  onImportBoards: (boards: Board[]) => void;
  canvasState: CanvasState;
  canUndo: boolean;
  canRedo: boolean;
  selectedNode: string | null;
  onDeleteSelected: () => void;
  activeTool: 'select' | 'move';
  onToolChange: (tool: 'select' | 'move') => void;
}

const Toolbar = ({
  nodes,
  boards,
  activeBoardId,
  onNodeAdd,
  onUndo,
  onRedo,
  onCanvasUpdate,
  onImportBoards,
  canvasState,
  canUndo,
  canRedo,
  selectedNode,
  onDeleteSelected,
  activeTool,
  onToolChange
}: ToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNodePalette, setShowNodePalette] = useState(false);

  const handleZoomIn = () => {
    onCanvasUpdate({ zoom: Math.min(canvasState.zoom + 10, 200) });
  };

  const handleZoomOut = () => {
    onCanvasUpdate({ zoom: Math.max(canvasState.zoom - 10, 50) });
  };

  const handleResetZoom = () => {
    onCanvasUpdate({ zoom: 100, panX: 0, panY: 0 });
  };

  const handleFitToView = () => {
    if (nodes.length === 0) return;
    
    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxX: Math.max(acc.maxX, node.x + node.width),
        maxY: Math.max(acc.maxY, node.y + node.height)
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
    
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = bounds.minX + width / 2;
    const centerY = bounds.minY + height / 2;
    
    // Calculate optimal zoom to fit all nodes
    const padding = 100;
    const maxZoomX = ((window.innerWidth - padding) / width) * 100;
    const maxZoomY = ((window.innerHeight - padding) / height) * 100;
    const optimalZoom = Math.min(maxZoomX, maxZoomY, 100);
    
    onCanvasUpdate({
      zoom: Math.max(optimalZoom, 50),
      panX: (window.innerWidth / 2) - (centerX * optimalZoom / 100),
      panY: (window.innerHeight / 2) - (centerY * optimalZoom / 100)
    });
  };

  const handleAddNodeFromPalette = (type: NodeType, e: React.MouseEvent) => {
    e.preventDefault();
    // Add node at center of canvas
    const centerX = (window.innerWidth / 2 - canvasState.panX) / (canvasState.zoom / 100);
    const centerY = (window.innerHeight / 2 - canvasState.panY) / (canvasState.zoom / 100);
    onNodeAdd(type, centerX, centerY);
    setShowNodePalette(false);
  };

  const getNodeTypeInfo = (type: NodeType) => {
    switch (type) {
      case 'start':
        return { icon: Circle, color: 'text-green-500', label: 'Start' };
      case 'end':
        return { icon: Circle, color: 'text-red-500', label: 'End' };
      case 'process':
        return { icon: Square, color: 'text-yellow-500', label: 'Process' };
      case 'decision':
        return { icon: Diamond, color: 'text-blue-500', label: 'Decision' };
      case 'loop':
        return { icon: RotateCcw, color: 'text-purple-500', label: 'Loop' };
      case 'variable':
        return { icon: Variable, color: 'text-orange-500', label: 'Variable' };
      default:
        return { icon: Square, color: 'text-gray-500', label: 'Node' };
    }
  };

  const handleUpload = () => {
    FileOperations.importFromFile().then((result) => {
      if (result.success && result.boards.length > 0) {
        onImportBoards(result.boards);
        setTimeout(() => {
          alert(`✓ Successfully imported ${result.importedCount} board(s)!`);
        }, 100);
      } else {
        const errorMsg = result.errors.length > 0 ? result.errors[0] : 'Import failed';
        alert(`✗ ${errorMsg}`);
      }
    }).catch((error) => {
      alert(`✗ Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  };

  const handleExportAll = () => {
    try {
      FileOperations.exportToFile(boards);
      setTimeout(() => {
        alert(`✓ Exported ${boards.length} board(s) successfully!`);
      }, 100);
    } catch (error) {
      alert(`✗ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportCurrent = () => {
    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (currentBoard) {
      try {
        FileOperations.exportCurrentBoard(currentBoard);
        setTimeout(() => {
          alert(`✓ Exported "${currentBoard.name}" successfully!`);
        }, 100);
      } catch (error) {
        alert(`✗ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      alert('✗ No board selected');
    }
  };

  const nodeTypes: NodeType[] = ['start', 'end', 'process', 'decision', 'loop', 'variable'];

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      {/* Outer pill */}
      <div className="bg-white/95 border border-[#13192A1A] shadow-[0_12px_32px_rgba(0,0,0,0.22)] rounded-full px-2 py-1.5 transition-all duration-300 backdrop-blur-md">
        {/* Inner soft-pink bar */}
        <div className="flex items-center space-x-2 bg-[#FFE4E1] bg-opacity-80 rounded-full px-3 py-1.5">
          {/* Main Tools */}
          {/* Play / primary button - yellow pill */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2.5 rounded-full transition-colors group relative border border-[#13192A] shadow-[0_4px_0_rgba(19,25,42,0.8)] ${
              isExpanded ? 'bg-[#FFD88A]' : 'bg-white'
            }`}
            title={isExpanded ? 'Collapse Toolbar' : 'Expand Toolbar'}
          >
            <Play size={18} className="text-[#13192A]" />
          </button>

          {/* Expanded Tools */}
          {isExpanded && (
            <>
              {/* Navigation Tools */}
              <div className="w-px h-7 bg-[#13192A1A] mx-1" />
              
              <button
                onClick={() => onToolChange(activeTool === 'select' ? 'move' : 'select')}
                className={`p-2 rounded-full transition-colors group relative ${
                  activeTool === 'move' ? 'bg-white text-[#13192A]' : 'hover:bg-white/60'
                }`}
                title={`${activeTool === 'select' ? 'Enable' : 'Disable'} Move Tool`}
              >
                <Hand size={18} className={activeTool === 'move' ? 'text-[#13192A]' : 'text-[#13192A]'} />
              </button>

              <button
                onClick={handleFitToView}
                disabled={nodes.length === 0}
                className="p-2 rounded-full transition-colors group relative hover:bg-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Fit to View"
              >
                <ZoomIn size={18} className="text-[#13192A]" />
              </button>

              {/* History Controls */}
              <div className="w-px h-8 bg-gray-300 mx-1" />
              
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-2 rounded-full transition-colors group relative hover:bg-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={18} className={canUndo ? 'text-[#13192A]' : 'text-[#13192A40]'} />
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-2 rounded-full transition-colors group relative hover:bg-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={18} className={canRedo ? 'text-[#13192A]' : 'text-[#13192A40]'} />
              </button>

              {/* Node Tools */}
              <div className="w-px h-8 bg-gray-300 mx-1" />
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowNodePalette(!showNodePalette);
                }}
                className="p-2 rounded-full transition-colors group relative hover:bg-white/60"
                title="Add Node (Shift+Click on canvas)"
              >
                <Plus size={18} className="text-[#13192A]" />
              </button>

              {/* Delete Selected */}
              <button
                onClick={onDeleteSelected}
                disabled={!selectedNode}
                className="p-2 rounded-full transition-colors group relative hover:bg-[#FFE0E0] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete Selected (Delete)"
              >
                <Trash2 size={18} className={selectedNode ? 'text-red-500' : 'text-gray-400'} />
              </button>

              {/* Zoom Controls */}
              <div className="w-px h-7 bg-[#13192A1A] mx-1" />

              <div className="flex items-center space-x-1 bg-white/70 rounded-full px-2">
                <button
                  onClick={handleZoomOut}
                  disabled={canvasState.zoom <= 50}
                  className="p-1 hover:bg-white rounded-full transition-colors disabled:opacity-40"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} className="text-[#13192A]" />
                </button>
                
                <span 
                  className="text-sm font-mono text-[#13192A] min-w-[3rem] text-center cursor-pointer hover:bg-white px-1 rounded-full"
                  onClick={handleResetZoom}
                  title="Click to reset zoom"
                >
                  {canvasState.zoom}%
                </span>
                
                <button
                  onClick={handleZoomIn}
                  disabled={canvasState.zoom >= 200}
                  className="p-1 hover:bg-white rounded-full transition-colors disabled:opacity-40"
                  title="Zoom In"
                >
                  <ZoomIn size={16} className="text-[#13192A]" />
                </button>
              </div>

              {/* Utility Tools */}
              <div className="w-px h-7 bg-[#13192A1A] mx-1" />

              <button
                onClick={handleUpload}
                className="p-2 rounded-full transition-colors group hover:bg-white/60"
                title="Import Boards"
              >
                <FolderOpen size={18} className="text-[#13192A]" />
              </button>

              <button
                onClick={handleExportAll}
                className="p-2 rounded-full transition-colors group hover:bg-white/60"
                title="Export All Boards"
              >
                <Save size={18} className="text-[#13192A]" />
              </button>

              <button
                onClick={handleExportCurrent}
                className="p-2 rounded-full transition-colors group hover:bg-white/60"
                title="Export Current Board"
              >
                <Download size={18} className="text-[#13192A]" />
              </button>

              <button
                className="p-2 rounded-full transition-colors group relative hover:bg-white/60"
                title="Collaboration"
              >
                <Users size={18} className="text-[#13192A]" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Node Type Palette */}
      {showNodePalette && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2">
          <div className="text-xs text-gray-600 mb-2 text-center font-medium">Click to add node</div>
          <div className="grid grid-cols-3 gap-1">
            {nodeTypes.map((type) => {
              const { icon: Icon, color, label } = getNodeTypeInfo(type);
              return (
                <button
                  key={type}
                  onClick={(e) => handleAddNodeFromPalette(type, e)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1 group"
                  title={label}
                >
                  <Icon size={16} className={color} />
                  <span className="text-xs text-gray-600 group-hover:text-gray-800">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Or Shift+Click on canvas
          </div>
        </div>
      )}

      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
            Click to expand toolbar
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;