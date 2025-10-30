import { Node, Connection, Board, ActionType } from '../types';

// Node validation function with comprehensive fallbacks
export const validateNode = (node: any, fallbackId?: string): Node => {
  const validatedNode: Node = {
    id: node?.id || fallbackId || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: node?.type || 'process',
    x: typeof node?.x === 'number' ? node.x : 0,
    y: typeof node?.y === 'number' ? node.y : 0,
    width: typeof node?.width === 'number' ? node.width : getDefaultWidth(node?.type),
    height: typeof node?.height === 'number' ? node.height : getDefaultHeight(node?.type),
    text: node?.text || getDefaultText(node?.type),
    color: node?.color || getDefaultColor(node?.type)
  };

  return validatedNode;
};

// Connection validation function with comprehensive fallbacks
export const validateConnection = (connection: any, fallbackId?: string): Connection => {
  const validatedConnection: Connection = {
    id: connection?.id || fallbackId || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromNode: connection?.fromNode || '',
    toNode: connection?.toNode || '',
    fromPoint: connection?.fromPoint || { x: 0, y: 0 },
    toPoint: connection?.toPoint || { x: 0, y: 0 },
    label: typeof connection?.label === 'string' ? connection.label : undefined,
    curvature: typeof connection?.curvature === 'number' ? connection.curvature : undefined
  };

  return validatedConnection;
};

// Board validation function
export const validateBoard = (board: any): Board => {
  const validatedBoard: Board = {
    id: board?.id || `board_${Date.now()}`,
    name: board?.name || 'Unnamed Board',
    isActive: board?.isActive || false,
    createdAt: board?.createdAt ? new Date(board.createdAt) : new Date(),
    data: {
      nodes: Array.isArray(board?.data?.nodes) ? board.data.nodes.map((node: any) => validateNode(node)) : [],
      connections: Array.isArray(board?.data?.connections) ? board.data.connections.map((conn: any) => validateConnection(conn)) : [],
      canvasState: {
        zoom: typeof board?.data?.canvasState?.zoom === 'number' ? board.data.canvasState.zoom : 100,
        panX: typeof board?.data?.canvasState?.panX === 'number' ? board.data.canvasState.panX : 0,
        panY: typeof board?.data?.canvasState?.panY === 'number' ? board.data.canvasState.panY : 0
      }
    }
  };

  return validatedBoard;
};

// Safe property access for node operations
export const safeGetNodeProperty = (node: any, property: keyof Node, defaultValue: any = null): any => {
  try {
    if (!node || typeof node !== 'object') {
      return defaultValue;
    }
    return node[property] ?? defaultValue;
  } catch (error) {
    console.warn(`Error accessing node property '${property}':`, error);
    return defaultValue;
  }
};

// Safe property access for connection operations
export const safeGetConnectionProperty = (connection: any, property: keyof Connection, defaultValue: any = null): any => {
  try {
    if (!connection || typeof connection !== 'object') {
      return defaultValue;
    }
    return connection[property] ?? defaultValue;
  } catch (error) {
    console.warn(`Error accessing connection property '${property}':`, error);
    return defaultValue;
  }
};

// Validate node exists in board
export const validateNodeExists = (nodeId: string, board: Board): boolean => {
  return board.data.nodes.some(node => node.id === nodeId);
};

// Validate connection exists in board
export const validateConnectionExists = (connectionId: string, board: Board): boolean => {
  return board.data.connections.some(conn => conn.id === connectionId);
};

// Sanitize action data to ensure all required properties exist
export const sanitizeActionData = (action: any): any => {
  if (!action || typeof action !== 'object') {
    return null;
  }

  const sanitized = { ...action };

  // Ensure action has required properties
  if (!sanitized.type || !Object.values(['add_node', 'delete_node', 'move_node', 'update_node', 'add_connection', 'delete_connection', 'canvas_move', 'zoom']).includes(sanitized.type)) {
    throw new Error(`Invalid action type: ${sanitized.type}`);
  }

  // Add timestamp if missing
  if (!sanitized.timestamp) {
    sanitized.timestamp = Date.now();
  }

  // Add ID if missing
  if (!sanitized.id) {
    sanitized.id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return sanitized;
};

// Helper functions for default values
function getDefaultWidth(type?: string): number {
  switch (type) {
    case 'start':
    case 'end':
      return 120;
    case 'decision':
      return 150;
    case 'loop':
      return 180;
    case 'variable':
      return 140;
    case 'process':
    default:
      return 180;
  }
}

function getDefaultHeight(type?: string): number {
  switch (type) {
    case 'start':
    case 'end':
      return 60;
    case 'decision':
      return 80;
    case 'loop':
      return 100;
    case 'variable':
      return 70;
    case 'process':
    default:
      return 80;
  }
}

function getDefaultText(type?: string): string {
  switch (type) {
    case 'start':
      return 'START';
    case 'end':
      return 'END';
    case 'process':
      return 'Process';
    case 'decision':
      return 'Decision';
    case 'loop':
      return 'Loop';
    case 'variable':
      return 'Variable';
    default:
      return 'Node';
  }
}

function getDefaultColor(type?: string): string {
  switch (type) {
    case 'start':
      return 'bg-green-500';
    case 'end':
      return 'bg-red-500';
    case 'process':
      return 'bg-yellow-400';
    case 'decision':
      return 'bg-blue-500';
    case 'loop':
      return 'bg-purple-500';
    case 'variable':
      return 'bg-orange-400';
    default:
      return 'bg-gray-400';
  }
}

// Error handling wrapper for operations
export const withErrorHandling = <T>(operation: () => T, fallbackValue: T, operationName: string): T => {
  try {
    return operation();
  } catch (error) {
    console.warn(`Error in ${operationName}:`, error);
    return fallbackValue;
  }
};

// Validate and repair corrupted board data
export const repairCorruptedBoard = (board: any): Board => {
  return withErrorHandling(
    () => validateBoard(board),
    {
      id: `board_repaired_${Date.now()}`,
      name: 'Repaired Board',
      isActive: false,
      createdAt: new Date(),
      data: {
        nodes: [],
        connections: [],
        canvasState: { zoom: 100, panX: 0, panY: 0 }
      }
    },
    'repairCorruptedBoard'
  );
};