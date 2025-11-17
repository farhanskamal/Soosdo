import { Node, Connection } from '../types';
import { validateNode, safeGetNodeProperty, withErrorHandling } from './validation';

// Connection port positions for different node types
export interface ConnectionPort {
  x: number;
  y: number;
  type: 'input' | 'output';
}

// Calculate connection port positions for a node
export const getConnectionPorts = (node: Node): { input: ConnectionPort; output: ConnectionPort } => {
  try {
    const validatedNode = validateNode(node);
    
    // Main input port (left edge, center)
    const input: ConnectionPort = {
      x: validatedNode.x,
      y: validatedNode.y + validatedNode.height / 2,
      type: 'input'
    };
    
    // Main output port (right edge, center)
    const output: ConnectionPort = {
      x: validatedNode.x + validatedNode.width,
      y: validatedNode.y + validatedNode.height / 2,
      type: 'output'
    };
    
    return { input, output };
  } catch (error) {
    console.warn('Error calculating connection ports:', error, node);
    // Fallback to basic calculations
    return {
      input: { x: 0, y: 0, type: 'input' },
      output: { x: 0, y: 0, type: 'output' }
    };
  }
};

// Calculate a simple orthogonal (elbow) connector path between two nodes.
// Always attaches directly to the node ports and ignores any cached points to
// avoid connectors "jumping" to other nodes.
export const calculateConnectorPath = (
  fromNode: Node,
  toNode: Node,
  _connectionData?: Partial<Connection>
): string => {
  try {
    const fromPorts = getConnectionPorts(fromNode);
    const toPorts = getConnectionPorts(toNode);

    const startX = fromPorts.output.x;
    const startY = fromPorts.output.y;
    const endX = toPorts.input.x;
    const endY = toPorts.input.y;

    // Simple elbow: horizontal from start, then vertical, then horizontal into end
    const midX = (startX + endX) / 2;

    return [
      `M ${startX} ${startY}`,
      `L ${midX} ${startY}`,
      `L ${midX} ${endY}`,
      `L ${endX} ${endY}`,
    ].join(' ');
  } catch (error) {
    console.warn('Error calculating connector path:', error);
    // Fallback to straight line between ports
    const fromPorts = getConnectionPorts(fromNode);
    const toPorts = getConnectionPorts(toNode);
    return `M ${fromPorts.output.x} ${fromPorts.output.y} L ${toPorts.input.x} ${toPorts.input.y}`;
  }
};

// Validate if a connection can be created between two nodes
export const canCreateConnection = (
  fromNode: Node,
  toNode: Node,
  existingConnections: Connection[]
): { canCreate: boolean; reason?: string } => {
  try {
    // Check if nodes exist and are valid
    if (!fromNode || !toNode) {
      return { canCreate: false, reason: 'Invalid nodes' };
    }
    
    // Check if trying to connect node to itself
    if (fromNode.id === toNode.id) {
      return { canCreate: false, reason: 'Cannot connect node to itself' };
    }
    
    // Check if connection already exists
    const existingConnection = existingConnections.find(
      conn => conn.fromNode === fromNode.id && conn.toNode === toNode.id
    );
    if (existingConnection) {
      return { canCreate: false, reason: 'Connection already exists' };
    }
    
    // Check if target node accepts connections (end nodes can have multiple inputs)
    if (toNode.type === 'start') {
      return { canCreate: false, reason: 'Start nodes cannot have input connections' };
    }
    
    // Additional validation can be added here based on business rules
    return { canCreate: true };
  } catch (error) {
    console.warn('Error validating connection:', error);
    return { canCreate: false, reason: 'Validation error' };
  }
};

// Create a new connection between nodes with proper validation
export const createConnection = (
  fromNode: Node,
  toNode: Node,
  existingConnections: Connection[],
  customStartPoint?: { x: number; y: number },
  customEndPoint?: { x: number; y: number }
): Connection | null => {
  try {
    const validation = canCreateConnection(fromNode, toNode, existingConnections);
    
    if (!validation.canCreate) {
      console.warn('Cannot create connection:', validation.reason);
      return null;
    }
    
    const fromPorts = getConnectionPorts(fromNode);
    const toPorts = getConnectionPorts(toNode);
    
    const connection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromNode: fromNode.id,
      toNode: toNode.id,
      fromPoint: customStartPoint || { x: fromPorts.output.x, y: fromPorts.output.y },
      toPoint: customEndPoint || { x: toPorts.input.x, y: toPorts.input.y }
    };
    
    return connection;
  } catch (error) {
    console.error('Error creating connection:', error);
    return null;
  }
};

// Find nodes that can be connected to a given node
export const findValidConnectionTargets = (
  fromNode: Node,
  allNodes: Node[],
  existingConnections: Connection[]
): Node[] => {
  try {
    return allNodes.filter(node => {
      const validation = canCreateConnection(fromNode, node, existingConnections);
      return validation.canCreate;
    });
  } catch (error) {
    console.warn('Error finding valid connection targets:', error);
    return [];
  }
};

