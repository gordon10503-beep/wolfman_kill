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


## Version 1.7.3 — 2026-10-19

- Fixed ground geometry is separate from halo rotation on the homepage and private role cards. Browser computed styles confirm five stationary ground layers, rotating auras, independently blinking eyes, shaking potions and a moving arrow. Motion off stops each animated part; private witch-card layers were checked separately.
- Morning audio derives only from an already-published dawn event. Tests cover two casualties, a peaceful night, no pre-dawn disclosure, expiry on the next night, hunter follow-ups, both speech languages, stale-cue rejection, cached replay and muting/interruption races. No role or death cause enters the spoken report.
- Local verification: 93 Python tests passed; 5 PostgreSQL cases require CI. All 48 frontend tests and JavaScript syntax checks passed.


## Version 1.7.4 — 2026-10-19

- Hybrid DEBUG tests reject host power use/inspection for approved guest seers, witches and hunters. Mixed wolf packs wait for agreement, simulated ballots preserve real votes and wait for the final player, and role handoff cannot bypass a guest's Ready. Approval removes the seat's earlier simulated choices; revocation restores simulation.
- Browser two-tab pass: seat 2 joined, was approved as the seer, investigated seat 1 privately and confirmed the result. The host's stage action was hidden and the bilingual notice identified player-controlled seat 2.
- Hunter public labels use only a revealed-role flag and retain hidden causes/other roles. Endgame tests cover good-side wins, wolf wins and draws in both narration languages; frontend result caches separate different winners.
- Archive: book cover, unsealing and card flights checked in the browser. All five cards fit a 1265 × 720 desktop viewport in a 3+2 arrangement without internal scrolling; independent character details animate and Motion off makes the collection static. No console errors observed. Narrow layouts use two columns and allow scrolling; no physical-phone claim is made.
- Invitation exports: 1080 × 1920 and 1080 × 1440 PNGs visually inspected. ZXing decoded both QR codes at original resolution and at 540-pixel width to https://moonfall-wolfman.onrender.com/. SVG sources and optional reproduction scripts included.
- Final local checks: 107 Python tests passed, 5 PostgreSQL cases require CI; 51 frontend tests and all JavaScript syntax checks passed. Pytest discovery is restricted to this repository's tests directory.


## Version 1.8.0 — 2026-10-20

- Remote rooms narrate independently on approved players' devices, with per-device mute, volume, language and cached replay. In-person rooms retain the main-device speaker lease. Viewer and unapproved credentials cannot request remote audio.
- Chat authorization is enforced server-side: living wolves only during the wolves phase; public daytime chat for living players and the designated last-words speaker. Eliminated players may read public discussion. Independent cursors avoid invalidating actions or replaying narration; bounded histories, message limits, sender cooldown and escaped rendering are covered.
- Browser two-device pass: approval, private identity separated from actions, real wolf votes preserved during host DEBUG simulation, private wolf discussion removed after the phase, completed voter attribution on both screens, and bilingual solo DEBUG guide. Guest replay played the original Cantonese audio; mute and volume were checked.
- At a 390 × 844 browser viewport, the remote guest page had no horizontal overflow and the phase-specific action stayed accessible at the bottom. The viewport override was reset. No console errors observed in the guest tab; physical phone testing remains outstanding.
- Regression cases cover peaceful-night audio not repeating after hunter shots, including interruption, late join, replay and unmute. Chat permission, cursor, room isolation and retention cases run against the API.
- Local checks: 114 Python cases passed; 5 PostgreSQL cases require CI. All 56 frontend tests and JavaScript syntax checks passed. Voice chat remains deferred.

- Spectator viewer passes and eliminated players share a separate chat; living players cannot read or write it. API tests verify public read-only access, wolf-channel denial, no public-state leakage, cursors and cross-room isolation. Viewer passes retain their existing restrictions on role actions and audio.


## Version 1.8.1 — 2026-10-20

- Replaced inline remote chat with a zero-height floating launcher and native modal glass panel. Desktop uses a 520px side panel; phone view uses the screen minus safe margins. Background scroll is locked only while open.
- Browser checked opening, Escape closing, focus returned to the launcher, unsent draft retention through closing and game-page rerender, sending a message, and an open draft surviving a server version update. No console errors were observed in the inspected host tab.
- At 390 × 844 and 390 × 480, the panel and composer stayed within the viewport without horizontal overflow. The smaller viewport simulates reduced available keyboard height; actual physical iPhone keyboard behavior remains untested. VisualViewport resize/scroll tracks phone keyboard space. Temporary viewport override reset.
- All 56 frontend tests, JavaScript syntax checks and 114 local backend tests passed; 5 PostgreSQL cases require CI. Backend chat access rules are unchanged.


