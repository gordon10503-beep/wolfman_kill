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

Only the fixed `NARRATION` dictionary can reach Edge TTS. The audio endpoint accepts a whitelisted public `phase` for prefetch and a whitelisted `voice` profile (`original` or `narrator`). It never accepts free text. Profile settings match the original HiuMaan voice exactly by default; optional WanLung runs slightly slower.

`Speech` hashes text, voice, rate, pitch, and cache revision. It checks memory and disk before awaiting network slots, so a cached clip never waits behind unrelated synthesis. MP3 files are atomically replaced with unique temporary filenames. Identical concurrent requests share a task; cancelling a listener does not cancel synthesis for others. A two-slot semaphore bounds provider concurrency, generation has a 12-second deadline, and failures open a 30-second backoff. Application shutdown cancels pending work. The live app warms original prompts asynchronously using one slot at startup, leaving capacity for live audio; the test factory disables network warmup by default. `backend.prepare_audio` can prime either pack ahead of time. Cache files live under the database directory's `audio-cache/`, overridden by `WOLFMAN_AUDIO_CACHE`, and are excluded from Git.

The browser independently caches up to 24 public blobs by cue/profile, deduplicates pending requests, prefetches upcoming cues, and briefly caches failures. Replay creates a playback object from the existing blob with zero audio HTTP requests. `stop()` cancels playback and system speech but lets useful pending downloads finish; generation guards prevent stale playback. `dispose()` also aborts requests and releases caches on page exit. Temporary playback URLs are revoked. Profile changes cancel the previous voice before playing the new one. A watchdog stops stalled playback.

Browser speech is opt-in and explicitly identified as a local fallback; it must have a Cantonese voice. Network failure otherwise leaves captions, without silently replacing the original neural voice. Sound requires a click and starts off per tab. Enable it on one device. External service availability remains outside the application's control; prepared clips remain usable offline.

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
| GET | `/api/games/{id}/audio` | Host/viewer; public MP3 or 503; optional `phase` and `voice` |

Phase-specific actions: `ack`, `wolves`, `witch`, `inspect`, `dawn`, `shoot`, `vote`, `ballots`, `debug_skip_reveal`. Rule violations return 409; schema errors 422; missing credentials 401; forbidden credentials 403; unknown game 404. Polling runs every three seconds while visible without a private dialog. After uncertain network failure, synchronize before retrying: a committed action cannot reuse its old version.
