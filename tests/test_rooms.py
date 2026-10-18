from concurrent.futures import ThreadPoolExecutor
import json
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend import rooms
from backend.engine import new_game, RuleError

COUNTS = {'wolf':2,'seer':1,'witch':1,'hunter':1,'villager':4}


@pytest.fixture
def room(tmp_path):
    with TestClient(create_app(tmp_path/'rooms.db')) as c:
        created=c.post('/api/games',json={'counts':COUNTS,'mode':'multi'}).json()
        path='/api/games/'+created['id']
        host={'Authorization':'Bearer '+created['host_token']}
        invite=c.post(path+'/room',headers=host,json={'command':'invite'}).json()['invite']
        yield c,path,host,invite,created


def command(room, command, data=None):
    c,path,host,*_=room
    response=c.post(path+'/room',headers=host,json={'command':command,'data':data or {}})
    assert response.status_code==200,response.text
    return response.json()


def join(room,seat,approve=True):
    c,path,host,invite,*_=room
    response=c.post(path+'/join',json={'invite':invite,'seat':seat,'name':f'Player {seat}'})
    assert response.status_code==201,response.text
    headers={'Authorization':'Bearer '+response.json()['player_token']}
    if approve:
        pending=c.get(path+'/room',headers=host).json()['members'][-1]
        command(room,'approve',{'id':pending['id']})
    return headers


def detail(room,headers):
    c,path,*_=room
    response=c.get(path+'/player/private',headers=headers)
    assert response.status_code==200,response.text
    return response.json()


def play(room,headers,action,data=None,key=None):
    c,path,*_=room
    return c.post(path+'/player/actions',headers=headers,json={'turn_key':key or detail(room,headers)['turn_key'],'action':action,'data':data or {}})


def connect_all(room):
    passes={s:join(room,s) for s in range(1,10)}
    roles={s:detail(room,h)['role'] for s,h in passes.items()}
    key=detail(room,passes[1])['turn_key']
    for h in passes.values():assert play(room,h,'ready',key=key).status_code==200
    return passes,roles


def test_approval_and_seat_scoped_secrets(room):
    c,path,host,invite,created=room
    pending=join(room,1,False)
    assert c.get(path+'/player/private',headers=pending).json()['approved'] is False
    request=c.get(path+'/room',headers=host).json()['members'][0]
    command(room,'approve',{'id':request['id']})
    secret=detail(room,pending)
    assert secret['seat']==1 and secret['role'] in COUNTS
    assert 'role' not in secret['state']['players'][1]
    assert not any(k in json.dumps(secret) for k in ('invite_hash','members','player_token'))
    for endpoint in ('','/private','/debug','/room','/audio'):
        assert c.get(path+endpoint,headers=pending).status_code==403
    assert c.get(path+'/player/private',headers=host).status_code==403
    viewer={'Authorization':'Bearer '+created['viewer_token']}
    assert c.get(path+'/audio',headers=viewer).status_code==403
    assert c.get(path+'/room',headers=viewer).status_code==403
    assert c.post(path+'/join',json={'invite':invite,'seat':True}).status_code==422
    assert c.post(path+'/join',json={'invite':'wrong'*8,'seat':2}).status_code==403
    duplicate=join(room,1,False)
    request2=c.get(path+'/room',headers=host).json()['members'][-1]
    assert c.post(path+'/room',headers=host,json={'command':'approve','data':{'id':request2['id']}}).status_code==409
    command(room,'revoke',{'id':request['id']})
    assert c.get(path+'/player',headers=pending).status_code==403
    command(room,'approve',{'id':request2['id']})
    assert detail(room,duplicate)['seat']==1


