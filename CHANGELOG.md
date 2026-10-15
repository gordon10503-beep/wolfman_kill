# Changelog

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
