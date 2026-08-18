#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
狼人殺語音 MC 程式 v18

==================== 安裝及虛擬環境 ====================

建議使用 Python 3.10 或以上版本。
先確認版本：
    python --version

Windows PowerShell：
    py -3.13 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip setuptools wheel
    python -m pip install --upgrade edge-tts pygame

如果 PowerShell 阻止啟用 venv，可只對目前視窗執行：
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
然後再執行：
    .\.venv\Scripts\Activate.ps1

Windows Command Prompt（cmd）：
    py -3.13 -m venv .venv
    .venv\Scripts\activate.bat
    python -m pip install --upgrade pip setuptools wheel
    python -m pip install --upgrade edge-tts pygame

macOS / Linux：
    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install --upgrade pip setuptools wheel
    python -m pip install --upgrade edge-tts pygame

離開虛擬環境：
    deactivate

==================== 執行 ====================

先啟用上述虛擬環境，然後：
    python .\wolfman_kill.py
    python .\wolfman_kill.py --debug
    python .\wolfman_kill.py --mute
    python .\wolfman_kill.py --skip-confirm

任何正常輸入位置可輸入：
    debug / 除錯 / 偵錯          切換 DEBUG（只跳過倒數）
    mute / 靜音                 切換 MUTE（靜音）
    skip / skip-confirm / 略過   切換略過一般 Enter 確認

==================== v18 重點 ====================

- DEBUG 模式只跳過倒數，例如 90 秒討論與 15 秒投票統計；不會略過 Enter 確認。
- skip-confirm 才會略過一般 Enter 確認；私密結果確認永遠不會略過。
- 開局前控制面板：可選擇語音測試、DEBUG、靜音與略過確認。
- pygame 阻塞播放：每段 MC 音檔完整播放後才會進入下一步。
- 所有閉眼／睜眼廣播均保留語音。
- 自動角色交接統一由 auto_handoff() 處理，日後新增角色可直接重用。
- 狼人提交擊殺目標後立即清屏，女巫看不到狼人輸入。
- 狼人與女巫可看到本夜開始時的存活玩家名單。
- 預言家只看到本夜開始時的可查驗存活玩家，不會知道當晚死者。
- 女巫的解藥／毒藥行動為私密；每晚毒藥階段的公開語音與流程一致，
  避免其他玩家從互動差異推斷女巫是否使用了解藥。