// Calculate arrow marker position and rotation for SVG
export const getArrowMarkerTransform = (connection: Connection): string => {
  try {
    const angle = Math.atan2(
      connection.toPoint.y - connection.fromPoint.y,
      connection.toPoint.x - connection.fromPoint.x
    ) * 180 / Math.PI;
    
    return `rotate(${angle})`;
  } catch (error) {
    console.warn('Error calculating arrow marker transform:', error);
    return '';
  }
};

// Get connection point for drag operations
export const getConnectionPoint = (
  node: Node,
  type: 'start' | 'end',
  mousePosition: { x: number; y: number },
  nodes: Node[]
): { x: number; y: number } => {
  try {
    const ports = getConnectionPorts(node);
    
    if (type === 'start') {
      // If we're starting a connection, use the closest edge based on mouse position
      const centerX = ports.input.x;
      const centerY = ports.input.y;
      
      // Find closest edge to mouse position
      const distances = {
        left: Math.abs(mousePosition.x - ports.input.x),
        right: Math.abs(mousePosition.x - (ports.input.x + node.width)),
        top: Math.abs(mousePosition.y - ports.input.y),
        bottom: Math.abs(mousePosition.y - (ports.input.y + node.height))
      };
      
      const minDistance = Math.min(distances.left, distances.right, distances.top, distances.bottom);
      
      if (minDistance === distances.left) {
        return { x: ports.input.x, y: mousePosition.y };
      } else if (minDistance === distances.right) {
        return { x: ports.input.x + node.width, y: mousePosition.y };
      } else if (minDistance === distances.top) {
        return { x: mousePosition.x, y: ports.input.y };
      } else {
        return { x: mousePosition.x, y: ports.input.y + node.height };
      }
    } else {
      // For ending a connection, snap to the closest valid input port
      const validTargets = nodes.filter(targetNode => {
        const targetValidation = canCreateConnection(node, targetNode, []);
        return targetValidation.canCreate && targetNode.id !== node.id;
      });
      
      if (validTargets.length === 0) {
        return mousePosition;
      }
      
      // Find the closest target node
      let closestNode = validTargets[0];
      let closestDistance = Math.sqrt(
        Math.pow(mousePosition.x - ports.output.x, 2) + 
        Math.pow(mousePosition.y - ports.output.y, 2)
      );
      
      for (const targetNode of validTargets.slice(1)) {
        const targetPorts = getConnectionPorts(targetNode);
        const distance = Math.sqrt(
          Math.pow(mousePosition.x - targetPorts.input.x, 2) + 
          Math.pow(mousePosition.y - targetPorts.input.y, 2)
        );
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNode = targetNode;
        }
      }
      
      // If we're close enough to a valid target, snap to it
      if (closestDistance < 50) {
        const targetPorts = getConnectionPorts(closestNode);
        return { x: targetPorts.input.x, y: targetPorts.input.y };
      }
      
      return mousePosition;
    }
  } catch (error) {
    console.warn('Error getting connection point:', error);
    return mousePosition;
  }
};

// Utility function to check if a point is inside a node
export const isPointInNode = (point: { x: number; y: number }, node: Node): boolean => {
  try {
    const validatedNode = validateNode(node);
    
    return (
      point.x >= validatedNode.x &&
      point.x <= validatedNode.x + validatedNode.width &&
      point.y >= validatedNode.y &&
      point.y <= validatedNode.y + validatedNode.height
    );
  } catch (error) {
    console.warn('Error checking if point is in node:', error);
    return false;
  }
};

// Get the node at a specific position
export const getNodeAtPosition = (
  position: { x: number; y: number },
  nodes: Node[],
  ignoreNodeId?: string
): Node | null => {
  try {
    // Find nodes in reverse order (topmost first)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (ignoreNodeId && node.id === ignoreNodeId) {
        continue;
      }
      
      if (isPointInNode(position, node)) {
        return node;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Error getting node at position:', error);
    return null;
  }
};

// Validate connection data for rendering
export const validateConnectionForRendering = (connection: Connection, nodes: Node[]): Connection | null => {
  try {
    const fromNode = nodes.find(n => n.id === connection.fromNode);
    const toNode = nodes.find(n => n.id === connection.toNode);
    
    if (!fromNode || !toNode) {
      console.warn('Connection references missing nodes:', connection);
      return null;
    }
    
    // Ensure connection has valid points
    const validatedConnection = {
      ...connection,
      fromPoint: connection.fromPoint || { x: 0, y: 0 },
      toPoint: connection.toPoint || { x: 0, y: 0 }
    };
    
    return validatedConnection;
  } catch (error) {
    console.warn('Error validating connection for rendering:', error);
    return null;
  }
};