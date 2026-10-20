from copy import deepcopy
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend import rooms
from backend.engine import ROLES,WOLF_ROLES,act,new_game,public_view,private_view,killing_wolves,check_winner,kill,settle,RuleError


def game(roles=('wolf_king','wolf_beauty','hidden_wolf','seer','witch','hunter','knight','villager','villager'),phase='wolves',**rules):
    g=new_game({r:roles.count(r) for r in ROLES},{'fun_mode':True,'last_words':False,'parity_wins':False,**rules})
    for p,r in zip(g['players'],roles):p['role']=r
    g['phase']=phase
    return g


def test_wolf_balance_and_victory_use_the_whole_faction():
    counts={r:0 for r in ROLES};counts.update(wolf=1,wolf_king=1,white_wolf_king=1,villager=3)
    with pytest.raises(RuleError):new_game(counts)
    g=game(('hidden_wolf','seer','villager','villager','villager'))
    assert not check_winner(g)
    g['players'][0]['alive']=False
    assert check_winner(g) and g['winner']=='village'
    g=game(('wolf_king','villager','villager','villager','villager'),parity_wins=True)
    for p in g['players'][2:]:p['alive']=False
    assert check_winner(g) and g['winner']=='wolves'


def test_hidden_wolves_do_not_vote_until_only_hidden_wolves_remain():
    g=game(('wolf','hidden_wolf','hidden_wolf','villager','seer','villager','villager'))
    assert killing_wolves(g)==[1]
    g['players'][0]['alive']=False
    assert killing_wolves(g)==[2,3]
    g['players'][1]['alive']=False
    assert killing_wolves(g)==[3]


def test_hidden_wolf_seer_disguise_does_not_change_true_alignment():
    g=game(phase='seer');g=act(g,'inspect',{'target':3})
    assert private_view(g)['inspection']=={'seat':3,'alignment':'good'}
    g['phase']='vote';g=act(g,'vote_result',{'leaders':[3]});g['phase']='gravedigger'
    g['players'][8]['role']='gravedigger'
    assert private_view(g)['grave_result']['alignment']=='bad'


@pytest.mark.parametrize('cause,can_shoot',[('wolf',True),('vote',True),('hunter',True),('poison',False),('duel',False),('explosion',False),('charm',False)])
def test_wolf_king_shot_eligibility(cause,can_shoot):
    g=game(phase='discussion');kill(g,1,cause);settle(g,'discussion')
    assert (g['phase']=='wolf_king_shot') is can_shoot
    if can_shoot:
        assert public_view(g)['players'][0]['revealed_role']=='wolf_king'
        g=act(g,'shoot',{'target':8})
        assert g['players'][7]['shooter_role']=='wolf_king'
        assert public_view(g)['players'][0]['revealed_role']=='wolf_king'


def test_hunter_and_wolf_king_chain_resolves_before_victory():
    g=game(('hunter','wolf_king','wolf_king','villager','villager'),phase='dawn')
    g.update(kill=1,wolf_target=1)
    g=act(g,'dawn',{});assert g['phase']=='hunter'
    g=act(g,'shoot',{'target':2});assert g['phase']=='wolf_king_shot' and public_view(g)['hunter']==2
    g=act(g,'shoot',{'target':3});assert g['phase']=='wolf_king_shot' and public_view(g)['hunter']==3
    g=act(g,'shoot',{'target':None});assert g['phase']=='finished' and g['winner']=='village'


def test_white_wolf_king_explosion_skips_voting_and_blocks_shots():
    g=game(('white_wolf_king','hunter','wolf','villager','villager','villager'),phase='discussion',last_words=True)
    g=act(g,'explode',{'actor':1,'target':2})
    assert g['phase']=='wolves' and g['day']==2 and not g['hunters']
    assert not g.get('last_words_queue')
    assert public_view(g)['players'][0]['revealed_role']=='white_wolf_king'
    assert not g['players'][0]['alive'] and not g['players'][1]['alive']
    with pytest.raises(RuleError):act(g,'explode',{'actor':1,'target':3})
    g=game(('white_wolf_king','wolf_king','wolf','villager','villager','villager','villager'),phase='discussion')
    assert not act(g,'explode',{'actor':1,'target':2})['hunters']
    g['phase']='vote'
    with pytest.raises(RuleError):act(g,'explode',{'actor':1,'target':2})


