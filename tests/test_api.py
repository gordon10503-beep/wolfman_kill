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
    assert client.get("/api/health").json() == {"status": "ok", "version": "1.6.2"}
    assert response.headers["x-moonfall-version"] == "1.6.2"


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


def test_skip_reveal_is_host_only_atomic_and_keeps_roles_private(client):
    g = create(client)
    path = "/api/games/" + g["id"]
    viewer = {"Authorization": "Bearer " + g["viewer_token"]}
    host = {"Authorization": "Bearer " + g["host_token"]}
    action = {"version": 0, "action": "debug_skip_reveal"}
    assert client.post(path + "/actions", headers=viewer, json=action).status_code == 403
    response = client.post(path + "/actions", headers=host, json=action)
    assert response.status_code == 200 and response.json()["phase"] == "wolves"
    assert all("role" not in p for p in response.json()["players"])
    assert client.post(path + "/actions", headers=host, json=action).status_code == 409
    assert client.get(path, headers=viewer).json()["phase"] == "wolves"


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
    async def unavailable(text, profile):
        return None
    client.app.state.speech.synthesize = unavailable
    headers = {"Authorization": "Bearer " + g["host_token"]}
    assert client.get(f'/api/games/{g["id"]}/audio', headers=headers).status_code == 503
    assert client.get(f'/api/games/{g["id"]}', headers=headers).status_code == 200


def test_audio_prefetch_is_fixed_public_text_and_validates_voice(client):
    from backend.engine import NARRATION
    g = create(client)
    seen = []
    async def synthesize(text, profile):
        seen.append((text, profile))
        return b"fake-mp3"
    client.app.state.speech.synthesize = synthesize
    headers = {"Authorization": "Bearer " + g["viewer_token"]}
    path = f'/api/games/{g["id"]}/audio'
    response = client.get(path + '?phase=witch&voice=narrator', headers=headers)
    assert response.status_code == 200 and response.content == b"fake-mp3"
    assert seen == [(NARRATION["witch"], "narrator")]
    assert response.headers["x-audio-voice"] == "zh-HK-WanLungNeural"
    assert client.get(path + '?phase=secret', headers=headers).status_code == 422
    assert client.get(path + '?voice=unknown', headers=headers).status_code == 422
    assert len(seen) == 1


def test_english_audio_uses_english_script_and_voice(client):
    from backend.engine import NARRATION_EN
    g = create(client)
    seen = []
    async def synthesize(text, profile):
        seen.append((text, profile))
        return b"english-mp3"
    client.app.state.speech.synthesize = synthesize
    headers = {"Authorization": "Bearer " + g["host_token"]}
    path = f'/api/games/{g["id"]}/audio'
    for voice, profile, expected in (("original", "english", "en-US-JennyNeural"),
                                     ("narrator", "english_narrator", "en-US-GuyNeural")):
        response = client.get(path, params={"phase": "wolves", "lang": "en", "voice": voice}, headers=headers)
        assert response.status_code == 200
        assert response.headers["content-language"] == "en-US"
        assert response.headers["x-audio-voice"] == expected
        assert seen[-1] == (NARRATION_EN["wolves"], profile)
    assert client.get(path + '?lang=other', headers=headers).status_code == 422
    response = client.get(path + '?phase=wolves&lang=en', headers=headers)
    assert response.headers["x-audio-voice"] == "en-US-GuyNeural"
    response = client.get(path + '?phase=wolves', headers=headers)
    assert response.headers["x-audio-voice"] == "zh-HK-HiuMaanNeural"

def test_forest_animation_style_is_narrowly_allowed(client):
    import base64
    import hashlib
    import xml.etree.ElementTree as ET

    response = client.get('/assets/forest.svg')
    assert response.status_code == 200
    svg = ET.fromstring(response.text)
    style = svg.find('{http://www.w3.org/2000/svg}style').text
    digest = base64.b64encode(hashlib.sha256(style.encode()).digest()).decode()
    policy = response.headers['content-security-policy']
    assert f"'sha256-{digest}'" in policy
    assert "'unsafe-inline'" not in policy
    assert 'prefers-reduced-motion:reduce' in style
    assert 'sha256-' not in client.get('/').headers['content-security-policy']

