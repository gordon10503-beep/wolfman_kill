from copy import deepcopy
import pytest
from backend.engine import ALIGNMENTS, ROLES, RuleError, act, new_game, private_view, public_view


def make(roles=('wolf','witch','witch','seer','seer','hunter','hunter','villager'), phase='wolves'):
    g=new_game({r:roles.count(r) for r in ROLES},{'fun_mode':True})
    for p,role in zip(g['players'],roles): p['role']=role
    g['phase']=phase
    return g


def test_fun_mode_unlocks_specials_but_keeps_balance_and_boolean_validation():
    counts={r:['wolf','hunter','hunter','hunter','hunter'].count(r) for r in ROLES}
    assert new_game(counts,{'fun_mode':True})['rules']['fun_mode']
    with pytest.raises(RuleError): new_game(counts)
    with pytest.raises(RuleError): new_game(counts,{'fun_mode':'true'})
    with pytest.raises(RuleError): new_game({**counts,'wolf':4},{'fun_mode':True})


def test_witches_have_independent_potions_and_the_same_original_wolf_information():
    g=act(make(),'wolves',{'target':8})
    assert private_view(g)['actor_seat']==2
    g=act(g,'witch',{'save':True})
    second=private_view(g)
    assert g['phase']=='witch' and second['actor_seat']==3
    assert second['kill']==8 and second['can_save'] and second['can_poison']
    g=act(g,'witch',{'poison':1})
    assert g['phase']=='seer' and g['kill'] is None
    assert g['witch_potions']=={'2':{'save_used':True,'poison_used':False},'3':{'save_used':False,'poison_used':True}}
    g['phase']='witch'
    assert not private_view(g)['can_save'] and private_view(g)['can_poison']
    g=act(g,'witch',{})
    assert private_view(g)['can_save'] and not private_view(g)['can_poison']


def test_multiple_poison_targets_resolve_together_and_suppress_hunter_shots():
    g=act(make(),'wolves',{})
    g=act(g,'witch',{'poison':6})
    g=act(g,'witch',{'poison':7})
    g['phase']='dawn'
    result=act(g,'dawn',{})
    assert all(result['players'][s-1]['cause']=='poison' for s in (6,7))
    assert result['hunters']==[] and result['phase']=='discussion'


def test_seer_turns_keep_results_private_and_use_faction_alignment():
    g=make(phase='seer')
    assert private_view(g)['actor_seat']==4
    g=act(g,'inspect',{'target':1})
    assert private_view(g)['inspection']=={'seat':1,'alignment':'bad'}
    assert 'inspection' not in public_view(g) and 'seer_cursor' not in public_view(g)
    g=act(g,'ack',{})
    assert g['phase']=='seer' and private_view(g)['actor_seat']==5
    assert public_view(g)['role_turn']=={'number':2,'total':2}
    assert private_view(g)['inspection'] is None
    with pytest.raises(RuleError): act(g,'inspect',{'target':5})
    g=act(g,'inspect',{'target':8})
    assert private_view(g)['inspection']['alignment']=='good'
    assert act(g,'ack',{})['phase']=='dawn'


def test_seer_alignment_can_classify_a_future_non_wolf_role(monkeypatch):
    g=make(phase='seer')
    g['players'][7]['role']='future_bad_role'
    monkeypatch.setitem(ALIGNMENTS,'future_bad_role','bad')
    assert act(g,'inspect',{'target':8})['inspection']['alignment']=='bad'


def test_inactive_pass_never_skips_a_live_actor_or_hunter():
    for phase in ('witch','seer','hunter'):
        g=make(phase=phase)
        with pytest.raises(RuleError): act(g,'inactive_pass',{})
    g=make(phase='seer');g['players'][3]['alive']=False
    before=public_view(g);players_before=deepcopy(g['players'])
    g=act(g,'inactive_pass',{})
    assert g['phase']=='seer' and private_view(g)['actor_seat']==5
    assert public_view(g)['role_turn']=={'number':2,'total':2}
    assert g['players']==players_before
    assert all('role' not in p for p in before['players'])
    with pytest.raises(RuleError): act(g,'inactive_pass',{})


def test_missing_roles_and_disabled_witch_keep_the_same_private_pass_path():
    g=make(('wolf','hunter','hunter','hunter','hunter'))
    g=act(g,'wolves',{})
    assert not private_view(g)['active']
    g=act(g,'inactive_pass',{})
    assert g['phase']=='seer' and not private_view(g)['active']
    assert act(g,'inactive_pass',{})['phase']=='dawn'
    g=make();g['rules']['witch_acts_when_killed']=False
    g=act(g,'wolves',{'target':2})
    assert not private_view(g)['active']
    assert act(g,'inactive_pass',{})['kill']==2


def test_all_hunter_chain_finishes_before_winner_even_at_parity():
    g=make(('wolf','hunter','hunter','hunter','hunter'),phase='vote')
    g=act(g,'vote_result',{'leaders':[2]})
    for target in (3,4,5):
        assert g['phase']=='hunter' and g['winner'] is None
        g=act(g,'shoot',{'target':target})
    assert g['hunters']==[5]
    g=act(g,'shoot',{'target':1})
    assert g['winner']=='draw' and not any(p['alive'] for p in g['players'])


def test_hunter_sources_survive_a_chain_and_only_appear_in_the_public_recap():
    g=make(('wolf','hunter','hunter','hunter','hunter'),phase='vote')
    g=act(g,'vote_result',{'leaders':[2]})
    for shooter,victim in ((2,3),(3,4),(4,5)):
        g=act(g,'shoot',{'target':victim})
        assert g['players'][victim-1]['hunter_seat']==shooter
        assert all('hunter_seat' not in p for p in public_view(g)['players'])
    g=act(g,'shoot',{'target':1})
    recap=public_view(g)['players']
    assert g['phase']=='finished'
    assert {p['seat']:p['hunter_seat'] for p in recap if p['cause']=='hunter'}=={3:2,4:3,5:4,1:5}
    assert 'hunter_seat' not in recap[1]  # Voted out, rather than shot.


def test_counted_results_match_ballots_and_keep_runoff_rules():
    g=make(phase='vote')
    direct=act(g,'vote_result',{'leaders':[1]})
    ballots=act(g,'ballots',{'ballots':{str(p['seat']):1 for p in g['players']}})
    assert direct['players']==ballots['players'] and direct['winner']==ballots['winner']
    tie=act(g,'vote_result',{'leaders':[2,1]})
    assert tie['phase']=='runoff' and tie['runoff']==[1,2]
    with pytest.raises(RuleError): act(tie,'vote_result',{'leaders':[3]})
    result=act(tie,'vote_result',{'leaders':[1,2]})
    assert result['phase']=='wolves' and all(p['alive'] for p in result['players'])
    assert act(g,'vote_result',{'leaders':[]})['phase']=='wolves'


@pytest.mark.parametrize('leaders',[None,[True],['1'],[1,1],[99]])
def test_invalid_counted_results_do_not_mutate_game(leaders):
    g=make(phase='vote')
    with pytest.raises(RuleError): act(g,'vote_result',{'leaders':leaders})
    assert g['phase']=='vote' and g['version']==0

def test_fun_mode_accepts_one_wolf_and_fifteen_hunters_but_not_sixteen():
    counts={r:0 for r in ROLES};counts.update(wolf=1,hunter=15)
    assert len(new_game(counts,{'fun_mode':True})['players'])==16
    with pytest.raises(RuleError):new_game({**counts,'hunter':16},{'fun_mode':True})
