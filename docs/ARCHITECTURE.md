# Architecture

```text
Browser: HTML / CSS / ES modules
  ├── Public table and read-only audience view
  ├── Explicit private handoff dialogs
  └── Single cancellable audio owner
       │ same-origin JSON + bearer capability
FastAPI
  ├── engine.py: pure rules and public/private serializers
  ├── store.py: SQLite transactions and hashed capabilities
  └── speech.py: bounded synthesis and prompt cache
```

Frontend/API share one origin with no Node build or external font/CDN requests. The terminal application runs independently.

`python run.py` starts the local server with Python autoreload. This prevents newer frontend files from being paired with an already-loaded older backend after source changes. Existing non-reloading servers need one manual restart when adopting this launcher. `/api/health` and `X-Moonfall-Version` identify the loaded backend version. An unavailable debug endpoint produces a restart explanation and retry control in the host UI.

## Persistence and concurrency

SQLite stores one JSON snapshot per game. `BEGIN IMMEDIATE` reserves the writer before reading. Every mutation includes the previous version; two tabs cannot commit the same action. The engine copies its input, so failed validation cannot partly mutate state. State survives restart; session storage retains credentials through same-tab reload. Closing/clearing the session loses credentials; no recovery/account system is included.

The default database is `data/games.sqlite3`, configurable through `WOLFMAN_DB`. Back up using SQLite's backup API or stop the server before copying. Data is ignored by Git/Docker. Operators manage retention. Use one Uvicorn worker; speech locks/cache are per process.

## Privacy boundary

Random 256-bit host/viewer capabilities are returned at creation; only SHA-256 hashes are stored. Requests use Authorization headers. Viewer links carry a viewer capability in a URL fragment, which is not an HTTP path/query. On arrival, the client moves it into session storage and removes it from the visible URL. Viewers cannot mutate or access private endpoints; host credentials never enter viewer links.

Private dialogs empty when the tab hides. Private values never enter public events/TTS. SQL parameters, strict models, same-origin mutation checks, no-store responses, CSP, and no-referrer headers support this boundary. Database roles are plaintext: protect host files/backups. The host is trusted.

This local release has no internet-facing rate limiter or account service. Before public hosting configure HTTPS, access controls, request/rate limits, and a trusted reverse proxy. Do not expose Uvicorn directly to the internet.

## Speech and timer

Only fixed public prompts go to Edge TTS. Two attempts use 8-second timeouts, an 18-second total request budget, a synthesis lock, and a 16-entry cache. Failure returns 503 without changing state. Service availability cannot be guaranteed.

`audio.mjs` owns HTML audio and system speech. Replay, phase changes, mute, private handoff, and tab hiding cancel earlier work. Generation counters discard late responses; object URLs are released; stalled playback has a watchdog. Only an installed Cantonese voice is a fallback; otherwise captions remain. Sound requires a click and starts off per tab. Enable it on one device.

The advisory discussion timer is local per tab. A session-storage deadline supports reload, pause, and reset. Audience timers are independent. It never advances the server; host submissions control progress.

## API

Raw schema: `/openapi.json`. Protected routes use `Authorization: Bearer <capability>`.

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/health` | None |
| POST | `/api/games` | None; local setup |
| GET | `/api/games/{id}` | Host/viewer; public state |
| GET | `/api/games/{id}/private` | Host; active role context |
| GET | `/api/games/{id}/debug` | Host only; identity sheet, potion inventory, pending night actions |
| POST | `/api/games/{id}/actions` | Host; `{version, action, data}` |
| GET | `/api/games/{id}/audio` | Host/viewer; public MP3 or 503 |

Phase-specific actions: `ack`, `wolves`, `witch`, `inspect`, `dawn`, `shoot`, `vote`, `ballots`. Rule violations return 409; schema errors 422; missing credentials 401; forbidden credentials 403; unknown game 404. Polling runs every three seconds while visible without a private dialog. After uncertain network failure, synchronize before retrying: a committed action cannot reuse its old version.