def test_fun_mode_actions_are_host_only_and_do_not_publish_private_actor_state(client):
    roles=['wolf','witch','witch','seer','seer','hunter','hunter','villager']
    g=new_game({r:roles.count(r) for r in COUNTS},{'fun_mode':True})
    for p,role in zip(g['players'],roles): p['role']=role
    g['phase']='witch';g['players'][1]['alive']=False
    game_id,host_token,viewer_token=client.app.state.store.create(g)
    path=f'/api/games/{game_id}'
    host={'Authorization':'Bearer '+host_token};viewer={'Authorization':'Bearer '+viewer_token}
    assert client.get(path+'/private',headers=viewer).status_code==403
    assert client.post(path+'/actions',headers=viewer,json={'version':0,'action':'inactive_pass'}).status_code==403
    assert client.get(path+'/private',headers=host).json()['actor_seat']==2
    response=client.post(path+'/actions',headers=host,json={'version':0,'action':'inactive_pass'})
    assert response.status_code==200
    public=response.json()
    assert not {'actor_seat','witch_cursor','witch_potions','inspection'} & public.keys()
    assert all('role' not in p for p in public['players'])
    assert client.get(path+'/private',headers=host).json()['actor_seat']==3
    assert client.post(path+'/actions',headers=host,json={'version':1,'action':'inactive_pass'}).status_code==409
    assert set(client.get(path+'/debug',headers=host).json()['potions']['by_seat'])=={'2','3'}


def test_counted_vote_result_rejects_audience_and_preserves_host_validation(client):
    g=new_game(COUNTS);g['phase']='vote'
    game_id,host_token,viewer_token=client.app.state.store.create(g)
    path=f'/api/games/{game_id}/actions'
    body={'version':0,'action':'vote_result','data':{'leaders':[]}}
    assert client.post(path,headers={'Authorization':'Bearer '+viewer_token},json=body).status_code==403
    response=client.post(path,headers={'Authorization':'Bearer '+host_token},json=body)
    assert response.status_code==200 and response.json()['phase']=='wolves'
    assert client.post(path,headers={'Authorization':'Bearer '+host_token},json=body).status_code==409

def test_new_games_default_to_self_save_but_saved_rules_remain_explicit():
    roles=['wolf','witch','seer','hunter','villager']
    counts={r:roles.count(r) for r in COUNTS}
    assert new_game(counts)['rules']['witch_self_save'] is True
    assert new_game(counts)['rules']['last_words'] is True
    assert new_game(counts,{'last_words':False})['rules']['last_words'] is False
    old=new_game(counts,{'witch_self_save':False})
    assert old['rules']['witch_self_save'] is False
    old['phase']='wolves'
    from backend.engine import act
    assert act(old,'wolves',{})['rules']['witch_self_save'] is False


def test_last_words_is_public_but_only_the_host_can_advance_it(client):
    from backend.engine import act
    g=new_game(COUNTS,{'last_words':True});g['phase']='vote'
    victim=next(p['seat'] for p in g['players'] if p['role']=='villager')
    g=act(g,'vote_result',{'leaders':[victim]})
    game_id,host,viewer=client.app.state.store.create(g)
    path=f'/api/games/{game_id}'
    view=client.get(path,headers={'Authorization':'Bearer '+viewer}).json()
    assert view['phase']=='last_words' and view['last_words_seat']==victim
    assert all('role' not in p for p in view['players'])
    body={'version':g['version'],'action':'last_words_done'}
    assert client.post(path+'/actions',headers={'Authorization':'Bearer '+viewer},json=body).status_code==403
    assert client.post(path+'/actions',headers={'Authorization':'Bearer '+host},json=body).json()['phase']=='wolves'
    assert client.post(path+'/actions',headers={'Authorization':'Bearer '+host},json=body).status_code==409


def test_install_manifest_icons_and_worker_are_served(client):
    manifest=client.get('/manifest.webmanifest')
    assert manifest.status_code==200 and manifest.json()['display']=='standalone'
    for icon in manifest.json()['icons']:
        response=client.get(icon['src'])
        assert response.status_code==200 and response.headers['content-type']=='image/png'
    assert client.get('/sw.js').status_code==200
    assert 'no-store' in client.get('/sw.js').headers['cache-control']
