import asyncio
from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, StrictInt

from .engine import NARRATION, NARRATION_EN, RuleError, new_game, private_view, public_view, witch_potions, morning_report, narration
from .speech import PROFILES, Speech, speech_profile
from .store import Store
from . import rooms

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.8.0"


class CreateGame(BaseModel):
    model_config = ConfigDict(extra="forbid")
    counts: dict[str, StrictInt]
    rules: dict[str, Any] = Field(default_factory=dict)
    mode: Literal["single", "multi", "remote"] = "multi"


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: StrictInt = Field(ge=0)
    action: str = Field(max_length=24)
    debug: bool = False
    data: dict[str, Any] = Field(default_factory=dict)


class JoinRoom(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invite: str = Field(min_length=20, max_length=100)
    seat: StrictInt | None = Field(default=None, ge=1, le=16)
    name: str = Field(default="", max_length=32)


class RoomCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    command: Literal["mode", "invite", "approve", "revoke"]
    data: dict[str, Any] = Field(default_factory=dict)


class PlayerAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    turn_key: str = Field(max_length=300)
    action: str = Field(max_length=24)
    data: dict[str, Any] = Field(default_factory=dict)


class Speaker(BaseModel):
    model_config = ConfigDict(extra="forbid")
    device: str = Field(min_length=20, max_length=64)


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    channel: Literal["public", "wolves"]
    text: str = Field(min_length=1, max_length=500)


def create_app(database=None, preload_audio=False):
    @asynccontextmanager
    async def lifespan(app):
        database_url = os.environ.get("DATABASE_URL") if database is None else None
        if database_url:
            from .postgres_store import PostgresStore
            app.state.store = PostgresStore(database_url)
            audio_root = ROOT / "data"
        else:
            app.state.store = Store(database or os.environ.get("WOLFMAN_DB", str(ROOT / "data" / "games.sqlite3")))
            audio_root = Path(app.state.store.path).parent
        directory = os.environ.get("WOLFMAN_AUDIO_CACHE", str(audio_root / "audio-cache"))
        app.state.speech = Speech(directory)
        warmup = asyncio.create_task(app.state.speech.warm(NARRATION.values())) if preload_audio else None
        try:
            yield
        finally:
            if warmup:
                warmup.cancel()
                await asyncio.gather(warmup, return_exceptions=True)
            await app.state.speech.close()

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
        # Allow only the shipped SVG animation style, without enabling inline styles elsewhere.
        if request.url.path == "/assets/forest.svg":
            response.headers["Content-Security-Policy"] = response.headers["Content-Security-Policy"].replace(
                "style-src 'self'", "style-src 'self' 'sha256-2bHWQKsHk0UdNI3L3wnc5pq60w9QdmfbznC8sJCksgc='")
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
        rooms.network(state).update(mode="single" if body.mode == "single" else "multi", remote=body.mode == "remote")
        rooms.ensure_host(state)
        state["version"] = 0
        game_id, host, viewer = app.state.store.create(state)
        return {"id": game_id, "host_token": host, "viewer_token": viewer, "state": public_view(state)}

    @app.get("/api/games/{game_id}")
    def view(game_id: str, credential=Depends(token)):
        return public_view(app.state.store.get(game_id, credential))

    @app.get("/api/games/{game_id}/private")
    def private(game_id: str, credential=Depends(token)):
        state = app.state.store.get(game_id, credential, host_only=True)
        info = private_view(state)
        if state["phase"] not in ("witch", "seer") or info["active"]:
            rooms.guard_private(state)
        if state["phase"] == "wolves" and rooms.mode(state) == "multi":
            info["choices"] = rooms.network(state)["wolf_votes"]
        return info

    @app.post("/api/games/{game_id}/actions")
    def action(game_id: str, body: Action, credential=Depends(token)):
        return public_view(app.state.store.update(game_id, credential, body.version, body.action, body.data, debug=body.debug))

    @app.get("/api/games/{game_id}/cover")
    def cover(game_id: str, credential=Depends(token)):
        state = app.state.store.get(game_id, credential, host_only=True)
        return {"active": private_view(state).get("active", True)}

    @app.get("/api/games/{game_id}/room")
    def room_view(game_id: str, credential=Depends(token)):
        return rooms.host_view(app.state.store.get(game_id, credential, host_only=True))

    @app.post("/api/games/{game_id}/room")
    def room_command(game_id: str, body: RoomCommand, credential=Depends(token)):
        def operation(g, host, viewer):
            rooms.authorize(credential, host)
            return rooms.host_operation(g, body.command, body.data)
        return app.state.store.mutate(game_id, operation)

    @app.post("/api/games/{game_id}/join", status_code=201)
    def join_room(game_id: str, body: JoinRoom):
        return app.state.store.mutate(game_id, lambda g, *_: rooms.join(g, body.invite, body.seat, body.name))

    @app.post("/api/games/{game_id}/speaker")
    def speaker(game_id: str, body: Speaker, credential=Depends(token)):
        def operation(g, host, viewer):
            rooms.authorize(credential, host)
            return rooms.claim_speaker(g, body.device)
        return app.state.store.mutate(game_id, operation)

    @app.get("/api/games/{game_id}/player")
    def player_state(game_id: str, credential=Depends(token)):
        g, _, _ = app.state.store.read_record(game_id)
        return rooms.player_view(g, credential)

    @app.post("/api/games/{game_id}/host-player")
    def host_player(game_id: str, credential=Depends(token)):
        def operation(g, host, viewer):
            rooms.authorize(credential, host)
            key = rooms.ensure_host(g)
            return rooms.player_view(g, "", member_key=key)
        return app.state.store.mutate(game_id, operation)

    @app.get("/api/games/{game_id}/host-player/private")
    def host_player_private(game_id: str, credential=Depends(token)):
        g = app.state.store.get(game_id, credential, host_only=True)
        key = rooms.host_key(g)
        if key is None:
            raise HTTPException(409, "請先分配主持人座位。 / Initialize the host seat first.")
        return rooms.player_view(g, "", True, member_key=key)

    @app.post("/api/games/{game_id}/host-player/actions")
    def host_player_action(game_id: str, body: PlayerAction, credential=Depends(token)):
        def operation(g, host, viewer):
            rooms.authorize(credential, host)
            key = rooms.ensure_host(g)
            return rooms.player_action(g, "", body.turn_key, body.action, body.data, member_key=key)
        return app.state.store.mutate(game_id, operation)

    @app.get("/api/games/{game_id}/player/private")
    def player_private(game_id: str, credential=Depends(token)):
        g, _, _ = app.state.store.read_record(game_id)
        return rooms.player_view(g, credential, True)

    @app.post("/api/games/{game_id}/player/actions")
    def player_act(game_id: str, body: PlayerAction, credential=Depends(token)):
        return app.state.store.mutate(game_id, lambda g, *_: rooms.player_action(g, credential, body.turn_key, body.action, body.data))

    @app.get("/api/games/{game_id}/debug")
    def debug(game_id: str, credential=Depends(token)):
        state = app.state.store.get(game_id, credential, host_only=True)
        potions = {"save_used": state["save_used"], "poison_used": state["poison_used"]}
        if state["rules"].get("fun_mode"):
            potions["by_seat"] = {str(p["seat"]): witch_potions(state,p["seat"]) for p in state["players"] if p["role"] == "witch"}
        return {"version": state["version"], "phase": state["phase"], "players": state["players"],
                "potions": potions,
                "night": {"kill": state["kill"], "poison": state["poison"], "poisons": state.get("poisons", []), "inspection": state["inspection"]},
                "control": rooms.debug_control(state)}

    @app.get("/api/games/{game_id}/chat")
    def chat(game_id: str, after_public: int = Query(default=0, ge=0), after_wolves: int = Query(default=0, ge=0), credential=Depends(token)):
        g, host, _ = app.state.store.read_record(game_id)
        return rooms.chat_view(g, rooms.participant(g, credential, host), after_public, after_wolves)

    @app.post("/api/games/{game_id}/chat")
    def send_chat(game_id: str, body: ChatMessage, credential=Depends(token)):
        return app.state.store.mutate(game_id, lambda g, host, _: rooms.chat_send(g, rooms.participant(g, credential, host), body.channel, body.text))

    @app.get("/api/games/{game_id}/audio")
    async def audio(game_id: str, request: Request, phase: str | None = Query(default=None, max_length=24),
                    voice: Literal["original", "narrator"] | None = None,
                    morning: int | None = Query(default=None, ge=1),
                    lang: Literal["yue", "en"] = "yue", credential=Depends(token)):
        state, host, _ = app.state.store.read_record(game_id)
        if rooms.remote(state):
            rooms.participant(state, credential, host)
        else:
            app.state.store.get(game_id, credential)
        if rooms.mode(state) == "multi" and not rooms.remote(state):
            app.state.store.get(game_id, credential, host_only=True)
            if not rooms.owns_speaker(state, request.headers.get("X-Moonfall-Speaker")):
                raise HTTPException(403, "只有主裝置可以播放語音。 / Only the main device may narrate.")
        cue = phase or state["phase"]
        if cue not in NARRATION:
            raise HTTPException(422, "未知的公開語音。")
        # Prefetch may name a future cue, but never send arbitrary/private text.
        profile = speech_profile(voice, lang)
        script = NARRATION_EN if lang == "en" else NARRATION
        text = script[cue]
        if cue == "finished" and state["phase"] == "finished":
            text = narration(state, lang)
        if morning is not None:
            report = morning_report(state)
            if not report or morning != state["day"] or cue != state["phase"] or state["phase"] in ("reveal", "wolves", "witch", "seer", "dawn"):
                raise HTTPException(409, "天亮結果尚未公布或階段已變更。 / Morning results are not published or the turn has changed.")
            text = report["en" if lang == "en" else "zh"] + " " + text
        try:
            result = await asyncio.wait_for(app.state.speech.synthesize(text, profile), 14)
        except TimeoutError:
            result = None
        if result is None:
            raise HTTPException(503, "語音暫時不可用，請使用畫面字幕。")
        return Response(result, media_type="audio/mpeg", headers={"X-Audio-Voice": PROFILES[profile]["voice"], "X-Audio-Cue": cue, "Content-Language": "en-US" if lang == "en" else "zh-HK"})

    app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
    return app


app = create_app(preload_audio=True)
