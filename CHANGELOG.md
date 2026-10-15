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
