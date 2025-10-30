import { Board, Node, Connection, CanvasState, Action, ActionType, BoardData } from '../types';
import { validateNode, validateConnection, validateBoard, sanitizeActionData, withErrorHandling } from './validation';

export interface HistoryState {
  boards: Board[];
  activeBoardId: string;
  selectedNode: string | null;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
}

export class HistoryManager {
  private static history: Action[] = [];
  private static currentIndex: number = -1;
  private static maxHistorySize: number = 50;

  /**
   * Record an action for undo/redo tracking with board isolation
   */
  static recordAction(
    type: ActionType, 
    data: any, 
    reverseData?: any,
    boardId?: string
  ): void {
    // Remove any future actions (when we add new action after undo)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    const action: Action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      reverseData,
      timestamp: Date.now()
    };

    // Sanitize action data to prevent errors
    const sanitizedAction = withErrorHandling(
      () => sanitizeActionData(action),
      action,
      'recordAction'
    );

    this.history.push(sanitizedAction);
    this.currentIndex = this.history.length - 1;

    // Keep history size limited
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
      this.currentIndex = this.history.length - 1;
    }
  }

  /**
   * Undo the last action with enhanced error handling
   */
  static undo(boards: Board[], activeBoardId: string): HistoryState {
    if (this.currentIndex < 0) {
      return this.getCurrentState(boards, activeBoardId);
    }

    const action = this.history[this.currentIndex];
    
    try {
      const updatedBoards = this.applyReverseAction(boards, action);
      this.currentIndex--;
      
      return {
        boards: updatedBoards,
        activeBoardId,
        selectedNode: null,
        canUndo: this.currentIndex >= 0,
        canRedo: this.currentIndex < this.history.length - 1,
        historyIndex: this.currentIndex
      };
    } catch (error) {
      console.warn('Error during undo operation:', error);
      this.currentIndex--;
      return this.getCurrentState(boards, activeBoardId);
    }
  }

  /**
   * Redo the next action with enhanced error handling
   */
  static redo(boards: Board[], activeBoardId: string): HistoryState {
    if (this.currentIndex >= this.history.length - 1) {
      return this.getCurrentState(boards, activeBoardId);
    }

    this.currentIndex++;
    const action = this.history[this.currentIndex];
    
    try {
      const updatedBoards = this.applyAction(boards, action);
      return {
        boards: updatedBoards,
        activeBoardId,
        selectedNode: null,
        canUndo: this.currentIndex >= 0,
        canRedo: this.currentIndex < this.history.length - 1,
        historyIndex: this.currentIndex
      };
    } catch (error) {
      console.warn('Error during redo operation:', error);
      return this.getCurrentState(boards, activeBoardId);
    }
  }

  /**
   * Apply an action to the boards state with enhanced error handling
   */
  private static applyAction(boards: Board[], action: Action): Board[] {
    try {
      switch (action.type) {
        case 'add_node':
          return this.addNode(boards, action.data);
        case 'delete_node':
          return this.restoreNode(boards, action.data);
        case 'move_node':
          return this.moveNodeToPosition(boards, action.data);
        case 'update_node':
          return this.updateNodeToState(boards, action.data);
        case 'add_connection':
          return this.addConnection(boards, action.data);
        case 'delete_connection':
          return this.restoreConnection(boards, action.data);
        case 'update_connection':
          return this.updateConnectionToState(boards, action.data);
        case 'canvas_move':
          return this.moveCanvasToPosition(boards, action.data);
        case 'zoom':
          return this.zoomToLevel(boards, action.data);
        default:
          console.warn('Unknown action type:', action.type);
          return boards;
      }
    } catch (error) {
      console.error('Error applying action:', error, action);
      return boards;
    }
  }

  /**
   * Apply a reverse action to the boards state with enhanced error handling
   */
  private static applyReverseAction(boards: Board[], action: Action): Board[] {
    try {
      switch (action.type) {
        case 'add_node':
          return this.deleteNode(boards, action.data.nodeId);
        case 'delete_node':
          return this.restoreNode(boards, action.data);
        case 'move_node':
          return this.moveNodeToPosition(boards, action.reverseData);
        case 'update_node':
          return this.updateNodeToState(boards, action.reverseData);
        case 'add_connection':
          return this.deleteConnection(boards, action.data.connectionId);
        case 'delete_connection':
          return this.restoreConnection(boards, action.data);
        case 'update_connection':
          return this.updateConnectionToState(boards, action.reverseData);
        case 'canvas_move':
          return this.moveCanvasToPosition(boards, action.reverseData);
        case 'zoom':
          return this.zoomToLevel(boards, action.reverseData);
        default:
          console.warn('Unknown action type:', action.type);
          return boards;
      }
    } catch (error) {
      console.error('Error applying reverse action:', error, action);
      return boards;
    }
  }

  /**
   * Add node action with validation
   */
  private static addNode(boards: Board[], nodeData: Node): Board[] {
    try {
      const validatedNode = validateNode(nodeData);
      return boards.map(board => ({
        ...board,
        data: {
          ...board.data,
          nodes: [...board.data.nodes, validatedNode]
        }
      }));
    } catch (error) {
      console.error('Error adding node:', error, nodeData);
      return boards;
    }
  }

  /**
   * Delete node action
   */
  private static deleteNode(boards: Board[], nodeId: string): Board[] {
    return boards.map(board => ({
      ...board,
      data: {
        ...board.data,
        nodes: board.data.nodes.filter(node => node.id !== nodeId),
        connections: board.data.connections.filter(
          conn => conn.fromNode !== nodeId && conn.toNode !== nodeId
        )
      }
    }));
  }

  /**
   * Restore node action with validation
   */
  private static restoreNode(boards: Board[], nodeData: { nodeId: string; node: Node }): Board[] {
    try {
      if (!nodeData || !nodeData.node) {
        console.warn('Invalid node data for restoration:', nodeData);
        return boards;
      }
      
      const validatedNode = validateNode(nodeData.node, nodeData.nodeId);
      return boards.map(board => ({
        ...board,
        data: {
          ...board.data,
          nodes: [...board.data.nodes, validatedNode]
        }
      }));
    } catch (error) {
      console.error('Error restoring node:', error, nodeData);
      return boards;
    }
  }

  /**
   * Move node action
   */
  private static moveNodeToPosition(
    boards: Board[], 
    data: { nodeId: string; x: number; y: number; boardId?: string }
  ): Board[] {
    return boards.map(board => {
      if (data.boardId && board.id !== data.boardId) return board;
      
      return {
        ...board,
        data: {
          ...board.data,
          nodes: board.data.nodes.map(node =>
            node.id === data.nodeId ? { ...node, x: data.x, y: data.y } : node
          )
        }
      };
    });
  }

  /**
   * Update node action
   */
  private static updateNodeToState(
    boards: Board[],
    data: { nodeId: string; updates: Partial<Node>; boardId?: string }
  ): Board[] {
    return boards.map(board => {
      if (data.boardId && board.id !== data.boardId) return board;
      
      return {
        ...board,
        data: {
          ...board.data,
          nodes: board.data.nodes.map(node =>
            node.id === data.nodeId ? { ...node, ...data.updates } : node
          )
        }
      };
    });
  }

  /**
   * Add connection action with validation
   */
  private static addConnection(boards: Board[], connectionData: Connection): Board[] {
    try {
      const validatedConnection = validateConnection(connectionData);
      return boards.map(board => ({
        ...board,
        data: {
          ...board.data,
          connections: [...board.data.connections, validatedConnection]
        }
      }));
    } catch (error) {
      console.error('Error adding connection:', error, connectionData);
      return boards;
    }
  }

  /**
   * Delete connection action
   */
  private static deleteConnection(boards: Board[], connectionId: string): Board[] {
    return boards.map(board => ({
      ...board,
      data: {
        ...board.data,
        connections: board.data.connections.filter(conn => conn.id !== connectionId)
      }
    }));
  }

  /**
   * Restore connection action with validation
   */
  private static restoreConnection(boards: Board[], connectionData: Connection): Board[] {
    try {
      if (!connectionData || !connectionData.fromNode || !connectionData.toNode) {
        console.warn('Invalid connection data for restoration:', connectionData);
        return boards;
      }
      
      const validatedConnection = validateConnection(connectionData);
      return boards.map(board => ({
        ...board,
        data: {
          ...board.data,
          connections: [...board.data.connections, validatedConnection]
        }
      }));
    } catch (error) {
      console.error('Error restoring connection:', error, connectionData);
      return boards;
    }
  }

  /**
   * Update connection fields
   */
  private static updateConnectionToState(
    boards: Board[],
    data: { connectionId: string; updates: Partial<Connection>; boardId?: string }
  ): Board[] {
    return boards.map(board => {
      if (data.boardId && board.id !== data.boardId) return board;
      return {
        ...board,
        data: {
          ...board.data,
          connections: board.data.connections.map(conn =>
            conn.id === data.connectionId ? { ...conn, ...data.updates } : conn
          )
        }
      };
    });
  }

  /**
   * Canvas move action
   */
  private static moveCanvasToPosition(
    boards: Board[],
    data: { panX: number; panY: number; boardId?: string }
  ): Board[] {
    return boards.map(board => {
      if (data.boardId && board.id !== data.boardId) return board;
      
      return {
        ...board,
        data: {
          ...board.data,
          canvasState: {
            ...board.data.canvasState,
            panX: data.panX,
            panY: data.panY
          }
        }
      };
    });
  }

  /**
   * Zoom action
   */
  private static zoomToLevel(
    boards: Board[],
    data: { zoom: number; boardId?: string }
  ): Board[] {
    return boards.map(board => {
      if (data.boardId && board.id !== data.boardId) return board;
      
      return {
        ...board,
        data: {
          ...board.data,
          canvasState: {
            ...board.data.canvasState,
            zoom: data.zoom
          }
        }
      };
    });
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get current state
   */
  private static getCurrentState(boards: Board[], activeBoardId: string): HistoryState {
    return {
      boards,
      activeBoardId,
      selectedNode: null,
      canUndo: this.currentIndex >= 0,
      canRedo: this.currentIndex < this.history.length - 1,
      historyIndex: this.currentIndex
    };
  }

  /**
   * Get history statistics
   */
  static getHistoryStats(): { total: number; current: number; canUndo: boolean; canRedo: boolean } {
    return {
      total: this.history.length,
      current: this.currentIndex + 1,
      canUndo: this.currentIndex >= 0,
      canRedo: this.currentIndex < this.history.length - 1
    };
  }

  /**
   * Record specific action types with appropriate reverse data and board isolation
   */
  static recordNodeAdd(node: Node, boardId: string): void {
    try {
      const validatedNode = validateNode(node);
      this.recordAction('add_node', { ...validatedNode, boardId }, undefined, boardId);
    } catch (error) {
      console.warn('Error recording node add action:', error);
    }
  }

  static recordNodeDelete(nodeId: string, deletedNode: Node, boardId: string): void {
    try {
      const validatedNode = validateNode(deletedNode, nodeId);
      this.recordAction('delete_node', { nodeId, boardId }, { nodeId, node: validatedNode, boardId }, boardId);
    } catch (error) {
      console.warn('Error recording node delete action:', error);
    }
  }

  static recordNodeMove(nodeId: string, oldPosition: { x: number; y: number }, newPosition: { x: number; y: number }, boardId: string): void {
    try {
      if (!nodeId || !oldPosition || !newPosition) {
        console.warn('Invalid node move data:', { nodeId, oldPosition, newPosition });
        return;
      }
      
      this.recordAction('move_node', 
        { nodeId, x: newPosition.x, y: newPosition.y, boardId },
        { nodeId, x: oldPosition.x, y: oldPosition.y, boardId },
        boardId
      );
    } catch (error) {
      console.warn('Error recording node move action:', error);
    }
  }

  static recordNodeUpdate(nodeId: string, oldState: Partial<Node>, newState: Partial<Node>, boardId: string): void {
    try {
      if (!nodeId || !oldState || !newState) {
        console.warn('Invalid node update data:', { nodeId, oldState, newState });
        return;
      }
      
      this.recordAction('update_node',
        { nodeId, updates: newState, boardId },
        { nodeId, updates: oldState, boardId },
        boardId
      );
    } catch (error) {
      console.warn('Error recording node update action:', error);
    }
  }

  static recordConnectionAdd(connection: Connection, boardId: string): void {
    try {
      const validatedConnection = validateConnection(connection);
      this.recordAction('add_connection', { ...validatedConnection, boardId }, undefined, boardId);
    } catch (error) {
      console.warn('Error recording connection add action:', error);
    }
  }

  static recordConnectionDelete(connectionId: string, deletedConnection: Connection, boardId: string): void {
    try {
      const validatedConnection = validateConnection(deletedConnection);
      this.recordAction('delete_connection', { connectionId, boardId }, { ...validatedConnection, boardId }, boardId);
    } catch (error) {
      console.warn('Error recording connection delete action:', error);
    }
  }

  static recordConnectionUpdate(connectionId: string, oldState: Partial<Connection>, newState: Partial<Connection>, boardId: string): void {
    try {
      this.recordAction(
        'update_connection',
        { connectionId, updates: newState, boardId },
        { connectionId, updates: oldState, boardId },
        boardId
      );
    } catch (error) {
      console.warn('Error recording connection update action:', error);
    }
  }

  static recordCanvasMove(oldState: CanvasState, newState: CanvasState, boardId: string): void {
    try {
      if (!oldState || !newState) {
        console.warn('Invalid canvas move data:', { oldState, newState });
        return;
      }
      
      this.recordAction('canvas_move',
        { panX: newState.panX, panY: newState.panY, boardId },
        { panX: oldState.panX, panY: oldState.panY, boardId },
        boardId
      );
    } catch (error) {
      console.warn('Error recording canvas move action:', error);
    }
  }

  static recordZoomChange(oldZoom: number, newZoom: number, boardId: string): void {
    try {
      if (typeof oldZoom !== 'number' || typeof newZoom !== 'number') {
        console.warn('Invalid zoom data:', { oldZoom, newZoom });
        return;
      }
      
      this.recordAction('zoom',
        { zoom: newZoom, boardId },
        { zoom: oldZoom, boardId },
        boardId
      );
    } catch (error) {
      console.warn('Error recording zoom change action:', error);
    }
  }
}