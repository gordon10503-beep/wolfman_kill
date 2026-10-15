def test_terminal_hunter_resolves_before_parity_check(monkeypatch):
    import wolfman_kill as legacy

    g = legacy.GameState(players=[legacy.Player(i + 1, role) for i, role in enumerate(
        ["狼人", "狼人", "獵人", "平民", "平民"])])
    calls = []
    monkeypatch.setattr(legacy, "clear_screen_for_privacy", lambda: None)
    monkeypatch.setattr(legacy, "announce_then_confirm", lambda *a, **kw: None)
    monkeypatch.setattr(legacy, "countdown_wait", lambda *a: None)
    def shoot(game, hunter, cause):
        calls.append("hunter")
        game.players[0].alive = False
    def winner(game):
        calls.append("winner")
        return False
    monkeypatch.setattr(legacy, "hunter_shot", shoot)
    monkeypatch.setattr(legacy, "check_win_condition", winner)
    assert legacy.day_phase(g, "3", "0") is False
    assert calls == ["hunter", "winner"]
