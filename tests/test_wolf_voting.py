"""Wolf plurality/runoff rules and multiplayer privacy regressions."""
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from backend import rooms
from backend.app import create_app
from backend.engine import ROLES, RuleError, act, new_game, private_view, public_view


def game(wolves=2, **rules):
    roles = ['wolf'] * wolves + ['seer'] + ['villager'] * (wolves + 1)
    g = new_game({r: roles.count(r) for r in ROLES}, {'fun_mode': True, **rules})
    for p, role in zip(g['players'], roles):
        p['role'] = role
    g['phase'] = 'wolves'
    return g


@pytest.mark.parametrize('ballots,expected', [
    ({'1': 4, '2': 4, '3': 5}, 4),
    ({'1': None, '2': None, '3': 5}, 5),
    ({'1': None, '2': None, '3': None}, None),
])
def test_plurality_and_abstentions(ballots, expected):
    g = act(game(3), 'wolf_ballots', {'ballots': ballots})
    assert g['phase'] != 'wolves' and g['kill'] == expected


@pytest.mark.parametrize('can_pass', [True, False])
def test_one_private_runoff_then_no_kill_even_if_voluntary_passing_is_disabled(can_pass):
    original = game(wolves_can_abstain=can_pass)
    g = act(original, 'wolf_ballots', {'ballots': {'1': 4, '2': 5}})
    assert g['phase'] == 'wolves' and private_view(g)['targets'] == [4, 5]
    assert private_view(g)['round'] == 2
    assert public_view(g)['events'] == public_view(original)['events']
    assert 'wolf_runoff' not in public_view(g)
    with pytest.raises(RuleError):
        act(g, 'wolf_ballots', {'ballots': {'1': 3, '2': 5}})
    g = act(g, 'wolf_ballots', {'ballots': {'1': 4, '2': 5}})
    assert g['phase'] != 'wolves' and g['kill'] is None and 'wolf_runoff' not in g


def test_runoff_winner_and_ballot_validation():
    g = game(wolves_can_abstain=False)
    for ballots in ({'1': 4}, {'1': True, '2': 4}, {'1': None, '2': 4}, {'1': 4, '2': 5, '3': 4}):
        before = deepcopy(g)
        with pytest.raises(RuleError):
            act(g, 'wolf_ballots', {'ballots': ballots})
        assert g == before
    g = act(g, 'wolf_ballots', {'ballots': {'1': 4, '2': 5}})
    g = act(g, 'wolf_ballots', {'ballots': {'1': 5, '2': 5}})
    assert g['kill'] == 5


@pytest.mark.parametrize('mode', ['multi', 'remote'])
def test_phone_rounds_fresh_ballots_and_stale_key_rejection(mode):
    g = game()
    rooms.network(g).update(mode='multi', remote=mode == 'remote')
    rooms.ensure_host(g)
    invite = rooms.host_operation(g, 'invite', {})['invite']
    token = rooms.join(g, invite, None, 'Wolf 2')['player_token']
    guest_id = rooms.host_view(g)['members'][-1]['id']
    rooms.host_operation(g, 'approve', {'id': guest_id})
    key = rooms.turn_key(g)
    rooms.player_action(g, '', key, 'wolves', {'target': 4}, member_key=rooms.host_key(g))
    rooms.player_action(g, token, key, 'wolves', {'target': 5})
    assert g['phase'] == 'wolves' and g['wolf_runoff'] == [4, 5]
    assert rooms.network(g)['wolf_votes'] == {}
    with pytest.raises(RuleError):
        rooms.player_action(g, token, key, 'wolves', {'target': 4})
    with pytest.raises(RuleError):
        rooms.host_action(g, 'wolf_ballots', {'ballots': {'1': 4, '2': 4}}, debug=True)
    key = rooms.turn_key(g)
    rooms.player_action(g, token, key, 'wolves', {'target': 5})
    rooms.player_action(g, '', key, 'wolves', {'target': 5}, member_key=rooms.host_key(g))
    assert g['kill'] == 5 and rooms.network(g)['wolf_votes'] == {}


