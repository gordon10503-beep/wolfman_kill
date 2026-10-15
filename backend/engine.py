"""Deterministic game rules. No I/O, networking, or speech in this module."""
from collections import Counter
from copy import deepcopy
import secrets

ROLES = ("wolf", "seer", "witch", "hunter", "villager")
LABELS = dict(zip(ROLES, ("狼人", "預言家", "女巫", "獵人", "平民")))
NARRATION = {
    "reveal": "歡迎來到狼人殺。請各位玩家依次查看自己的身份。",
    "wolves": "天黑請閉眼。狼人請睜眼，選擇今晚的目標。",
    "witch": "狼人請閉眼。女巫請睜眼，確認今晚的資訊，決定是否使用藥物。",
    "seer": "女巫請閉眼。預言家請睜眼，選擇查驗的玩家。",
    "dawn": "預言家請閉眼。天亮了，所有玩家請睜眼。",
    "hunter": "獵人請決定是否開槍。",
    "discussion": "現在開始日間討論。請各位玩家依次發言。",
    "vote": "現在開始投票。請投出你懷疑是狼人的玩家，亦可以棄權。",
    "runoff": "本輪平票。請在平票玩家之間再投一次。",
    "finished": "遊戲結束。請查看勝方與完整復盤。",
}


class RuleError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise RuleError(message)


def new_game(counts, rules=None):
    require(set(counts) == set(ROLES), "請設定全部五種角色。")
    require(all(type(n) is int and 0 <= n <= 16 for n in counts.values()), "角色人數必須是 0–16 的整數。")
    total = sum(counts.values())
    require(5 <= total <= 16, "每局需要 5–16 位玩家。")
    require(0 < counts["wolf"] < total - counts["wolf"], "至少一位狼人，而且開局狼人必須少於好人。")
    require(all(counts[r] <= 1 for r in ("seer", "witch", "hunter")), "預言家、女巫及獵人各最多一位。")
    options = {"witch_self_save": False, "witch_acts_when_killed": True,
               "parity_wins": True, "discussion_seconds": 90}
    if rules:
        require(set(rules) <= set(options), "未知規則。")
        options.update(rules)
    require(all(type(options[k]) is bool for k in options if k != "discussion_seconds"), "規則開關必須是布林值。")
    require(type(options["discussion_seconds"]) is int and 15 <= options["discussion_seconds"] <= 600, "討論時間須為 15–600 秒。")
    deck = [role for role in ROLES for _ in range(counts[role])]
    secrets.SystemRandom().shuffle(deck)
    return {"version": 0, "phase": "reveal", "day": 1, "rules": options,
            "players": [{"seat": i + 1, "role": r, "alive": True, "cause": None} for i, r in enumerate(deck)],
            "reveal_seat": 1, "save_used": False, "poison_used": False,
            "kill": None, "poison": None, "inspection": None, "hunters": [],
            "after_hunter": "discussion", "runoff": [], "winner": None,
            "events": [{"day": 1, "text": "村莊已集結。身份分配完成。"}]}


def alive(g):
    return [p["seat"] for p in g["players"] if p["alive"]]


def player(g, seat):
    require(type(seat) is int and 1 <= seat <= len(g["players"]), "無效座位。")
    return g["players"][seat - 1]


def role_player(g, role):
    return next((p for p in g["players"] if p["role"] == role and p["alive"]), None)


def event(g, text):
    g["events"].append({"day": g["day"], "text": text})


def target(g, seat, exclude=(), optional=True):
    if seat is None and optional:
        return
    require(seat is not None, "請選擇目標。")
    p = player(g, seat)
    require(p["alive"] and seat not in exclude, "請選擇有效的存活目標。")


def check_winner(g):
    living = [p for p in g["players"] if p["alive"]]
    wolves = sum(p["role"] == "wolf" for p in living)
    good = len(living) - wolves
    # Simultaneous elimination of both factions is explicitly a draw.
    winner = "draw" if not living else "village" if not wolves else "wolves" if not good or (g["rules"]["parity_wins"] and wolves >= good) else None
    if winner:
        g["winner"], g["phase"] = winner, "finished"
        event(g, {"draw": "雙方同時全滅，平局。", "village": "所有狼人已出局。好人陣營勝利。", "wolves": "狼人陣營勝利。"}[winner])
    return bool(winner)


def kill(g, seat, cause):
    p = player(g, seat)
    if not p["alive"]:
        return
    p.update(alive=False, cause=cause)
    if p["role"] == "hunter" and cause != "poison":
        g["hunters"].append(seat)


def settle(g, next_phase):
    # Never check parity until all eligible death-triggered shots are resolved.
    g["after_hunter"] = next_phase
    if g["hunters"]:
        g["phase"] = "hunter"
    elif not check_winner(g):
        g["phase"] = next_phase
        if next_phase == "wolves":
            g["day"] += 1
            g["kill"] = g["poison"] = g["inspection"] = None
            event(g, "夜幕再次降臨。")


