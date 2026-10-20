"""Seat-scoped room access. No player ever receives the host/viewer pass."""
import hashlib
import hmac
import secrets
import time
from copy import deepcopy
from .engine import act, alive, player, private_view, public_view, require, target, turn_actor, NIGHT_ROLES, voters, vote_targets


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def authorize(token, expected):
    if not hmac.compare_digest(digest(token), expected):
        raise PermissionError("無效的通行證。 / Invalid pass.")


def claim_speaker(g, device):
    n = network(g)
    owns = n.get("speaker") == device or n.get("speaker_until", 0) <= time.time()
    if owns:
        n["speaker"], n["speaker_until"] = device, time.time() + 20
    return {"main": owns}


def owns_speaker(g, device):
    n = network(g)
    return bool(device and n.get("speaker") == device and n.get("speaker_until", 0) > time.time())


def network(g):
    return g.setdefault("network", {"mode": "single", "epoch": 0, "members": {}, "ready": [], "ballots": {}, "wolf_votes": {}})


def mode(g):
    return g.get("network", {}).get("mode", "single")


def remote(g):
    return mode(g) == "multi" and g.get("network", {}).get("remote", False)


def participant(g, credential, host_hash):
    """Resolve either the host's own seat or one approved player pass."""
    key = host_key(g) if hmac.compare_digest(digest(credential), host_hash) else digest(credential)
    m = network(g)["members"].get(key)
    if not m or not m["approved"]:
        raise PermissionError("需要已批准玩家的通行證。 / An approved player pass is required.")
    return m


def host_key(g):
    return next((key for key,m in network(g)["members"].items() if m.get("host")), None)


def ensure_host(g):
    key = host_key(g)
    if key:
        return key
    n = network(g)
    occupied = {m["seat"] for m in n["members"].values()}
    seat = next((p["seat"] for p in g["players"] if p["seat"] not in occupied), None)
    require(seat is not None, "請先騰出主持人的座位。 / Free a seat for the host first.")
    key = digest(secrets.token_urlsafe(32))
    n["members"][key] = {"id": secrets.token_urlsafe(12), "seat":seat, "name":"主持人 / Host", "approved":True, "host":True}
    g["version"] += 1
    return key


def turn_key(g):
    n = network(g)
    return f'{n["epoch"]}:{g["day"]}:{g["phase"]}:{g.get("witch_cursor",0)}:{g.get("seer_cursor",0)}:{g.get("hunters",[])}:{g.get("inspection")}:{g.get("guard_cursor",0)}:{g.get("gravedigger_cursor",0)}'


def public_room(g):
    n = g.get("network", {})
    # Nighttime completion never names the acting seat or reveals availability.
    return {"mode": mode(g), "remote": remote(g), "connected": sum(m["approved"] for m in n.get("members", {}).values()),
            "ready": len(n.get("ready", [])) if g["phase"] == "reveal" else None,
            "votes_received": len(n.get("ballots", {})) if g["phase"] in ("vote", "runoff") else None}


def member(g, token):
    m = network(g)["members"].get(digest(token))
    if m is None:
        raise PermissionError("玩家通行證已失效，請重新加入。 / Player pass revoked. Please rejoin.")
    return m


def replace_state(g, updated):
    g.clear()
    g.update(updated)


def clear_round_inputs(g, previous_key):
    if turn_key(g) != previous_key:
        network(g)["ballots"] = {}
        network(g)["wolf_votes"] = {}


def protected_seats(g):
    """Approved guest passes retain ownership even during a temporary disconnect."""
    return {m["seat"] for m in network(g)["members"].values() if m["approved"] and not m.get("host")}


