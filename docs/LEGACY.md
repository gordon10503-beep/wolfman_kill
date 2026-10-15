# Werewolf Voice MC / 狼人殺語音 MC

A terminal-based Werewolf game host written in Python. It uses Microsoft Edge TTS to generate Cantonese voice prompts and plays each prompt synchronously, ensuring that a new MC line never interrupts the previous one.

一個以 Python 編寫的終端機狼人殺主持程式。它使用 Microsoft Edge TTS 生成粵語語音，並以同步阻塞方式播放，確保新台詞不會覆蓋上一段 MC 語音。

Current version / 目前版本：**v18**

---

# English

## Features

- Cantonese MC voice prompts using `zh-HK-HiuMaanNeural` by default
- Blocking audio playback to prevent overlapping or interrupted TTS lines
- Startup control panel for audio testing, debug mode, mute mode, and confirmation skipping
- Configurable player count and role distribution
- Private, seat-by-seat role entry with anonymous role-count validation
- Private night flows for Werewolves, Witch, and Seer
- Screen clearing between roles to reduce information leakage
- One antidote and one poison for the Witch per game
- Private Seer alignment checks
- Hunter death shot, except when killed by poison
- Day discussion timer, voting, and abstention
- Debug mode skips timers only; it does not skip Enter confirmations
- Separate `skip-confirm` mode for skipping ordinary Enter confirmations
- End-game debrief showing the winner, roles, final status, and death causes

## Supported roles

| Role | Current support |
|---|---|
| Werewolf | Chooses a nightly kill target and sees players alive at the start of the night |
| Seer | Checks one living player’s alignment privately each night |
| Witch | Privately sees the Werewolf target and has one antidote and one poison |
| Hunter | May shoot one living player on death, except when poisoned |
| Villager | Participates in daytime discussion and voting |

## Requirements

- Python 3.10 or later
- Internet connection: `edge-tts` connects to Microsoft’s voice service
- A working default audio output device, such as speakers or headphones

## Installation

Clone the repository and enter its folder:

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

### Windows PowerShell

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade edge-tts pygame
```

If PowerShell blocks activation, run this in the current PowerShell window first:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Windows Command Prompt

```bat
py -3.13 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade edge-tts pygame
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade edge-tts pygame
```

Leave the virtual environment when finished:

```bash
deactivate
```

## Running the program

Assuming the main file is named `wolfman_kill.py`:

```bash
python wolfman_kill.py
```

Optional command-line flags:

```bash
python wolfman_kill.py --debug
python wolfman_kill.py --mute
python wolfman_kill.py --skip-confirm
```

| Flag | Effect |
|---|---|
| `--debug` or `-d` | Skips countdown timers such as the 90-second discussion and vote-counting timers; it does not skip Enter prompts |
| `--mute` or `-m` | Disables TTS generation and audio playback while retaining all printed MC text |
| `--skip-confirm`, `--auto-confirm`, or `-s` | Skips ordinary Enter confirmations; private-result confirmations still require manual Enter |

## Startup control panel

Before player and role setup, the program displays a control panel:

```text
1. DEBUG mode (skip countdowns only)
2. MUTE mode
3. Skip ordinary Enter confirmations
4. Run voice test
5. Start player and role setup
0. Exit
```

Voice testing is optional. If you skip the test, the program will still try to play audio normally. Enable MUTE mode if you want text-only operation.

## Game flow

1. The host sets the player count and the number of each role.
2. Players privately enter their role one seat at a time.
3. The program validates only total role counts and never reveals which seat selected which role.
4. Night phases run for Werewolves, Witch, and Seer.
5. Morning announces deaths, followed by discussion and voting.
6. The game repeats night and day phases until a faction wins.
7. An end-game debrief reveals all roles and final outcomes.

## Privacy design

The program uses screen clearing and private confirmation steps to reduce information leakage:

- The Werewolves’ typed kill target is cleared before the Witch phase.
- The Witch’s typed poison target is cleared before the Seer phase.
- The Seer sees the list of players alive at the start of the night only, not the current night’s kill or poison result.
- The Seer’s result remains on screen until the Seer manually presses Enter, even with Debug or skip-confirm enabled.
- Witch potion use and potion depletion are displayed privately and are never announced through TTS.
- The same public poison-question voice prompt is played every night, reducing deductions based on whether the Witch used antidote.

> This program cannot replace real-world privacy rules. During private actions, only the relevant player should be close to the keyboard and screen; all other players should close their eyes or look away.

## Configuration

Edit the settings section at the top of the Python file:

```python
VOICE = "zh-HK-HiuMaanNeural"
RATE = "+0%"

STEP_WAIT_SECONDS = 15
DISCUSSION_SECONDS = 90
SPEAK_GAP_SECONDS = 0.5

