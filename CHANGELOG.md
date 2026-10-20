# Version 1.8.7 — 2026-10-20

- Let explicit Motion on override the archive’s system reduced-motion CSS, including environments where Remote Desktop requests reduced animation.
- Add a Motion toggle inside the archive; retain the static view when disabled. Start each archive visit at the top and preserve the book’s measured position during its opening animation.

# Version 1.8.6 — 2026-10-20

- Add crater patterns, surface shading and soft rim light to the crescent icon and forest moon, retaining lightweight SVG artwork.
- Unify header controls at 44px high with matching corners, padding and alignment. Motion, DEBUG and Voice share equal widths; help, archive and speaker buttons share a 44px square.
- Allow the header to wrap cleanly, with equal-width toggles on mobile and room actions retaining the same control height.

# Version 1.8.5 — 2026-10-20

- Include witch self-saving, witch action when attacked, parity victory and discussion duration in the collapsed bilingual rules summary. Numeric edits update immediately.
- Add a gold Start game button at the hero’s bottom-right, using the same selected roles/rules and submission guard as the existing start button. Narrow screens place it after the hero copy without overlap.

# Version 1.8.4 — 2026-10-20

- Collapse homepage house rules into a clickable bilingual summary with an expansion chevron; keep Start game accessible while closed and preserve selections across cast/preset changes.
- Replace overlapping device toggles with one mutually exclusive choice: Shared device, In-person phones, or Remote play (default).
- Move narrator text and controls into a floating-button glass panel for hosts and remote players, preserving language, voice, replay and fallback controls.

# Version 1.8.3 — 2026-10-20

- Put host room status and invite/approval controls above the Village chronicle heading.
- Focus the role card when opening private identity dialogs so long role tips cannot scroll the entrance offscreen.
- Add continuous gentle role-card idle movement after the entrance and make halo rotation more visible. Keep ground geometry stationary.
- Reflect system reduced-motion preferences accurately in the Motion button; explicitly selecting Motion on enables character animation, while Motion off still stops it.

# Version 1.8.2 — 2026-10-20

- Default new games to remote mode in setup and the creation API; existing rooms retain their mode.
- Add a speaker button beside Volume for immediate mute/unmute without disabling narration. Preserve the chosen volume and tab mute preference, with bilingual accessible labels and distinct speaker/muted icons.

# Version 1.8.1 — 2026-10-20

- Replace inline chat with a floating bilingual chat-bubble button and a translucent glass panel: side panel on desktop, nearly full-screen sheet on phones.
- Preserve chat drafts and the open panel across game updates; support Escape, backdrop closing, focus restoration, safe areas and mobile visual viewport changes. Channel permissions remain server-enforced.

# Version 1.8.0 — 2026-10-20

- Add switchable remote play with approved-player narration, per-device mute/volume/language and public text discussion. Living wolves have a backend-protected private channel only during their action phase; eliminated players retain reading and designated last words.
- Preserve completed voter-by-voter results and runoff history, while keeping pending ballots private. Split identity viewing from phase-specific actions and move the chronicle above the seats.
- Replace Help with a bilingual solo DEBUG walkthrough when DEBUG is enabled, including button purposes and real-player ownership rules.
- Stop interrupted morning instructions or later hunter turns from repeating an earlier peaceful-night report. Tie new reports to their original morning cue and track playback start rather than waiting for the entire clip to end.
- Use a host-only cover-status route for inactive-turn timers so player-owned active powers do not cause repeated ownership errors. Text chat uses separate cursors and bounded histories without changing game versions.

# Version 1.7.4 — 2026-10-19

- Restrict multi-device DEBUG to unclaimed seats and the host's own seat. Approved guests retain readiness, private powers, pack choices and ballots; hybrid simulations wait for real players. Approval clears prior simulated inputs for that seat.
- Reveal hunter identity publicly when called to shoot, retain it afterward, and announce the actual winning team or draw with separate cached result clips.
- Add a public character archive beside Help: a magic book opens and cards fly into a responsive animated gallery. The current desktop layout shows three cards above two, with motion preferences respected.
- Add matching 1080 × 1920 and 1080 × 1440 invitation PNGs/editable SVGs, with a central QR pointing to the public Render site and optional reproduction tools.

# Version 1.7.3 — 2026-10-19

- Separate the fixed ground flourish from rotating halos on role cards and homepage symbols.
- Add crimson glowing wolf blinks, seer eye blinks, hunter arrow draw/release and independently shaking witch bottles in both views.
- Hydrate actual SVG parts from the shared sprite so animations target individual features; preserve Motion off and reduced motion.
- Narrate published night casualties or a peaceful night before the next morning instruction in Cantonese/English. Read each report once, include it on explicit replay, and cache the combined clip without revealing roles or causes.

# Version 1.7.2 — 2026-10-19

- Homepage role symbols have subtle individual idle motion. Player rooms now share animated scenery, a bilingual village table and chronicle; join/approval screens also show the forest. Night overlays retain the painted forest and wolf silhouettes.
- Role cards preload one shared inline SVG sprite. Emblems rise into place, followed by fading halos and a slow orbit on all five roles. Motion-off/reduced-motion preferences show static cards.

# Version 1.7.1 — 2026-10-19

- New games default to multi-device rooms in the UI and API; existing games keep their mode.
- Main-device DEBUG can simulate all roles and voting with no joined players, while retaining normal game-rule and host-pass checks.
- Host automatically occupies seat 1 and plays privately from the main screen, without joining or an extra tab. Guest seats are allocated atomically in join order; pending requests reserve seats.
- Setup copy now describes one narrator device and private player phones, with shared-device play available.