def debug_control(g):
    protected = protected_seats(g) if mode(g) == "multi" else set()
    simulated = sorted(set(voters(g)) - protected)
    phase, actor = g["phase"], None
    if phase in NIGHT_ROLES:
        p = turn_actor(g, phase)
        actor = p["seat"] if p else None
    elif phase == "hunter":
        actor = g["hunters"][0]
    elif phase == "reveal":
        actor = g["reveal_seat"]
    can_act = actor not in protected
    if phase == "wolves":
        can_act = bool(set(private_view(g)["wolves"]) - protected)
    elif phase in ("vote", "runoff"):
        can_act = bool(simulated)
    return {"protected_seats": sorted(protected), "ballot_seats": simulated, "can_act": can_act}


def guard_private(g):
    if mode(g) == "multi":
        require(debug_control(g)["can_act"], "此角色由已批准的玩家操作。 / This role belongs to an approved player's device.")


def host_action(g, action, data, debug=False):
    if mode(g) == "multi" and not debug:
        # Main device controls public pacing; seat devices control private powers.
        require(action in ("dawn", "vote", "last_words_done", "inactive_pass", "debug_skip_reveal"),
                "此模式請由玩家手機操作，或先切回單機。 / Use the player's device or switch to single device.")
    protected = protected_seats(g) if mode(g) == "multi" else set()
    if protected and g["phase"] == "reveal" and action in ("debug_skip_reveal", "ack"):
        updated = act(g, action, data)  # Keep normal action/field validation.
        if action == "ack":
            guard_private(g)
        ready = set(network(g)["ready"]) | (set(range(1, len(g["players"]) + 1)) - protected if action == "debug_skip_reveal" else {g["reveal_seat"]})
        network(updated)["ready"] = sorted(ready)
        if len(ready) < len(g["players"]):
            updated["phase"] = "reveal"
            updated["reveal_seat"] = next(s for s in range(1, len(g["players"]) + 1) if s not in ready)
        clear_round_inputs(updated, turn_key(g))
        return updated
    if protected and debug:
        phase, previous = g["phase"], turn_key(g)
        if phase in (*NIGHT_ROLES, "hunter") and action != "inactive_pass":
            guard_private(g)
        if phase == "wolves" and action == "wolves":
            updated = act(g, action, data)  # Validate without committing the pack's decision yet.
            wolves = private_view(g)["wolves"]
            simulated = set(wolves) - protected
            require(bool(simulated), "所有存活狼人由玩家操作。 / All living wolves are player-controlled.")
            if set(wolves) & protected:
                choices = {**network(g)["wolf_votes"], **{str(s): data.get("target") for s in simulated}}
                if all(str(s) in choices for s in wolves) and len({choices[str(s)] for s in wolves}) == 1:
                    clear_round_inputs(updated, previous)
                else:
                    updated = deepcopy(g)
                    network(updated)["wolf_votes"] = choices
                    updated["version"] += 1
                return updated
        if phase in ("vote", "runoff") and action in ("ballots", "vote_result") and protected & set(voters(g)):
            require(action == "ballots", "已有玩家投票，請只模擬未入座玩家的選票。 / Simulate only unclaimed seats; players keep their own ballots.")
            simulated = set(voters(g)) - protected
            require(set(data) == {"ballots"} and isinstance(data["ballots"], dict) and bool(simulated)
                    and set(data["ballots"]) == {str(s) for s in simulated}, "只可提交未入座玩家的選票。 / Submit only unclaimed seats' ballots.")
            for choice in data["ballots"].values():
                target(g, choice)
                require(choice is None or choice in vote_targets(g), "此玩家不能被放逐。 / This player cannot be exiled.")
                require(phase != "runoff" or choice is None or choice in g["runoff"], "加賽只可投平票玩家。 / Vote for a tied player.")
            updated = deepcopy(g)
            votes = network(updated)["ballots"]
            votes.update(data["ballots"])
            if len(votes) == len(voters(g)):
                updated = act(updated, "ballots", {"ballots": votes})
                clear_round_inputs(updated, previous)
            else:
                updated["version"] += 1
            return updated
    if action == "duel" and mode(g) == "multi":
        require(data.get("actor") not in protected, "騎士由玩家裝置操作。 / This knight belongs to a player device.")
    previous = turn_key(g)
    updated = act(g, action, data)
    if debug and g["phase"] == "reveal" and action == "ack":
        network(updated)["ready"] = sorted(set(network(updated)["ready"]) | {g["reveal_seat"]})
    clear_round_inputs(updated, previous)
    return updated


