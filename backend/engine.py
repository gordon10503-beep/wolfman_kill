"""Deterministic game rules. No I/O, networking, or speech in this module."""
from collections import Counter
from copy import deepcopy
import re
import hashlib
import secrets

WOLF_ROLES = frozenset(("wolf", "wolf_king", "white_wolf_king", "wolf_beauty", "hidden_wolf"))
ROLES = ("wolf", "wolf_king", "white_wolf_king", "wolf_beauty", "hidden_wolf", "seer", "guard", "witch", "hunter", "knight", "gravedigger", "idiot", "villager")
NIGHT_ROLES = ("hidden_wolf", "wolf_beauty", "witch", "seer", "guard", "gravedigger")
NEXT_NIGHT = dict(zip(NIGHT_ROLES, (*NIGHT_ROLES[1:], "dawn")))
ALIGNMENTS = {role: "bad" if role in WOLF_ROLES else "good" for role in ROLES}
LABELS = dict(zip(ROLES, ("狼人", "狼王", "白狼王", "狼美人", "隱狼", "預言家", "守衛", "女巫", "獵人", "騎士", "守墓人", "白痴神", "平民")))
NARRATION = {
    "reveal": "歡迎來到狼人殺。請各位玩家依次查看自己的身份。",
    "wolves": "天黑請閉眼。有狼刀權的狼隊請睜眼，選擇今晚的目標。其他狼人仍生存時，隱狼請保持閉眼。",
    "hidden_wolf": "狼隊請閉眼。隱狼請睜眼，私下確認你的狼隊隊友。",
    "wolf_beauty": "隱狼請閉眼。狼美人請睜眼，選擇今晚魅惑的玩家。",
    "wolf_king_shot": "狼王請決定是否開槍。",
    "witch": "狼隊請閉眼。女巫請睜眼，確認今晚的資訊，決定是否使用藥物。",
    "seer": "女巫請閉眼。預言家請睜眼，選擇查驗的玩家。",
    "guard": "預言家請閉眼。守衛請睜眼，選擇今晚守護的玩家。不能連續兩晚守護同一人。",
    "gravedigger": "守衛請閉眼。守墓人請睜眼，查看前一個白天被放逐者的陣營。",
    "dawn": "所有夜間角色請閉眼。天亮了，所有玩家請睜眼。",
    "hunter": "獵人請決定是否開槍。",
    "last_words": "請畫面指定的玩家發表遺言，其餘玩家請保持安靜。",
    "discussion": "現在開始日間討論。請各位玩家依次發言。",
    "vote": "現在開始投票。請投出你懷疑是狼人的玩家，亦可以棄權。",
    "runoff": "本輪平票。請在平票玩家之間再投一次。",
    "finished": "遊戲結束。請查看勝方與完整復盤。",
}
NARRATION_EN = {
    "reveal": "Welcome to Werewolf. Players, take turns checking your secret roles.",
    "wolves": "Night falls. Wolves with the kill vote, open your eyes and choose a target. Hidden Wolves stay closed while other wolves survive.",
    "hidden_wolf": "Wolves, close your eyes. Hidden Wolf, privately check your teammates.",
    "wolf_beauty": "Hidden Wolf, close your eyes. Wolf Beauty, open your eyes and choose whom to charm tonight.",
    "wolf_king_shot": "Wolf King, decide whether to take your final shot.",
    "witch": "Werewolves, close your eyes. Witch, open your eyes. Review tonight's information and decide whether to use a potion.",
    "seer": "Witch, close your eyes. Seer, open your eyes and choose a player to investigate.",
    "guard": "Seer, close your eyes. Guardian, open your eyes. Protect a player, but not the same player as last night.",
    "gravedigger": "Guardian, close your eyes. Gravedigger, open your eyes and learn the alignment of yesterday's exiled player.",
    "dawn": "All night roles, close your eyes. Morning has arrived. Everyone, open your eyes.",
    "hunter": "Hunter, decide whether to take your final shot.",
    "last_words": "The player shown on screen may give their last words. Everyone else, please listen quietly.",
    "discussion": "The daytime discussion begins. Please speak in seat order and listen carefully.",
    "vote": "Voting begins. Choose the player you suspect is a werewolf. You may vote for yourself or abstain.",
    "runoff": "The vote is tied. Vote once more, choosing only from the tied players.",
    "finished": "The game is over. You may now view the winning team and the full recap.",
}
WINNER_NARRATION = {
    "village": ("遊戲結束。好人陣營勝利！所有狼人已出局。", "The game is over. The good side wins! All werewolves have been eliminated."),
    "wolves": ("遊戲結束。狼人陣營勝利！", "The game is over. The werewolves win!"),
    "draw": ("遊戲結束。雙方同時全滅，平局。", "The game is over. Both sides have been eliminated. It is a draw."),
}


