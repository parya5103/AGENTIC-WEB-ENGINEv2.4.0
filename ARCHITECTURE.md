# NicheFlow AI Architecture

This document describes the complete architecture for NicheFlow AI as requested:

## 1. System Architecture
NicheFlow AI uses a multi-agent orchestrated system:
- **Frontend**: Vite + React + Tailwind CSS + Framer Motion
- **Backend**: Express + Socket.io + Node.js
- **AI Runtime**: Local Ollama model running `qwen2.5:7b` with cloud fallbacks
- **Agent Orchestration**: Docker-based agents orchestrating through Node.js Event Queues
- **Database**: In-memory / SQLite / JSON file fallback for persistence (`storage.json`)
- **Automation**: Docker scheduler containers triggering backend endpoints to process Agent Tasks
- **Deployment**: Docker Compose for multi-container orchestration.

## 2. Folder Structure
```
nicheflow/
├── Dockerfile                  # Application build rules
├── docker-compose.yml          # Multi-container setup (app, workers, ollama, db)
├── package.json                # Dependencies and scripts
├── server.ts                   # Backend Express & Socket.io server
├── agents.ts                   # Agent Orchestration logic
├── lib/
│   ├── server/
│   │   ├── intelligence.ts     # AI Router & Ollama integration
│   │   └── renderer.ts         # Dynamic HTML Rendering (SEO-optimized)
│   └── ...                     # Client utils
├── src/
│   ├── App.tsx                 # Frontend Dashboard
│   ├── components/             # React UI components
│   └── ...                     # Frontend assets
├── dist/                       # Compiled Vite frontend
└── storage.json                # Local database fallback
```

## 3. Docker Setup
We use `docker-compose.yml` to orchestrate:
- `app`: Main backend server & frontend static hosting
- `ollama`: Official Ollama image to run AI models locally
- `database`: PostgreSQL or SQLite storage
- `seo-worker`, `content-worker`, `scheduler`: Worker containers assigned specific sub-tasks via environment variables.

## 4. Ollama Integration
Ollama is integrated as the primary AI engine in `lib/server/intelligence.ts`.
It prioritizes local API calls to `http://ollama:11434/api/chat` before falling back to external providers (Qwen, Gemini, Nemotron).
Payload Example:
```json
{
  "model": "qwen2.5:7b",
  "messages": [ { "role": "user", "content": "Generate SEO article" } ]
}
```

## 5. Backend Code
Built on Express.js and Socket.io in `server.ts`.
Key responsibilities:
- Managing the task queue (`AgentOrchestrator`).
- Rendering server-side SEO HTML pages (`/cat/:slug`).
- Handling real-time updates to the dashboard via WebSockets.

## 6. Frontend Code
Built with React and Tailwind in Vite.
Key components:
- `App.tsx`: Main Dashboard showing system state.
- Live updates of Active Agents via WebSockets (`init` payload).
- Control panel to Forge new niches manually.

## 7. SEO System
SEO is handled via `lib/server/renderer.ts`.
- Pre-renders static HTML for web crawlers.
- Generates semantically structured content with appropriate header tags (H1, H2, H3).
- Implements semantic internal linking arrays through category mappings.

## 8. Automation Workflow
1. The `scheduler` container runs periodic pings to the API endpoints (`/api/start`, `/api/categories/refresh`).
2. `AgentOrchestrator` queues tasks (`TREND_RESEARCH`, `CONTENT_WRITER`, `MONETIZATION`).
3. Workers listen to the queue, requesting AI completions via Ollama.
4. Finalized output is stored and rendered live.

## 9. Deployment Steps
1. Ensure Docker and Docker Compose are installed.
2. Clone the repository.
3. Run `docker-compose up --build -d` to launch the entire stack.
4. Expose port `3000` via Nginx or Cloudflare Tunnels to a public domain.
5. Ollama will automatically pull `qwen2.5:7b` upon first request (requires setup script execution or manual pull: `docker exec -it nicheflow-ollama-1 ollama pull qwen2.5:7b`).

## 10. Monetization Setup
AdSense integration is built directly into the HTML templates in `lib/server/renderer.ts`:
- Uses the `EMPIRE` client ID placeholder.
- Specific High-Yield and Deployment areas are demarcated in the HTML output.
- Structured organically around generated content to comply with AdSense Helpful Content policies.

## 11. Scaling Strategy
- **Horizontal Scaling**: Launch more `content-worker` containers to process tasks concurrently.
- **AI Throughput**: Allocate dedicated GPUs to the Ollama container or split Ollama across multiple nodes behind a load balancer.
- **Database Scaling**: Migrate `storage.json` to a robust PostgreSQL cluster to handle massive category trees.