@pytest.mark.parametrize('cause,linked',[('vote',True),('poison',True),('hunter',True),('wolf',False),('duel',False),('explosion',False)])
def test_wolf_beauty_death_triggers_only_the_supported_links(cause,linked):
    g=game(phase='wolf_beauty');g=act(g,'charm',{'target':8})
    kill(g,2,cause)
    assert g['players'][7]['alive'] is not linked
    if linked:assert g['players'][7]['cause']=='charm'


def test_charm_accepts_hidden_wolf_and_does_not_disclose_target_alignment():
    g=game(phase='wolf_beauty')
    before=private_view(g)
    assert 1 in before['targets'] and 3 in before['targets'] and 2 not in before['targets']
    hidden=act(g,'charm',{'target':3});ordinary=act(g,'charm',{'target':1})
    assert public_view(hidden)==public_view(ordinary)
    kill(hidden,2,'poison');kill(ordinary,2,'poison')
    assert not hidden['players'][2]['alive'] and ordinary['players'][0]['alive']
    assert 'charms' not in public_view(hidden)


def test_latest_charm_independent_beauties_and_cover_turns():
    g=game(('wolf_beauty','wolf_beauty','hidden_wolf','seer','villager','villager','villager'),phase='wolf_beauty')
    g=act(g,'charm',{'target':5});g=act(g,'charm',{'target':6})
    assert g['charms']=={'1':5,'2':6}
    g.update(phase='wolf_beauty',wolf_beauty_cursor=0)
    g=act(g,'charm',{'target':3});kill(g,1,'vote')
    assert not g['players'][2]['alive'] and g['players'][4]['alive']
    kill(g,2,'poison');assert not g['players'][5]['alive']
    g.update(phase='wolf_beauty',wolf_beauty_cursor=0)
    assert private_view(g)['active'] is False
    assert act(g,'inactive_pass',{})['wolf_beauty_cursor']==1


def test_simultaneous_poison_has_priority_over_charm_and_morning_lists_every_death():
    g=game(phase='wolf_beauty',last_words=True);g=act(g,'charm',{'target':6})
    g.update(phase='dawn',poisons=[2,6],poison=6,kill=None)
    g=act(g,'dawn',{})
    assert g['players'][5]['cause']=='poison' and not g['hunters']
    assert set(g['last_words_queue'])=={2,6}
    assert '2 號' in g['events'][1]['text'] and '6 號' in g['events'][1]['text']
    g=game(phase='wolf_beauty');g=act(g,'charm',{'target':8});g.update(phase='dawn',poisons=[2],kill=None)
    g=act(g,'dawn',{})
    assert '8 號' in public_view(g)['morning_report']['zh']


def room_game(roles,phase):
    g=game(roles,phase=phase);rooms.network(g).update(mode='multi',remote=True);rooms.ensure_host(g)
    invite=rooms.host_operation(g,'invite',{})['invite'];passes={}
    for seat in range(2,len(roles)+1):
        token=rooms.join(g,invite,None,str(seat))['player_token'];passes[seat]=token
        rooms.host_operation(g,'approve',{'id':rooms.host_view(g)['members'][-1]['id']})
    return g,passes


