import { useState } from 'react';
import { X, Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { Board } from '../types';

interface BoardSidebarProps {
  isOpen: boolean;
  boards: Board[];
  onClose: () => void;
  onBoardCreate: (name: string) => void;
  onBoardSwitch: (boardId: string) => void;
  onBoardRename: (boardId: string, newName: string) => void;
  onBoardDelete?: (boardId: string) => void;
}

const BoardSidebar = ({ isOpen, boards, onClose, onBoardCreate, onBoardSwitch, onBoardRename, onBoardDelete }: BoardSidebarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      onBoardCreate(newBoardName.trim());
      setNewBoardName('');
      setShowCreateForm(false);
    }
  };

  const handleDeleteBoard = (boardId: string) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      onBoardDelete?.(boardId);
    }
  };

  const handleStartRename = (e: React.MouseEvent, boardId: string, currentName: string) => {
    e.stopPropagation();
    setEditingBoard(boardId);
    setEditingName(currentName);
  };

  const handleSaveRename = () => {
    if (editingBoard && editingName.trim()) {
      onBoardRename(editingBoard, editingName.trim());
    }
    setEditingBoard(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingBoard(null);
    setEditingName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const handleKeyPressCreate = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBoard();
    } else if (e.key === 'Escape') {
      setShowCreateForm(false);
      setNewBoardName('');
    }
  };

  const filteredBoards = boards.filter(board => 
    board.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredBoards.length === 0 && searchTerm) {
    return (
      <>
        {isOpen && <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={onClose} />}
        <div className={`fixed left-0 top-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-soodo-oxford-blue">Boards</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search boards..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400">
              No boards found
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold text-soodo-oxford-blue">
              Boards ({filteredBoards.length})
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent"
              />
            </div>
          </div>

          {/* Create New Board Form */}
          <div className="p-4 border-b border-gray-200">
            {showCreateForm ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Board name..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={handleKeyPressCreate}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent text-sm"
                  autoFocus
                />
                <button
                  onClick={handleCreateBoard}
                  className="px-3 py-2 bg-soodo-cocoa-brown text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBoardName('');
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-dashed border-soodo-cocoa-brown text-soodo-cocoa-brown rounded-lg hover:bg-soodo-alice-blue transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">New Board</span>
              </button>
            )}
          </div>

          {/* Board List */}
          <div className="flex-1 overflow-y-auto">
            {filteredBoards.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No boards found
              </div>
            ) : (
              filteredBoards.map((board) => (
                <div
                  key={board.id}
                  onMouseEnter={() => setHoveredBoardId(board.id)}
                  onMouseLeave={() => setHoveredBoardId(null)}
                  className={`
                    group border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${board.isActive ? 'bg-soodo-alice-blue border-l-4 border-l-soodo-cocoa-brown' : ''}
                  `}
                >
                  <div className="p-4 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (editingBoard !== board.id) {
                          onBoardSwitch(board.id);
                          onClose();
                        }
                      }}
                      className="flex-1 text-left"
                    >
                      {editingBoard === board.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleSaveRename}
                          onKeyDown={handleKeyPress}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full font-medium bg-white border border-soodo-cocoa-brown rounded px-2 py-1 text-soodo-oxford-blue"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className={`font-medium ${
                            board.isActive ? 'text-soodo-oxford-blue' : 'text-gray-700'
                          }`}>
                            {board.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {board.createdAt.toLocaleDateString()} • {board.data.nodes.length} nodes
                          </div>
                        </div>
                      )}
                    </button>
                    {(hoveredBoardId === board.id || editingBoard === board.id) && editingBoard !== board.id && (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => handleStartRename(e, board.id, board.name)}
                          className="p-1 text-gray-500 hover:text-soodo-cocoa-brown transition-colors"
                          title="Rename"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteBoard(board.id)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BoardSidebar;