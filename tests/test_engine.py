from copy import deepcopy

import pytest

from backend.engine import RuleError, act, new_game, private_view, public_view


def game(roles=("wolf", "wolf", "witch", "seer", "hunter", "villager", "villager"), phase="wolves"):
    g = new_game({r: roles.count(r) for r in ("wolf", "seer", "witch", "hunter", "villager")})
    for p, role in zip(g["players"], roles):
        p["role"] = role
    g["phase"] = phase
    return g


def night(g, victim=None, save=False, poison=None, inspect=1):
    g = act(g, "wolves", {"target": victim})
    g = act(g, "witch", {"save": save, "poison": poison})
    if any(p["alive"] and p["role"] == "seer" for p in g["players"]):
        g = act(g, "inspect", {"target": inspect})
    return act(g, "ack", {})


def test_setup_rejects_invalid_composition_and_types():
    for counts in ({"wolf": 2}, {"wolf": 3, "seer": 0, "witch": 0, "hunter": 0, "villager": 2},
                   {"wolf": 1, "seer": 2, "witch": 0, "hunter": 0, "villager": 3},
                   {"wolf": True, "seer": 1, "witch": 1, "hunter": 1, "villager": 3}):
        with pytest.raises(RuleError):
            new_game(counts)


def test_unknown_action_fields_cannot_silently_become_abstentions():
    with pytest.raises(RuleError):
        act(game(), "wolves", {"targte": 3})


def test_wolves_abstain_rule_enforced_and_old_games_remain_compatible():
    g = game()
    assert act(g, "wolves", {"target": None})["kill"] is None
    g["rules"]["wolves_can_abstain"] = False
    assert private_view(g)["can_abstain"] is False
    for data in ({}, {"target": None}):
        with pytest.raises(RuleError):
            act(g, "wolves", data)
    assert act(g, "wolves", {"target": 6})["kill"] == 6
    assert g["phase"] == "wolves"
    del g["rules"]["wolves_can_abstain"]
    assert act(g, "wolves", {})["phase"] == "witch"


def test_new_rule_validates_boolean_and_bilingual_prompts_cover_all_phases():
    from backend.engine import NARRATION, NARRATION_EN, ROLES
    counts = {r: ["wolf", "seer", "witch", "hunter", "villager", "villager"].count(r) for r in ROLES}
    assert new_game(counts)["rules"]["wolves_can_abstain"] is True
    with pytest.raises(RuleError):
        new_game(counts, {"wolves_can_abstain": "false"})
    assert NARRATION.keys() == NARRATION_EN.keys()
    for phase in NARRATION:
        g = game(phase=phase)
        if phase == "hunter":
            g["hunters"] = [5]
        if phase == "last_words":
            g["last_words_queue"] = [6]
        assert public_view(g)["narration_en"] == NARRATION_EN[phase]


def test_reveal_each_seat_then_start():
    g = game(phase="reveal")
    for seat in range(1, 8):
        assert private_view(g)["seat"] == seat
        g = act(g, "ack", {})
    assert g["phase"] == "wolves"


def test_debug_skip_remaining_reveals_preserves_deal_and_only_works_during_reveal():
    g = act(game(phase="reveal"), "ack", {})
    players = deepcopy(g["players"])
    skipped = act(g, "debug_skip_reveal", {})
    assert skipped["phase"] == "wolves" and skipped["day"] == 1
    assert skipped["reveal_seat"] == len(players)
    assert skipped["players"] == players
    assert skipped["version"] == g["version"] + 1
    assert g["phase"] == "reveal"
    with pytest.raises(RuleError):
        act(skipped, "debug_skip_reveal", {})


def test_no_night_leaks_and_snapshot_remains_alive_for_seer():
    g = night(game(), victim=4, poison=7)
    view = public_view(g)
    assert all(p["alive"] for p in view["players"])
    assert all(set(p) == {"seat", "alive"} for p in view["players"])
    assert not {"kill", "poison", "inspection", "save_used", "poison_used"} & view.keys()
    assert len(view["events"]) == 1
    g = act(g, "dawn", {})
    assert not g["players"][3]["alive"] and not g["players"][6]["alive"]


def test_hunter_fires_before_night_parity():
    g = game(("wolf", "wolf", "hunter", "villager", "villager"))
    g = night(g, victim=3)
    g = act(g, "dawn", {})
    assert g["phase"] == "hunter" and g["winner"] is None
    g = act(g, "shoot", {"target": 1})
    assert g["phase"] == "discussion" and g["winner"] is None


def test_poison_overrides_wolf_death_and_prevents_hunter_shot():
    g = act(night(game(), victim=5, poison=5), "dawn", {})
    assert g["players"][4]["cause"] == "poison"
    assert not g["hunters"] and g["phase"] == "discussion"