def test_hidden_wolf_identity_never_reaches_regular_wolf_private_views_or_chat():
    g,tokens=room_game(('wolf','hidden_wolf','wolf_beauty','seer','villager','villager','villager'),'wolves')
    assert not rooms.player_view(g,tokens[2],True)['can_act']
    regular=rooms.player_view(g,None,True,member_key=rooms.host_key(g))
    assert regular['info']['wolves']==[1,3] and 'team' not in regular
    assert rooms.player_view(g,tokens[2],True)['team']==[1,2,3]
    assert 'wolves' not in rooms.chat_permissions(g,rooms.member(g,tokens[2]))
    with pytest.raises(RuleError):rooms.player_action(g,tokens[2],rooms.turn_key(g),'wolves',{'target':7})
    g['phase']='hidden_wolf'
    detail=rooms.player_view(g,tokens[2],True)
    assert detail['can_act'] and detail['info']['team']==[1,2,3]
    assert rooms.player_view(g,tokens[3],True)['info'] is None
    rooms.player_action(g,tokens[2],detail['turn_key'],'hidden_ack',{})
    assert g['phase']=='wolf_beauty'
    for seat in (1,3):g['players'][seat-1]['alive']=False
    g['phase']='wolves'
    assert rooms.player_view(g,tokens[2],True)['can_act']
    rooms.player_action(g,tokens[2],rooms.turn_key(g),'wolves',{'target':7})
    assert g['phase']=='hidden_wolf' and g['kill']==7


@pytest.mark.parametrize('mode',['single','multi','remote'])
@pytest.mark.parametrize('role,phase,action,data',[
 ('wolf_beauty','wolf_beauty','charm',{'target':6}),
 ('hidden_wolf','hidden_wolf','hidden_ack',{}),
 ('white_wolf_king','discussion','explode',{'target':6}),
 ('wolf_king','wolf_king_shot','shoot',{'target':6})])
def test_wolf_powers_work_in_all_modes_and_respect_device_ownership(tmp_path,mode,role,phase,action,data):
    roles=['wolf',role,'villager','seer','villager','villager','villager']
    with TestClient(create_app(tmp_path/'wolves.db')) as c:
        created=c.post('/api/games',json={'counts':{r:roles.count(r) for r in ROLES},'mode':mode,'rules':{'last_words':False}}).json()
        path='/api/games/'+created['id'];host={'Authorization':'Bearer '+created['host_token']}
        def stage(g,*_):
            for p,r in zip(g['players'],roles):p['role']=r
            g['phase']=phase
            if phase=='wolf_king_shot':g['players'][1]['alive']=False;g['hunters']=[2]
        c.app.state.store.mutate(created['id'],stage)
        if mode=='single':
            state=c.get(path,headers=host).json();payload={**data,**({'actor':2} if action=='explode' else {})}
            assert c.post(path+'/actions',headers=host,json={'version':state['version'],'action':action,'data':payload}).status_code==200
            return
        invite=c.post(path+'/room',headers=host,json={'command':'invite'}).json()['invite']
        joined=c.post(path+'/join',json={'invite':invite}).json();guest={'Authorization':'Bearer '+joined['player_token']}
        pending=c.get(path+'/room',headers=host).json()['members'][-1]
        c.post(path+'/room',headers=host,json={'command':'approve','data':{'id':pending['id']}})
        detail=c.get(path+'/player/private',headers=guest).json();assert detail['can_act']
        state=c.get(path,headers=host).json();payload={**data,**({'actor':2} if action=='explode' else {})}
        assert c.post(path+'/actions',headers=host,json={'version':state['version'],'action':action,'data':payload,'debug':True}).status_code==409
        assert c.post(path+'/player/actions',headers=guest,json={'turn_key':detail['turn_key'],'action':action,'data':data}).status_code==200
        assert c.post(path+'/player/actions',headers=guest,json={'turn_key':detail['turn_key'],'action':action,'data':data}).status_code==409


def test_shooting_beauty_after_dawn_records_the_linked_casualty():
    g=game(phase='wolf_beauty');g=act(g,'charm',{'target':8})
    g.update(phase='wolf_king_shot',hunters=[1]);g['players'][0]['alive']=False
    g=act(g,'shoot',{'target':2})
    assert any(e['text']=='8 號因魅惑連鎖出局。' for e in g['events'])