WITCH_CAN_SAVE_SELF = False
WITCH_ACTS_IF_KILLED_TONIGHT = True
WOLVES_WIN_ON_PARITY = True
```

| Setting | Description |
|---|---|
| `VOICE` | Edge TTS voice name |
| `RATE` | Speech rate, such as `+10%` or `-10%` |
| `DISCUSSION_SECONDS` | Daytime discussion timer in seconds |
| `STEP_WAIT_SECONDS` | Voting discussion/counting timer in seconds |
| `SPEAK_GAP_SECONDS` | Extra pause after each complete voice line |
| `WITCH_CAN_SAVE_SELF` | Whether the Witch can use antidote to save herself |
| `WITCH_ACTS_IF_KILLED_TONIGHT` | Whether a Witch chosen as the Werewolf target can still act that night |
| `WOLVES_WIN_ON_PARITY` | Whether Werewolves win when their count is at least the Good side’s count |

## Role handoffs

Two reusable helpers manage transitions between night roles:

```python
private_handoff(...)
```

Use this when the next role needs to operate the computer. It clears the screen, speaks the transition, waits for an ordinary Enter confirmation, then clears the screen again.

```python
auto_handoff(...)
```

Use this for automatic transitions that require no keyboard operation. It clears the screen, finishes the voice prompt, then clears the screen and continues automatically.

For example, when adding a Guard role:

```python
auto_handoff("Witch, close your eyes.", "Guard, open your eyes.")

# After the Guard completes a private action:
private_handoff(
    "Guard, close your eyes.",
    "Seer, open your eyes.",
    prompt="Seer, press Enter when ready.",
)
```

## Troubleshooting

### `ModuleNotFoundError` for `edge_tts` or `pygame`

Activate your virtual environment, then run:

```bash
python -m pip install --upgrade edge-tts pygame
```

### No audio

- Select option `4` in the startup control panel to run the voice test.
- Ensure MUTE mode is disabled.
- Check system volume, speaker/headphone connection, and default output device.
- Confirm that the computer has an active internet connection.

### `403`, `Forbidden`, or no audio data

Update `edge-tts`:

```bash
python -m pip install --upgrade edge-tts
```

Also check that:

- Your system time is accurate.
- Your network, VPN, or firewall does not block Microsoft voice services.
- Your device can access the internet.

## License

Add a license of your choice, such as the MIT License.

---

# 廣東話／中文版本

## 功能

- 粵語 MC 語音：預設使用 `zh-HK-HiuMaanNeural`
- 阻塞式音訊播放：避免新台詞覆蓋或截斷上一段台詞
- 開局前控制面板：可選擇語音測試、DEBUG、靜音與略過一般確認
- 自訂玩家總人數與角色配置
- 玩家按座位逐一私密輸入角色，並以不記名方式核對角色數量
- 私密夜晚流程：狼人、女巫、預言家各自查看自己的資訊
- 自動清屏：避免下一個角色看到上一角色的目標或查驗結果
- 女巫解藥與毒藥：每種全局限用一次，並保持行動資訊私密
- 預言家私密查驗陣營結果
- 獵人死亡開槍；被女巫毒死時不能開槍
- 白天討論、投票出局、棄票
- DEBUG 模式只跳過倒數，不跳過 Enter 確認
- 獨立的 `skip-confirm` 模式可略過一般 Enter 確認
- 結束後賽後復盤：公開勝方、所有角色、最終生死與死因

## 支援角色

| 角色 | 目前支援功能 |
|---|---|
| 狼人 | 夜晚選擇擊殺目標；可查看本夜開始時的存活座位 |
| 預言家 | 夜晚查驗一名存活玩家；結果只供預言家查看 |
| 女巫 | 私密查看狼人擊殺目標；全局各有一瓶解藥及毒藥 |
| 獵人 | 非毒死時可在死亡後開槍帶走一人 |
| 平民 | 參與日間討論與投票 |

## 系統需求

- Python 3.10 或以上
- Internet 連線：`edge-tts` 需要連接 Microsoft 語音服務
- 音訊輸出裝置：喇叭、耳機或其他已設定的預設輸出裝置

## 安裝

先複製專案並進入資料夾：

```bash
git clone <你的-repository-url>
cd <你的-repository-folder>
```

### Windows PowerShell

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade edge-tts pygame
```

如果 PowerShell 顯示 execution policy 錯誤，先在同一個 PowerShell 視窗執行：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Windows Command Prompt

```bat
py -3.13 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade edge-tts pygame
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade edge-tts pygame
```

離開虛擬環境：

```bash
deactivate
```

## 執行

假設主程式檔名為 `wolfman_kill.py`：

```bash
python wolfman_kill.py
```

命令列選項：

```bash
python wolfman_kill.py --debug
python wolfman_kill.py --mute
python wolfman_kill.py --skip-confirm
```

| 選項 | 效果 |
|---|---|
| `--debug` 或 `-d` | 跳過所有程式倒數，例如 90 秒討論及投票統計；不會略過 Enter |
| `--mute` 或 `-m` | 不生成及播放語音，但仍會顯示所有 MC 文字 |
| `--skip-confirm`、`--auto-confirm` 或 `-s` | 略過一般 Enter 確認；私密查驗／私密資訊確認仍需手動 Enter |

