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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      {/* Left Side - Logo and Toggle */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleLeftSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to home">
          <Home size={20} className="text-gray-600" />
        </Link>
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-soodo-cocoa-brown rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm font-heading">S</span>
          </div>
          <h1 className="text-xl font-heading font-bold text-soodo-oxford-blue">
            Soodo Code
          </h1>
        </div>
      </div>

      {/* Center - Current Board Name */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 text-sm">Current board:</span>
          {isEditingBoard ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onBlur={handleBoardNameSave}
                onKeyDown={handleBoardNameKeyPress}
                className="text-lg font-medium text-soodo-oxford-blue bg-transparent border-b-2 border-soodo-cocoa-brown focus:outline-none min-w-[200px]"
                autoFocus
              />
              <button
                onClick={handleBoardNameSave}
                className="p-1 hover:bg-green-100 rounded transition-colors"
                title="Save"
              >
                <Check size={16} className="text-green-600" />
              </button>
              <button
                onClick={handleBoardNameCancel}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Cancel"
              >
                <X size={16} className="text-red-600" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2 
                className="text-lg font-medium text-soodo-oxford-blue cursor-pointer hover:text-soodo-cocoa-brown transition-colors"
                onClick={() => setIsEditingBoard(true)}
                title="Click to edit board name"
              >
                {activeBoard.name}
              </h2>
              <button
                onClick={() => setIsEditingBoard(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors opacity-60 hover:opacity-100"
                title="Click to edit"
              >
                <Edit2 size={14} className="text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Share Button and User Avatar */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={onToggleRightSidebar}
          className="bg-soodo-cocoa-brown text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center space-x-2"
          title="Toggle AI Assistant"
        >
          <MessageCircle size={16} />
          <span className="text-sm font-medium">AI Assistant</span>
        </button>
        
        <button className="bg-soodo-cocoa-brown text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center space-x-2">
          <Share size={16} />
          <span className="text-sm font-medium">Share</span>
        </button>

        <button 
          onClick={onOpenSettings}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={20} className="text-gray-600" />
        </button>
        
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <User size={20} className="text-gray-600" />
        </button>
      </div>
    </header>
  );
};

export default Header;