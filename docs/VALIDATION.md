# Validation — 2026-10-15

- Python 3.14: 61 pytest cases passed (rules including self-votes in normal/runoff ballots, API/auth, host-only debug privacy, concurrency, restart persistence, speech failure/cache, terminal hunter regression).
- Node 24: 37 frontend tests passed (audio replay, late responses, mute races, Cantonese/text fallback, night/day/dawn/hunter theme selection, bilingual rules and dynamic prompts, recap translations, identity privacy and role-effect lifecycle). JavaScript syntax checks passed.
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

- Requested animation tuning: motion on by default (explicit pause remains remembered per tab); tree sway increased to ±1.8° over 2.8/3.8-second half-cycles; star twinkle half-cycles reduced to 1.2–1.7 seconds.

- Handoff upgrade: browser checked the top-bar motion switch and seat 1 → 2 after a private acknowledgment. Transition tests cover new-game/final-handoff triggers, immediate rendering with motion paused, midpoint swap, and cleanup even when rendering fails.
- Final-handoff browser pass: all nine private confirmations completed in a separate QA game; wolf phase appeared, no transition overlay remained, and the main view was no longer inert. Phone viewport checked at 375 CSS pixels with no horizontal overflow. Wolf and wipe edges use gradient masks with a brief exit fade.

- Version 1.5: browser-tested a 10-player fun game with two witches, two seers, and two hunters over three nights. Verified separate potion inventories/results, role action animations, cancellation before inspection, counted eliminations, a hunter shot, sun/moon transitions and animated daytime SVG layers. A dead witch auto-passed to the living witch without skipping the latter. New guide/default settings and mobile layout checked separately.

- Current defaults: fresh host page shows bilingual DEBUG/Voice controls with narration on and self-save checked. Muting survives reload; audience defaults remain silent. The bilingual guide and shared privacy notice were checked on the homepage and in the modal, including 375px viewport overflow checks.
- Hunter narration now treats a new queued hunter seat as a new cue even when the phase stays `hunter`; repeated polls stay silent and the existing audio cache handles replay. Fun-mode role controls cap non-wolves at 15 and wolves at 7.
- Role-effect flash fix: projectile styles now hold their destination while the delayed card flip finishes, with a hidden base style and removal before animation cancellation. Regression tests cover the timing gap and interrupted actions. A separate browser game completed wolf and witch actions, showed the flask at its target, and left no projectile elements or console errors after completion.
- Hunter attribution: chain tests preserve each firing seat and keep it out of unfinished public player records. Frontend tests cover bilingual labels, legacy chronicle recovery and unchanged wolf deaths. Browser checked a separate six-player recap with three distinct hunter sources and no console errors.
