from copy import deepcopy
import pytest
from backend.engine import ROLES, RuleError, act, new_game, public_view


def game(roles=('wolf','hunter','hunter','witch','seer','villager','villager'), day=1):
    g=new_game({r:roles.count(r) for r in ROLES},{'fun_mode':True,'last_words':True})
    for p,r in zip(g['players'],roles):p['role']=r
    g['day']=day
    return g


def test_first_night_poison_and_hunter_chain_each_receive_one_turn_before_discussion():
    g=game();g.update(phase='dawn',kill=2,poison=6,poisons=[6])
    g=act(g,'dawn',{})
    assert g['phase']=='hunter' and g['last_words_queue']==[2,6]
    g=act(g,'shoot',{'target':3})
    assert g['phase']=='hunter'
    g=act(g,'shoot',{'target':7})
    assert g['phase']=='last_words' and g['last_words_queue']==[2,6,3,7]
    for seat in (2,6,3,7):
        view=public_view(g)
        assert view['last_words_seat']==seat and g['winner'] is None
        assert all('role' not in p for p in view['players'])
        g=act(g,'last_words_done',{})
    assert g['phase']=='discussion' and g['last_words_queue']==[]


@pytest.mark.parametrize('day',[2,3])
def test_later_night_casualties_and_hunter_chain_have_no_last_words(day):
    g=game(day=day);g.update(phase='dawn',kill=2,poison=6)
    g=act(g,'dawn',{})
    g=act(g,'shoot',{'target':3})
    g=act(g,'shoot',{'target':7})
    assert g['phase']=='discussion' and not g.get('last_words_queue')


@pytest.mark.parametrize('day',[1,4])
def test_only_voted_hunter_receives_daytime_last_words_after_all_shots(day):
    g=game(day=day);g['phase']='vote'
    g=act(g,'vote_result',{'leaders':[2]})
    g=act(g,'shoot',{'target':3})
    g=act(g,'shoot',{'target':6})
    assert g['phase']=='last_words' and g['last_words_queue']==[2]
    g=act(g,'last_words_done',{})
    assert g['phase']=='wolves' and g['day']==day+1


def test_victory_waits_for_voted_players_last_words_and_rejects_wrong_actions():
    g=game();g['phase']='runoff';g['runoff']=[1,6]
    g=act(g,'vote_result',{'leaders':[1]})
    assert g['phase']=='last_words' and g['winner'] is None
    before=deepcopy(g)
    with pytest.raises(RuleError):act(g,'wolves',{})
    with pytest.raises(RuleError):act(g,'last_words_done',{'seat':6})
    assert g==before
    assert act(g,'last_words_done',{})['winner']=='village'


def test_disabled_or_legacy_rules_keep_the_original_flow_and_ties_grant_no_turn():
    for legacy in (False,True):
        g=game();g['phase']='vote'
        if legacy:del g['rules']['last_words']
        else:g['rules']['last_words']=False
        assert act(g,'vote_result',{'leaders':[6]})['phase']=='wolves'
    g=game();g['phase']='vote'
    assert act(g,'vote_result',{'leaders':[1,6]})['phase']=='runoff'
    assert act(g,'vote_result',{'leaders':[]})['phase']=='wolves'
    with pytest.raises(RuleError):new_game({r:['wolf','hunter','villager','villager','villager'].count(r) for r in ROLES},{'last_words':'yes'})


def test_fun_mode_skips_only_undealt_roles_and_keeps_dead_role_cover():
    for roles,expected in ((('wolf','seer','villager','villager','villager'),'seer'),(('wolf','witch','villager','villager','villager'),'witch')):
        g=game(roles);g['phase']='wolves'
        g=act(g,'wolves',{})
        assert g['phase']==expected
        if expected=='witch':assert act(g,'witch',{})['phase']=='dawn'
    g=game(('wolf','seer','villager','villager','villager'));g['phase']='wolves';g['players'][1]['alive']=False
    g=act(g,'wolves',{})
    assert g['phase']=='seer'
    assert act(g,'inactive_pass',{})['phase']=='dawn'
    g=game(('wolf','villager','villager','villager','villager'));g['rules']['fun_mode']=False;g['phase']='wolves'
    assert act(g,'wolves',{})['phase']=='witch'
