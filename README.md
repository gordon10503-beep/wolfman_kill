# Moonfall · 狼人殺

**When the moon rises, trust no one. 天黑請閉眼，故事即將開始。**

A full-stack, Cantonese-friendly companion for in-person Werewolf. A mysterious moonlit interface replaces terminal prompts, while a Python backend handles rules, private actions, saved games, and narration. The original terminal interface remains available.

![Moonfall interface](docs/preview.png)

## Start the web app

Python **3.13 or 3.14** recommended. No frontend build or npm install is needed.

```bash
git clone git@github.com:gordon10503-beep/wolfman_kill.git
cd wolfman_kill
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python run.py
```

macOS / Linux:

```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python run.py
```

The local launcher automatically reloads Python changes. After updating an older running server, stop it once with `Ctrl+C` and use `python run.py`; refreshing the browser alone cannot update an already-loaded backend. `/api/health` reports the running version.

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)**. Stop with `Ctrl+C`.

## Play a night

1. Choose a 6-, 9-, or 12-player preset, or adjust the cast for 5–16 players. Agree on house rules.
2. Pass the device around. Each player explicitly reveals their random identity, then hides it.
3. Enable **Voice on** on one device. Public Cantonese prompts guide the night; secrets stay silent.
4. Wolves, witch, and seer use private handoff screens. Deaths remain hidden until dawn.
5. Discuss with the pauseable timer, then record every living player's ballot. Ties trigger one runoff.
6. Resolve the hunter's shot before calculating victory. At the end, reveal the cast and death causes.

Use **觀眾畫面** for a read-only public table in another window. The host browser is trusted and can access private information; never project it to spectators. Private dialogs clear when the tab hides. Night interaction timing still depends on players.

Every action saves to SQLite. Reloading the same tab resumes the game; the home page offers a resume button for its existing session. **Keep the host tab open:** credentials live in session storage; closing/clearing it can lose host access. There is no account recovery.

The table follows the game clock: wolves/witch/seer phases use a moonlit forest with mist, wolf silhouettes, and small blood traces; dawn, hunter resolution, discussion, voting, and recap switch to a bright morning palette. Setup retains the original moonlit style.

| Morning | Night |
| --- | --- |
| ![Bright morning table](docs/day-preview.png) | ![Moonlit night table](docs/night-preview.png) |

For testing, toggle **DEBUG on** in the host header. It shows all seat identities, potion inventory, and pending night actions in a host-only panel. During role reveal, **跳過身份交接（DEBUG）** skips all remaining reveals and starts the first night without changing the assigned identities. During discussion it replaces the timer with **跳過討論（DEBUG）**, which goes straight to voting. The toggle is saved in the tab session and can be turned off at any time. Audience links never receive debug information. Turn debug off before handing the host device to players.

## What changed

| Area | Implementation |
| --- | --- |
| Frontend | Responsive HTML/CSS/ES modules, moonlit forest artwork, SVG icons, dark teal and antique gold, English/Traditional Chinese copy |
| Backend | FastAPI, pure game state machine, strict validation, SQLite transactions, optimistic version checks |
| Privacy | Separate host/viewer capabilities, server-side public/private views, no private TTS, no-store responses |
| Audio | One cancellable playback owner, stale-response guards, timeouts/retry/cache, Cantonese system-voice fallback, captions |
| Rules | Simultaneous dawn deaths, poison precedence, potion limits, validated ballots/runoff, hunter-before-victory ordering |
| Engineering | Python/Node tests, GitHub Actions, Docker, architecture and rules documentation |

The original script could declare victory before a dying hunter acted and accepted duplicate special roles it could not process. Both are fixed in the terminal version too. See [the rules review](docs/RULES.md).

## Audio reliability

Edge TTS uses `zh-HK-HiuMaanNeural` and requires internet access. The server retries once with bounded timeouts and caches public prompts. The browser cancels earlier playback on replay, phase change, mute, private handoff, or hiding the tab. Late responses cannot start old audio.

On failure, an installed Cantonese browser voice is used if available; otherwise captions keep the game playable. External TTS availability cannot be guaranteed. Sound starts only after a click and defaults off. **Enable voice on only one tab/device** to avoid multiple independent speakers. The web server does not play through pygame.

## Tests and development

Using your virtual environment's Python, install development requirements and run:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
npm run check
npm test
```

Node **22+** is needed only for JS checks/tests. Tests cover rules, privacy, replay protection, concurrent writes, restart persistence, synthesis failures/caching, and audio cancellation races without real TTS requests. A real speaker/headphone check is still useful before a game.

For autoreload, run `python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000`. Refresh after frontend changes. Raw API schema: `/openapi.json`.

## Docker

```bash
docker build -t moonfall .
docker run --rm -p 127.0.0.1:8000:8000 -v moonfall-data:/app/data moonfall
```

The named volume preserves games; the image runs as a non-root user. A local Docker installation is required.

## Project map

```text
backend/
  app.py        API, authentication, static serving
  engine.py     deterministic rules and public/private views
  store.py      transactional SQLite snapshots
  speech.py     bounded Cantonese synthesis
frontend/
  index.html    application shell
  style.css     responsive moonlit design
  app.js        table, handoffs, ballots, timer, audience mode
  audio.mjs     single cancellable audio owner
  assets/       SVG artwork and generated night forest
tests/          rules, API, speech, and audio tests
docs/           architecture, rules review, terminal guide
wolfman_kill.py original terminal application
```

See [Architecture](docs/ARCHITECTURE.md), [Rules and edge cases](docs/RULES.md), and [Changelog](CHANGELOG.md).

Current checks and their limits are recorded in [Validation](docs/VALIDATION.md).

## Storage and hosting

Set `WOLFMAN_DB` to change `data/games.sqlite3`. The database contains plaintext roles and is excluded from Git/Docker build contexts. Protect host files and backups. Use one server worker; speech locks/caches are per process.

This release serves a trusted, in-person table. Pushing to GitHub does not deploy a live website. Public hosting needs HTTPS, access controls, rate limits, and a configured reverse proxy. The documented server binds to loopback. Audience links use the same origin; another device requires a reachable, securely hosted server. Discussion timers are independent and advisory; only the host advances the game.

## Terminal version

```bash
python -m pip install edge-tts pygame
python wolfman_kill.py
python wolfman_kill.py --mute
python wolfman_kill.py --debug --skip-confirm
```

The terminal version uses physical role-card registration and moderator-entered elimination results. See the [original terminal guide](docs/LEGACY.md). `pygame` is not needed by the web app.

## License

No license has been selected. Add an explicit license before inviting redistribution under particular terms.
