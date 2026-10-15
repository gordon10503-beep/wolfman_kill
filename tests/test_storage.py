"""Shared persistence contract; CI runs both SQLite and real PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
import os
import pytest
from backend.engine import RuleError, new_game
from backend.store import Store

COUNTS={'wolf':1,'seer':1,'witch':1,'hunter':1,'villager':2}


@pytest.fixture(params=['sqlite','postgres'])
def storage(request,tmp_path):
    if request.param=='postgres':
        url=os.environ.get('TEST_DATABASE_URL')
        if not url:pytest.skip('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database')
        from backend.postgres_store import PostgresStore
        factory=lambda:PostgresStore(url)
    else:
        factory=lambda:Store(tmp_path/'games.sqlite3')
    return factory(),factory


def test_storage_auth_and_restart(storage):
    store,reopen=storage
    original=new_game(COUNTS)
    game_id,host,viewer=store.create(original)
    assert reopen().get(game_id,host)==original
    assert store.get(game_id,viewer)==original
    with pytest.raises(PermissionError):store.get(game_id,viewer,host_only=True)
    with pytest.raises(PermissionError):store.update(game_id,viewer,0,'ack',{})
    with pytest.raises(PermissionError):store.get(game_id,'wrong')


def test_storage_only_one_concurrent_action_commits(storage):
    store,_=storage
    game_id,host,_=store.create(new_game(COUNTS))
    def submit(_):
        try:return store.update(game_id,host,0,'ack',{})['version']
        except RuleError:return 'conflict'
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(submit,range(2)))
    assert sorted(map(str,results))==['1','conflict']
    assert store.get(game_id,host)['reveal_seat']==2


def test_storage_failed_actions_roll_back(storage):
    store,_=storage
    original=new_game(COUNTS)
    game_id,host,_=store.create(original)
    with pytest.raises(RuleError):store.update(game_id,host,0,'shoot',{'target':1})
    assert store.get(game_id,host)==original
    assert store.update(game_id,host,0,'ack',{})['version']==1


def test_storage_last_words_queue_survives_reopening(storage):
    store,reopen=storage
    g=new_game(COUNTS,{'last_words':True});g['phase']='vote'
    victim=next(p['seat'] for p in g['players'] if p['role']=='villager')
    game_id,host,_=store.create(g)
    state=store.update(game_id,host,0,'vote_result',{'leaders':[victim]})
    assert state['phase']=='last_words'
    store=reopen()
    assert store.get(game_id,host)['last_words_queue']==[victim]
    assert store.update(game_id,host,1,'last_words_done',{})['phase']=='wolves'
