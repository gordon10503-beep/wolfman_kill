from copy import deepcopy
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend import rooms
from backend.engine import ROLES, act, new_game, private_view, public_view, voters, RuleError


def game(roles=('wolf','wolf','seer','guard','witch','knight','gravedigger','idiot','villager'),phase='wolves',**rules):
    g=new_game({r:roles.count(r) for r in ROLES},{'fun_mode':True,'last_words':False,**rules})
    for p,r in zip(g['players'],roles):p['role']=r
    g['phase']=phase
    return g


def test_guard_after_seer_and_gravedigger_after_guard():
    g=act(game(),'wolves',{'target':9})
    assert g['phase']=='witch'
    g=act(g,'witch',{})
    g=act(g,'inspect',{'target':1})
    g=act(g,'ack',{})
    assert g['phase']=='guard' and private_view(g)['actor_seat']==4
    g=act(g,'protect',{'target':4})
    assert g['phase']=='gravedigger'
    assert private_view(g)['grave_result'] is None
    assert act(g,'grave_ack',{})['phase']=='dawn'


@pytest.mark.parametrize('saved,protected,conflict,poison,dead',[
    (False,False,True,False,True),(True,False,True,False,False),
    (False,True,True,False,False),(True,True,True,False,True),
    (True,True,False,False,False),(False,True,False,True,True),
    (True,True,False,True,True)])
def test_guard_antidote_and_poison_resolution(saved,protected,conflict,poison,dead):
    g=game(guard_save_conflict=conflict);g['phase']='dawn'
    g.update(kill=None if saved else 9,wolf_target=9,saved_targets=[9] if saved else [],protected=[9] if protected else [],poisons=[9] if poison else [])
    g=act(g,'dawn',{})
    assert g['players'][8]['alive'] is not dead
    if poison:assert g['players'][8]['cause']=='poison'


def test_multiple_guardians_track_separate_histories_and_cover_dead_holders():
    g=game(('wolf','guard','guard','villager','villager'),phase='guard')
    g=act(g,'protect',{'target':2})
    assert g['phase']=='guard' and private_view(g)['actor_seat']==3
    g=act(g,'protect',{'target':2})
    assert g['protected']==[2,2]
    g.update(phase='guard',guard_cursor=0,protected=[])
    with pytest.raises(RuleError):act(g,'protect',{'target':2})
    g=act(g,'protect',{'target':None})
    assert 2 not in private_view(g)['targets']
    g['players'][2]['alive']=False
    assert not private_view(g)['active']
    before=deepcopy(g['guard_previous'])
    g=act(g,'inactive_pass',{})
    assert g['guard_previous']==before and g['phase']=='dawn'
    g.update(phase='guard',guard_cursor=0)
    assert 2 in private_view(g)['targets']


def test_idiot_survives_exile_has_no_vote_and_can_still_die():
    g=game(phase='vote')
    g=act(g,'vote_result',{'leaders':[8]})
    assert g['players'][7]['alive'] and g['players'][7]['idiot_revealed']
    assert 8 not in voters(g) and g.get('last_exile') is None
    public=public_view(g)
    assert public['players'][7]=={'seat':8,'alive':True,'revealed_role':'idiot','can_vote':False}
    g['phase']='vote'
    with pytest.raises(RuleError):act(g,'ballots',{'ballots':{str(s):8 for s in voters(g)}})
    with pytest.raises(RuleError):act(g,'vote_result',{'leaders':[8]})
    g.update(phase='dawn',kill=8,wolf_target=8)
    assert not act(g,'dawn',{})['players'][7]['alive']


def test_idiot_is_not_revealed_by_night_death_or_skill():
    g=game(phase='dawn');g.update(kill=8,wolf_target=8)
    result=act(g,'dawn',{})
    assert not result['players'][7]['alive']
    assert 'revealed_role' not in public_view(result)['players'][7]


def test_knight_duel_success_skips_vote_and_failure_keeps_discussion():
    g=game(phase='discussion')
    hit=act(g,'duel',{'actor':6,'target':1})
    assert hit['phase']=='wolves' and hit['day']==2
    assert hit['players'][5]['alive'] and not hit['players'][0]['alive']
    assert public_view(hit)['players'][5]['revealed_role']=='knight'
    miss=act(g,'duel',{'actor':6,'target':8})
    assert miss['phase']=='discussion' and miss['day']==1
    assert not miss['players'][5]['alive'] and miss['players'][7]['alive']
    assert not miss.get('last_words_queue')
    with pytest.raises(RuleError):act(hit,'duel',{'actor':6,'target':2})
    with pytest.raises(RuleError):act(miss,'duel',{'actor':6,'target':2})
    with pytest.raises(RuleError):act(g,'duel',{'actor':6,'target':6})
    g['phase']='vote'
    with pytest.raises(RuleError):act(g,'duel',{'actor':6,'target':1})


def test_multiple_knights_have_independent_duels_and_last_wolf_wins():
    g=game(('wolf','knight','knight','villager','villager'),phase='discussion')
    g=act(g,'duel',{'actor':2,'target':4})
    assert g['phase']=='discussion' and not g['players'][1]['alive']
    g=act(g,'duel',{'actor':3,'target':1})
    assert g['phase']=='finished' and g['winner']=='village'


@pytest.mark.parametrize('role,alignment',[('wolf','bad'),('villager','good')])
def test_gravedigger_sees_previous_actual_exile_privately(role,alignment):
    g=game(phase='vote');g['players'][8]['role']=role
    g=act(g,'vote_result',{'leaders':[9]})
    g['phase']='gravedigger'
    assert private_view(g)['grave_result']=={'seat':9,'day':1,'alignment':alignment}
    assert 'last_exile' not in public_view(g) and 'grave_result' not in public_view(g)
    g['day']=3
    assert private_view(g)['grave_result'] is None
    g['players'][6]['alive']=False
    assert private_view(g)['grave_result'] is None and not private_view(g)['active']