def test_role_actions_consensus_seer_and_mode_switch(room):
    c,path,host,*_=room
    passes,roles=connect_all(room)
    wolves=[s for s,r in roles.items() if r=='wolf']
    seer=next(s for s,r in roles.items() if r=='seer')
    witch=next(s for s,r in roles.items() if r=='witch')
    key=detail(room,passes[wolves[0]])['turn_key']
    assert play(room,passes[seer],'wolves',{'target':1}).status_code==409
    assert c.post(path+'/actions',headers=host,json={'version':c.get(path,headers=host).json()['version'],'action':'wolves','data':{'target':1}}).status_code==409
    assert play(room,passes[wolves[0]],'wolves',{'target':1},key).json()['state']['phase']=='wolves'
    assert play(room,passes[wolves[1]],'wolves',{'target':2},key).json()['state']['phase']=='wolves'
    assert play(room,passes[wolves[1]],'wolves',{'target':1},key).json()['state']['phase']=='witch'
    assert detail(room,passes[seer])['info'] is None
    assert detail(room,passes[witch])['info']['kill']==1
    assert play(room,passes[witch],'witch',{'save':False,'poison':None}).json()['state']['phase']=='seer'
    assert play(room,passes[seer],'inspect',{'target':wolves[0]}).status_code==200
    assert detail(room,passes[seer])['info']['inspection']['alignment']=='bad'
    assert detail(room,passes[witch])['info'] is None
    old_key=detail(room,passes[seer])['turn_key']
    command(room,'mode',{'mode':'single'})
    assert c.get(path+'/player/private',headers=passes[seer]).status_code==409
    command(room,'mode',{'mode':'multi'})
    assert play(room,passes[seer],'ack',key=old_key).status_code==409
    assert detail(room,passes[seer])['info']['inspection']['alignment']=='bad'
    assert play(room,passes[seer],'ack').json()['state']['phase']=='dawn'


def test_parallel_votes_are_atomic_and_cross_room_tokens_fail(room):
    c,path,host,*_=room
    passes,_=connect_all(room)
    command(room,'mode',{'mode':'single'})
    for action,data in [('wolves',{'target':None}),('witch',{'save':False,'poison':None})]:
        state=c.get(path,headers=host).json()
        assert c.post(path+'/actions',headers=host,json={'version':state['version'],'action':action,'data':data}).status_code==200
    seer_info=c.get(path+'/private',headers=host).json()
    for action,data in [('inspect',{'target':seer_info['targets'][0]}),('ack',{}),('dawn',{}),('vote',{})]:
        state=c.get(path,headers=host).json()
        assert c.post(path+'/actions',headers=host,json={'version':state['version'],'action':action,'data':data}).status_code==200
    command(room,'mode',{'mode':'multi'})
    key=detail(room,passes[1])['turn_key']
    def vote(seat):return play(room,passes[seat],'ballot',{'target':1},key)
    with ThreadPoolExecutor(max_workers=9) as pool:results=list(pool.map(vote,range(1,10)))
    assert all(r.status_code==200 for r in results),[r.text for r in results]
    assert c.get(path,headers=host).json()['players'][0]['alive'] is False
    assert play(room,passes[2],'ballot',{'target':2},key).status_code==409
    other=c.post('/api/games',json={'counts':COUNTS,'mode':'multi'}).json()
    assert c.get('/api/games/'+other['id']+'/player/private',headers=passes[1]).status_code==403
    assert other['state']['phase']=='reveal' and all(p['alive'] for p in other['state']['players'])
    assert c.post(path+'/speaker',headers=host,json={'device':'group-A-main-device-012345'}).json()['main']
    other_host={'Authorization':'Bearer '+other['host_token']}
    assert c.post('/api/games/'+other['id']+'/speaker',headers=other_host,json={'device':'group-B-main-device-012345'}).json()['main']