def narration(g, language="yue"):
    if g["phase"] == "finished" and g["winner"] in WINNER_NARRATION:
        return WINNER_NARRATION[g["winner"]][language == "en"]
    base = (NARRATION_EN if language == "en" else NARRATION)[g["phase"]]
    announcement = current_announcement(g)
    return (announcement["en" if language == "en" else "zh"] + " " + base) if announcement else base


class RuleError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise RuleError(message)


def new_game(counts, rules=None):
    require(set(counts) <= set(ROLES) and {"wolf", "seer", "witch", "hunter", "villager"} <= set(counts), "請設定基本角色，並只使用已知角色。")
    counts = {r: counts.get(r, 0) for r in ROLES}
    require(all(type(n) is int and 0 <= n <= 16 for n in counts.values()), "角色人數必須是 0–16 的整數。")
    total = sum(counts.values())
    require(5 <= total <= 16, "每局需要 5–16 位玩家。")
    wolves = sum(counts[r] for r in WOLF_ROLES)
    require(0 < wolves < total - wolves, "狼人陣營至少一位，而且合計必須少於好人。 / The combined wolf side must start smaller than the good side.")
    options = {"witch_self_save": True, "witch_acts_when_killed": True, "witch_one_potion_per_night": True,
               "guard_save_conflict": True, "parity_wins": True, "discussion_seconds": 90, "wolves_can_abstain": True, "fun_mode": False, "last_words": True}
    if rules:
        require(set(rules) <= set(options), "未知規則。")
        options.update(rules)
    require(all(type(options[k]) is bool for k in options if k != "discussion_seconds"), "規則開關必須是布林值。")
    require(type(options["discussion_seconds"]) is int and 15 <= options["discussion_seconds"] <= 600, "討論時間須為 15–600 秒。")
    require(not options["fun_mode"] or all(n <= 15 for n in counts.values()), "娛樂模式每種角色最多 15 位。")
    require(options["fun_mode"] or all(counts[r] <= 1 for r in ROLES if r not in ("wolf", "villager")), "標準模式每種特殊角色最多一位。")
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


def killing_wolves(g):
    wolves = [p["seat"] for p in g["players"] if p["alive"] and p["role"] in WOLF_ROLES]
    visible = [s for s in wolves if player(g, s)["role"] != "hidden_wolf"]
    # Hidden Wolves inherit together only once every other wolf has died.
    return visible or wolves


def wolf_team(g):
    return [p["seat"] for p in g["players"] if p["role"] in WOLF_ROLES]


def role_player(g, role):
    return next((p for p in g["players"] if p["role"] == role and p["alive"]), None)


def turn_actor(g, role):
    # Include eliminated holders so their cover turn looks the same in public.
    actors = [p for p in g["players"] if p["role"] == role]
    index = g.get(role + "_cursor", 0)
    return actors[index] if index < len(actors) else None


def finish_role_turn(g, role, next_phase):
    actors = [p for p in g["players"] if p["role"] == role]
    index = g.get(role + "_cursor", 0) + 1
    if index < len(actors):
        g[role + "_cursor"] = index
        if role == "seer":
            g["inspection"] = None
    else:
        g[role + "_cursor"] = 0
        g["phase"] = next_phase


def voters(g):
    return [p["seat"] for p in g["players"] if p["alive"] and not p.get("idiot_revealed", False)]


def vote_targets(g):
    return voters(g)


def night_phase(g, phase):
    while phase in NIGHT_ROLES and not any(p["role"] == phase for p in g["players"]) and (g["rules"].get("fun_mode", False) or phase in ("guard", "gravedigger", "wolf_beauty", "hidden_wolf")):
        phase = NEXT_NIGHT[phase]
    return phase


def witch_potions(g, seat):
    if sum(p["role"] == "witch" for p in g["players"]) <= 1:
        return {"save_used": g["save_used"], "poison_used": g["poison_used"]}
    return g.get("witch_potions", {}).get(str(seat), {"save_used": False, "poison_used": False})