def host_operation(g, command, data):
    n = network(g)
    if command == "mode":
        require(set(data) == {"mode"} and data["mode"] in ("single", "multi", "remote"), "無效模式。 / Invalid mode.")
        next_mode = "single" if data["mode"] == "single" else "multi"
        next_remote = data["mode"] == "remote"
        if n["mode"] != next_mode or remote(g) != next_remote:
            n["mode"], n["remote"] = next_mode, next_remote
            n["epoch"] += 1
            n["ballots"], n["wolf_votes"] = {}, {}
            # Roles already checked on the shared device remain acknowledged.
            if g["phase"] == "reveal":
                n["ready"] = sorted(set(n["ready"]) | set(range(1, g["reveal_seat"])))
    elif command == "invite":
        require(not data, "無效參數。 / Invalid fields.")
        invite = secrets.token_urlsafe(32)
        n["invite_hash"] = digest(invite)
        g["version"] += 1
        host = host_key(g)
        return {"invite": invite, "seats": len(g["players"]), "host_seat": n["members"][host]["seat"] if host else None}
    elif command in ("approve", "revoke"):
        require(set(data) == {"id"}, "無效參數。 / Invalid fields.")
        entry = next(((key, m) for key, m in n["members"].items() if m["id"] == data["id"]), None)
        require(entry is not None, "找不到申請。 / Request not found.")
        key, m = entry
        require(not m.get("host"), "主持人保留自己的座位。 / The host keeps their seat.")
        if command == "revoke":
            del n["members"][key]
        else:
            require(not any(other["approved"] and other["seat"] == m["seat"] for other in n["members"].values()),
                    "座位已有玩家，請先撤銷舊裝置。 / Revoke the old device before replacing this seat.")
            m["approved"] = True
            n["ballots"].pop(str(m["seat"]), None)
            n["wolf_votes"].pop(str(m["seat"]), None)
            if g["phase"] == "reveal":
                n["ready"] = [s for s in n["ready"] if s != m["seat"]]
    else:
        require(False, "未知房間操作。 / Unknown room operation.")
    g["version"] += 1
    return host_view(g)


def host_view(g):
    n = network(g)
    return {"room": public_room(g), "members": [{**{k: m[k] for k in ("id", "seat", "name", "approved")}, "host":bool(m.get("host"))} for m in n["members"].values()]}


def join(g, invite, seat, name):
    n = network(g)
    authorize(invite, n.get("invite_hash", ""))
    require(mode(g) == "multi" and g["phase"] != "finished", "房間暫未開放。 / Room is not open.")
    # Assign under the storage write lock. Pending requests reserve seats too.
    # Ignore old clients' requested seat; all clients follow join order.
    occupied = {m["seat"] for m in n["members"].values()}
    seat = next((p["seat"] for p in g["players"] if p["seat"] not in occupied), None)
    require(seat is not None, "房間已滿，請主持人移除離開的玩家。 / Room full. Ask the host to remove a departed player.")
    require(len(n["members"]) < 64, "申請已滿，請主持人移除舊申請。 / Ask the host to clear old requests.")
    token = secrets.token_urlsafe(32)
    n["members"][digest(token)] = {"id": secrets.token_urlsafe(12), "seat": seat, "name": name, "approved": False}
    g["version"] += 1
    return {"player_token": token, "seat": seat}


