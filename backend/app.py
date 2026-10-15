from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, StrictInt

from .engine import RuleError, new_game, private_view, public_view
from .speech import Speech
from .store import Store

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.2.1"


class CreateGame(BaseModel):
    model_config = ConfigDict(extra="forbid")
    counts: dict[str, StrictInt]
    rules: dict[str, Any] = Field(default_factory=dict)


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: StrictInt = Field(ge=0)
    action: str = Field(max_length=24)
    data: dict[str, Any] = Field(default_factory=dict)


def create_app(database=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(database or os.environ.get("WOLFMAN_DB", str(ROOT / "data" / "games.sqlite3")))
        app.state.speech = Speech()
        yield

    app = FastAPI(title="Moonfall · 狼人殺", version=VERSION, lifespan=lifespan, docs_url=None, redoc_url=None)
    auth = HTTPBearer(auto_error=False)

    def token(credentials: HTTPAuthorizationCredentials | None = Depends(auth)):
        if credentials is None:
            raise HTTPException(401, "需要遊戲通行證。")
        return credentials.credentials

    @app.middleware("http")
    async def security(request: Request, call_next):
        # Same-origin app; refuse cross-site mutations, including game creation.
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = request.headers.get("origin")
            if origin and origin != str(request.base_url).rstrip("/"):
                return JSONResponse({"detail": "Cross-origin requests are disabled."}, status_code=403)
            try:
                length = int(request.headers.get("content-length", "0"))
            except ValueError:
                return JSONResponse({"detail": "Invalid content length."}, status_code=400)
            if length > 32768:
                return JSONResponse({"detail": "Request too large."}, status_code=413)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Moonfall-Version"] = VERSION
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
        return response

    @app.exception_handler(RuleError)
    async def rule_error(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=409)

    @app.exception_handler(PermissionError)
    async def permission_error(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=403)

    @app.exception_handler(LookupError)
    async def missing(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=404)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": VERSION}

    @app.post("/api/games", status_code=201)
    def create(body: CreateGame):
        state = new_game(body.counts, body.rules)
        game_id, host, viewer = app.state.store.create(state)
        return {"id": game_id, "host_token": host, "viewer_token": viewer, "state": public_view(state)}

    @app.get("/api/games/{game_id}")
    def view(game_id: str, credential=Depends(token)):
        return public_view(app.state.store.get(game_id, credential))

    @app.get("/api/games/{game_id}/private")
    def private(game_id: str, credential=Depends(token)):
        return private_view(app.state.store.get(game_id, credential, host_only=True))

    @app.post("/api/games/{game_id}/actions")
    def action(game_id: str, body: Action, credential=Depends(token)):
        return public_view(app.state.store.update(game_id, credential, body.version, body.action, body.data))

    @app.get("/api/games/{game_id}/debug")
    def debug(game_id: str, credential=Depends(token)):
        state = app.state.store.get(game_id, credential, host_only=True)
        return {"version": state["version"], "phase": state["phase"], "players": state["players"],
                "potions": {"save_used": state["save_used"], "poison_used": state["poison_used"]},
                "night": {"kill": state["kill"], "poison": state["poison"], "inspection": state["inspection"]}}

    @app.get("/api/games/{game_id}/audio")
    async def audio(game_id: str, credential=Depends(token)):
        state = app.state.store.get(game_id, credential)
        # Only fixed public prompts can reach the online speech provider.
        import asyncio
        try:
            result = await asyncio.wait_for(app.state.speech.synthesize(public_view(state)["narration"]), 18)
        except TimeoutError:
            result = None
        if result is None:
            raise HTTPException(503, "語音暫時不可用，請使用畫面字幕。")
        return Response(result, media_type="audio/mpeg")

    app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
    return app


app = create_app()