def event(g, text):
    g["events"].append({"day": g["day"], "text": text})


def announce(g, zh, en):
    g["announcement"] = {"key": f"{g['day']}:{g['phase']}:{g['version'] + 1}:{hashlib.sha256(zh.encode()).hexdigest()[:12]}", "day": g["day"], "phase": g["phase"], "zh": zh, "en": en}


def current_announcement(g):
    value = g.get("announcement")
    return value if value and value["phase"] == g["phase"] and value["day"] == g["day"] and g["phase"] != "finished" else None


def target(g, seat, exclude=(), optional=True):
    if seat is None and optional:
        return
    require(seat is not None, "請選擇目標。")
    p = player(g, seat)
    require(p["alive"] and seat not in exclude, "請選擇有效的存活目標。")


def check_winner(g):
    living = [p for p in g["players"] if p["alive"]]
    wolves = sum(ALIGNMENTS[p["role"]] == "bad" for p in living)
    good = len(living) - wolves
    # Simultaneous elimination of both factions is explicitly a draw.
    winner = "draw" if not living else "village" if not wolves else "wolves" if not good or (g["rules"]["parity_wins"] and wolves >= good) else None
    if winner:
        g["winner"], g["phase"] = winner, "finished"
        event(g, {"draw": "雙方同時全滅，平局。", "village": "所有狼人已出局。好人陣營勝利。", "wolves": "狼人陣營勝利。"}[winner])
    return bool(winner)


def kill(g, seat, cause, night=False):
    p = player(g, seat)
    if not p["alive"]:
        return
    p.update(alive=False, cause=cause)
    if g["rules"].get("last_words", False) and (cause == "vote" or (night and g["day"] == 1)):
        g.setdefault("last_words_queue", []).append(seat)
    if p["role"] in ("hunter", "wolf_king") and cause in ("wolf", "vote", "hunter"):
        g["hunters"].append(seat)
    if p["role"] == "wolf_beauty" and cause in ("vote", "poison", "hunter"):
        mate = g.get("charms", {}).pop(str(seat), None)
        if mate is not None:
            if g.get("_defer_charms"):
                g.setdefault("_pending_charms", []).append(mate)
            elif player(g, mate)["alive"]:
                kill(g, mate, "charm", night)
                if g["phase"] != "dawn":
                    event(g, f"{mate} 號因魅惑連鎖出局。")


def resolve_deaths(g, causes, night=False):
    # Direct simultaneous causes win over charm; poison must still prevent shots.
    before = set(alive(g))
    g["_defer_charms"] = True
    for seat, cause in sorted(causes.items()):
        kill(g, seat, cause, night)
    g.pop("_defer_charms", None)
    for seat in g.pop("_pending_charms", []):
        kill(g, seat, "charm", night)
    return sorted(before - set(alive(g)))


def settle(g, next_phase):
    # Never check parity until all eligible death-triggered shots are resolved.
    g["after_hunter"] = next_phase
    if g["hunters"]:
        g["phase"] = "wolf_king_shot" if player(g, g["hunters"][0])["role"] == "wolf_king" else "hunter"
    elif g.get("last_words_queue"):
        g["after_last_words"] = next_phase
        g["phase"] = "last_words"
    elif not check_winner(g):
        g["phase"] = next_phase
        if next_phase == "wolves":
            g["day"] += 1
            g["kill"] = g["poison"] = g["inspection"] = None
            g["poisons"], g["wolf_target"] = [], None
            for role in NIGHT_ROLES:
                g[role + "_cursor"] = 0
            g["protected"], g["saved_targets"] = [], []
            event(g, "夜幕再次降臨。")


