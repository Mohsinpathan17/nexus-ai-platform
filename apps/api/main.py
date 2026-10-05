import asyncio
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_service import authenticate_user, create_access_token, get_current_user, get_password_hash
from database import Base, database_health, engine, get_db
from models import User
from nexus.engine import NexusEngine
from nexus.store import MissionStore
from redis_client import redis_health

load_dotenv()


def build_allowed_origins(raw: str | None = None) -> list[str]:
    value = raw if raw is not None else os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    origins = [origin.strip() for origin in value.split(",") if origin.strip()]
    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


Base.metadata.create_all(bind=engine)

app = FastAPI(title="NEXUS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=build_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
store = MissionStore()
engine_runtime = NexusEngine(store)


class RunRequest(BaseModel):
    task: str = "Investigate why checkout is returning HTTP 500 after yesterday's deployment and fix it if safe."


class DecisionRequest(BaseModel):
    note: str = ""


class UserCreateRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "nexus-api",
        "mode": os.getenv("NEXUS_DEMO_MODE", "true"),
        "database": database_health(),
        "redis": redis_health(),
    }


@app.post("/api/auth/register", response_model=TokenResponse)
def register_user(payload: UserCreateRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    user = User(email=email, password_hash=get_password_hash(payload.password), full_name=payload.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.email)
    return TokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(user.email)
    return TokenResponse(access_token=token)


@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)) -> dict:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
    }


@app.post("/api/runs")
async def create_run(req: RunRequest):
    run = store.create_run(req.task)
    asyncio.create_task(engine_runtime.execute(run["id"]))
    return run


@app.get("/api/runs/{run_id}")
def get_run(run_id):
    r = store.get(run_id)
    if not r:
        raise HTTPException(404, "Mission not found")
    return r


@app.get("/api/runs/{run_id}/timeline")
def timeline(run_id):
    return store.timeline(run_id)


@app.get("/api/runs/{run_id}/evidence")
def evidence(run_id):
    return store.evidence(run_id)


@app.get("/api/runs/{run_id}/diff")
def diff(run_id):
    r = store.get(run_id)
    if not r:
        raise HTTPException(404, "Mission not found")
    return {"diff": r["diff"], "files": r["changed_files"]}


@app.post("/api/runs/{run_id}/approve")
def approve(run_id, req: DecisionRequest):
    return engine_runtime.approve(run_id, req.note)


@app.post("/api/runs/{run_id}/reject")
def reject(run_id, req: DecisionRequest):
    return engine_runtime.reject(run_id, req.note)


@app.get("/api/metrics")
def metrics():
    return store.metrics()


@app.websocket("/api/runs/{run_id}/stream")
async def stream(ws: WebSocket, run_id: str):
    await ws.accept()
    last = 0
    try:
        while True:
            events = store.timeline(run_id)
            if len(events) > last:
                for e in events[last:]:
                    await ws.send_json(e)
                last = len(events)
            r = store.get(run_id)
            if r and r["status"] in {"completed", "awaiting_approval", "rejected", "failed"}:
                await ws.send_json({"type": "mission_state", "status": r["status"]})
                break
            await asyncio.sleep(0.35)
    except WebSocketDisconnect:
        pass