def test_room_transactions_persist_and_rollback(tmp_path):
    from backend.store import Store
    reopen=lambda:Store(tmp_path/"persist.db")
    store=reopen()
    g=new_game(COUNTS)
    game_id,host,_=store.create(g)
    store.mutate(game_id,lambda state,*_:rooms.host_operation(state,'mode',{'mode':'multi'}))
    invite=store.mutate(game_id,lambda state,*_:rooms.host_operation(state,'invite',{}))['invite']
    joined=store.mutate(game_id,lambda state,*_:rooms.join(state,invite,1,'A'))
    state=reopen().get(game_id,host)
    request=rooms.host_view(state)['members'][0]
    store.mutate(game_id,lambda state,*_:rooms.host_operation(state,'approve',{'id':request['id']}))
    assert rooms.player_view(reopen().get(game_id,host),joined['player_token'],True)['seat']==1
    before=store.get(game_id,host)
    with pytest.raises(RuleError):
        store.mutate(game_id,lambda state,*_:rooms.host_operation(state,'mode',{'mode':'broken'}))
    assert store.get(game_id,host)==before


def test_only_one_main_device_can_narrate(room,monkeypatch):
    c,path,host,*_=room
    first,second='a'*32,'b'*32
    assert c.post(path+'/speaker',headers=host,json={'device':first}).json()=={'main':True}
    assert c.post(path+'/speaker',headers=host,json={'device':second}).json()=={'main':False}
    assert c.get(path+'/audio',headers={**host,'X-Moonfall-Speaker':second}).status_code==403
    participant=join(room,1)
    assert c.post(path+'/speaker',headers=participant,json={'device':first}).status_code==403
    real_now=rooms.time.time()
    monkeypatch.setattr(rooms.time,'time',lambda:real_now+21)
    assert c.post(path+'/speaker',headers=host,json={'device':second}).json()=={'main':True}
    assert c.get(path+'/audio',headers={**host,'X-Moonfall-Speaker':first}).status_code==403


def test_fun_mode_turn_ownership_cover_and_hunter_chain():
    g=new_game({'wolf':1,'seer':2,'witch':2,'hunter':2,'villager':1},{'fun_mode':True,'last_words':False})
    roles=['wolf','witch','witch','seer','seer','hunter','hunter','villager']
    for p,role in zip(g['players'],roles):p['role']=role
    rooms.network(g)['mode']='multi'
    passes={}
    invite=rooms.host_operation(g,'invite',{})['invite']
    for s in range(1,9):
        passes[s]=rooms.join(g,invite,s,'')['player_token']
        rooms.host_operation(g,'approve',{'id':rooms.host_view(g)['members'][-1]['id']})
    def action(s,name,data=None):return rooms.player_action(g,passes[s],rooms.turn_key(g),name,data or {})
    for s in range(1,9):action(s,'ready')
    action(1,'wolves',{'target':6})
    assert rooms.player_view(g,passes[3],True)['info'] is None
    with pytest.raises(RuleError):action(3,'witch',{'save':False,'poison':None})
    action(2,'witch',{'save':False,'poison':8})
    assert rooms.player_view(g,passes[3],True)['info']['can_poison'] is True
    action(3,'witch',{'save':False,'poison':None})
    action(4,'inspect',{'target':1})
    assert rooms.player_view(g,passes[4],True)['info']['inspection']['alignment']=='bad'
    assert rooms.player_view(g,passes[5],True)['info'] is None
    action(4,'ack')
    assert rooms.player_view(g,passes[5],True)['info']['inspection'] is None
    action(5,'inspect',{'target':6});action(5,'ack')
    rooms.replace_state(g,rooms.host_action(g,'dawn',{}))
    with pytest.raises(RuleError):action(7,'shoot',{'target':1})
    action(6,'shoot',{'target':7})
    assert g['phase']=='hunter' and g['hunters']==[7]
    action(7,'shoot',{'target':None})
    assert g['phase']=='discussion'
    # A dead holder still owns a harmless cover turn, but other seats cannot act.
    g['phase']='witch';g['witch_cursor']=0;g['players'][1]['alive']=False
    cover=rooms.player_view(g,passes[2],True)
    assert cover['can_act'] and not cover['info']['active'] and cover['info']['kill'] is None
    with pytest.raises(RuleError):action(3,'inactive_pass')
    action(2,'inactive_pass')
    assert rooms.player_view(g,passes[3],True)['info']['active']