@pytest.mark.parametrize('mode',['single','multi','remote'])
@pytest.mark.parametrize('role,phase,action,data',[
    ('guard','guard','protect',{'target':3}),
    ('gravedigger','gravedigger','grave_ack',{}),
    ('knight','discussion','duel',{'target':1})])
def test_new_role_ownership_and_switching_in_all_modes(tmp_path,mode,role,phase,action,data):
    roles=['wolf',role,'villager','wolf','villager','villager']
    counts={r:roles.count(r) for r in ROLES}
    with TestClient(create_app(tmp_path/'game.db')) as c:
        created=c.post('/api/games',json={'counts':counts,'mode':mode}).json()
        path='/api/games/'+created['id'];host={'Authorization':'Bearer '+created['host_token']}
        def set_state(g,*_):
            for p,r in zip(g['players'],roles):p['role']=r
            g['phase']=phase
        c.app.state.store.mutate(created['id'],set_state)
        if mode=='single':
            payload={**data,**({'actor':2} if role=='knight' else {})}
            state=c.get(path,headers=host).json()
            assert c.post(path+'/actions',headers=host,json={'version':state['version'],'action':action,'data':payload}).status_code==200
            return
        invite=c.post(path+'/room',headers=host,json={'command':'invite'}).json()['invite']
        joined=c.post(path+'/join',json={'invite':invite}).json()
        guest={'Authorization':'Bearer '+joined['player_token']}
        pending=c.get(path+'/room',headers=host).json()['members'][-1]
        c.post(path+'/room',headers=host,json={'command':'approve','data':{'id':pending['id']}})
        detail=c.get(path+'/player/private',headers=guest).json()
        assert detail['can_act'] and detail['role']==role
        host_detail=c.get(path+'/host-player/private',headers=host).json()
        assert not host_detail['can_act'] and host_detail['info'] is None
        state=c.get(path,headers=host).json()
        payload={**data,**({'actor':2} if role=='knight' else {})}
        assert c.post(path+'/actions',headers=host,json={'version':state['version'],'action':action,'data':payload,'debug':True}).status_code==409
        assert c.post(path+'/player/actions',headers=guest,json={'turn_key':detail['turn_key'],'action':action,'data':data}).status_code==200
        assert c.post(path+'/player/actions',headers=guest,json={'turn_key':detail['turn_key'],'action':action,'data':data}).status_code==409
        c.post(path+'/room',headers=host,json={'command':'mode','data':{'mode':'single'}})
        assert c.get(path+'/player/private',headers=guest).status_code==409


def test_old_five_role_cast_stays_compatible_and_new_roles_are_unique_in_standard():
    old={'wolf':1,'seer':1,'witch':1,'hunter':1,'villager':1}
    assert len(new_game(old)['players'])==5
    with pytest.raises(RuleError):new_game({**old,'guard':2})
    assert len(new_game({**old,'guard':2},{'fun_mode':True})['players'])==7


def test_public_role_announcements_are_phase_bound_and_audio_validates_key(tmp_path):
    with TestClient(create_app(tmp_path/'audio.db')) as c:
        g=game(phase='discussion');g=act(g,'duel',{'actor':6,'target':8})
        created,host,viewer=c.app.state.store.create(g)
        path='/api/games/'+created;headers={'Authorization':'Bearer '+host}
        public=public_view(g);assert public['public_cue'] and 'Knight 6' in public['narration_en']
        texts=[]
        async def synthesize(text,profile):texts.append(text);return b'mp3'
        c.app.state.speech.synthesize=synthesize
        assert c.get(path+'/audio?phase=discussion&lang=en',headers=headers).status_code==200
        assert 'Knight' not in texts[-1]  # Generic prefetch stays generic.
        assert c.get(path+'/audio',params={'phase':'discussion','lang':'en','announcement':public['public_cue']},headers=headers).status_code==200
        assert 'Knight 6' in texts[-1] and 'seat 8' not in texts[-1]  # Public outcome only.
        assert c.get(path+'/audio?announcement=fake',headers=headers).status_code==409
        assert public_view(act(g,'vote',{}))['public_cue'] is None


@pytest.mark.parametrize('remote',[False,True])
def test_revealed_idiot_is_not_required_for_phone_ballot_completion(remote):
    g=game(('wolf','idiot','villager','wolf','villager','villager'),phase='vote')
    rooms.network(g).update(mode='multi',remote=remote);rooms.ensure_host(g)
    invite=rooms.host_operation(g,'invite',{})['invite'];passes={}
    for seat in range(2,7):
        joined=rooms.join(g,invite,None,f'Player {seat}');passes[seat]=joined['player_token']
        rooms.host_operation(g,'approve',{'id':rooms.host_view(g)['members'][-1]['id']})
    g=act(g,'vote_result',{'leaders':[2]});g['phase']='vote'
    assert not rooms.player_view(g,passes[2],True)['can_act']
    with pytest.raises(RuleError):rooms.player_action(g,passes[2],rooms.turn_key(g),'ballot',{'target':1})
    with pytest.raises(RuleError):rooms.player_action(g,passes[3],rooms.turn_key(g),'ballot',{'target':2})
    for seat in (3,4,5,6):rooms.player_action(g,passes[seat],rooms.turn_key(g),'ballot',{'target':None})
    rooms.player_action(g,None,rooms.turn_key(g),'ballot',{'target':None},member_key=rooms.host_key(g))
    assert g['phase']=='wolves' and len(g['vote_history'][-1]['ballots'])==5
    assert '2' not in g['vote_history'][-1]['ballots']
