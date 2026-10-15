# Validation — 2026-10-15

- Python 3.14: 31 pytest cases passed (rules including self-votes in normal/runoff ballots, API/auth, host-only debug privacy, concurrency, restart persistence, speech failure/cache, terminal hunter regression).
- Node 24: 8 frontend tests passed (audio replay, late responses, mute races, Cantonese/text fallback, night/day/dawn/hunter theme selection). JavaScript syntax checks passed.
- Browser: complete 6-player game through role dealing, two nights, witch/seer actions, dawn, discussion timer, ballots, village victory, and full recap. Audience mode and URL credential removal verified. No console errors in the inspected session.
- Responsive checks: 1280px desktop and 390px mobile widths, without horizontal document overflow. `preview.png` captures the desktop setup.
- Version 1.1 browser checks: night-to-dawn palette transition, 「返回」without submission, host debug identity sheet, debug persistence through reload, restoring normal timer when debug is off, skipping discussion directly to voting, and audience mode with no debug toggle/panel. `day-preview.png` and `night-preview.png` capture both palettes. No browser console errors observed.
- Version 1.2: diagnosed the active port 8000 server as an older 1.0 process without the debug route. Restarted it with the new autoreloading launcher and verified `/api/health` reports 1.2.0, DEBUG shows all identities, and a player can select their own seat and be eliminated by that self-vote. The chronicle contains both dawn and vote events. The updated `night-preview.png` shows the natural forest backdrop. No browser console errors observed.
- Real Edge TTS request: service unavailable here (HTTP 503 after about 7.5 seconds). The failure stayed within its time budget; game state remained available. Automated fallback tests pass; physical speaker output has not been listened to.
- Docker is not installed on the development machine, so the supplied image has not been built locally.
- GitHub Actions is configured for Python 3.13/3.14 and Node 22. Local results do not imply the hosted workflow has completed.

The FastAPI/Starlette test client emits upstream deprecation warnings in this environment; no project test failures resulted.

- Version 1.2.1: browser verified the role-reveal skip is hidden in normal mode and jumps straight to the first night in DEBUG. Backend tests cover partial reveals, preservation of the deal, phase restrictions, audience denial, and duplicate submissions.