def player_view(g, token, include_private=False, *, member_key=None):
    m = network(g)["members"][member_key] if member_key else member(g, token)
    if not m["approved"]:
        return {"approved": False, "seat": m["seat"], "version": g["version"]}
    p, phase = player(g, m["seat"]), g["phase"]
    actor = turn_actor(g, phase) if phase in NIGHT_ROLES else None
    available = ((phase == "reveal" and p["seat"] not in network(g)["ready"])
                 or (phase == "wolves" and p["role"] == "wolf" and p["alive"])
                 or (actor is not None and actor["seat"] == p["seat"])
                 or (phase == "hunter" and g["hunters"][0] == p["seat"])
                 or (phase in ("vote", "runoff") and p["seat"] in voters(g))
                 or (phase == "discussion" and p["role"] == "knight" and p["alive"] and not p.get("duel_used")))
    result = {"approved": True, "seat": m["seat"], "state": public_view(g), "turn_key": turn_key(g), "can_act": available and mode(g) == "multi"}
    if not include_private:
        return result
    require(mode(g) == "multi", "已切換單機，請看主裝置。 / Single-device mode: use the main device.")
    p, phase = player(g, m["seat"]), g["phase"]
    result.update(role=p["role"], alive=p["alive"], can_act=False, info=None)
    if phase == "reveal":
        result["can_act"] = p["seat"] not in network(g)["ready"]
    elif phase == "wolves" and p["role"] == "wolf" and p["alive"]:
        result.update(can_act=True, info=private_view(g))
        result["info"]["choices"] = network(g)["wolf_votes"]
    elif phase in NIGHT_ROLES:
        actor = turn_actor(g, phase)
        if actor and actor["seat"] == p["seat"]:
            result.update(can_act=True, info=private_view(g))
    elif phase == "hunter" and g["hunters"][0] == p["seat"]:
        result.update(can_act=True, info={"targets": alive(g)})
    elif phase == "discussion" and p["role"] == "knight" and p["alive"] and not p.get("duel_used"):
        result.update(can_act=True, info={"actor_seat": p["seat"], "targets": [s for s in alive(g) if s != p["seat"]]})
    elif phase in ("vote", "runoff") and p["seat"] in voters(g):
        result.update(can_act=True, info={"targets": g["runoff"] if phase == "runoff" else vote_targets(g),
                                         "submitted": str(p["seat"]) in network(g)["ballots"]})
    return result


def player_action(g, token, key, action, data, *, member_key=None):
    m = network(g)["members"][member_key] if member_key else member(g, token)
    require(m["approved"] and mode(g) == "multi", "請等待批准或使用主裝置。 / Wait for approval or use the main device.")
    require(key == turn_key(g), "回合已變，請重新同步。 / Turn changed. Please sync again.")
    require(isinstance(data, dict), "無效參數。 / Invalid fields.")
    p, phase, n = player(g, m["seat"]), g["phase"], network(g)
    info = player_view(g, token, True, member_key=member_key)
    require(info["can_act"], "現在並非你的行動。 / It is not your turn.")
    previous = turn_key(g)
    if phase == "reveal":
        require(action == "ready" and not data, "請確認身份。 / Confirm your role.")
        n["ready"] = sorted(set(n["ready"]) | {p["seat"]})
        if len(n["ready"]) == len(g["players"]):
            replace_state(g, act(g, "debug_skip_reveal", {}))
        else:
            g["version"] += 1
    elif phase == "wolves":
        require(action == "wolves" and set(data) == {"target"}, "無效狼人行動。 / Invalid wolf action.")
        target(g, data["target"], optional=g["rules"].get("wolves_can_abstain", True))
        n["wolf_votes"][str(p["seat"])] = data["target"]
        wolves = private_view(g)["wolves"]
        choices = n["wolf_votes"]
        if all(str(s) in choices for s in wolves) and len({choices[str(s)] for s in wolves}) == 1:
            replace_state(g, act(g, "wolves", data))
        else:
            g["version"] += 1
    elif phase in ("vote", "runoff"):
        require(action == "ballot" and set(data) == {"target"}, "無效投票。 / Invalid ballot.")
        target(g, data["target"])
        require(data["target"] is None or data["target"] in vote_targets(g), "此玩家不能被放逐。 / This player cannot be exiled.")
        require(phase != "runoff" or data["target"] is None or data["target"] in g["runoff"], "加賽只可投平票玩家。 / Vote for a tied player.")
        n["ballots"][str(p["seat"])] = data["target"]
        if len(n["ballots"]) == len(voters(g)):
            replace_state(g, act(g, "ballots", {"ballots": n["ballots"]}))
        else:
            g["version"] += 1
    else:
        allowed = {"witch": {"witch", "inactive_pass"}, "seer": {"inspect", "ack", "inactive_pass"}, "hunter": {"shoot"}, "guard": {"protect", "inactive_pass"}, "gravedigger": {"grave_ack", "inactive_pass"}, "discussion": {"duel"}}
        require(action in allowed.get(phase, set()), "不允許此行動。 / Action not allowed.")
        if action == "duel":
            require(set(data) <= {"target", "actor"} and data.get("actor", p["seat"]) == p["seat"], "只能操作自己的騎士。 / Control your own knight only.")
            data = {**data, "actor": p["seat"]}
        replace_state(g, act(g, action, data))
    clear_round_inputs(g, previous)
    return player_view(g, token, member_key=member_key)