def test_witch_may_act_and_self_save_by_default_but_both_can_be_disabled():
    g = act(game(), "wolves", {"target": 3})
    assert private_view(g)["active"] and private_view(g)["can_save"]
    assert act(g, "witch", {"save": True})["kill"] is None
    g["rules"]["witch_self_save"] = False
    with pytest.raises(RuleError):
        act(g, "witch", {"save": True})
    assert act(g, "witch", {"poison": 1})["poison_used"]
    g["rules"]["witch_acts_when_killed"] = False
    assert not private_view(g)["active"]
    with pytest.raises(RuleError):
        act(g, "witch", {"poison": 1})


def test_witch_potions_single_use_and_mutually_exclusive():
    g = act(game(), "wolves", {"target": 6})
    with pytest.raises(RuleError):
        act(g, "witch", {"save": True, "poison": 1})
    g = act(g, "witch", {"save": True})
    assert g["save_used"] and g["kill"] is None
    g["phase"], g["kill"] = "witch", 6
    with pytest.raises(RuleError):
        act(g, "witch", {"save": True})
    g = act(g, "witch", {"poison": 1})
    g["phase"] = "witch"
    with pytest.raises(RuleError):
        act(g, "witch", {"poison": 2})


def test_seer_cannot_self_inspect_repeat_or_skip_result():
    g = game(phase="seer")
    for action, data in (("inspect", {"target": 4}), ("ack", {})):
        with pytest.raises(RuleError):
            act(g, action, data)
    g = act(g, "inspect", {"target": 1})
    assert private_view(g)["inspection"] == {"seat": 1, "alignment": "bad"}
    with pytest.raises(RuleError):
        act(g, "inspect", {"target": 2})
    assert act(g, "ack", {})["phase"] == "dawn"


def test_missing_special_roles_keep_same_phases():
    g = game(("wolf", "villager", "villager", "villager", "villager"))
    g = act(g, "wolves", {})
    assert g["phase"] == "witch" and not private_view(g)["active"]
    g = act(g, "witch", {})
    assert g["phase"] == "seer" and not private_view(g)["active"]
    g = act(g, "ack", {})
    assert act(g, "dawn", {})["phase"] == "discussion"


def test_ballots_tie_runoff_then_tie_means_no_death():
    g = game(phase="vote")
    ballots = {"1": 2, "2": 1, "3": 1, "4": 2, "5": None, "6": None, "7": None}
    g = act(g, "ballots", {"ballots": ballots})
    assert g["phase"] == "runoff" and g["runoff"] == [1, 2]
    g = act(g, "ballots", {"ballots": ballots})
    assert g["phase"] == "wolves" and g["day"] == 2
    assert all(p["alive"] for p in g["players"])


def test_votes_require_alive_voters_and_targets():
    g = game(phase="vote")
    ballots = {str(i): None for i in range(1, 8)}
    for invalid in ({"1": 2}, {**ballots, "1": 99}, {**ballots, "1": True}):
        with pytest.raises(RuleError):
            act(g, "ballots", {"ballots": invalid})
    g["players"][6]["alive"] = False
    with pytest.raises(RuleError):
        act(g, "ballots", {"ballots": ballots})


def test_self_vote_can_eliminate_the_voter():
    g = game(phase="vote")
    ballots = {str(i): (1 if i == 1 else None) for i in range(1, 8)}
    g = act(g, "ballots", {"ballots": ballots})
    assert not g["players"][0]["alive"]
    assert g["players"][0]["cause"] == "vote"


def test_self_vote_is_also_allowed_in_runoff():
    g = game(phase="vote")
    ballots = {str(i): i for i in range(1, 8)}
    g = act(g, "ballots", {"ballots": ballots})
    assert g["phase"] == "runoff"
    g = act(g, "ballots", {"ballots": ballots})
    assert g["phase"] == "wolves" and all(p["alive"] for p in g["players"])


def test_hunter_vote_can_kill_last_wolf_before_victory():
    g = game(("wolf", "hunter", "villager", "villager", "villager"), phase="vote")
    g = act(g, "ballots", {"ballots": {"1": 2, "2": None, "3": 2, "4": 2, "5": None}})
    assert g["phase"] == "hunter"
    g = act(g, "shoot", {"target": 1})
    assert g["winner"] == "village" and g["phase"] == "finished"
    assert all("role" in p and "cause" in p for p in public_view(g)["players"])
    with pytest.raises(RuleError):
        act(g, "wolves", {})


def test_simultaneous_elimination_draw_and_parity_toggle():
    g = game(phase="dawn")
    for p in g["players"]:
        p["alive"] = p["seat"] in [1, 3]
    g["kill"], g["poison"] = 3, 1
    assert act(g, "dawn", {})["winner"] == "draw"
    g = game(phase="dawn")
    for p in g["players"]:
        p["alive"] = p["seat"] in [1, 3]
    g["rules"]["parity_wins"] = False
    assert act(g, "dawn", {})["phase"] == "discussion"
    g["rules"]["parity_wins"] = True
    assert act(g, "dawn", {})["winner"] == "wolves"


@pytest.mark.parametrize("seat", [0, -1, 99, True, "1", 1.5])
def test_bad_targets_rejected_without_mutating_input(seat):
    g = game()
    before = deepcopy(g)
    with pytest.raises(RuleError):
        act(g, "wolves", {"target": seat})
    assert g == before