## Version 1.8.2 — 2026-10-20

- Browser checked the remote checkbox default and creating a REMOTE TABLE without changing mode. Existing solo DEBUG API coverage now asserts the remote default.
- Browser checked volume 0.35 → mute → unmute retaining 0.35, narration staying enabled while muted, mute surviving refresh, and slider zero → speaker restoring the last audible volume. Both host and remote guests use the same volume binding and effective-volume context.
- All 114 local Python tests and 56 frontend tests passed, along with JavaScript syntax checks; 5 PostgreSQL cases require CI.


## Version 1.8.3 — 2026-10-20

- Browser host room status Y=201 precedes chronicle heading Y=444. Guest private role has identity-rise + identity-idle and a 32-second halo orbit, with changing computed transforms; its ground has no animation.
- Browser checked guest Motion off produces no role/halo animation, and explicit Motion on restores both. Reopening host and guest role cards replays their entrance. System reduced-motion preference now controls the default button state and does not suppress an explicitly requested character animation.
- Frontend syntax and all 56 tests passed. The preceding full backend run passed 114 tests; the additional backend change only bumps the displayed release version.

- Found and fixed native dialog autofocus scrolling a guest role card to Y=-293 while Hide was focused beneath long tips (scrollTop=413). Private identity dialogs now focus the card and start at the top, making the entrance visible.


## Version 1.8.4 — 2026-10-20

- House rules default closed with a bilingual six-item overview and chevron; Start remains outside the disclosure. Browser checked live summary changes, exclusively selected play modes, and preserving mode/potion/disclosure state across a six-player preset change.
- Host narrator content is removed from the main page and moved, with original handlers, into a floating-button glass dialog. Changing language keeps the panel open, updates voice options and leaves only one language selector in the DOM. Remote guests retain language/replay controls in their own panel. Closing restores focus to the launcher.
- At 390px width, the collapsed home page has no horizontal overflow; narrator panel bounds are x=10…380 and y=10…834 in a 390 × 844 viewport. Temporary QA viewports were reset or their test tabs closed. No physical-phone claim is made.
- Local checks: 114 Python tests passed, 5 PostgreSQL cases require CI; all 56 frontend tests and JavaScript syntax checks passed.


## Version 1.8.5 — 2026-10-20

- Browser checked all four added summary entries, including disabled states and discussion time changing to 120 seconds during input.
- The hero start button created a remote game with the selected 120-second discussion, self-save off, witch action when attacked off and parity victory off; the stored game was checked directly for this QA room.
- At 390px width the document had no horizontal overflow, and the button remained within the hero bounds after the copy. Desktop screenshot verified bottom-right placement above the footer quote. Temporary viewport override reset.
- JavaScript syntax and 56 frontend tests passed; all 20 API tests passed for the release version. Full backend coverage continues in CI.


## Version 1.8.6 — 2026-10-20

- Browser measured Motion/DEBUG/Voice at 156 × 44 CSS pixels and speaker/help/archive at 44 × 44 on desktop. At 390px width, the three toggles share equal ~110px widths and 44px height; document scroll width equals client width. Temporary viewport override reset.
- SVG XML parsing passed for moon.svg and forest.svg. Browser visually checked crater shading, edge glow, original forest animation and the refreshed crescent logo; no console errors observed. The forest glow uses gradients, with no animated filters.


## Version 1.8.7 — 2026-10-20

- Found the archive’s unconditional prefers-reduced-motion rule could suppress animations despite an explicit Motion on choice. Scoped the fallback to respect an explicit opt-in, matching role-card behavior; no OS/RDP setting is changed.
- Browser verified Motion off → open archive → enable motion inside the dialog, resulting in root data-motion=on, book-unseal and archive-emerge animations and a nontrivial cover rotation matrix. All five cards fit at 1265 × 720, with scroll height equal to client height (668px). No claim is made about physical RDP testing.
- JavaScript syntax, 56 frontend tests and 20 API tests passed. Full PostgreSQL/backend checks run in CI.


## Version 1.8.8 — 2026-10-20

- Added host-only invite QR generation using pinned qrcode 8.2 and a pure SVG matrix renderer (no Pillow/server image dependency). No host/viewer pass enters the QR. Tests cover HTTPS link fields, authentication, old-invite invalidation and cross-room denial.
- Browser rendered the QR, and ZXing independently decoded its screenshot to exactly the displayed invitation URL. Renew invite changed the sharing link. At 390px width the QR measured 252 × 252px, with no document or dialog horizontal overflow; temporary viewport override reset.
- Local verification: 115 Python tests passed, 5 PostgreSQL cases require CI; all 56 frontend tests and JavaScript syntax checks passed.