- 遊戲結束後會公開完整復盤：勝方、每個座位的身分、生死與死亡原因。
"""

import asyncio
import atexit
import os
import random
import shutil
import sys
import tempfile
import time
from dataclasses import dataclass, field
from typing import Optional

try:
    import edge_tts
except ImportError:
    print("請先安裝 edge-tts：python -m pip install --upgrade edge-tts")
    sys.exit(1)

try:
    import pygame  # type: ignore[import-not-found]
except ImportError:
    pygame = None


# ============ 設定區 ============

VOICE = "zh-HK-HiuMaanNeural"
RATE = "+0%"

ROLE_ORDER = ["狼人", "預言家", "女巫", "獵人", "平民"]
VALID_ROLES = ROLE_ORDER.copy()

STEP_WAIT_SECONDS = 15
DISCUSSION_SECONDS = 90
SPEAK_GAP_SECONDS = 0.5

# 規則設定
WITCH_CAN_SAVE_SELF = False
WITCH_ACTS_IF_KILLED_TONIGHT = True
WOLVES_WIN_ON_PARITY = True

# DEBUG 只會跳過 countdown_wait() 倒數；不會跳過任何 Enter 確認。
DEBUG_MODE = "--debug" in sys.argv or "-d" in sys.argv
MUTE_MODE = "--mute" in sys.argv or "-m" in sys.argv
# 只有這個開關才會略過一般 Enter 確認；私密確認例外。
SKIP_CONFIRMATIONS = (
    "--skip-confirm" in sys.argv
    or "--auto-confirm" in sys.argv
    or "-s" in sys.argv
)

TEMP_DIR = tempfile.mkdtemp(prefix="werewolf_mc_")
VOICE_HEALTHY: Optional[bool] = None

TOGGLE_COMMANDS = {"debug", "除錯", "偵錯"}
MUTE_COMMANDS = {"mute", "靜音"}
CONFIRM_COMMANDS = {"skip", "skipconfirm", "skip-confirm", "略過確認", "略過"}


# ============ 通用工具 ============

def _cleanup_temp_dir():
    try:
        if pygame is not None and pygame.mixer.get_init():
            pygame.mixer.music.stop()
            pygame.mixer.quit()
    except Exception:
        pass
    shutil.rmtree(TEMP_DIR, ignore_errors=True)


atexit.register(_cleanup_temp_dir)


def clear_screen_for_privacy():
    """只用於私密資訊、角色輸入與角色交接。"""
    command = "cls" if os.name == "nt" else "clear"
    result = os.system(command)
    if result != 0:
        print("\n" * 60)


def _check_toggle_commands(raw: str) -> bool:
    global DEBUG_MODE, MUTE_MODE, SKIP_CONFIRMATIONS
    normalized = raw.strip().lower()

    if normalized in TOGGLE_COMMANDS:
        DEBUG_MODE = not DEBUG_MODE
        print(f"\n[切換成功] DEBUG 模式（只跳過倒數）現在：{'開啟' if DEBUG_MODE else '關閉'}")
        return True

    if normalized in MUTE_COMMANDS:
        MUTE_MODE = not MUTE_MODE
        print(f"\n[切換成功] MUTE 模式（靜音）現在：{'開啟' if MUTE_MODE else '關閉'}")
        return True

    if normalized in CONFIRM_COMMANDS:
        SKIP_CONFIRMATIONS = not SKIP_CONFIRMATIONS
        print(f"\n[切換成功] 跳過確認鍵（Enter）現在：{'開啟' if SKIP_CONFIRMATIONS else '關閉'}")
        return True

    return False


def input_with_toggle(prompt: str) -> str:
    while True:
        try:
            raw = input(prompt)
        except (EOFError, KeyboardInterrupt):
            print("\n程式已中止。")
            sys.exit(0)
        if _check_toggle_commands(raw):
            continue
        return raw


def wait_enter(prompt="按 Enter 繼續。", clear_after=False):
    """一般確認只可被 SKIP_CONFIRMATIONS 略過；DEBUG 不影響確認。"""
    if SKIP_CONFIRMATIONS:
        print(f"[自動略過] {prompt}")
    else:
        input_with_toggle(f"\n>>> {prompt}（可輸入 debug/mute/skip 切換模式）")

    if clear_after:
        clear_screen_for_privacy()


def mandatory_private_enter(prompt="確認後，直接按 Enter 清除畫面。"):
    """私密結果專用確認；不會被 DEBUG 或 skip-confirm 自動略過。"""
    while True:
        raw = input_with_toggle(f"\n>>> {prompt}").strip()
        if raw == "":
            return
        print("[提示] 請直接按 Enter 確認。")


def private_handoff(*lines: str, prompt="確認後，按 Enter 繼續。"):
    """角色需要操作電腦前的交接：播報後等待 Enter，再清屏。"""
    clear_screen_for_privacy()
    speak_sequence(list(lines))
    wait_enter(prompt, clear_after=True)


def auto_handoff(*lines: str, clear_before=True, clear_after=True):
    """
    自動角色交接，不要求任何人按 Enter。

    日後新增角色可直接使用，例如：
        auto_handoff("守衛請閉眼。", "預言家請睜眼。")
    """
    if clear_before:
        clear_screen_for_privacy()
    speak_sequence(list(lines))
    if clear_after:
        clear_screen_for_privacy()


def countdown_wait(seconds: int, label: str = "等待中"):
    """DEBUG 開啟時只跳過倒數，不會影響任何輸入或確認。"""
    if DEBUG_MODE:
        print(f"[DEBUG] 跳過倒數：{label}")
        return

    print(f"\n>>> {label}（{seconds} 秒後自動繼續）")
    print("    提示：倒數期間可按 Ctrl+C 略過；debug 在下一個輸入位置生效。")
    try:
        for remaining in range(seconds, 0, -1):
            print(f"\r    倒數 {remaining:>3} 秒 ", end="", flush=True)
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[略過] 已中止本次倒數。")
        return
    print("\r    時間到，繼續！                 ")


# ============ 語音 ============

async def _tts_save(text: str, filepath: str):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(filepath)


def _diagnose_tts_error(e: Exception) -> str:
    msg = str(e).lower()
    hints = []

    if "403" in msg or "forbidden" in msg:
        hints.append(
            "可能是 edge-tts 版本或驗證問題。請執行：python -m pip install --upgrade edge-tts，"
            "並確認電腦系統時間正確。"
        )
    if "noaudioreceived" in msg.replace(" ", "") or "no audio" in msg:
        hints.append(
            "伺服器沒有回傳音頻。請更新 edge-tts，並檢查網絡、防火牆或 VPN。"
        )
    if "connection" in msg or "timeout" in msg or "resolve" in msg:
        hints.append("這似乎是網絡問題；edge-tts 需要連線至 Microsoft 語音服務。")
    if not hints:
        hints.append("請更新 edge-tts、確認網絡可用，並檢查播放器及預設音訊輸出裝置。")

    return f"[錯誤類型] {type(e).__name__}\n[錯誤內容] {e}\n[建議] {' '.join(hints)}"


def play_audio(filepath: str):
    """同步阻塞播放，只有音檔真正播完才會 return。"""
    if pygame is None:
        raise RuntimeError("未安裝 pygame。請執行：python -m pip install pygame")

    try:
        if not pygame.mixer.get_init():
            pygame.mixer.init()
    except Exception as e:
        raise RuntimeError(
            f"無法初始化 pygame 音訊裝置：{e}。請檢查喇叭、耳機或預設音訊輸出裝置。"
        ) from e

    pygame.mixer.music.load(filepath)
    pygame.mixer.music.play()

    try:
        while pygame.mixer.music.get_busy():
            time.sleep(0.05)
    finally:
        pygame.mixer.music.stop()
        try:
            pygame.mixer.music.unload()
        except Exception:
            pass


def speak_sequence(texts: list[str], show_text: bool = True):
    """同一流程節點的連續台詞合併成一段音檔，並完整播放。"""
    cleaned = [str(text).strip() for text in texts if str(text).strip()]
    if not cleaned:
        return

    if show_text:
        for text in cleaned:
            print(f"\n🎤 MC：{text}")

    if MUTE_MODE or VOICE_HEALTHY is False:
        return

    filename = os.path.join(TEMP_DIR, f"line_{time.time_ns()}_{random.randint(0, 999999)}.mp3")
    try:
        asyncio.run(_tts_save(" ".join(cleaned), filename))
        if not os.path.exists(filename) or os.path.getsize(filename) == 0:
            raise RuntimeError("語音檔案生成後大小為 0。")
        play_audio(filename)
        if SPEAK_GAP_SECONDS > 0:
            time.sleep(SPEAK_GAP_SECONDS)
    except Exception as e:
        print("\n" + "=" * 56)
        print("[警告] 語音生成或播放失敗，程式會繼續；請 MC 自行讀出台詞。")
        print(_diagnose_tts_error(e))
        print("=" * 56)
    finally:
        try:
            if os.path.exists(filename):
                os.remove(filename)
        except OSError:
            pass


def speak(text: str, show_text: bool = True):
    speak_sequence([text], show_text=show_text)


def announce_then_confirm(*lines: str, prompt="按 Enter 繼續。", private=False):
    """先播完台詞，再要求一般確認；private=True 時確認後清屏。"""
    speak_sequence(list(lines))
    wait_enter(prompt, clear_after=private)


def show_private_result(text: str, prompt="確認結果後，按 Enter 清除畫面。"):
    """顯示必須手動確認的私密結果，例如預言家查驗結果。"""
    clear_screen_for_privacy()
    print("\n" + "=" * 56)
    print("🔒 [私密資訊：只供目前角色查看]")
    print(text)
    print("=" * 56)
    mandatory_private_enter(prompt)
    clear_screen_for_privacy()


def self_test_voice():
    global VOICE_HEALTHY

    if MUTE_MODE:
        print("[MUTE] 已開啟靜音模式，跳過語音自測。")
        VOICE_HEALTHY = False
        return

    if pygame is None:
        print("[警告] 未安裝 pygame，程式會以文字模式繼續。")
        print("請執行：python -m pip install --upgrade pygame")
        VOICE_HEALTHY = False
        return

    print("\n正在測試語音功能，請稍等...")
    test_filename = os.path.join(TEMP_DIR, "self_test.mp3")
    try:
        asyncio.run(_tts_save("語音測試。你聽到這句說話，代表語音播放正常。", test_filename))
        size = os.path.getsize(test_filename) if os.path.exists(test_filename) else 0
        if size == 0:
            raise RuntimeError("語音檔案生成後大小為 0。")
        print(f"[語音自測] 已生成 {size} bytes，現在播放。")
        play_audio(test_filename)
        VOICE_HEALTHY = True
        heard = input_with_toggle("[語音自測] 你有冇聽到聲？(y/n，直接 Enter 當有)：").strip().lower()
        if heard == "n":
            print("[警告] 音檔可生成但聽不到聲；請檢查音量及預設輸出裝置。")
            VOICE_HEALTHY = False
    except Exception as e:
        print("\n" + "=" * 56)
        print("[語音自測失敗]")
        print(_diagnose_tts_error(e))
        print("=" * 56)
        VOICE_HEALTHY = False
        proceed = input_with_toggle("是否仍然以文字模式繼續？(y/n)：").strip().lower()
        if proceed not in ("y", "yes", "1", "是", "係", ""):
            sys.exit(1)
    finally:
        try:
            if os.path.exists(test_filename):
                os.remove(test_filename)
        except OSError:
            pass


def startup_control_panel():
    """角色人數設定前的開局控制面板。"""
    global DEBUG_MODE, MUTE_MODE, SKIP_CONFIRMATIONS

    while True:
        print("\n" + "=" * 60)
        print("                 【開局前控制面板】")
        print("=" * 60)
        print(f"1. DEBUG 模式（只跳過倒數）：{'開啟' if DEBUG_MODE else '關閉'}")
        print(f"2. MUTE 模式（靜音）：{'開啟' if MUTE_MODE else '關閉'}")
        print(f"3. 跳過一般確認鍵（Enter）：{'開啟' if SKIP_CONFIRMATIONS else '關閉'}")
        print("4. 執行語音測試")
        print("5. 開始設定玩家與角色人數")
        print("0. 結束程式")
        print("=" * 60)

        choice = input_with_toggle("請輸入選項（0-5）：").strip()

        if choice == "1":
            DEBUG_MODE = not DEBUG_MODE
            print(f"[設定完成] DEBUG 模式（只跳過倒數）現在：{'開啟' if DEBUG_MODE else '關閉'}")
        elif choice == "2":
            MUTE_MODE = not MUTE_MODE
            print(f"[設定完成] MUTE 模式現在：{'開啟' if MUTE_MODE else '關閉'}")
        elif choice == "3":
            SKIP_CONFIRMATIONS = not SKIP_CONFIRMATIONS
            print(f"[設定完成] 跳過一般確認鍵現在：{'開啟' if SKIP_CONFIRMATIONS else '關閉'}")
        elif choice == "4":
            self_test_voice()
        elif choice == "5":
            print("[開始遊戲設定] 現在進入玩家與角色人數設定。")
            return
        elif choice == "0":
            print("已中止程式。")
            sys.exit(0)
        else:
            print("[輸入錯誤] 請輸入 0 至 5。")


# ============ 輸入驗證 ============

def ask_seat(prompt: str, valid_seats: set[int], allow_zero: bool = True) -> str:
    while True:
        raw = input_with_toggle(prompt).strip()
        if allow_zero and raw in ("", "0"):
            return "0"
        if raw.isdigit() and int(raw) in valid_seats:
            return raw
        zero_hint = " 或 0 代表沒有／棄權" if allow_zero else ""
        print(f"[輸入錯誤] 請輸入有效座位號 {sorted(valid_seats)}{zero_hint}。")


def ask_yes_no(prompt: str) -> bool:
    while True:
        raw = input_with_toggle(prompt).strip().lower()
        if raw in ("y", "yes", "1", "是", "係"):
            return True
        if raw in ("n", "no", "0", "否", "唔係", ""):
            return False
        print("[輸入錯誤] 請輸入 y 或 n。")


def role_menu_text(role_names: list[str]) -> str:
    return "  ".join(f"{index + 1}.{role}" for index, role in enumerate(role_names))


def ask_role(prompt_prefix: str, role_names: list[str]) -> str:
    while True:
        raw = input_with_toggle(
            f"{prompt_prefix}\n{role_menu_text(role_names)}\n請輸入數字或中文名稱："
        ).strip()
        if raw.isdigit() and 1 <= int(raw) <= len(role_names):
            return role_names[int(raw) - 1]
        if raw in role_names:
            return raw
        print(f"[輸入錯誤] 請輸入 1 至 {len(role_names)}，或角色名稱：{'、'.join(role_names)}")


# ============ 資料模型與賽後復盤 ============

@dataclass
class Player:
    seat: int
    role: str
    alive: bool = True
    death_cause: str = ""


@dataclass
class GameState:
    players: list[Player] = field(default_factory=list)
    day_count: int = 0
    witch_save_used: bool = False
    witch_poison_used: bool = False
    winner: str = ""

    def alive_players(self) -> list[Player]:
        return [player for player in self.players if player.alive]

    def dead_players(self) -> list[Player]:
        return [player for player in self.players if not player.alive]

    def alive_seats(self) -> set[int]:
        return {player.seat for player in self.alive_players()}

    def find(self, seat: int | str) -> Optional[Player]:
        seat_number = int(seat)
        return next((player for player in self.players if player.seat == seat_number), None)


def living_players_text(game: GameState, exclude_seats: Optional[set[int]] = None) -> str:
    excluded = exclude_seats or set()
    seats = [
        player.seat
        for player in sorted(game.alive_players(), key=lambda p: p.seat)
        if player.seat not in excluded
    ]
    return "、".join(f"{seat}號" for seat in seats) if seats else "沒有可選玩家"


def print_role_sheet(game: GameState):
    print("\n" + "=" * 42)
    print("【DEBUG 專用】座位角色表")
    for player in sorted(game.players, key=lambda p: p.seat):
        print(f"  座位 {player.seat} 號：{player.role}")
    print("=" * 42)


def death_cause_text(cause: str) -> str:
    mapping = {
        "wolf": "被狼人殺害",
        "poison": "被女巫毒死",
        "vote": "被投票放逐",
        "hunter_shot": "被獵人開槍帶走",
        "": "仍然存活",
    }
    return mapping.get(cause, cause)


def end_game_briefing(game: GameState):
    clear_screen_for_privacy()
    print("\n" + "=" * 62)
    print("                【遊戲結束・賽後復盤】")
    print("=" * 62)
    print(f"勝利陣營：{game.winner or '未記錄'}")
    print(f"進行夜晚數：{game.day_count}")
    print("-" * 62)
    print(f"{'座位':<8}{'身分':<10}{'最終狀態':<10}{'結果／死因'}")
    print("-" * 62)

    for player in sorted(game.players, key=lambda p: p.seat):
        status = "存活" if player.alive else "死亡"
        detail = "存活至遊戲結束" if player.alive else death_cause_text(player.death_cause)
        print(f"{str(player.seat) + '號':<8}{player.role:<10}{status:<10}{detail}")

    print("-" * 62)
    print(
        "女巫道具："
        f"解藥{'已使用' if game.witch_save_used else '未使用'}；"
        f"毒藥{'已使用' if game.witch_poison_used else '未使用'}。"
    )
    print("=" * 62)

    speak_sequence([
        "現在公開賽後復盤。",
        f"本局勝利陣營是{game.winner or '未記錄'}。",
        "所有玩家的身分與最終結果已顯示在螢幕上。",
    ])
    wait_enter("全體查看完賽後復盤後，按 Enter 繼續。")


# ============ 開局設定 ============

def print_quota_tally(quota: dict[str, int]):
    print("[目前設定] " + "、".join(f"{role}:{quota[role]}" for role in ROLE_ORDER))


def configure_role_quota() -> dict:
    print("=" * 52)
    print("請設定本場總人數及各角色人數。")
    print(f"可用身分：{'、'.join(VALID_ROLES)}")
    print("可在任何輸入位置輸入 debug、mute 或 skip 切換模式。")
    print("=" * 52)

    while True:
        raw_total = input_with_toggle("本場總人數：").strip()
        if not raw_total.isdigit() or int(raw_total) <= 0:
            print("[錯誤] 請輸入正整數。")
            continue

        total = int(raw_total)
        quota = {role: 0 for role in VALID_ROLES}
        for role in VALID_ROLES:
            while True:
                print_quota_tally(quota)
                raw_count = input_with_toggle(f"「{role}」人數（沒有請輸入 0）：").strip()
                if raw_count.isdigit():
                    quota[role] = int(raw_count)
                    break
                print("[錯誤] 請輸入非負整數。")

        actual_total = sum(quota.values())
        print_quota_tally(quota)
        if actual_total != total:
            print(f"[驗證失敗] 總人數為 {total}，但角色合計為 {actual_total}；請重新設定。")
            continue
        if quota["狼人"] == 0:
            print("[驗證失敗] 本局至少要有一位狼人。")
            continue

        print(f"[驗證成功] 共 {total} 人。")
        return {"total": total, "quota": quota}


def _collect_one_round(total_players: int, valid_role_names: list[str]) -> list[Player]:
    players = []
    for seat in range(1, total_players + 1):
        clear_screen_for_privacy()
        print(f"現在輪到座位 {seat} 號玩家。其他人請不要看螢幕。")
        role = ask_role("請按你手持的身分卡選擇身分：", valid_role_names)
        players.append(Player(seat=seat, role=role))
        print(f"座位 {seat} 號輸入完成。")
        time.sleep(0.7)
    return players


def collect_roles_from_players(total_players: int, role_quota: dict[str, int]) -> list[Player]:
    valid_role_names = [role for role, count in role_quota.items() if count > 0]
    print("\n" + "=" * 52)
    print("按座位 1 至座位 N，逐位由玩家自行輸入其身分。")
    print("每位完成後會清屏；所有人均應避免觀看他人的輸入。")
    print("=" * 52)
    wait_enter("準備好後，按 Enter 由座位 1 號開始。", clear_after=True)

    attempt = 1
    while True:
        players = _collect_one_round(total_players, valid_role_names)
        actual_counts = {role: 0 for role in role_quota}
        for player in players:
            actual_counts[player.role] += 1

        mismatches = {
            role: actual_counts[role] - role_quota[role]
            for role in role_quota
            if actual_counts[role] != role_quota[role]
        }
        if not mismatches:
            clear_screen_for_privacy()
            print("[核對成功] 所有角色人數與預設相符。")
            return players

        clear_screen_for_privacy()
        print("=" * 52)
        print(f"[核對失敗] 第 {attempt} 次收集結果與角色設定不符。")
        print("以下為不記名差異，不會顯示任何座位：")
        for role, difference in mismatches.items():
            if difference > 0:
                print(f"「{role}」多了 {difference} 人（設定 {role_quota[role]}，實際 {actual_counts[role]}）。")
            else:
                print(f"「{role}」少了 {-difference} 人（設定 {role_quota[role]}，實際 {actual_counts[role]}）。")
        print("請全體重新核對身分卡，之後由座位 1 號重新輸入。")
        print("=" * 52)
        wait_enter("核對完成後按 Enter 重新開始。", clear_after=True)
        attempt += 1


# ============ 遊戲流程 ============

def opening_script(game: GameState):
    announce_then_confirm(
        f"歡迎來到今晚的狼人殺遊戲。今場一共有 {len(game.players)} 位玩家。",
        "每位玩家已根據手持身分卡輸入身分。請記住自己的身分，切勿公開。",
        prompt="確認全體已準備好後，按 Enter 開始第一晚。",
    )


def hunter_shot(game: GameState, hunter: Player, reason: str):
    if reason == "poison":
        announce_then_confirm(
            f"座位 {hunter.seat} 號是獵人，但因被毒死，不能開槍。",
            prompt="按 Enter 繼續。",
        )
        return

    clear_screen_for_privacy()
    announce_then_confirm(
        f"座位 {hunter.seat} 號是獵人。死亡時可以開槍帶走一位仍然存活的玩家。",
        prompt="獵人確認規則後，按 Enter 選擇目標。",
    )

    valid_targets = game.alive_seats() - {hunter.seat}
    if not valid_targets:
        speak("已沒有其他存活玩家，獵人不能開槍。")
        return

    print(f"\n【只供獵人查看】可開槍目標：{living_players_text(game, {hunter.seat})}")
    target_seat = ask_seat(
        f"獵人（座位 {hunter.seat} 號）帶走哪個座位？（不開槍輸入 0）：",
        valid_targets,
        allow_zero=True,
    )
    clear_screen_for_privacy()

    if target_seat == "0":
        speak("獵人選擇不開槍。")
        return

    victim = game.find(target_seat)
    if victim is None or not victim.alive:
        return

    victim.alive = False
    victim.death_cause = "hunter_shot"
    announce_then_confirm(
        f"獵人開槍帶走了座位 {victim.seat} 號玩家。",
        prompt="按 Enter 繼續。",
    )
    if victim.role == "獵人":
        hunter_shot(game, victim, "hunter_shot")


def seer_phase(game: GameState):
    """夜晚死亡尚未結算，預言家不會得知本晚死亡資訊。"""
    seer = next(
        (player for player in game.players if player.role == "預言家" and player.alive),
        None,
    )
    if seer is None:
        speak("本場沒有存活的預言家，跳過查驗環節。")
        return

    private_handoff(
        "預言家請睜眼。",
        "請選擇一位仍然存活的玩家查驗身分。",
        prompt="預言家準備好後，按 Enter 查看可查驗玩家。",
    )

    valid_targets = game.alive_seats() - {seer.seat}
    clear_screen_for_privacy()
    print("\n" + "=" * 56)
    print("🔒 [只供預言家查看]")
    print(f"可查驗玩家：{living_players_text(game, {seer.seat})}")
    print("=" * 56)

    target_seat = ask_seat(
        f"預言家（座位 {seer.seat} 號）查驗哪個座位？：",
        valid_targets,
        allow_zero=False,
    )
    clear_screen_for_privacy()

    target = game.find(target_seat)
    result = "狼人" if target is not None and target.role == "狼人" else "好人"
    show_private_result(
        f"座位 {target_seat} 號的陣營是：【{result}】",
        prompt="預言家確認查驗結果後，按 Enter 關閉畫面。",
    )

    auto_handoff("預言家請閉眼。")


def night_phase(game: GameState) -> tuple[str, str]:
    game.day_count += 1

    private_handoff(
        f"天黑請閉眼。第 {game.day_count} 晚，所有玩家請閉上眼睛。",
        "狼人請睜眼。狼人互相確認身分，然後選擇今晚要殺的目標。",
        prompt="狼人確認後，按 Enter 查看可擊殺玩家。",
    )

    wolf_targets = game.alive_seats()
    print("\n" + "=" * 56)
    print("🔒 [只供狼人查看]")
    print(f"目前存活玩家：{living_players_text(game)}")
    print("=" * 56)

    killed_seat = ask_seat(
        "狼人今晚殺哪個座位？（沒有擊殺則輸入 0）：",
        wolf_targets,
        allow_zero=True,
    )
    clear_screen_for_privacy()

    poisoned_seat = "0"
    witch = next((player for player in game.players if player.role == "女巫" and player.alive), None)
    witch_killed_tonight = witch is not None and killed_seat == str(witch.seat)
    witch_can_act = witch is not None and (WITCH_ACTS_IF_KILLED_TONIGHT or not witch_killed_tonight)

    if witch_can_act:
        private_handoff(
            "狼人請閉眼。",
            "女巫請睜眼。",
            prompt="女巫準備好後，按 Enter 查看今晚資訊。",
        )

        clear_screen_for_privacy()
        print("\n" + "=" * 56)
        print("🔒 [只供女巫查看]")
        print(f"本晚開始時的存活玩家：{living_players_text(game)}")
        if killed_seat == "0":
            print("今晚是平安夜，沒有人被狼人殺害。")
        else:
            print(f"今晚被狼人殺的是：座位 {killed_seat} 號。")
        print("=" * 56)
        mandatory_private_enter("女巫確認以上資訊後，按 Enter 繼續。")
        clear_screen_for_privacy()

        used_save_this_night = False

        if killed_seat != "0" and not game.witch_save_used:
            can_save_target = WITCH_CAN_SAVE_SELF or killed_seat != str(witch.seat)
            if can_save_target:
                announce_then_confirm(
                    "女巫，你要不要使用解藥救回今晚被殺的玩家？",
                    prompt="女巫聽完後，按 Enter 決定。",
                )
                if ask_yes_no("女巫是否使用解藥？(y/n)："):
                    game.witch_save_used = True
                    used_save_this_night = True
                    killed_seat = "0"
                    clear_screen_for_privacy()
                    print("\n🔒 [只供女巫查看] 你已使用解藥。今晚被殺的玩家已被救回。")
                    mandatory_private_enter("女巫確認後，按 Enter 繼續。")
                    clear_screen_for_privacy()
            else:
                clear_screen_for_privacy()
                print("\n🔒 [只供女巫查看] 你今晚被殺，而本局規則不允許女巫自救，因此不能使用解藥。")
                mandatory_private_enter("女巫確認後，按 Enter 繼續。")
                clear_screen_for_privacy()
        elif game.witch_save_used:
            clear_screen_for_privacy()
            print("\n🔒 [只供女巫查看] 你的解藥已經用完。")
            mandatory_private_enter("女巫確認後，按 Enter 繼續。")
            clear_screen_for_privacy()

        # 每晚都播出同一段毒藥詢問，避免外界從語音得知解藥是否已使用。
        announce_then_confirm(
            "女巫，你要不要使用毒藥毒死一位玩家？",
            prompt="女巫聽完後，按 Enter 決定。",
        )

        if used_save_this_night:
            # 私密提示，不會語音播出；外部仍聽到相同的毒藥詢問流程。
            clear_screen_for_privacy()
            print("\n🔒 [只供女巫查看] 你今晚已使用解藥，因此不能使用毒藥。")
            mandatory_private_enter("女巫確認毒藥決定後，按 Enter 繼續。")
            clear_screen_for_privacy()
        elif game.witch_poison_used:
            clear_screen_for_privacy()
            print("\n🔒 [只供女巫查看] 你的毒藥已經用完。")
            mandatory_private_enter("女巫確認毒藥決定後，按 Enter 繼續。")
            clear_screen_for_privacy()
        else:
            use_poison = ask_yes_no("女巫是否使用毒藥？(y/n)：")
            if use_poison:
                excluded = {int(killed_seat)} if killed_seat != "0" else set()
                valid_targets = game.alive_seats() - excluded
                if valid_targets:
                    clear_screen_for_privacy()
                    print("\n" + "=" * 56)
                    print("🔒 [只供女巫查看]")
                    print(f"可選毒藥目標：{living_players_text(game, excluded)}")
                    print("=" * 56)
                    poisoned_seat = ask_seat("女巫毒哪個座位？：", valid_targets, allow_zero=False)
                    clear_screen_for_privacy()
                    game.witch_poison_used = True
                else:
                    clear_screen_for_privacy()
                    print("\n🔒 [只供女巫查看] 沒有可選擇的存活目標，毒藥未使用。")
                    mandatory_private_enter("女巫確認毒藥決定後，按 Enter 繼續。")
                    clear_screen_for_privacy()

        auto_handoff("女巫請閉眼。")
    else:
        if witch is None:
            message = "狼人請閉眼。本場沒有存活女巫，跳過女巫環節。"
        else:
            message = "狼人請閉眼。女巫今晚被殺，而且本局規則不允許其行動。"
        auto_handoff(message)

    seer_phase(game)
    return killed_seat, poisoned_seat


def resolve_night_deaths(game: GameState, killed_seat: str, poisoned_seat: str) -> list[Player]:
    newly_dead = []
    for seat, cause in ((killed_seat, "wolf"), (poisoned_seat, "poison")):
        if seat == "0":
            continue
        player = game.find(seat)
        if player is not None and player.alive:
            player.alive = False
            player.death_cause = cause
            newly_dead.append(player)
    return newly_dead


def day_phase(game: GameState, killed_seat: str, poisoned_seat: str) -> bool:
    newly_dead = resolve_night_deaths(game, killed_seat, poisoned_seat)

    if check_win_condition(game):
        return True

    clear_screen_for_privacy()
    announce_then_confirm(
        "天亮了，所有玩家請睜眼。",
        prompt="所有玩家已睜眼後，按 Enter 繼續。",
    )

    if newly_dead:
        names = "、".join(f"座位 {player.seat} 號" for player in newly_dead)
        announce_then_confirm(
            f"昨晚，{names} 玩家不幸死亡。",
            prompt="死亡結果已確認，按 Enter 繼續。",
        )
        for player in newly_dead:
            if player.role == "獵人":
                hunter_shot(game, player, player.death_cause)
                if check_win_condition(game):
                    return True
    else:
        announce_then_confirm(
            "昨晚是平安夜，沒有玩家死亡。",
            prompt="按 Enter 繼續。",
        )

    announce_then_confirm(
        f"現在請按座位順序依次發言。討論時間共 {DISCUSSION_SECONDS} 秒，發言結束後進行投票。",
        prompt="確認後開始日間討論計時。",
    )
    countdown_wait(DISCUSSION_SECONDS, "白天討論時間")
    return False


def voting_phase(game: GameState):
    announce_then_confirm(
        "現在開始投票。請大家投出你懷疑是狼人的玩家。",
        "如無人出局或全體棄票，請輸入 0。",
        prompt="按 Enter 給玩家討論及統計投票。",
    )
    countdown_wait(STEP_WAIT_SECONDS, "投票討論及統計")

    voted_seat = ask_seat(
        "投票結果：哪個座位被投出局？（棄票／無人出局輸入 0）：",
        game.alive_seats(),
        allow_zero=True,
    )

    if voted_seat == "0":
        announce_then_confirm("本輪沒有玩家被投出局。", prompt="按 Enter 繼續。")
        return

    player = game.find(voted_seat)
    if player is None or not player.alive:
        return

    player.alive = False
    player.death_cause = "vote"
    announce_then_confirm(
        f"座位 {player.seat} 號玩家被投票出局，請亮出身分。",
        prompt="確認後按 Enter 繼續。",
    )
    if player.role == "獵人":
        hunter_shot(game, player, "vote")


def check_win_condition(game: GameState) -> bool:
    alive = game.alive_players()
    wolves = [player for player in alive if player.role == "狼人"]
    villagers = [player for player in alive if player.role != "狼人"]

    if not wolves:
        game.winner = "好人陣營"
        speak("所有狼人已被淘汰，好人陣營勝利。遊戲結束。")
        return True

    if WOLVES_WIN_ON_PARITY:
        if len(wolves) >= len(villagers):
            game.winner = "狼人陣營"
            speak("狼人數量已經不少於好人數量，狼人陣營勝利。遊戲結束。")
            return True
    elif not villagers:
        game.winner = "狼人陣營"
        speak("所有好人已被淘汰，狼人陣營勝利。遊戲結束。")
        return True

    return False


def closing_script():
    speak("感謝各位玩家參與。今晚的狼人殺遊戲正式結束，我們下次再見。")


# ============ 主程式 ============

def main():
    print("=" * 52)
    print("狼人殺語音 MC 程式 v18")
    print(f"目前語音：{VOICE}")
    print(f"DEBUG 模式（只跳過倒數）：{'開啟' if DEBUG_MODE else '關閉'}")
    print(f"MUTE 模式（靜音）：{'開啟' if MUTE_MODE else '關閉'}")
    print(f"跳過一般確認鍵：{'開啟' if SKIP_CONFIRMATIONS else '關閉'}")
    print("提示：在任何輸入位置打 debug / mute / skip 可即時切換。")
    print("=" * 52)

    startup_control_panel()

    setup = configure_role_quota()
    players = collect_roles_from_players(setup["total"], setup["quota"])
    game = GameState(players=players)

    if DEBUG_MODE:
        print_role_sheet(game)

    wait_enter("所有玩家已完成身分輸入，按 Enter 開始遊戲。")
    opening_script(game)

    while True:
        killed_seat, poisoned_seat = night_phase(game)
        if day_phase(game, killed_seat, poisoned_seat):
            break

        if check_win_condition(game):
            break

        voting_phase(game)
        if check_win_condition(game):
            break

    end_game_briefing(game)
    closing_script()
    print("\n遊戲結束，感謝使用！")


if __name__ == "__main__":
    main()