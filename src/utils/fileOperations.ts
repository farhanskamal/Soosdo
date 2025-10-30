import { Board, Node, Connection, CanvasState, BoardData } from '../types';

export interface ExportData {
  version: string;
  exportedAt: string;
  boards: Board[];
  metadata: {
    name: string;
    description: string;
    nodeCount: number;
    connectionCount: number;
    boardCount: number;
  };
}

export interface ImportResult {
  success: boolean;
  boards: Board[];
  importedCount: number;
  errors: string[];
}

const EXPORT_VERSION = '1.0.0';

export class FileOperations {
  /**
   * Export all boards to a JSON file
   */
  static async exportToFile(boards: Board[]): Promise<void> {
    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      boards: boards,
      metadata: {
        name: `Soodo Code Project`,
        description: `Exported from Soodo Code - ${boards.length} boards`,
        nodeCount: boards.reduce((sum, board) => sum + board.data.nodes.length, 0),
        connectionCount: boards.reduce((sum, board) => sum + board.data.connections.length, 0),
        boardCount: boards.length
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `soodo-code-project-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(link.href);
  }

  /**
   * Import boards from a JSON file
   */
  static async importFromFile(): Promise<ImportResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({
            success: false,
            boards: [],
            importedCount: 0,
            errors: ['No file selected']
          });
          return;
        }

        try {
          const text = await file.text();
          const result = this.parseImportedData(text);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            boards: [],
            importedCount: 0,
            errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
        }
      };

      input.click();
    });
  }

  /**
   * Parse and validate imported JSON data
   */
  private static parseImportedData(jsonText: string): ImportResult {
    const errors: string[] = [];
    
    try {
      const parsed = JSON.parse(jsonText);
      
      // Validate structure
      if (!this.validateExportStructure(parsed)) {
        errors.push('Invalid file format: missing required fields');
        return {
          success: false,
          boards: [],
          importedCount: 0,
          errors
        };
      }

      // Validate and clean boards data with unique ID generation for imports
      const validBoards = this.validateBoards(parsed.boards, true);
      
      if (validBoards.length === 0) {
        errors.push('No valid boards found in file');
        return {
          success: false,
          boards: [],
          importedCount: 0,
          errors
        };
      }

      return {
        success: true,
        boards: validBoards,
        importedCount: validBoards.length,
        errors
      };

    } catch (error) {
      errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        boards: [],
        importedCount: 0,
        errors
      };
    }
  }

  /**
   * Validate the export file structure
   */
  private static validateExportStructure(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.version &&
      data.exportedAt &&
      data.boards &&
      Array.isArray(data.boards)
    );
  }

  /**
   * Validate and clean board data with unique ID generation for imports
   */
  private static validateBoards(boards: any[], generateNewIds: boolean = false): Board[] {
    return boards
      .map((board, index) => {
        try {
          // Validate board structure
          if (!board.name || !board.data) {
            throw new Error(`Board ${index + 1}: Missing required fields`);
          }

          // Validate and clean board data
          const cleanedData: BoardData = {
            nodes: this.validateNodes(board.data.nodes || []),
            connections: this.validateConnections(board.data.connections || [], board.data.nodes || []),
            canvasState: this.validateCanvasState(board.data.canvasState || {})
          };

          // Generate new unique ID for imported boards to avoid conflicts
          const boardId = generateNewIds ? `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : (board.id || `board_${Date.now()}_${index}`);

          // Create clean board
          const cleanBoard: Board = {
            id: String(boardId),
            name: String(board.name),
            isActive: false, // Reset active state
            createdAt: new Date(board.createdAt || Date.now()),
            data: cleanedData
          };

          return cleanBoard;

        } catch (error) {
          console.warn(`Board ${index + 1} validation failed:`, error);
          return null;
        }
      })
      .filter((board): board is Board => board !== null);
  }

  /**
   * Validate and clean node data
   */
  private static validateNodes(nodes: any[]): Node[] {
    return nodes
      .map((node, index) => {
        try {
          if (!node.id || !node.type || typeof node.x !== 'number' || typeof node.y !== 'number') {
            throw new Error(`Node ${index + 1}: Missing required fields`);
          }

          // Validate node type
          const validTypes = ['start', 'end', 'process', 'decision', 'loop', 'variable'];
          if (!validTypes.includes(node.type)) {
            throw new Error(`Node ${index + 1}: Invalid type '${node.type}'`);
          }

          return {
            id: String(node.id),
            type: node.type as Node['type'],
            x: Number(node.x) || 0,
            y: Number(node.y) || 0,
            width: Number(node.width) || this.getDefaultWidth(node.type),
            height: Number(node.height) || this.getDefaultHeight(node.type),
            text: String(node.text || this.getDefaultText(node.type)),
            color: String(node.color || this.getDefaultColor(node.type))
          };

        } catch (error) {
          console.warn(`Node ${index + 1} validation failed:`, error);
          return null;
        }
      })
      .filter((node): node is Node => node !== null);
  }

  /**
   * Validate and clean connection data
   */
  private static validateConnections(connections: any[], nodes: any[]): Connection[] {
    const nodeIds = new Set(nodes.map(node => node.id));
    
    return connections
      .map((conn, index) => {
        try {
          if (!conn.id || !conn.fromNode || !conn.toNode) {
            throw new Error(`Connection ${index + 1}: Missing required fields`);
          }

          // Validate node references exist
          if (!nodeIds.has(conn.fromNode) || !nodeIds.has(conn.toNode)) {
            throw new Error(`Connection ${index + 1}: References non-existent nodes`);
          }

          return {
            id: String(conn.id),
            fromNode: String(conn.fromNode),
            toNode: String(conn.toNode),
            fromPoint: {
              x: Number(conn.fromPoint?.x) || 0,
              y: Number(conn.fromPoint?.y) || 0
            },
            toPoint: {
              x: Number(conn.toPoint?.x) || 0,
              y: Number(conn.toPoint?.y) || 0
            }
          };

        } catch (error) {
          console.warn(`Connection ${index + 1} validation failed:`, error);
          return null;
        }
      })
      .filter((conn): conn is Connection => conn !== null);
  }

  /**
   * Validate and clean canvas state
   */
  private static validateCanvasState(canvasState: any): CanvasState {
    return {
      zoom: Math.max(50, Math.min(200, Number(canvasState?.zoom) || 100)),
      panX: Number(canvasState?.panX) || 0,
      panY: Number(canvasState?.panY) || 0
    };
  }

  /**
   * Helper methods for default values
   */
  private static getDefaultWidth(type: string): number {
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

  private static getDefaultHeight(type: string): number {
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

  private static getDefaultText(type: string): string {
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

  private static getDefaultColor(type: string): string {
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

  /**
   * Export current board as single file
   */
  static async exportCurrentBoard(board: Board): Promise<void> {
    const exportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      boards: [board],
      metadata: {
        name: `Board: ${board.name}`,
        description: `Single board export - ${board.data.nodes.length} nodes, ${board.data.connections.length} connections`,
        nodeCount: board.data.nodes.length,
        connectionCount: board.data.connections.length,
        boardCount: 1
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `soodo-board-${board.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
  }
}