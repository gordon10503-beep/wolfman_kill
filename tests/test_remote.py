from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend import rooms
from backend.engine import act, public_view, new_game, RuleError


@pytest.fixture
def remote(tmp_path):
    with TestClient(create_app(tmp_path/'remote.db')) as client:
        counts={'wolf':2,'seer':1,'witch':1,'hunter':1,'villager':4}
        created=client.post('/api/games',json={'counts':counts,'mode':'remote'}).json()
        path='/api/games/'+created['id'];host={'Authorization':'Bearer '+created['host_token']}
        invite=client.post(path+'/room',headers=host,json={'command':'invite'}).json()['invite']
        joined=client.post(path+'/join',json={'invite':invite,'name':'Guest'}).json()
        guest={'Authorization':'Bearer '+joined['player_token']}
        pending=client.get(path+'/room',headers=host).json()['members'][-1]
        yield client,path,host,guest,pending,created


def approve(remote):
    c,path,host,_,pending,_=remote
    assert c.post(path+'/room',headers=host,json={'command':'approve','data':{'id':pending['id']}}).status_code==200


def test_remote_audio_needs_an_approved_pass_and_mode_changes_keep_old_policy(remote):
    c,path,host,guest,pending,created=remote
    async def synthesize(text,profile):return b'mp3'
    c.app.state.speech.synthesize=synthesize
    assert created['state']['room']['mode']=='multi' and created['state']['room']['remote']
    assert c.get(path+'/audio',headers=guest).status_code==403
    approve(remote)
    assert c.get(path+'/audio',headers=guest).status_code==200
    assert c.get(path+'/audio',headers=host).status_code==200
    viewer={'Authorization':'Bearer '+created['viewer_token']}
    assert c.get(path+'/audio',headers=viewer).status_code==403
    assert c.get(path+'/private',headers=guest).status_code==403
    c.post(path+'/room',headers=host,json={'command':'mode','data':{'mode':'multi'}})
    assert c.get(path+'/audio',headers=guest).status_code==403
    assert c.get(path+'/chat',headers=guest).status_code==409


def test_remote_chat_auth_cursors_and_no_game_version_change(remote):
    c,path,host,guest,_,created=remote
    assert c.get(path+'/chat',headers=guest).status_code==403
    approve(remote)
    before=c.get(path+'/player/private',headers=guest).json()
    assert c.post(path+'/chat',headers=guest,json={'channel':'public','text':'hello <b>village</b>'}).status_code==200
    after=c.get(path+'/player/private',headers=guest).json()
    assert before==after  # Chat cannot invalidate a private turn or trigger narration.
    chat=c.get(path+'/chat',headers=host).json()
    assert set(chat['channels'])=={'public'}
    assert chat['channels']['public']['messages'][0]['seat']==2
    assert c.get(path+'/chat?after_public=1',headers=guest).json()['channels']['public']['messages']==[]
    assert c.post(path+'/chat',headers=guest,json={'channel':'public','text':'too fast'}).status_code==409
    assert c.post(path+'/chat',headers=guest,json={'channel':'wolves','text':'secret'}).status_code==409
    assert c.post(path+'/chat',headers=guest,json={'channel':'public','text':' ','seat':1}).status_code==422
    other=c.post('/api/games',json={'counts':{'wolf':1,'seer':1,'witch':1,'hunter':0,'villager':2}}).json()
    assert c.get('/api/games/'+other['id']+'/chat',headers=guest).status_code==403


def test_wolf_chat_is_never_in_public_or_other_players_state(remote):
    c,path,host,guest,_,created=remote;approve(remote)
    def wolves(g,*_):
        wolf=next(p for p in g['players'] if p['role']=='wolf' and p['seat']!=2)
        wolf['role'],g['players'][1]['role']=g['players'][1]['role'],'wolf'
        if g['players'][0]['role']=='wolf':g['players'][0]['role'],g['players'][2]['role']=g['players'][2]['role'],g['players'][0]['role']
        # Force the host's role to a good role without changing the wolf guest.
        if g['players'][0]['role']=='wolf':
            good=next(p for p in g['players'] if p['role']!='wolf' and p['seat']!=2)
            good['role'],g['players'][0]['role']=g['players'][0]['role'],good['role']
        g['phase']='wolves';g['version']+=1
    c.app.state.store.mutate(created['id'],wolves)
    assert c.post(path+'/chat',headers=guest,json={'channel':'wolves','text':'secret target discussion'}).status_code==200
    assert 'wolves' in c.get(path+'/chat',headers=guest).json()['channels']
    assert 'wolves' not in c.get(path+'/chat',headers=host).json()['channels']
    assert 'secret target discussion' not in c.get(path,headers=host).text
    assert c.post(path+'/chat',headers=guest,json={'channel':'public','text':'night leak'}).status_code==409
    c.app.state.store.mutate(created['id'],lambda g,*_:g.update(phase='discussion'))
    assert 'wolves' not in c.get(path+'/chat',headers=guest).json()['channels']


def test_eliminated_players_read_but_only_speak_for_their_last_words(remote):
    c,path,host,guest,_,created=remote;approve(remote)
    def eliminate(g,*_):g['players'][1]['alive']=False;g.update(phase='discussion')
    c.app.state.store.mutate(created['id'],eliminate)
    assert not c.get(path+'/chat',headers=guest).json()['channels']['public']['can_send']
    assert c.post(path+'/chat',headers=guest,json={'channel':'public','text':'dead spoiler'}).status_code==409
    c.app.state.store.mutate(created['id'],lambda g,*_:g.update(phase='last_words',last_words_queue=[2]))
    assert c.post(path+'/chat',headers=guest,json={'channel':'public','text':'my last words'}).status_code==200


def test_completed_vote_history_retains_voters_but_never_pending_ballots():
    g=new_game({'wolf':1,'seer':1,'witch':1,'hunter':1,'villager':2},{'last_words':False});g['phase']='vote'
    ballots={str(p['seat']):None for p in g['players']};ballots['1']=2;ballots['2']=1
    original=deepcopy(g)
    g=act(g,'ballots',{'ballots':ballots})
    view=public_view(g)
    assert view['vote_history']==[{'day':1,'round':'vote','ballots':ballots,'leaders':[1,2]}]
    assert public_view(original)['vote_history']==[]
    network=rooms.network(original);network['ballots']={'1':2}
    assert public_view(original)['vote_history']==[] and 'ballots' not in public_view(original)


def test_chat_history_is_bounded_and_does_not_change_the_game_turn(monkeypatch):
    g=new_game({'wolf':1,'seer':1,'witch':1,'hunter':0,'villager':2})
    rooms.network(g).update(mode='multi',remote=True);rooms.ensure_host(g)
    m=rooms.network(g)['members'][rooms.host_key(g)]
    version,key=g['version'],rooms.turn_key(g)
    for i in range(126):
        monkeypatch.setattr(rooms.time,'time',lambda i=i:1000+i*2)
        rooms.chat_send(g,m,'public',str(i))
    messages=rooms.network(g)['chat']['public']
    assert len(messages)==120 and messages[0]['id']==7
    assert g['version']==version and rooms.turn_key(g)==key
