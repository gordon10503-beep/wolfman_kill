# Validation — 2026-10-15

- Python 3.14: 42 pytest cases passed (rules including self-votes in normal/runoff ballots, API/auth, host-only debug privacy, concurrency, restart persistence, speech failure/cache, terminal hunter regression).
- Node 24: 19 frontend tests passed (audio replay, late responses, mute races, Cantonese/text fallback, night/day/dawn/hunter theme selection, bilingual rules and dynamic prompts, recap translations and identity privacy). JavaScript syntax checks passed.
- Browser: complete 6-player game through role dealing, two nights, witch/seer actions, dawn, discussion timer, ballots, village victory, and full recap. Audience mode and URL credential removal verified. No console errors in the inspected session.
- Responsive checks: 1280px desktop and 390px mobile widths, without horizontal document overflow. `preview.png` captures the desktop setup.
- Version 1.1 browser checks: night-to-dawn palette transition, 「返回」without submission, host debug identity sheet, debug persistence through reload, restoring normal timer when debug is off, skipping discussion directly to voting, and audience mode with no debug toggle/panel. `day-preview.png` and `night-preview.png` capture both palettes. No browser console errors observed.
- Version 1.2: diagnosed the active port 8000 server as an older 1.0 process without the debug route. Restarted it with the new autoreloading launcher and verified `/api/health` reports 1.2.0, DEBUG shows all identities, and a player can select their own seat and be eliminated by that self-vote. The chronicle contains both dawn and vote events. The updated `night-preview.png` shows the natural forest backdrop. No browser console errors observed.
- Historical initial-release Edge TTS request: service unavailable here (HTTP 503 after about 7.5 seconds). The failure stayed within its time budget; game state remained available. Automated fallback tests pass; physical speaker output has not been listened to.
- Docker is not installed on the development machine, so the supplied image has not been built locally.
- GitHub Actions is configured for Python 3.13/3.14 and Node 22. Local results do not imply the hosted workflow has completed.

The FastAPI/Starlette test client emits upstream deprecation warnings in this environment; no project test failures resulted.

- Version 1.2.1: browser verified the role-reveal skip is hidden in normal mode and jumps straight to the first night in DEBUG. Backend tests cover partial reveals, preservation of the deal, phase restrictions, audience denial, and duplicate submissions.

- Version 1.3: reproduced provider 403 with edge-tts 7.2.8. Upgraded to 7.3.1 and successfully generated all ten fixed prompts for both HiuMaan and WanLung (20 MP3s). Live cached wolf-clip requests measured about 6–17 ms, versus an initial uncached synthesis check around 6.2 seconds. These are local observations, not a latency guarantee. Browser verification exercised original neural playback, rapid replay, male voice selection, and mute, with no console errors. Frontend tests assert zero additional HTTP requests on replay, in-flight deduplication, future-cue prefetch reuse, and explicit local fallback. Backend tests cover disk persistence across new Speech instances, concurrent deduplication, cancellation isolation, outage backoff, and public-cue/voice validation. Physical voice quality has not been independently listened to or rated.

- Version 1.4: verified 空刀 disabled survives changing the setup preset and removes the abstain radio option. English female narration played translated instructions; switching back to Cantonese restored the original neural voice. All English female/male prompts generated successfully and were cached (40 clips across both languages and genders). Added rule enforcement, legacy-game compatibility, translated-prompt coverage, language/voice API validation, language-separated cache, and matching local-fallback tests. No browser console errors observed.

- Bilingual UI browser pass: setup rules, role reveal, wolf target/pass choices, witch potion instructions, seer result, debug roster, daytime events, and all-player voting checked in a separate QA game. Existing user games were not advanced.

- Forest polish: browser-confirmed SVG animation styles run under a resource-specific CSP hash. Added a regression check for the exact style hash and reduced-motion rule. Glass-like highlights use static gradients and shadows, with no per-card backdrop blur.

- Animation visibility fix: confirmed moving moon/tree transform values and changing star opacity inside the actual homepage DOM, plus exactly one forest after changing the player preset. The illustration now mounts as SVG elements with external CSS rather than relying on an animated CSS background image.

- Motion visibility follow-up: brighter, larger stars and top-aligned sky; increased moon travel and tree sway. Browser checked the bilingual motion switch, paused computed animation state, and persistence after changing a player preset. Explicit enable overrides the system reduced-motion default for this tab only.
