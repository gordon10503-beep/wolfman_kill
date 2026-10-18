# Validation — 2026-10-15

- Python 3.14: 78 pytest cases passed, with 4 PostgreSQL cases skipped locally without TEST_DATABASE_URL (rules including self-votes in normal/runoff ballots, API/auth, host-only debug privacy, concurrency, restart persistence, speech failure/cache, terminal hunter regression).
- Node 24: 38 frontend tests passed (audio replay, late responses, mute races, Cantonese/text fallback, night/day/dawn/hunter theme selection, bilingual rules and dynamic prompts, recap translations, identity privacy and role-effect lifecycle). JavaScript syntax checks passed.
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
- Game header: browser checked the centered bilingual title and night/round line, with Audience view and New game in the top bar. Both actions work after phase changes and reload; returning to setup clears the game controls. Desktop and 375px mobile layouts have no horizontal overflow, with the mobile host buttons sharing one row.

- Version 1.6 browser pass: a five-player fun game skipped absent witch/seer phases, queued two first-night speakers after a hunter shot, and exposed counted votes directly. Individual ballots remained usable. A voted hunter shot the last wolf; only that hunter received daytime last words, with victory deferred until confirmation. No console errors. The voting screen fits 375 CSS pixels without horizontal overflow.
- GitHub Actions run 38729606200 passed on Python 3.13 and 3.14, including all 79 backend cases against SQLite/PostgreSQL 17 and 38 frontend cases. This verifies the PostgreSQL storage contract, permission checks, concurrent version conflicts, rollback and last-words persistence. Live Render/Neon verification: health reports 1.6.0; a six-player cloud game completed a night, witch save, seer inspection, counted vote, last words and village victory. Reload retained its snapshot. Both last-words MP3s returned HTTP 200: HiuMaan Cantonese (34,416 bytes, about 1.25 s) and Guy English (40,896 bytes, about 2.66 s). Physical voice output and actual iOS installation have not been independently checked.

- Version 1.6.1: backend tests cover both potions on one night, spent-inventory rejection, legacy one-potion behavior, poison precedence, strict Boolean validation and independent fun-mode inventories. Browser verified No limit survives changing presets, two potion effects run, and both inventories are consumed with the wolf target saved and poison recorded.

- Version 1.6.2: browser checked matching gold on-states and muted off-states for Motion/DEBUG/Voice, Motion off wording, speech language first, all house-rule toggles on except fun mode, and left-aligned supporting text. Host actions follow LOCAL TABLE. Observed 1.8-second wolf and 2-second sky CSS durations and no leftover overlays after the night/day transition. Backend tests cover the new last-words default and explicit opt-out; legacy-rule fallback remains unchanged.


## Version 1.7.0 — 2026-10-19

- Added seat-approval, cross-seat/cross-room denial, revoked-pass replacement, wolf unanimity, stale-turn rejection, private seer results, mode-switch retention and parallel ballot integration tests. Fun-mode coverage includes independent witches, sequential seers, dead cover turns and hunter chains.
- Shared SQLite/PostgreSQL storage contract now covers concurrent requests for the same seat, atomic approval and restart persistence. PostgreSQL cases require the CI service or TEST_DATABASE_URL; they are skipped locally.
- A renewable narrator lease is tested for exclusivity and expiry; players/audience cannot acquire it or fetch room narration. Frontend audio checks include the main-device header and disabled playback.
- Browser QA: nine-seat room creation, sharing, pending approval without secrets, approvals on the host, private blue/gold hunter card, readiness, a night of player actions, hunter elimination and shot from the player's browser, last-words handoff, both mode switches, refresh/reconnect, revocation and approval on a replacement seat. The replacement received only its crimson wolf card. No console errors in the inspected player session.
- Player dialog at 375 CSS pixels: document and dialog scroll widths equal client widths. Temporary viewport override reset after testing. Actual physical iPhone installation/network play has not been exercised; browser phone viewport and separate tabs were used.
- Multiple rooms are isolated in integration tests. No hosting capacity/load-test claim is made.

- Final local suite: 85 Python cases passed, 5 PostgreSQL cases skipped without TEST_DATABASE_URL; 40 frontend cases and all JavaScript syntax checks passed.


## Version 1.7.1 — 2026-10-19

- New-game UI/API default to multi-device rooms. Normal play automatically reserves and approves host seat 1, with private host role, readiness, seer investigation and own-ballot APIs. Viewer passes cannot access host-player routes. Host seats cannot be revoked through the guest-management UI/API.
- Main-device DEBUG can drive all role phases with no guest connections, skip dealing/discussion and submit counted or individual votes. Disabling DEBUG restores seat-only actions. An integration test covers a full peaceful night and counted vote, without any guest joins.
- Pending requests reserve the next free seat inside SQLite/PostgreSQL write transactions. Eight concurrent guest joins receive seats 2–9 exactly once; a full room rejects new joins and a rejected pending seat is reusable.
- Browser checked automatic host role reveal and Ready in normal multi mode, without any separate player tab. Solo DEBUG exercised wolf/witch decisions, seer result and acknowledgment. Setup default and revised bilingual copy verified.

- Version 1.7.2 separates each character emblem from its shared halo/star layer, prefixes SVG IDs to avoid forest collisions, and preloads the sprite once. Card identity text remains visible while artwork loads; animation uses opacity/transforms and respects Motion off/reduced motion.

- Browser animation pass: one shared character sprite, character-rise animation present while halo opacity is initially zero; later halo opacity is 0.9 and its transform rotates while the character rests. All five homepage emblems have distinct idle animations; Motion off removes them. Player views show day/night scenes, with forest-twinkle and forest-sway on the night overlay and no public identity cards during an unfinished game. Public table labels and chronicle remain bilingual.
- Final animation test suite: 42 frontend tests plus JavaScript syntax checks passed. Backend remains at 88 passing local cases, with 5 PostgreSQL cases requiring CI.
