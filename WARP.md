# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Soodo Code** is a production-ready visual programming environment built with React + TypeScript + Vite. It enables users to create flowcharts with 6 node types (Start, End, Process, Decision, Loop, Variable), connect them visually, and generate executable code from the flowchart logic. The application features a sophisticated undo/redo system, file import/export capabilities, and an AI assistant for code generation and help.

**Tech Stack**: React 18, TypeScript 5.6, Vite 6, Tailwind CSS, Radix UI components, pnpm package manager

## Development Commands

### Essential Commands
```powershell
# Install dependencies (uses pnpm with offline cache preference)
pnpm install
# or use the convenience script:
pnpm run install-deps

# Start development server with HMR
pnpm run dev

# Build for production
pnpm run build

# Build for GitHub Pages deployment
pnpm run build:gh-pages

# Lint the codebase
pnpm run lint

# Preview production build locally
pnpm run preview

# Clean build artifacts and dependencies
pnpm run clean
```

### Package Manager
This project uses **pnpm** exclusively. All scripts include `pnpm install --prefer-offline` to ensure dependencies are available before execution. Never use npm or yarn.

### No Test Framework
This project does not currently have a test framework configured. Do not attempt to run tests with jest, vitest, or similar tools.

## Architecture Overview

### State Management Pattern
The application uses a **centralized state pattern** in `App.tsx` with specialized utility classes for complex operations:

- **App.tsx**: Central state container holding all boards, canvas states, and UI flags
- **HistoryManager** (`utils/historyManager.ts`): Action-based undo/redo system with 50-action limit and board isolation
- **FileOperations** (`utils/fileOperations.ts`): Complete import/export with multi-layer validation

State flows unidirectionally from App.tsx down through props, with callbacks bubbling actions back up.

### Board-Centric Data Model
```typescript
Board {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  data: {
    nodes: Node[]           // 6 types: start, end, process, decision, loop, variable
    connections: Connection[] // Bezier curve connections between nodes
    canvasState: { zoom, panX, panY }
  }
}
```

Each board maintains its own isolated canvas state, nodes, and connections. History actions are tagged with `boardId` for proper isolation during undo/redo.

### Component Hierarchy
```
App.tsx (root state container)
├── Header.tsx (top bar with logo, actions)
├── BoardSidebar.tsx (left: board management, file ops)
├── FlowchartCanvas.tsx (main canvas: node/connection rendering & interactions)
│   ├── Node rendering with SVG shapes
│   ├── Connection path calculations (Bezier curves)
│   ├── Drag & drop, pan/zoom, keyboard shortcuts
│   └── Inline text editing
├── Toolbar.tsx (right: node palette, zoom controls)
├── AIAssistant.tsx (right sidebar: chat interface, code generation)
├── SettingsModal.tsx (configuration for API providers)
└── TutorialOverlay.tsx (first-time user guidance)
```

### Key Utility Modules

**historyManager.ts**: Action recording system with reverse operations
- Records every user action (add/delete/move/update) with reverse data
- Applies/unapplies actions to boards array
- Board-specific action isolation via `boardId`
- Used by: All state-modifying operations in App.tsx

**fileOperations.ts**: Import/export with validation
- Export: Serializes all boards to JSON with metadata
- Import: Validates structure, node types, connection references
- Generates unique IDs on import to prevent conflicts
- Used by: BoardSidebar.tsx for file menu actions

**codeGenerator.ts**: Flowchart-to-code transpilation
- Analyzes node types and connections to generate executable code
- Supports Python, JavaScript, and generic pseudocode
- Creates functions for process nodes, conditionals for decisions
- Used by: AIAssistant.tsx for "Generate Code" feature

**connectors.ts**: Connection path calculations
- Bezier curve generation between node ports
- Port position calculations (top/bottom/left/right of nodes)
- Hover detection and connection validation
- Used by: FlowchartCanvas.tsx for rendering and interactions

**validation.ts**: Data integrity functions
- Node validation (type checking, position sanitization)
- Connection validation (endpoint reference integrity)
- Action data sanitization for history system
- Error handling wrappers for robust operations

### AI Assistant Integration

The AI assistant (`AIAssistant.tsx`) supports multiple providers:
- **OpenAI** (gpt-4o-mini, gpt-4, etc.)
- **Anthropic** (Claude models)
- **Google Gemini** (gemini-1.5-flash, etc.)
- **Custom endpoints** (including Supabase Edge Functions)

Configuration is stored in `localStorage` under `soodo-settings`. The assistant:
1. Sends flowchart context (nodes, connections, boardName) with each request
2. Parses structured responses for tasks and code blocks
3. Falls back to OpenAI-compatible format for custom endpoints
4. Currently uses **simulated responses** when no API key is configured

**Real AI requires**: API key configuration via SettingsModal. See `AI_API_REQUIRED.md` for setup.

### Canvas Interaction Model

**FlowchartCanvas.tsx** implements a sophisticated interaction system:

- **Pan**: Middle-mouse, Ctrl+drag, or "Hand Tool" mode
- **Zoom**: Mouse wheel (50-200% range)
- **Node drag**: Click and drag nodes (snaps to 10px grid)
- **Connect**: Drag from node edge to another node
- **Edit text**: Double-click node to edit inline
- **Delete**: Delete key (node or connection)
- **Escape**: Cancel current operation

