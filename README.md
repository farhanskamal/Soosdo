# Soodo Code

Soodo Code is a visual programming environment for designing logic as flowcharts and turning it into real code.

You create **boards** made of nodes (Start, End, Process, Decision, Loop, Variable) and connect them visually. An AI assistant can then help you analyze the flow, suggest improvements, and generate code.

---

## Features

- **Board-based visual editor**
  - Multiple boards (e.g., Login System, Movement System, Combat System)
  - Drag-and-drop nodes on a snapping grid
  - Connect nodes with labeled arrows, reconnection, and deletion
  - Pan and zoom the board without distorting node sizes

- **History & safety**
  - Undo/redo via a centralized `HistoryManager`
  - Defensive validation for nodes, connections, and imported files

- **AI assistant (optional)**
  - Chat about your current board and its logic
  - Generate code locally or via a backend endpoint (e.g., Supabase function)
  - Supports multiple providers: OpenAI, Anthropic, Gemini, HuggingFace, or custom HTTP endpoints

- **Import/export**
  - Export all boards or a single board as JSON
  - Import boards from JSON with validation and ID de-duplication

---

## Getting started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) installed globally (`npm install -g pnpm`)

### Install dependencies

```bash
pnpm install
```

### Run the app in development

```bash
pnpm run dev
```

This starts Vite’s dev server. Open the URL it prints (typically `http://localhost:5173`).

### Build for production

```bash
pnpm run build
```

To preview the production build locally:

```bash
pnpm run preview
```

> Note: There is currently no automated test suite configured.

---

## Boards, nodes, and connections

- A **Board** contains:
  - `nodes`: visual blocks in your flowchart
  - `connections`: directed edges between nodes
  - `canvasState`: `zoom`, `panX`, `panY` controlling the view
- Node types:
  - **start/end** – rounded, entry/exit points
  - **process** – rectangular steps
  - **decision** – diamond-shaped conditionals
  - **loop** – loop constructs
  - **variable** – state / data nodes

You can:
- **Add nodes** via the toolbar or by using shortcuts on the board
- **Drag** nodes; they snap to a grid for clean alignment
- **Connect** nodes by dragging from the output handle of one to the input of another
- **Rename** boards and manage them from the left sidebar

---

## AI configuration

Real AI responses are **optional** and disabled by default.

Settings are stored in `localStorage` under the key `soodo-settings` and can be edited via the **Settings** button in the header.

In the Settings modal you can configure:

- **Theme**: `light`, `dark`, or `system`
- **Chat provider**:
  - `auto` (detect from API key/endpoint)
  - `openai`, `anthropic`, `gemini`, `huggingface`, `supabase`, `custom`, or `none`
- **Code provider**:
  - `local` – generate code in the browser using the bundled generator
  - `supabase` or `custom` – call a backend function/endpoint
- **API key** and **endpoints**:
  - Chat endpoint for the assistant
  - Code endpoint (e.g., Supabase Edge Function `flowchart-to-code`)

If no valid provider is configured, the assistant returns a simulated response explaining that you still need to configure an API key.

---

## Theming

Soodo Code supports light, dark, and system themes:

- The current theme is read from `soodo-settings` on startup.
- The root `<html>` element is toggled with a `.dark` class for dark mode.
- You can switch themes at any time from the Settings modal.

You can further customize colors in `src/index.css` where the main Soodo Code color tokens are defined.

---

## Project structure (high level)

- `src/App.tsx` – main app shell; manages boards, history, and layout
- `src/components/FlowchartCanvas.tsx` – the board for nodes and connections (pan/zoom, drag, connect)
- `src/components/Toolbar.tsx` – floating toolbar (zoom, add node, import/export)
- `src/components/BoardSidebar.tsx` – board list, create/rename/delete
- `src/components/AIAssistant.tsx` – chat + code generation side panel
- `src/components/SettingsModal.tsx` – configuration for theme and AI providers
- `src/utils/historyManager.ts` – undo/redo engine
- `src/utils/fileOperations.ts` – import/export of boards
- `supabase/functions/*` – optional backend functions (`chat-proxy`, `flowchart-to-code`)

---

## Deployment

For GitHub Pages or static hosting, you typically:

1. Build the app (`pnpm run build` or `pnpm run build:gh-pages`).
2. Serve the `dist/` folder from your hosting provider.
3. Ensure the `base` path in `vite.config.ts` matches your repository/hosting path.

See `DEPLOYMENT.md`, `HOSTING_SUMMARY.md`, and `.github/workflows/deploy.yml` for more detailed deployment notes.