def private_view(g):
    phase = g["phase"]
    result = {"targets": alive(g)}
    if phase == "reveal":
        p = player(g, g["reveal_seat"])
        result.update(seat=p["seat"], role=p["role"])
        if p["role"] == "hidden_wolf":
            result["team"] = wolf_team(g)
    elif phase == "witch":
        witch = turn_actor(g, "witch")
        victim = g.get("wolf_target", g["kill"])
        can_act = witch is not None and witch["alive"] and (g["rules"]["witch_acts_when_killed"] or victim != witch["seat"])
        potions = witch_potions(g, witch["seat"]) if witch else {"save_used": True, "poison_used": True}
        result.update(active=can_act, actor_seat=witch["seat"] if witch else None, kill=victim if can_act else None,
                      can_save=can_act and not potions["save_used"] and victim is not None and (g["rules"]["witch_self_save"] or victim != witch["seat"]),
                      can_poison=can_act and not potions["poison_used"])
    elif phase == "seer":
        seer = turn_actor(g, "seer")
        result.update(active=seer is not None and seer["alive"], actor_seat=seer["seat"] if seer else None, inspection=g["inspection"],
                      targets=[s for s in alive(g) if seer and seer["alive"] and s != seer["seat"]])
    elif phase == "guard":
        guard = turn_actor(g, "guard")
        previous = g.get("guard_previous", {}).get(str(guard["seat"])) if guard else None
        result.update(active=bool(guard and guard["alive"]), actor_seat=guard["seat"] if guard else None,
                      previous=previous, targets=[s for s in alive(g) if s != previous])
    elif phase == "gravedigger":
        keeper = turn_actor(g, "gravedigger")
        exile = g.get("last_exile")
        result.update(active=bool(keeper and keeper["alive"]), actor_seat=keeper["seat"] if keeper else None,
                      grave_result=deepcopy(exile) if keeper and keeper["alive"] and exile and exile["day"] == g["day"] - 1 else None)
    elif phase == "hidden_wolf":
        hidden = turn_actor(g, "hidden_wolf")
        result.update(active=bool(hidden and hidden["alive"]), actor_seat=hidden["seat"] if hidden else None,
                      team=wolf_team(g) if hidden and hidden["alive"] else [])
    elif phase == "wolf_beauty":
        beauty = turn_actor(g, "wolf_beauty")
        result.update(active=bool(beauty and beauty["alive"]), actor_seat=beauty["seat"] if beauty else None,
                      targets=[s for s in alive(g) if beauty and s != beauty["seat"]])
    elif phase == "discussion":
        result["exploders"] = [p["seat"] for p in g["players"] if p["role"] == "white_wolf_king" and p["alive"]]
        result["knights"] = [p["seat"] for p in g["players"] if p["role"] == "knight" and p["alive"] and not p.get("duel_used")]
    elif phase == "wolves":
        result["wolves"] = killing_wolves(g)
        result["can_abstain"] = g["rules"].get("wolves_can_abstain", True)
    return result


def morning_report(g):
    """Narrate only an already-published dawn event, never pending night actions."""
    for entry in reversed(g["events"]):
        if entry["day"] != g["day"] or not entry["text"].startswith("昨晚"):
            continue
        seats = [int(s) for s in re.findall(r"(\d+) 號", entry["text"])]
        return {"day": g["day"], "key": f'{g["day"]}:' + ",".join(map(str,seats)), "cue": g.get("morning_cue"),
                "zh": entry["text"],
                "en": "Eliminated last night: seats " + ", ".join(map(str,seats)) + "." if seats else "No one was eliminated last night."}
    return None


def public_view(g):
    from .rooms import public_room
    keys = ("version", "phase", "day", "rules", "reveal_seat", "runoff", "winner", "events")
    result = {k: deepcopy(g[k]) for k in keys}
    result["players"] = [{k: v for k, v in p.items() if k in ("seat", "alive") or g["phase"] == "finished"} for p in g["players"]]
    revealed = {int(match[1]) for e in g["events"] if (match := re.match(r"(?:獵人|狼王) (\d+) 號(?:開槍|放棄開槍)", e["text"]))}
    if g["phase"] in ("hunter", "wolf_king_shot"):
        revealed.add(g["hunters"][0])
    if g["phase"] != "finished":
        for p in result["players"]:
            if p["seat"] in revealed:
                p["revealed_role"] = player(g, p["seat"])["role"]
    for p in result["players"]:
        original = player(g, p["seat"])
        if original.get("idiot_revealed"):
            p.update(revealed_role="idiot", can_vote=False)
        elif original.get("exploded"):
            p["revealed_role"] = "white_wolf_king"
        elif original.get("duel_used"):
            p["revealed_role"] = "knight"
    result["role_counts"] = dict(Counter(p["role"] for p in g["players"]))
    result["voters"] = voters(g)
    result["vote_targets"] = vote_targets(g)
    result["hunter"] = g["hunters"][0] if g["phase"] in ("hunter", "wolf_king_shot") else None
    result["shooter_role"] = player(g, result["hunter"])["role"] if result["hunter"] else None
    result["last_words_seat"] = g["last_words_queue"][0] if g["phase"] == "last_words" else None
    total = sum(p["role"] == g["phase"] for p in g["players"]) if g["phase"] in NIGHT_ROLES else 0
    # Role counts/turn ordinals are public; actor seats and availability are not.
    result["role_turn"] = {"number": g.get(g["phase"] + "_cursor", 0) + 1, "total": total} if total > 1 else None
    result["public_cue"] = current_announcement(g)["key"] if current_announcement(g) else None
    result["narration"] = narration(g)
    result["narration_en"] = narration(g, "en")
    result["room"] = public_room(g)
    result["morning_report"] = morning_report(g)
    result["vote_history"] = deepcopy(g.get("vote_history", []))
    return result


