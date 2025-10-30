export interface Board {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  data: BoardData;
}

export type NodeType = 'start' | 'end' | 'process' | 'decision' | 'loop' | 'variable';

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export type ActionType = 'add_node' | 'delete_node' | 'move_node' | 'update_node' | 'add_connection' | 'delete_connection' | 'update_connection' | 'canvas_move' | 'zoom';

export interface Action {
  id: string;
  type: ActionType;
  timestamp: number;
  data: any;
  reverseData?: any;
}

export interface Connection {
  id: string;
  fromNode: string;
  toNode: string;
  fromPoint: { x: number; y: number };
  toPoint: { x: number; y: number };
  label?: string;
  curvature?: number; // optional curvature factor for path shape
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Optional richer content for chat rendering
  contentType?: 'text' | 'tasks' | 'code' | 'image' | 'mixed';
  tasksPayload?: Task[];
  codePayload?: GeneratedCode;
  imagesPayload?: { name: string; dataUrl: string }[];
}

export interface GeneratedCode {
  filename: string;
  language: string;
  code: string;
  lineNumbers: number[];
}

export interface BoardData {
  nodes: Node[];
  connections: Connection[];
  canvasState: CanvasState;
}
