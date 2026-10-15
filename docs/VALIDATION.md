# Validation — 2026-10-15

- Python 3.14: 26 pytest cases passed (rules, API/auth, concurrency, restart persistence, speech failure/cache, terminal hunter regression).
- Node 24: 5 audio tests passed (replay, late responses, mute races, Cantonese fallback, text-only fallback). JavaScript syntax checks passed.
- Browser: complete 6-player game through role dealing, two nights, witch/seer actions, dawn, discussion timer, ballots, village victory, and full recap. Audience mode and URL credential removal verified. No console errors in the inspected session.
- Responsive checks: 1280px desktop and 390px mobile widths, without horizontal document overflow. `preview.png` captures the desktop setup.
- Real Edge TTS request: service unavailable here (HTTP 503 after about 7.5 seconds). The failure stayed within its time budget; game state remained available. Automated fallback tests pass; physical speaker output has not been listened to.
- Docker is not installed on the development machine, so the supplied image has not been built locally.
- GitHub Actions is configured for Python 3.13/3.14 and Node 22. Local results do not imply the hosted workflow has completed.

The FastAPI/Starlette test client emits upstream deprecation warnings in this environment; no project test failures resulted.