# Version 1.7.0 — 2026-10-19

- Switch between shared-device play and private multi-device rooms without restarting. Host-approved seat requests, revocable player passes and reconnect support.
- Seat-scoped role reveal, witch/seer/hunter actions, wolf consensus and simultaneous private ballots. Only the main host device narrates, protected by a renewable narrator lease.
- Detailed vector character cards: blue/gold for good roles and crimson/gold for wolves. Bilingual room guide and mobile controls.
- Isolated room records and atomic writes for SQLite/PostgreSQL; no new hosting provider or account is required.

# Changelog

## 1.6.2 — 2026-10-15

- Unified Motion/DEBUG/Voice highlights and on/off wording; active buttons alone use the gold highlight. Host actions follow LOCAL TABLE in the header.
- Moved speech language to the top of house rules, aligned supporting text left, and enabled last words by default for new games. Existing saved rules remain unchanged.
- Slowed the wolf crossing to 1.8 seconds and sun/moon transitions to 2 seconds, keeping page swaps and cleanup synchronized.

## 1.6.1 — 2026-10-15

- Added a bilingual one-potion/no-nightly-limit witch house rule. Both potions may be used together when allowed, including separate effects; each remains single-use per game. Legacy games retain one potion per night.
- Published Moonfall on Render Free with Neon PostgreSQL saves and verified live Cantonese/English narration.

## 1.6.0 — 2026-10-15

- Added optional bilingual last-words turns: first-night casualties and voted-out players speak after hunter chains and before victory/next phase.
- Skipped fun-mode witch/seer phases only when the role was absent from the original cast; dead holders retain cover turns.
- Put counted-vote controls directly on the voting screen while preserving optional individual ballots.
- Added PostgreSQL snapshot storage for cloud deployments, a Render Free configuration, and a Neon deployment guide.
- Added installable web-app metadata, icons, online-only service worker, mobile touch targets and safe-area spacing. No private game responses are cached.

## 1.5.0 — 2026-10-15

- Added sun/moon transitions, an animated daytime forest, private role action/card-flip effects, and a wolf crossfade without a moving rectangle.
- Added a bilingual homepage guide and shared keep-clicking privacy reminders; inactive witch/seer turns auto-pass after 10 seconds of inactivity without skipping living roles or hunter shots.
- Kept individual ballots and added counted results, including tied leaders and no-elimination outcomes.
- Added fun mode with multiple special roles, independent witch potions and seer turns, and complete hunter chains before victory. Seers report Bad side / Good side.
- Replayed cached narration for every new hunter in a chain; capped non-wolf fun-mode role controls at 15.
- Recap cards identify the firing hunter by seat in Chinese and English, including older games with chronicle records.
- Enabled witch self-save and host narration by default; audience narration remains off by default. Header controls are bilingual.

## 1.4.0 — 2026-10-15

- Cantonese defaults to the original female voice; English defaults to the male voice. Manual overrides are remembered separately per language.

- Added 「允許狼人空刀」 to setup, enabled by default. Disabling it requires wolves to pick a living target in both the UI and backend; older games retain their existing behavior.
- Added Cantonese/English speech selection in setup and during play, with translated narration, matching female/male neural voices, and separate replay caches. The selection persists in the tab.
- Extended the audio preparation CLI with `--language en` and language-appropriate local fallback.

## 1.3.0 — 2026-10-15

- Upgraded edge-tts to 7.3.1, resolving the reproduced provider 403 and restoring the original HiuMaan neural voice.
- Added browser blob caching, in-flight download sharing, future-cue prefetch, and replay without further HTTP requests.
- Added persistent server MP3 caching, startup warmup, concurrent synthesis deduplication, bounded provider concurrency, and outage backoff. Added a CLI to prepare either voice pack before a game.
- Added a Cantonese male voice option. Kept the original female voice/rate as default; made robotic local fallback opt-in with explicit source labels.

## 1.2.1 — 2026-10-15

- Added a host DEBUG button to skip all remaining role reveals and enter the first night, preserving the assigned identities. Available only during role reveal; audience credentials cannot invoke it.

## 1.2.0 — 2026-10-15

- Replaced the red screen wash with a natural moonlit forest, shadowed wolves, mist, and restrained blood marks; panels return to charcoal/forest tones.
- Added an autoreloading local launcher and running-version health metadata. DEBUG now explains an outdated backend and offers retry instead of a bare “Not Found”.
- Renamed the event log to “Day & night chronicle · 日夜紀錄”.
- Allowed self-voting in both normal voting and runoffs; updated UI, rules, and tests.

## 1.1.0 — 2026-10-15

- Shortened the private-screen back button to 「返回」.
- Added bright morning and subtle blood-red night themes driven by the current game phase, including audience views.
- Added a persistent host DEBUG toggle with all identities, potion/night-action diagnostics, and a discussion skip. Debug data uses a separate host-only endpoint.

## 1.0.0 — 2026-10-15

- Added Moonfall: responsive, moonlit forest web interface with English/Traditional Chinese copy.
- Added private random role dealing, Cantonese public narration, audience view, saved games, discussion timer, full ballots, runoff, and final recap.
- Extracted deterministic rules, transactional SQLite storage, and bounded speech synthesis into separate backend modules.
- Prevented overlapping/stale audio within a tab with a cancellable playback owner and offline text fallback.
- Fixed premature victory before hunter actions and invalid multi-special-role setups, including the terminal version.
- Added rules/privacy documentation, Docker packaging, and Python/Node checks in GitHub Actions.

- Added a private spectator/eliminated-player chat on the audience and player pages, with read-only access to public village discussion and server-enforced separation from living players.