## Version 1.8.9 — 2026-10-20

- Browser verified a fresh session starts with Motion on and root data-motion=on. Turning it off survives refresh; turning it on restores motion. This is now the requested default even when the system requests reduced animation.
- Preserved the user's committed hero/chronicle copy changes (42f9e71). Frontend syntax and 56 tests passed; 21 API/invite-QR tests passed.


## Version 1.8.10 — 2026-10-20

- Browser DEBUG pass: six-player room, reveal and confirm seat 1, panel advances to 1/6 ready with prominent seat 2. More options exposes My role; skip action advances to wolves. Existing backend ownership restrictions remain intact.
- Normal remote host pass: own primary Confirm role reveals the card, then advances readiness to 1/9. At 390px width, document scroll width equals client width (375px) and compact panel width is 339px. Temporary viewport override reset.
- All 56 frontend tests and syntax checks passed, plus 38 API/room backend cases. Existing player-owned DEBUG and readiness cases passed without engine changes.


### 1.8.11 — Solo DEBUG chat

46 remote/room/API tests and 56 frontend tests passed. Verified in the browser that a good-side solo host can send village chat at night in DEBUG. Regression coverage checks ordinary mode, approved guests, spectator credentials, and no extra private-channel access.


### 1.8.12 — Chat keyboard shortcuts

Browser verified Enter sends and clears the composer, while Shift+Enter inserts a newline. Composition events, isComposing and legacy key code 229 bypass the send shortcut to protect IME input. JavaScript syntax checks passed.


### 2.0.0 — Nine-role village

- 144 backend tests passed locally; five PostgreSQL integration cases require the CI database. 57 frontend tests and module syntax checks passed.
- 28 focused new-role cases cover protection/antidote/poison combinations, independent guardians, cover turns, public Idiot reveals and eligible ballot completion, knight timing/ownership/win resolution, private gravedigger results, old five-role compatibility, all three play modes and public audio cue validation.
- Browser walkthrough: 13-seat remote DEBUG game; investigate → guardian (host’s own seat) protects wolf target → gravedigger confirms first-night no-result → dawn confirms no deaths → failed knight duel keeps discussion → vote spares Idiot and displays no voting rights. No console errors.
- Reviewed the nine-card animated archive, verified guardian CSS animation, and checked the 390px mobile cast picker without horizontal overflow. New role art shares the existing lightweight SVG sprite, gold/blue palette, stationary ground and separate rotating aura.
- Original presets and saves remain valid. New roles start at zero; standard special-role caps remain one and fun-mode caps remain 15 within the total/balance constraints.


### 2.0.1 — Presets and compact cast picker

Browser verified: 9-player preset totals nine with one Idiot and two villagers; 12-player preset totals twelve with all nine roles. The 6-player preset folds to five core cards. +/− reveals/hides the extra cards without altering selected counts; a collapsed 12-player preset still creates a twelve-player room. At 390px, the folded picker has no horizontal overflow. JavaScript syntax checks passed.


### 2.0.2 — Guide return button

Browser confirmed the footer button closes the normal guide, closes the DEBUG guide, and closes the normal guide again after toggling DEBUG off. Guide close handlers are rebound after rebuilding content; optional PWA installation uses delegated clicks and refreshes availability after a rebuild. Module syntax checks passed.


### 2.1.0 — Wolf variants, staged cast selection and archive chapters

- 179 backend tests and 58 frontend tests pass locally; five PostgreSQL tests require CI. Syntax checks pass. New wolf coverage checks all three modes, device ownership/stale actions, aggregate balance and victory, shot exceptions/chains, White Wolf King timing, independent/latest charms, Hidden Wolf eligibility and disguise, inherited kill voting, and direct-poison priority.
- Browser walkthrough: 10-player remote DEBUG room with all four variants. Regular wolf view excludes the Hidden Wolf; its own view lists the team. The seer sees Good side. A night-killed Wolf King shoots Wolf Beauty, taking her charm target too; first-night last words finish before discussion. White Wolf King explodes and skips voting, leaving the Hidden Wolf to inherit the kill.
- Verified default six-player cast with five core cards, named Extra characters button, eight-option multi-select, no cast change before Confirm, count=1 for additions, and Cancel preserving selected cards.
- Verified archive chapters contain 13 / 5 / 8 cards with faction styling and continued idle motion. Reviewed desktop artwork and 390px mobile layouts. The vanished book is removed from layout so a desktop-to-phone resize cannot preserve its old off-screen bounds.