def private_view(g):
    phase = g["phase"]
    result = {"targets": alive(g)}
    if phase == "reveal":
        p = player(g, g["reveal_seat"])
        result.update(seat=p["seat"], role=p["role"])
    elif phase == "witch":
        witch = role_player(g, "witch")
        can_act = witch is not None and (g["rules"]["witch_acts_when_killed"] or g["kill"] != witch["seat"])
        result.update(active=can_act, kill=g["kill"] if can_act else None,
                      can_save=can_act and not g["save_used"] and g["kill"] is not None and (g["rules"]["witch_self_save"] or g["kill"] != witch["seat"]),
                      can_poison=can_act and not g["poison_used"])
    elif phase == "seer":
        seer = role_player(g, "seer")
        result.update(active=seer is not None, inspection=g["inspection"],
                      targets=[s for s in alive(g) if seer and s != seer["seat"]])
    elif phase == "wolves":
        result["wolves"] = [p["seat"] for p in g["players"] if p["alive"] and p["role"] == "wolf"]
    return result


def public_view(g):
    keys = ("version", "phase", "day", "rules", "reveal_seat", "runoff", "winner", "events")
    result = {k: deepcopy(g[k]) for k in keys}
    result["players"] = [{k: v for k, v in p.items() if k in ("seat", "alive") or g["phase"] == "finished"} for p in g["players"]]
    result["hunter"] = g["hunters"][0] if g["phase"] == "hunter" else None
    result["narration"] = NARRATION[g["phase"]]
    return result


def act(original, action, data):
    g = deepcopy(original)
    phase = g["phase"]
    require(phase != "finished", "遊戲已結束。")
    fields = {"ack": set(), "wolves": {"target"}, "witch": {"save", "poison"},
              "inspect": {"target"}, "dawn": set(), "shoot": {"target"},
              "vote": set(), "ballots": {"ballots"}}
    require(action in fields, "未知行動。")
    require(isinstance(data, dict) and set(data) <= fields[action], "未知行動參數。")
    if phase == "reveal" and action == "ack":
        if g["reveal_seat"] == len(g["players"]):
            g["phase"] = "wolves"
        else:
            g["reveal_seat"] += 1
    elif phase == "wolves" and action == "wolves":
        target(g, data.get("target"))
        g["kill"], g["phase"] = data.get("target"), "witch"
    elif phase == "witch" and action == "witch":
        save, poison = data.get("save", False), data.get("poison")
        require(type(save) is bool, "無效的解藥選項。")
        info = private_view(g)
        require(not save or info["can_save"], "本晚不能使用解藥。")
        require(poison is None or info["can_poison"], "本晚不能使用毒藥。")
        require(not (save and poison is not None), "每晚只可使用一瓶藥。")
        target(g, poison)
        if save:
            g["save_used"], g["kill"] = True, None
        if poison is not None:
            g["poison_used"], g["poison"] = True, poison
        g["phase"] = "seer"
    elif phase == "seer" and action == "inspect":
        require(g["inspection"] is None, "本晚已完成查驗。")
        seer = role_player(g, "seer")
        require(seer is not None, "沒有可行動的預言家。")
        seat = data.get("target")
        target(g, seat, [seer["seat"]], optional=False)
        g["inspection"] = {"seat": seat, "alignment": "wolf" if player(g, seat)["role"] == "wolf" else "village"}
    elif phase == "seer" and action == "ack":
        require(role_player(g, "seer") is None or g["inspection"] is not None, "請先查驗，並確認結果。")
        g["phase"] = "dawn"
    elif phase == "dawn" and action == "dawn":
        deaths = sorted({s for s in (g["kill"], g["poison"]) if s is not None})
        for seat in deaths:
            kill(g, seat, "poison" if seat == g["poison"] else "wolf")
        event(g, "昨晚 " + "、".join(f"{s} 號" for s in deaths) + " 出局。" if deaths else "昨晚是平安夜。")
        settle(g, "discussion")
    elif phase == "hunter" and action == "shoot":
        seat = data.get("target")
        target(g, seat)
        hunter = g["hunters"].pop(0)
        if seat is not None:
            kill(g, seat, "hunter")
            event(g, f"獵人 {hunter} 號開槍，{seat} 號出局。")
        else:
            event(g, f"獵人 {hunter} 號放棄開槍。")
        settle(g, g["after_hunter"])
    elif phase == "discussion" and action == "vote":
        g["phase"] = "vote"
    elif phase in ("vote", "runoff") and action == "ballots":
        ballots = data.get("ballots")
        seats = alive(g)
        require(isinstance(ballots, dict) and set(ballots) == {str(s) for s in seats}, "必須記錄每位存活玩家的一票（或棄權）。")
        for voter, choice in ballots.items():
            target(g, choice, [int(voter)])
            require(choice is None or phase != "runoff" or choice in g["runoff"], "加賽只可投平票玩家。")
        tally = Counter(s for s in ballots.values() if s is not None)
        leaders = sorted(s for s, n in tally.items() if n == max(tally.values())) if tally else []
        if len(leaders) > 1 and phase == "vote":
            g["phase"], g["runoff"] = "runoff", leaders
            event(g, "投票平票，進入一次加賽。")
        else:
            g["runoff"] = []
            if len(leaders) == 1:
                kill(g, leaders[0], "vote")
                event(g, f"公投結果：{leaders[0]} 號出局。")
            else:
                event(g, "平票或全體棄權，本輪無人出局。")
            settle(g, "wolves")
    else:
        raise RuleError("此行動不適用於目前階段。")
    g["version"] += 1
    return g