def chat_participant(g, credential, host_hash, viewer_hash):
    if hmac.compare_digest(digest(credential), viewer_hash):
        return network(g).setdefault("spectator", {"seat": None})
    return participant(g, credential, host_hash)


def chat_permissions(g, m, debug=False):
    require(remote(g), "文字討論只適用於遠端模式。 / Text chat requires remote mode.")
    if m["seat"] is None:
        return {"public": False, "spectators": True}
    p, phase = player(g, m["seat"]), g["phase"]
    public = phase in ("reveal", "finished") or (p["alive"] and phase in ("discussion", "vote", "runoff")) or (phase == "last_words" and g["last_words_queue"][0] == p["seat"])
    # Only the authenticated host, alone in the room, may test public chat at night.
    solo_debug = debug and m.get("host", False) and not protected_seats(g)
    channels = {"public": public or solo_debug}
    if not p["alive"]:
        channels["spectators"] = True
    if phase == "wolves" and p["role"] == "wolf" and p["alive"]:
        channels["wolves"] = True
    return channels


def chat_view(g, m, after_public=0, after_wolves=0, after_spectators=0, debug=False):
    allowed = chat_permissions(g, m, debug)
    history = network(g).get("chat", {})
    return {"seat": m["seat"], "solo_debug": bool(debug and m.get("host", False) and not protected_seats(g)), "channels": {channel: {
        "can_send": can_send,
        "messages": [message for message in history.get(channel, [])[-60:] if message["id"] > {"public": after_public, "wolves": after_wolves, "spectators": after_spectators}[channel]]
    } for channel, can_send in allowed.items()}}


def chat_send(g, m, channel, text, debug=False):
    allowed = chat_permissions(g, m, debug)
    require(channel in allowed and allowed[channel], "目前不能在此頻道發言。 / You cannot speak in this channel now.")
    require(isinstance(text, str) and 0 < len(text.strip()) <= 500, "訊息須為 1–500 字。 / Messages need 1–500 characters.")
    require(time.time() - m.get("last_chat", 0) >= 1, "請稍候再發送。 / Wait a moment before sending again.")
    history = network(g).setdefault("chat", {}).setdefault(channel, [])
    history.append({"id": history[-1]["id"] + 1 if history else 1, "seat": m["seat"], "text": text.strip(), "day": g["day"]})
    del history[:-120]
    m["last_chat"] = time.time()
    # Chat has its own cursor: typing must not invalidate role actions or replay narration.
    return {"sent": True}
