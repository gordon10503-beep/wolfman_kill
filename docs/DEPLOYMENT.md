# Share Moonfall and install it as an app

One HTTPS website serves the frontend and Python API on iPhone, Android, Windows and Mac. This remains an in-person game: one host device handles private handoffs; audience links are read-only, not remote player accounts.

## Recommended free setup

Pricing checked 2026-10-15:

| Service | Purpose | Free-tier tradeoff |
| --- | --- | --- |
| [Render Free](https://render.com/docs/free) | Frontend, API and narration | 750 instance-hours/workspace/month. Sleeps after 15 idle minutes; waking takes about a minute. Local disk is temporary. |
| [Neon Free](https://neon.com/pricing) | Durable PostgreSQL game snapshots | Currently 1 GB and 100 CU-hours/project/month; no credit card required. Close unused game tabs so polling does not keep compute active. |
| [Koyeb Free](https://www.koyeb.com/docs/reference/instances) | Alternative Python host | One instance with 512 MB RAM, no persistent volume, sleeps after one idle hour. Still needs an external database. |

Keep both accounts on Free and check usage dashboards. These are hobby allowances, not unlimited hosting. Render's free PostgreSQL expires after 30 days, so this setup uses Neon. Do not rely on Render's temporary disk for saved games.

## Deploy

1. In Neon, create a Free PostgreSQL project named `moonfall`, in Singapore when available. No other Neon service is needed.
2. Open its connection dialog, choose the production branch/database/application role, and copy the pooled connection URL with `sslmode=require`. Treat this as a password.
3. In Render, create a Free **Web Service** from `https://github.com/gordon10503-beep/wolfman_kill`. Public-repository deployment needs no GitHub permission grant. Trigger future deploys manually; Git-provider integration can optionally enable automatic deploys.
4. Choose Python, branch `main`, Singapore, and build command `pip install -r requirements.txt`. Start command:

   ```sh
   python -m uvicorn backend.app:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
   ```

   Trust forwarded headers only behind the platform proxy; a directly exposed server should name its trusted proxies instead.

5. Add the secret environment variable `DATABASE_URL` with the Neon URL. Never commit it or put it in frontend code/screenshots. `render.yaml` also describes this configuration for Blueprints.
6. Set health check `/api/health`, deploy, and wait for **Live**. Open the assigned `https://…onrender.com` URL. Create a test game, refresh, finish a night and check narration. Fix database errors rather than removing `DATABASE_URL` and silently falling back to temporary disk.
7. Share the **home URL** for friends to create tables. Use **Audience view** in the top bar to share a read-only view of your active game. Keep the host tab private.

Cloud storage starts fresh: local SQLite games and MP3s are not automatically uploaded. MP3s can regenerate after restart; game snapshots stay in Neon. Use one Uvicorn worker for speech caching. Edge TTS access must be verified on the live host; on-screen instructions remain usable if speech is unavailable.

## Install on phones and computers

- **iPhone/iPad:** Safari → Share → Add to Home Screen → Open as Web App. [Apple's instructions](https://support.apple.com/guide/iphone/turn-a-website-into-an-app-iph42ab2f3a7/ios).
- **Android:** Chrome's install / Add to Home screen menu, or **Install Moonfall** in the guide when offered.
- **Windows:** Edge/Chrome install option in the address bar or menu.
- **Mac:** Safari's Add to Dock, or a supporting browser's install option.

This is an installable web app, not an App Store/Play Store binary. It includes a standalone manifest, icons, responsive panels, touch controls and safe-area spacing. HTTPS is required for installation features except localhost. Availability varies by browser.

**Play requires a connection.** The service worker does not cache API responses, private screens or stale frontend code. Install before creating a game: the host pass lives in that tab's session storage, and browser/installed-app sessions can differ. Keep the host session open while playing.

## Persistence validation

Local play uses SQLite; `DATABASE_URL` selects PostgreSQL. Both stores hash access passes and enforce atomic version checks. PostgreSQL locks each game row while committing an action.

CI provisions PostgreSQL 17 and runs the shared permission, restart, concurrency, rollback and last-words tests on both stores. To run these locally, set `TEST_DATABASE_URL` to a **dedicated test database** and run `python -m pytest tests/test_storage.py -q`. Tests create records; never point them at the live game database.