All interactions record history actions for undo/redo support.

## Important Patterns

### Adding a New Action Type
1. Add action type to `ActionType` union in `types/index.ts`
2. Implement `recordXXX()` method in `HistoryManager` with reverse data
3. Add case to `applyAction()` and `applyReverseAction()` in HistoryManager
4. Call `HistoryManager.recordXXX()` after state mutation in App.tsx
5. Update `historyState` with `canUndo/canRedo` flags

### File Operations Pattern
All file operations use `FileOperations` static methods:
- Exports create Blob → download link → trigger click → cleanup
- Imports open file picker → read text → validate → return ImportResult
- Validation is multi-layer: structure → nodes → connections → canvas
- Always generate new IDs on import to prevent board ID conflicts

### Node Type System
The 6 node types have different dimensions and colors:
- **start/end**: 120×60, green/red
- **process**: 180×80, yellow (rectangle)
- **decision**: 150×80, blue (diamond)
- **loop**: 180×100, purple
- **variable**: 140×70, orange

When adding nodes, respect these defaults in `getNodeDefaultText/Color/Width/Height()`.

## Configuration Files

### Environment Variables (.env)
```env
VITE_SUPABASE_URL=           # Optional Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Optional Supabase anon key
VITE_OPENAI_API_KEY=         # Optional OpenAI key
VITE_ANTHROPIC_API_KEY=      # Optional Anthropic key
VITE_GEMINI_API_KEY=         # Optional Google AI key
```

**Never commit .env files**. Use `.env.example` as template.

### Vite Configuration
- **Base path**: Configurable via `GITHUB_PAGES` env var for deployment
- **Source identifier plugin**: Adds `data-matrix` attributes in dev (disabled in prod)
- **Path alias**: `@/` maps to `./src/`

### TypeScript Configuration
- **Project references**: Split into `tsconfig.app.json` (src) and `tsconfig.node.json` (vite config)
- **Strict mode**: Enabled
- **Path alias**: `@/*` for src imports

### Tailwind Configuration
Uses Tailwind v3.4.16 with:
- `tailwindcss-animate` plugin for animations
- Radix UI color palette
- Custom component styles in `src/index.css`

## GitHub Pages Deployment

Automated via `.github/workflows/deploy.yml`:
1. Trigger: Push to `main` or `master`
2. Install pnpm, Node 18, dependencies
3. Build with `GITHUB_PAGES=true` flag
4. Upload artifact to GitHub Pages

**Manual deploy**: `GITHUB_PAGES=true pnpm run build` then push `dist/` to `gh-pages` branch.

**Base path**: GitHub repository slug is `/Soosdo/`, but the product name is **Soodo Code**. Update the base path in `vite.config.ts` if you rename the repository.

## Known Limitations

1. **No test coverage**: Testing framework not configured
2. **AI requires API keys**: Assistant uses simulated responses without real API configuration
3. **No database persistence**: All data is client-side (localStorage for settings only)
4. **Single-user**: No collaboration or sharing features
5. **Windows development**: Project developed on Windows with PowerShell; adjust commands for Unix shells

## Common Development Scenarios

### Adding a New Node Type
1. Add type to `NodeType` union in `types/index.ts`
2. Update `getNodeDefaultText/Color/Width/Height()` in `App.tsx` and `fileOperations.ts`
3. Add validation case in `fileOperations.validateNodes()`
4. Update color palette in `Toolbar.tsx` node buttons
5. Update code generator in `codeGenerator.ts` to handle new type

### Modifying Canvas Interactions
- All canvas mouse/keyboard handlers are in `FlowchartCanvas.tsx`
- Use `canvasRef` for coordinate transformations (account for pan/zoom)
- Always call history recording after state changes
- Update cursor styles in CSS for new tools

### Integrating a New AI Provider
1. Add provider to `apiProvider` type in `AIAssistant.tsx`
2. Implement request handler in `callChatAPI()` function
3. Add detection logic in `getSettings()` for auto-detection
4. Update `SettingsModal.tsx` UI with new provider option
5. Document required API key format in `AI_API_REQUIRED.md`

### Customizing Export Format
- Modify `ExportData` interface in `fileOperations.ts`
- Update `exportToFile()` to include new fields
- Add validation in `parseImportedData()` for backwards compatibility
- Increment `EXPORT_VERSION` constant if breaking changes

## Performance Considerations

- **History limit**: 50 actions max to prevent memory bloat
- **Grid snapping**: 10px grid reduces coordinate variations
- **Connection rendering**: Only validates visible connections
- **Canvas updates**: Use `useCallback` to prevent unnecessary re-renders
- **File operations**: Client-side only (no server processing)

## Code Style

- **Components**: Functional components with hooks
- **State**: Props drilling with callbacks (no Context/Redux)
- **Imports**: Absolute imports via `@/` alias preferred
- **Error handling**: Try-catch with console.warn in utilities
- **Validation**: Defensive programming with fallback defaults
- **Comments**: Inline for complex logic, JSDoc for utility functions
