# Changelog

## 1.0.0 — 2026-10-15

- Added Moonfall: responsive, moonlit forest web interface with English/Traditional Chinese copy.
- Added private random role dealing, Cantonese public narration, audience view, saved games, discussion timer, full ballots, runoff, and final recap.
- Extracted deterministic rules, transactional SQLite storage, and bounded speech synthesis into separate backend modules.
- Prevented overlapping/stale audio within a tab with a cancellable playback owner and offline text fallback.
- Fixed premature victory before hunter actions and invalid multi-special-role setups, including the terminal version.
- Added rules/privacy documentation, Docker packaging, and Python/Node checks in GitHub Actions.
