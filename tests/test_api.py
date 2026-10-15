from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
import pytest

from backend.app import create_app
from backend.engine import RuleError, new_game
from backend.store import Store

COUNTS = {"wolf": 2, "seer": 1, "witch": 1, "hunter": 1, "villager": 4}


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "game.db")) as c:
        yield c


def create(client):
    response = client.post("/api/games", json={"counts": COUNTS})
    assert response.status_code == 201
    return response.json()


def test_auth_privacy_and_persistence(client, tmp_path):
    g = create(client)
    path = "/api/games/" + g["id"]
    host = {"Authorization": "Bearer " + g["host_token"]}
    viewer = {"Authorization": "Bearer " + g["viewer_token"]}
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer wrong"}).status_code == 403
    assert client.get(path, headers=viewer).status_code == 200
    assert client.get(path + "/private", headers=viewer).status_code == 403
    assert client.post(path + "/actions", headers=viewer, json={"version": 0, "action": "ack"}).status_code == 403
    assert "role" in client.get(path + "/private", headers=host).json()
    result = client.post(path + "/actions", headers=host, json={"version": 0, "action": "ack"})
    assert result.status_code == 200 and result.json()["reveal_seat"] == 2
    assert client.post(path + "/actions", headers=host, json={"version": 0, "action": "ack"}).status_code == 409
    with TestClient(create_app(tmp_path / "game.db")) as restarted:
        assert restarted.get(path, headers=host).json()["reveal_seat"] == 2


def test_validation_and_same_origin(client):
    assert client.post("/api/games", json={"counts": {**COUNTS, "wolf": True}}).status_code == 422
    assert client.post("/api/games", json={"counts": COUNTS}, headers={"Origin": "https://evil.example"}).status_code == 403
    response = client.get("/")
    assert response.status_code == 200
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert response.headers["cache-control"] == "no-store"
    assert client.get("/api/health").json() == {"status": "ok"}


def test_debug_identity_sheet_is_host_only_and_does_not_change_public_state(client):
    g = create(client)
    path = "/api/games/" + g["id"]
    host = {"Authorization": "Bearer " + g["host_token"]}
    viewer = {"Authorization": "Bearer " + g["viewer_token"]}
    before = client.get(path, headers=viewer).json()
    assert client.get(path + "/debug").status_code == 401
    assert client.get(path + "/debug", headers=viewer).status_code == 403
    assert client.get(path + "/debug", headers={"Authorization": "Bearer wrong"}).status_code == 403
    debug = client.get(path + "/debug", headers=host).json()
    assert len(debug["players"]) == sum(COUNTS.values())
    assert all("role" in p for p in debug["players"])
    assert debug["potions"] == {"save_used": False, "poison_used": False}
    assert client.get(path, headers=viewer).json() == before
    assert all("role" not in p for p in before["players"])


def test_two_tabs_only_one_action_commits(tmp_path):
    store = Store(tmp_path / "concurrent.db")
    game_id, host, _ = store.create(new_game(COUNTS))
    def submit(_):
        try:
            store.update(game_id, host, 0, "ack", {})
            return "ok"
        except RuleError:
            return "stale"
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(submit, range(2))) == ["ok", "stale"]
    assert store.get(game_id, host)["version"] == 1


def test_unavailable_speech_does_not_break_game(client):
    g = create(client)
    async def unavailable(text):
        return None
    client.app.state.speech.synthesize = unavailable
    headers = {"Authorization": "Bearer " + g["host_token"]}
    assert client.get(f'/api/games/{g["id"]}/audio', headers=headers).status_code == 503
    assert client.get(f'/api/games/{g["id"]}', headers=headers).status_code == 200
