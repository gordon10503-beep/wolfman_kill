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

SQLite stores one JSON snapshot per game locally. Setting `DATABASE_URL` selects PostgreSQL through `postgres_store.py`; it uses `SELECT … FOR UPDATE` and the same version/authentication checks. This keeps cloud snapshots outside ephemeral web-server storage. `BEGIN IMMEDIATE` reserves the writer before reading. Every mutation includes the previous version; two tabs cannot commit the same action. The engine copies its input, so failed validation cannot partly mutate state. State survives restart; session storage retains credentials through same-tab reload. Closing/clearing the session loses credentials; no recovery/account system is included.

The default database is `data/games.sqlite3`, configurable through `WOLFMAN_DB`. Back up using SQLite's backup API or stop the server before copying. Data is ignored by Git/Docker. Operators manage retention. Use one Uvicorn worker; speech locks/cache are per process.

## Privacy boundary

Random 256-bit host/viewer capabilities are returned at creation; only SHA-256 hashes are stored. Requests use Authorization headers. Viewer links carry a viewer capability in a URL fragment, which is not an HTTP path/query. On arrival, the client moves it into session storage and removes it from the visible URL. Viewers cannot mutate or access private endpoints; host credentials never enter viewer links.

Private dialogs empty when the tab hides. Private values never enter public events/TTS. SQL parameters, strict models, same-origin mutation checks, no-store responses, CSP, and no-referrer headers support this boundary. Database roles are plaintext: protect host files/backups. The host is trusted.

This local release has no internet-facing rate limiter or account service. Before public hosting configure HTTPS, access controls, request/rate limits, and a trusted reverse proxy. Do not expose Uvicorn directly to the internet.

## Speech and timer

Only the fixed `NARRATION` / `NARRATION_EN` dictionaries can reach Edge TTS. The audio endpoint accepts a whitelisted public `phase` for prefetch and a whitelisted `voice` profile (`original` or `narrator`). A validated `lang=yue|en` selects the script and matching neural voice. It never accepts free text. Profile settings match the original HiuMaan voice exactly by default; optional WanLung runs slightly slower.

`Speech` hashes text, voice, rate, pitch, and cache revision. It checks memory and disk before awaiting network slots, so a cached clip never waits behind unrelated synthesis. MP3 files are atomically replaced with unique temporary filenames. Identical concurrent requests share a task; cancelling a listener does not cancel synthesis for others. A two-slot semaphore bounds provider concurrency, generation has a 12-second deadline, and failures open a 30-second backoff. Application shutdown cancels pending work. The live app warms original prompts asynchronously using one slot at startup, leaving capacity for live audio; the test factory disables network warmup by default. `backend.prepare_audio` can prime either pack ahead of time. Cache files live under the database directory's `audio-cache/`, overridden by `WOLFMAN_AUDIO_CACHE`, and are excluded from Git.

The browser independently caches up to 48 public blobs by cue/profile/language, deduplicates pending requests, prefetches upcoming cues, and briefly caches failures. Replay creates a playback object from the existing blob with zero audio HTTP requests. `stop()` cancels playback and system speech but lets useful pending downloads finish; generation guards prevent stale playback. `dispose()` also aborts requests and releases caches on page exit. Temporary playback URLs are revoked. Profile changes cancel the previous voice before playing the new one. A watchdog stops stalled playback.

Browser speech is opt-in and explicitly identified as a local fallback; it must have a voice matching the selected language. Network failure otherwise leaves captions, without silently replacing the original neural voice. Host narration defaults on; audience narration defaults off, and mute overrides persist separately. Browser autoplay policy may still require a click. Keep a single device speaking. External service availability remains outside the application's control; prepared clips remain usable offline.

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
| GET | `/api/games/{id}/audio` | Host/viewer; public MP3 or 503; optional `phase`, `voice`, and `lang` |

Phase-specific actions: `ack`, `wolves`, `witch`, `inspect`, `dawn`, `shoot`, `vote`, `ballots`, `vote_result`, `inactive_pass`, `debug_skip_reveal`. `inactive_pass` is rejected for living actors and hunters. Fun mode stores private per-role cursors and per-witch potion inventory; public state never includes actor seats or inventory. Only a role-turn ordinal/count is public so players can follow the order; dead holders remain in that count. Rule violations return 409; schema errors 422; missing credentials 401; forbidden credentials 403; unknown game 404. Polling runs every three seconds while visible without a private dialog. After uncertain network failure, synchronize before retrying: a committed action cannot reuse its old version.

Frontend visuals use CSS/SVG transforms and opacity for day/night transitions and animated scenery. The small host-only night-cover timer checks the private role context after 10 seconds without interaction, then submits a version-checked inactive pass only if the server confirms the role cannot act. Private action effects finish before submission/results, and cancelled dialogs do not commit an unfinished visual action.

## Installable website

The web manifest and icons support home-screen/desktop installation. The online-only service worker registers without caching requests, so private API responses and obsolete frontend code never enter a runtime cache. A supporting browser may offer an install prompt in the guide; iOS uses Safari’s Add to Home Screen. See [Deployment](DEPLOYMENT.md).
