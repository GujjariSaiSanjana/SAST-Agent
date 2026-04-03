# Enterprise SAST Copilot

A production-grade, AI-powered Static Application Security Testing (SAST) copilot.
Combines the speed of Bearer CLI with the intelligence of LLMs (Gemini / OpenAI) to find, explain, and fix vulnerabilities.

## Architecture

![Architecture](https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/GraphQL_Logo.svg/1200px-GraphQL_Logo.svg.png) <!-- Placeholder -->

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, Monaco Editor.
*   **Backend**: Node.js, Express, TypeScript, Prisma ORM, Bull MQ, SSE.
*   **Database**: PostgreSQL
*   **Cache & Queue**: Redis
*   **SAST Engine**: Bearer CLI
*   **AI Engine**: Gemini 1.5 Flash (Primary) + OpenAI GPT-4o-mini (Fallback)

## Quick Start (Docker)

1. Rename `backend/.env.example` to `backend/.env` and fill in your keys (GitHub OAuth, Gemini, OpenAI).
2. Run from the root directory:
   ```bash
   docker-compose up --build -d
   ```
3. Access the dashboard at `http://localhost:5173`
4. The backend API runs at `http://localhost:3001`

## Local Development

### Backend
```bash
cd backend
npm install
# Start Postgres/Redis via docker-compose ideally or locally
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Highlights
- **Resilient AI Pipeline**: Uses Gemini as primary analyzer for high-speed low-cost inference, automatically gracefully gracefully degrading to GPT-4o-mini on rate limits or errors.
- **Batched Processing**: Processes vulnerabilities in batches of 5 to protect rate limits while being efficient.
- **Live Streaming**: Frontend consumes real-time SSE streams to show granular scanning phase updates.
- **Premium UI**: Deep dark mode, animated entry states, Rechart severity breakdowns, and integrated Monaco Editor for codebase visualization.