## 開局前控制面板

開始後，程式會在進入角色人數設定前顯示控制面板：

```text
1. DEBUG 模式（只跳過倒數）
2. MUTE 模式（靜音）
3. 跳過一般確認鍵（Enter）
4. 執行語音測試
5. 開始設定玩家與角色人數
0. 結束程式
```

語音測試是可選的。若未測試，程式仍會在正常模式下嘗試播放語音；若想完全避免語音，請開啟 MUTE 模式。

## 遊戲流程

1. 主持人設定總人數與每個角色的人數。
2. 玩家按座位順序，私密輸入自己的角色。
3. 程式只會檢查角色總數是否符合設定，不會顯示哪個座位輸入了甚麼角色。
4. 晚上依序進行狼人、女巫、預言家行動。
5. 天亮後公布死亡玩家，進入討論與投票。
6. 重複夜晚與白天流程，直到任一陣營勝利。
7. 遊戲結束後公開賽後復盤。

## 私隱設計

程式使用清屏與私密確認來降低資訊外洩：

- 狼人輸入擊殺目標後，畫面會立即清除，再交給女巫。
- 女巫輸入毒藥目標後，畫面會立即清除，再交給預言家。
- 預言家只看到本晚開始時的存活名單，不會知道狼人擊殺或女巫毒藥結果。
- 預言家查驗結果必須親自按 Enter 才會清除，即使開啟 DEBUG 或 skip-confirm 也不例外。
- 女巫使用解藥、毒藥或藥物耗盡只會在私密畫面顯示。
- 每晚均會播放相同的毒藥詢問語音，減少其他玩家從流程差異推斷女巫是否已使用解藥。

> 此程式不能取代現場玩家閉眼、轉頭或避免觀看螢幕的規則。私密角色操作時，請只讓該角色靠近鍵盤與螢幕。

## 可調整設定

在主程式頂部的「設定區」可調整以下項目：

```python
VOICE = "zh-HK-HiuMaanNeural"
RATE = "+0%"

STEP_WAIT_SECONDS = 15
DISCUSSION_SECONDS = 90
SPEAK_GAP_SECONDS = 0.5

WITCH_CAN_SAVE_SELF = False
WITCH_ACTS_IF_KILLED_TONIGHT = True
WOLVES_WIN_ON_PARITY = True
```

| 設定 | 說明 |
|---|---|
| `VOICE` | Edge TTS 聲線名稱 |
| `RATE` | 朗讀速度，例如 `+10%` 或 `-10%` |
| `DISCUSSION_SECONDS` | 日間討論倒數秒數 |
| `STEP_WAIT_SECONDS` | 投票討論／統計倒數秒數 |
| `SPEAK_GAP_SECONDS` | 每段語音後額外停頓秒數 |
| `WITCH_CAN_SAVE_SELF` | 女巫是否可使用解藥自救 |
| `WITCH_ACTS_IF_KILLED_TONIGHT` | 女巫被狼人選為當晚目標時，是否仍可行動 |
| `WOLVES_WIN_ON_PARITY` | 狼人數量不少於好人時，是否立即狼人勝利 |

## 夜晚角色交接

程式有兩種交接函數：

```python
private_handoff(...)
```

用於下一個角色需要操作電腦時。它會清屏、播出閉眼／睜眼台詞、等待一般 Enter，然後再次清屏。

```python
auto_handoff(...)
```

用於不需要角色操作電腦的自動過場。它會清屏、完整播放語音，然後自動清屏並繼續。

日後新增角色時，例如守衛，可以使用：

```python
auto_handoff("女巫請閉眼。", "守衛請睜眼。")

# 守衛完成私密操作後
private_handoff(
    "守衛請閉眼。",
    "預言家請睜眼。",
    prompt="預言家準備好後，按 Enter 繼續。",
)
```

## 疑難排解

### `ModuleNotFoundError: No module named 'edge_tts'` 或 `pygame`

確認虛擬環境已啟用後執行：

```bash
python -m pip install --upgrade edge-tts pygame
```

### 沒有聲音

- 在開局前控制面板選擇 `4` 執行語音測試。
- 確認 MUTE 模式沒有開啟。
- 檢查系統音量、耳機／喇叭連線與預設輸出裝置。
- 確認電腦可連上互聯網。

### `403`、`Forbidden` 或沒有音頻資料

更新 `edge-tts`：

```bash
python -m pip install --upgrade edge-tts
```

並檢查：

- 系統時間是否正確
- 網絡、防火牆或 VPN 是否阻止 Microsoft 語音服務
- 電腦是否可以正常連網

### 想快速測試流程

- 在開局前控制面板開啟 DEBUG：跳過討論及投票倒數，但保留所有 Enter 確認。
- 如要連一般 Enter 都跳過，可額外開啟 skip-confirm。
- 如不想測試語音，開啟 MUTE 模式。

## 授權

請按你的需要加入授權條款，例如 MIT License。