def resolve_vote(g, leaders):
    if len(leaders) > 1 and g["phase"] == "vote":
        g["phase"], g["runoff"] = "runoff", sorted(leaders)
        event(g, "投票平票，進入一次加賽。")
    else:
        g["runoff"] = []
        if len(leaders) == 1:
            exiled = player(g, leaders[0])
            if exiled["role"] == "idiot":
                exiled["idiot_revealed"] = True
                event(g, f"白痴神 {leaders[0]} 號翻牌免於放逐，失去投票權。")
                g["last_exile"] = None
            else:
                g["last_exile"] = {"seat": leaders[0], "alignment": ALIGNMENTS[exiled["role"]], "day": g["day"]}
                kill(g, leaders[0], "vote")
                event(g, f"公投結果：{leaders[0]} 號出局。")
        else:
            g["last_exile"] = None
            event(g, "平票或全體棄權，本輪無人出局。")
        settle(g, "wolves")
        if len(leaders) == 1 and player(g, leaders[0]).get("idiot_revealed"):
            seat = leaders[0]
            announce(g, f"白痴神 {seat} 號翻牌免於放逐，失去投票權。", f"Idiot {seat} reveals, survives exile, and loses voting rights.")


def act(original, action, data):
    g = deepcopy(original)
    phase = g["phase"]
    require(phase != "finished", "遊戲已結束。")
    fields = {"ack": set(), "wolves": {"target"}, "witch": {"save", "poison"},
              "hidden_ack": set(), "charm": {"target"}, "explode": {"actor", "target"}, "protect": {"target"}, "grave_ack": set(), "duel": {"actor", "target"}, "inspect": {"target"}, "dawn": set(), "shoot": {"target"},
              "vote": set(), "ballots": {"ballots"}, "debug_skip_reveal": set(),
              "vote_result": {"leaders"}, "inactive_pass": set(), "last_words_done": set()}
    require(action in fields, "未知行動。")
    require(isinstance(data, dict) and set(data) <= fields[action], "未知行動參數。")
    if phase in NIGHT_ROLES and action == "inactive_pass":
        require(not private_view(g)["active"], "仍有可行動角色，請完成私人行動。")
        finish_role_turn(g, phase, NEXT_NIGHT[phase])
    elif phase == "reveal" and action == "debug_skip_reveal":
        g["reveal_seat"] = len(g["players"])
        g["phase"] = "wolves"
    elif phase == "reveal" and action == "ack":
        if g["reveal_seat"] == len(g["players"]):
            g["phase"] = "wolves"
        else:
            g["reveal_seat"] += 1
    elif phase == "wolves" and action == "wolves":
        target(g, data.get("target"), optional=g["rules"].get("wolves_can_abstain", True))
        g["kill"], g["phase"] = data.get("target"), "hidden_wolf"
        g["wolf_target"] = g["kill"]
        for role in NIGHT_ROLES:
            g[role + "_cursor"] = 0
        g["poisons"], g["protected"], g["saved_targets"] = [], [], []
    elif phase == "hidden_wolf" and action == "hidden_ack":
        finish_role_turn(g, "hidden_wolf", "wolf_beauty")
    elif phase == "wolf_beauty" and action == "charm":
        beauty = turn_actor(g, "wolf_beauty")
        require(beauty is not None and beauty["alive"], "沒有可行動的狼美人。 / No active Wolf Beauty.")
        seat = data.get("target")
        target(g, seat, [beauty["seat"]])
        eligible = seat is not None and (ALIGNMENTS[player(g, seat)["role"]] == "good" or player(g, seat)["role"] == "hidden_wolf")
        # Never confirm whether the target is a Hidden Wolf through the response.
        g.setdefault("charms", {})[str(beauty["seat"])] = seat if eligible else None
        finish_role_turn(g, "wolf_beauty", "witch")
    elif phase == "witch" and action == "witch":
        save, poison = data.get("save", False), data.get("poison")
        require(type(save) is bool, "無效的解藥選項。")
        info = private_view(g)
        require(not save or info["can_save"], "本晚不能使用解藥。")
        require(poison is None or info["can_poison"], "本晚不能使用毒藥。")
        require(not g["rules"].get("witch_one_potion_per_night", True) or not (save and poison is not None), "每晚只可使用一瓶藥。")
        target(g, poison)
        witch = turn_actor(g, "witch")
        potions = witch_potions(g, witch["seat"]) if witch else None
        if save:
            g["save_used"], g["kill"] = True, None
            g.setdefault("saved_targets", []).append(g.get("wolf_target"))
            potions["save_used"] = True
        if poison is not None:
            g["poison_used"], g["poison"] = True, poison
            g.setdefault("poisons", []).append(poison)
            potions["poison_used"] = True
        if witch:
            g.setdefault("witch_potions", {})[str(witch["seat"])] = potions
        finish_role_turn(g, "witch", "seer")
    elif phase == "seer" and action == "inspect":
        require(g["inspection"] is None, "本晚已完成查驗。")
        seer = turn_actor(g, "seer")
        require(seer is not None and seer["alive"], "沒有可行動的預言家。")
        seat = data.get("target")
        target(g, seat, [seer["seat"]], optional=False)
        g["inspection"] = {"seat": seat, "alignment": "good" if player(g, seat)["role"] == "hidden_wolf" else ALIGNMENTS[player(g, seat)["role"]]}
    elif phase == "seer" and action == "ack":
        seer = turn_actor(g, "seer")
        require(seer is None or not seer["alive"] or g["inspection"] is not None, "請先查驗，並確認結果。")
        finish_role_turn(g, "seer", "guard")
    elif phase == "guard" and action == "protect":
        guard = turn_actor(g, "guard")
        require(guard is not None and guard["alive"], "沒有可行動的守衛。 / No active guardian.")
        seat = data.get("target")
        target(g, seat)
        previous = g.setdefault("guard_previous", {}).get(str(guard["seat"]))
        require(seat is None or seat != previous, "不能連續兩晚守護同一人。 / Cannot protect the same player on consecutive nights.")
        g["guard_previous"][str(guard["seat"])] = seat
        if seat is not None:
            g.setdefault("protected", []).append(seat)
        finish_role_turn(g, "guard", "gravedigger")
    elif phase == "gravedigger" and action == "grave_ack":
        finish_role_turn(g, "gravedigger", "dawn")
    elif phase == "discussion" and action == "explode":
        king = player(g, data.get("actor"))
        require(king["role"] == "white_wolf_king" and king["alive"], "白狼王只能在存活的白天討論時自爆。 / A living White Wolf King may explode during discussion only.")
        seat = data.get("target")
        target(g, seat, [king["seat"]], optional=False)
        king["exploded"] = True
        resolve_deaths(g, {king["seat"]: "explosion", seat: "explosion"})
        event(g, f"白狼王 {king['seat']} 號自爆，帶走 {seat} 號。")
        settle(g, "wolves")
        announce(g, f"白狼王 {king['seat']} 號自爆，帶走 {seat} 號，直接入夜。", f"White Wolf King {king['seat']} explodes, taking seat {seat}. Night begins.")
    elif phase == "discussion" and action == "duel":
        knight = player(g, data.get("actor"))
        require(knight["role"] == "knight" and knight["alive"] and not knight.get("duel_used"), "騎士本局只能決鬥一次。 / Each living knight may duel once per game.")
        seat = data.get("target")
        target(g, seat, [knight["seat"]], optional=False)
        knight["duel_used"] = True
        if player(g, seat)["role"] in WOLF_ROLES:
            kill(g, seat, "duel")
            event(g, f"騎士 {knight['seat']} 號決鬥，{seat} 號是狼人並出局。")
            settle(g, "wolves")
            announce(g, f"騎士 {knight['seat']} 號決鬥成功，{seat} 號狼人出局。", f"Knight {knight['seat']} wins the duel. Werewolf {seat} is eliminated.")
        else:
            kill(g, knight["seat"], "duel")
            event(g, f"騎士 {knight['seat']} 號決鬥，{seat} 號不是狼人，騎士出局。")
            settle(g, "discussion")
            announce(g, f"騎士 {knight['seat']} 號決鬥失敗，騎士出局。", f"Knight {knight['seat']} loses the duel and is eliminated.")
    elif phase == "dawn" and action == "dawn":
        poisons = set(g.get("poisons", [])) | ({g["poison"]} if g["poison"] is not None else set())
        victim = g.get("wolf_target", g["kill"])
        protected = victim is not None and victim in g.get("protected", [])
        saved = victim is not None and victim in g.get("saved_targets", [])
        wolf_death = victim if protected and saved and g["rules"].get("guard_save_conflict", True) else (None if protected or saved else g["kill"])
        causes = {seat: "poison" for seat in poisons}
        if wolf_death is not None:
            causes.setdefault(wolf_death, "wolf")
        deaths = resolve_deaths(g, causes, night=True)
        event(g, "昨晚 " + "、".join(f"{s} 號" for s in deaths) + " 出局。" if deaths else "昨晚是平安夜。")
        settle(g, "discussion")
        g["morning_cue"] = f'{g["phase"]}:{g["hunters"][0] if g["phase"] in ("hunter", "wolf_king_shot") else ""}:{g["last_words_queue"][0] if g["phase"] == "last_words" else ""}'
    elif phase in ("hunter", "wolf_king_shot") and action == "shoot":
        seat = data.get("target")
        target(g, seat)
        hunter = g["hunters"].pop(0)
        shooter = LABELS[player(g, hunter)["role"]]
        if seat is not None:
            kill(g, seat, "hunter", night=g["after_hunter"] == "discussion")
            player(g, seat).update(hunter_seat=hunter, shooter_role=player(g, hunter)["role"])
            event(g, f"{shooter} {hunter} 號開槍，{seat} 號出局。")
        else:
            event(g, f"{shooter} {hunter} 號放棄開槍。")
        settle(g, g["after_hunter"])
    elif phase == "last_words" and action == "last_words_done":
        seat = g["last_words_queue"].pop(0)
        event(g, f"{seat} 號遺言結束。")
        settle(g, g["after_last_words"])
    elif phase == "discussion" and action == "vote":
        g["phase"] = "vote"
    elif phase in ("vote", "runoff") and action == "ballots":
        ballots = data.get("ballots")
        seats = voters(g)
        require(isinstance(ballots, dict) and set(ballots) == {str(s) for s in seats}, "必須記錄每位存活玩家的一票（或棄權）。")
        for voter, choice in ballots.items():
            target(g, choice)
            require(choice is None or choice in vote_targets(g), "已翻牌白痴神不能再被放逐。 / A revealed Idiot cannot be exiled again.")
            require(choice is None or phase != "runoff" or choice in g["runoff"], "加賽只可投平票玩家。")
        tally = Counter(s for s in ballots.values() if s is not None)
        leaders = sorted(s for s, n in tally.items() if n == max(tally.values())) if tally else []
        g.setdefault("vote_history", []).append({"day": g["day"], "round": phase, "ballots": dict(ballots), "leaders": leaders})
        resolve_vote(g, leaders)
    elif phase in ("vote", "runoff") and action == "vote_result":
        leaders = data.get("leaders")
        require(isinstance(leaders, list) and all(type(s) is int for s in leaders), "請選擇最高票座位。")
        require(len(leaders) == len(set(leaders)), "最高票座位不可重複。")
        for seat in leaders:
            target(g, seat, optional=False)
            require(seat in vote_targets(g), "已翻牌白痴神不能再被放逐。 / A revealed Idiot cannot be exiled again.")
            require(phase != "runoff" or seat in g["runoff"], "加賽只可投平票玩家。")
        event(g, "主持人已輸入現場點票結果。")
        resolve_vote(g, sorted(leaders))
    else:
        raise RuleError("此行動不適用於目前階段。")
    # A role absent from the original fun-mode cast has no cover turn to protect.
    # Keep turns for eliminated holders; skipping those would reveal their status.
    g["phase"] = night_phase(g, g["phase"])
    g["version"] += 1
    return g