def test_debug_hybrid_runoff_cannot_skip_guest_or_erase_their_choice():
    g = game()
    rooms.network(g)['mode'] = 'multi'
    rooms.ensure_host(g)
    invite = rooms.host_operation(g, 'invite', {})['invite']
    token = rooms.join(g, invite, None, 'Wolf 2')['player_token']
    rooms.host_operation(g, 'approve', {'id': rooms.host_view(g)['members'][-1]['id']})
    rooms.player_action(g, token, rooms.turn_key(g), 'wolves', {'target': 5})
    g = rooms.host_action(g, 'wolves', {'target': 4}, debug=True)
    assert g['wolf_runoff'] == [4, 5] and not rooms.network(g)['wolf_votes']
    g = rooms.host_action(g, 'wolves', {'target': 4}, debug=True)
    assert g['phase'] == 'wolves'
    rooms.player_action(g, token, rooms.turn_key(g), 'wolves', {'target': 5})
    assert g['phase'] != 'wolves' and g['kill'] is None


def test_player_poll_response_does_not_encode_seer_result(tmp_path):
    with TestClient(create_app(tmp_path / 'privacy.db')) as client:
        g = game()
        rooms.network(g)['mode'] = 'multi'
        invite = rooms.host_operation(g, 'invite', {})['invite']
        token = rooms.join(g, invite, None, 'Unrelated wolf')['player_token']
        rooms.host_operation(g, 'approve', {'id': rooms.host_view(g)['members'][-1]['id']})
        g['phase'] = 'seer'
        g = act(g, 'inspect', {'target': 1})
        game_id, _, _ = client.app.state.store.create(g)
        response = client.get(f'/api/games/{game_id}/player', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 200
        assert 'alignment' not in response.text and "'seat'" not in response.text
        assert len(response.json()['turn_key']) == 64
        assert 'turn_secret' not in response.text
        alternate = deepcopy(g)
        alternate['inspection'] = {'seat': 5, 'alignment': 'good'}
        assert rooms.turn_key(g) == rooms.turn_key(alternate)
        assert rooms.turn_key(g) != rooms.turn_key({**g, 'inspection': None})


def test_revoke_clears_pending_votes_and_readiness():
    g = game()
    rooms.network(g)['mode'] = 'multi'
    invite = rooms.host_operation(g, 'invite', {})['invite']
    token = rooms.join(g, invite, None, 'Wolf')['player_token']
    guest_id = rooms.host_view(g)['members'][-1]['id']
    rooms.host_operation(g, 'approve', {'id': guest_id})
    n = rooms.network(g)
    n.update(wolf_votes={'1': 4}, ballots={'1': 4}, ready=[1])
    rooms.host_operation(g, 'revoke', {'id': guest_id})
    assert not n['wolf_votes'] and not n['ballots'] and not n['ready']
    with pytest.raises(PermissionError):
        rooms.player_view(g, token)


def test_mode_change_clears_pending_wolf_runoff_and_invalidates_old_forms():
    g = game()
    rooms.network(g)['mode'] = 'multi'
    g = act(g, 'wolf_ballots', {'ballots': {'1': 4, '2': 5}})
    rooms.network(g)['wolf_votes'] = {'1': 4}
    old_key = rooms.turn_key(g)
    rooms.host_operation(g, 'mode', {'mode': 'single'})
    assert 'wolf_runoff' not in g and not rooms.network(g)['wolf_votes']
    assert rooms.turn_key(g) != old_key
    assert private_view(g)['round'] == 1


def test_turn_keys_survive_saved_room_reload_and_legacy_reads_are_stable(tmp_path):
    from backend.store import Store
    g = game()
    key = rooms.turn_key(g)
    store = Store(tmp_path / 'saved.db')
    game_id, host, _ = store.create(g)
    restored = Store(tmp_path / 'saved.db').get(game_id, host)
    assert rooms.turn_key(restored) == key
    del g['network']['turn_secret']
    assert rooms.turn_key(deepcopy(g)) == rooms.turn_key(deepcopy(g))


def test_chat_catchup_does_not_skip_retained_messages_after_a_polling_gap():
    g = game()
    rooms.network(g).update(mode='multi', remote=True)
    g['phase'] = 'discussion'
    member = {'seat': 1, 'approved': True}
    rooms.network(g)['chat'] = {'public': [{'id': i, 'seat': 1, 'text': str(i), 'day': 1} for i in range(1, 121)]}
    def read(after):
        return rooms.chat_view(g, member, after_public=after)['channels']['public']['messages']
    assert [m['id'] for m in read(0)] == list(range(61, 121))
    first = read(50)
    second = read(first[-1]['id'])
    assert [m['id'] for m in first + second] == list(range(51, 121))
    assert read(120) == []
