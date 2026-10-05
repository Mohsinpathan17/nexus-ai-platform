# NEXUS — Autonomous AI Software Engineering & Operations Platform

NEXUS is a portfolio-grade prototype of an AI control plane for software engineering and operations.

## Flagship demo

> Investigate why checkout is returning HTTP 500 after yesterday's deployment and fix it if safe.

The deterministic demo follows:

`HTTP 500 → logs → repository → database → root cause → sandbox patch → tests → security → evaluator → PR proposal → human approval`

It deliberately does **not** claim unrestricted production access. Production deployment remains behind a human approval gate.

## Architecture

```text
React + Three.js UI
        │
        ▼
FastAPI API ───── WebSocket mission stream
        │
        ▼
NEXUS Orchestrator
  ├── Investigator
  ├── Engineer
  ├── Tester
  ├── Security
  └── Evaluator
        │
        ▼
Controlled Tool Layer
  ├── Repository
  ├── Logs
  ├── Database
  ├── Tests
  ├── Security
  └── Deployment
        │
        ▼
Risk / Policy Engine
        ├── ALLOW
        ├── LOG
        ├── REVIEW
        └── BLOCK
```

## Run locally

### Prerequisites

- Python 3.13+
- Node 20+
- npm

### 1) Backend

```bash
cd apps/api
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173`.

## Docker / real project run

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

docker compose up --build
```

This runs the API and the React app as a single deployment unit without hardcoding a wildcard CORS policy.

## Cloud deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deploying the frontend to Vercel and the FastAPI backend to Render.

## Project commands

```bash
make install
make test
make dev
make docker-up
```

## API

- `GET /api/health`
- `POST /api/runs`
- `GET /api/runs/{run_id}`
- `GET /api/runs/{run_id}/timeline`
- `GET /api/runs/{run_id}/evidence`
- `GET /api/runs/{run_id}/diff`
- `POST /api/runs/{run_id}/approve`
- `POST /api/runs/{run_id}/reject`
- `GET /api/metrics`
- `WS /api/runs/{run_id}/stream`

## Security principles

- no unrestricted production shell
- destructive actions are blocked
- production deployment requires approval
- tool calls are recorded
- risk is evaluated before execution
- demo capabilities are explicitly simulated
- private chain-of-thought is never exposed

## Next upgrades

1. GitHub App integration
2. Docker sandbox for generated patches
3. PostgreSQL + pgvector
4. Redis event bus
5. MCP server implementation
6. LangGraph orchestration
7. OpenTelemetry/Langfuse
8. Real GitHub PR creation
9. Benchmark runner
10. Staging deployment with approval gate
