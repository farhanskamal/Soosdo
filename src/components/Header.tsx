import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share, User, Menu, MessageCircle, Edit2, Check, X, Settings, Home } from 'lucide-react';

interface HeaderProps {
  activeBoard: {
    id: string;
    name: string;
    isActive: boolean;
  };
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onBoardRename?: (boardId: string, newName: string) => void;
  onOpenSettings?: () => void;
}

const Header = ({ activeBoard, onToggleLeftSidebar, onToggleRightSidebar, onBoardRename, onOpenSettings }: HeaderProps) => {
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [boardName, setBoardName] = useState(activeBoard.name);

  const handleBoardNameSave = () => {
    if (onBoardRename && boardName.trim() && boardName !== activeBoard.name) {
      onBoardRename(activeBoard.id, boardName.trim());
    }
    setIsEditingBoard(false);
  };

  const handleBoardNameCancel = () => {
    setBoardName(activeBoard.name);
    setIsEditingBoard(false);
  };

  const handleBoardNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBoardNameSave();
    } else if (e.key === 'Escape') {
      handleBoardNameCancel();
    }
  };

  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 z-40">
      {/* Left island: menu + board info */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          onClick={onToggleLeftSidebar}
          className="p-2 rounded-full bg-white/95 border border-gray-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:bg-[#FFF5D5] transition-colors"
          title="Boards"
        >
          <Menu size={18} className="text-gray-700" />
        </button>

        <div className="flex items-center gap-3 bg-white/95 border border-gray-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] px-4 py-2">
          <Link to="/" title="Back to home" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--soodo-jasmine)] rounded-xl flex items-center justify-center shadow">
              <span className="text-[var(--soodo-oxford-blue)] font-heading font-bold text-sm">S</span>
            </div>
            <h1 className="hidden md:block text-base font-heading font-bold text-soodo-oxford-blue">
              Soodo Code
            </h1>
          </Link>

          <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-gray-500 text-xs uppercase tracking-[0.18em]">Board</span>
            {isEditingBoard ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  onBlur={handleBoardNameSave}
                  onKeyDown={handleBoardNameKeyPress}
                  className="text-sm font-medium text-soodo-oxford-blue bg-transparent border-b-2 border-soodo-cocoa-brown focus:outline-none min-w-[140px]"
                  autoFocus
                />
                <button
                  onClick={handleBoardNameSave}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                  title="Save"
                >
                  <Check size={14} className="text-green-600" />
                </button>
                <button
                  onClick={handleBoardNameCancel}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Cancel"
                >
                  <X size={14} className="text-red-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingBoard(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#FFF5D5] transition-colors"
                title="Click to rename board"
              >
                <span className="text-sm font-medium text-soodo-oxford-blue truncate max-w-[140px]">
                  {activeBoard.name}
                </span>
                <Edit2 size={14} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right island: navigation, AI, share, settings, user */}
      <div className="pointer-events-auto flex items-center">
        <div className="flex items-center gap-2 bg-white/95 border border-gray-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] px-3 py-2">
          {/* Back to landing page */}
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#13192A1A] bg-white/80 hover:bg-[#FFF5D5] text-xs font-heading text-soodo-oxford-blue transition-colors"
            title="Back to landing page"
          >
            <Home size={14} className="text-gray-700" />
            <span>Home</span>
          </Link>
          <button 
            onClick={onToggleRightSidebar}
            className="flex items-center gap-2 bg-[var(--soodo-jasmine)] px-3 py-1.5 rounded-xl hover:brightness-95 transition-colors"
            title="Open AI Assistant"
          >
            <MessageCircle size={16} className="text-[var(--soodo-oxford-blue)]" />
            <span className="text-xs font-heading font-bold text-[var(--soodo-oxford-blue)]">AI</span>
          </button>

          <button
            className="flex items-center gap-2 bg-[#FFE0B3] px-3 py-1.5 rounded-xl hover:brightness-95 transition-colors"
            title="Share board"
          >
            <Share size={16} className="text-[var(--soodo-cocoa-brown)]" />
            <span className="text-xs font-heading font-bold text-[var(--soodo-oxford-blue)]">Share</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-[#FFF5D5] transition-colors"
            title="Settings"
          >
            <Settings size={18} className="text-gray-600" />
          </button>

          <button className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:ring-2 hover:ring-[var(--soodo-cocoa-brown)] transition-all">
            <User size={18} className="text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;