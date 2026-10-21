# Game logic, usability and efficiency audit — 21 October 2026

## Result and scope

Reviewed the rules engine, room ownership, voting, API serializers, storage, chat, narration and frontend state/rendering. Ran the Python/Node suites and syntax checks. Used a separate temporary SQLite database for browser QA; existing saved games and deployment were not modified.

The existing rules suite is strong around poison precedence, simultaneous deaths, hunter chains, victory ordering, special roles and device ownership. Passing it did not establish complete privacy: synchronization metadata was outside the private-result assertions.

Baseline: **179 Python tests passed, 5 PostgreSQL tests skipped; 58 Node tests passed; syntax checks passed.** Final validation is recorded below. PostgreSQL, physical phones, poor-network behavior, production capacity and real speaker playback were not verified in this audit.

## Confirmed issues fixed

| Priority | Finding and reproduction | Change |
| --- | --- | --- |
| P1 | `rooms.turn_key()` serialized `g.inspection` into the normal `/player` polling response. After a seer inspected, unrelated approved players could read the target and alignment from this field. The result could remain there in later phases. The key also included the queued shooters. | Removed private results/future shooters from the synchronization material. Returned keys are opaque HMACs using a saved room secret, also concealing wolf-runoff metadata. Added an API-level privacy regression. |
| P2 | Revoking a member deleted their pass but retained that seat's pending wolf vote, daytime ballot and Ready flag. A later submission could count a revoked device's stale input. | Revocation clears all three pending inputs. A replacement must submit its own readiness/vote. Added a regression. |
| P2 | Chat filtered the newest 60 messages rather than taking the next 60 after the client's cursor. With retained IDs 1–120 and cursor 50, it returned 61–120, silently skipping 51–60 despite retaining them. | Catch-up reads now page forward from the cursor. First-time readers still start with the newest 60. Added a two-page catch-up regression. The existing 120-message retention cap remains. |

New rooms save their synchronization secret in the existing snapshot. Older saves use a process-local fallback: their open forms need to synchronize after a server restart. Continue using the documented single-worker configuration; migrating old rooms to persistent secrets is needed before supporting multiple application workers.

## Requested wolf voting behavior implemented

1. Every eligible living wolf submits one vote. Hidden Wolves retain their existing eligibility rule.
2. Resolve only after all eligible ballots arrive; the target with the greatest number of votes wins. An absolute majority is unnecessary.
3. A first tie starts one fresh private runoff restricted to the tied targets.
4. A second tie produces no wolf kill. This applies even when voluntary passing is disabled.
5. Abstentions are ignored when counting targets. All abstentions produce no kill when passing is allowed.
6. Players can change an unresolved ballot. Finishing a round invalidates old forms and clears that round's votes.
7. DEBUG waits for real guest ballots and cannot submit aggregate ballots over approved players. Shared-device/solo DEBUG users can choose **Record wolf ballots**; the collective target shortcut remains for an agreed result.
8. Round, tied targets and pack choices remain private. No public runoff event or extra public narration identifies the tie.
9. Changing play mode clears unfinished wolf ballots and the private runoff, then starts wolf voting again from round one.

Existing games adopt this voting behavior after the backend restarts. Stale pre-update forms need to synchronize. Daytime voting rules are unchanged.

Browser QA: six-player solo DEBUG game, two different wolf targets → private runoff showing only those targets → second tie → witch phase with no wolf target. Checked the runoff dialog at 390 × 844; its bounds were x=19…356, y=51…793, with no horizontal document overflow. Inspected console logs contained no warnings/errors. Automated room/API tests additionally exercise phone voting and guest ownership; this was not a physical multiplayer playtest.

![The witch receives no wolf target after the second tied wolf vote](audit-wolf-no-kill.jpg)

## Highest-value UI simplifications proposed

These are recommendations, not an implemented redesign. Preserve the forest artwork and private role cards; simplify the controls around them.

| Priority | Current evidence | Proposed change and acceptance check |
| --- | --- | --- |
| P1 | At 390px, the header is about 183px tall and the lower setup Start button is about 2,919px down the page. A separate hero Start button exists, above the configuration. | Use **Create room → Invite/ready lobby → Start night**. Keep presets, player count and play mode visible together; place advanced rules in a disclosure. On phones keep one primary action in a safe-area-aware bottom bar, with no competing Start buttons. |
| P1 | Every screen repeats Chinese and English, including long safety instructions and rule summaries. Speech language is separate from interface language. | Add a persistent interface-language selector. Show one primary language, with an optional bilingual mode. Reduce phase copy to one instruction; move full role explanations behind “Ability details.” |
| P1 | The chronicle and vote ledger precede the guest seating plan; the guest action is near the bottom. Longer games add more content before the action. | Place **current phase, your status, primary action, seats** first. Default the chronicle to the latest event and collapse full history/old vote rounds. Keep chat and narration as existing floating panels. |
| P2 | Setup steppers measured approximately 27 × 29px. They meet the basic 24px size threshold but are small for repeated finger taps. | Aim for 44 × 44px effective hit areas, including steppers and icon-only controls. Verify keyboard focus, 200% zoom, screen-reader names and long translated labels. WCAG 2.2's 24px AA requirement includes exceptions/spacing rules; these measurements alone do not establish full conformance. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) |
| P2 | Motion defaults on even when the system requests reduced motion; `forest.mjs` deliberately sets the default to `on`. | For a future accessibility setting, use **System / On / Off**, preserving explicit user preference. This audit leaves the existing requested default intact. Make essential actions immediate and decorative effects optional. |
| P2 | Pending submitted votes can be reopened and changed, but there is limited persistent confirmation of the player's current selection. | Show “Vote submitted: Seat 4 — change until voting ends” privately. Use a visible submitted/remaining count for daytime voting; keep wolf counts inside the wolf dialog. Distinguish connecting, waiting, submitted and disconnected states. |

## Logic and resilience improvements proposed

- **Recovery and host continuity:** host credentials currently live in session storage. Offer an explicit private recovery mechanism and a host-transfer flow. Test closing the host tab, losing the phone and restoring a game; do not expose recovery credentials in audience/invite URLs.
- **Stalled rounds:** a living role or missing voter can stall progress indefinitely. Add host-visible missing-device status and explicit pause/replacement controls. Any future timeout/auto-abstention should be an agreed house rule, never a silent override of real player ownership. Wolf disagreement now has a bounded runoff; absent ballots still require recovery.
- **Authoritative shared timer:** discussion clocks are advisory and local per tab. Store a server deadline/pause state if remote players should see the same clock. Rejoining should reconstruct the same remaining time.
- **Readable rule presets:** provide named beginner/standard/custom presets with a concise explanation of parity victory, witch self-save, protection-plus-antidote and special death effects. These are house rules, not universal Werewolf conventions. Avoid implying that a valid composition is necessarily well balanced.
- **Public-host resource limits:** game creation currently has no rate limiter or room expiry. Add per-client creation/join throttles, bounded active rooms and an explicit finished/abandoned-room retention policy before treating the public service as production-ready. Keep seat approval and capability isolation.
- **Broader regressions:** add generated state-machine scenarios asserting no dead action, no duplicate elimination, no unavailable potion use, no early winner during pending shots, and no private-result leakage across every serializer. Add end-to-end remote play tests for reconnects, simultaneous ballots, mode switches and mobile dialogs. Keep PostgreSQL checks mandatory in CI.

## Efficiency improvements proposed

| Priority | Verified implementation/evidence | Proposed work |
| --- | --- | --- |
| P1 | Security middleware sets `Cache-Control: no-store` on static assets as well as APIs. Local HTTP requests confirmed `forest-night.png` is **2,543,953 bytes**, with no content encoding and `no-store`; app.js also uses `no-store`. | Keep private/dynamic responses `no-store`. Give public assets content-hashed filenames and long-lived caching. Compress text assets at the proxy/server; generate a smaller WebP/AVIF night background with a fallback and compare visual quality. Check deploy invalidation before enabling long cache lifetimes. |
| P1 | Remote devices poll state and chat separately every three seconds. | At 16 visible devices this is about **10.7 requests/sec/room** for those two streams alone, before host speaker/room/private requests. This is an arithmetic estimate, not a load-test result. Start with lightweight version checks, delta responses, jitter and error backoff; consider authenticated SSE for server-to-client updates once measured traffic justifies it. Preserve separate game/chat cursors. |
| P1 | Both stores serialize whole snapshots on mutations. Speaker lease renewal and chat sends use the same mutation path. `/host-player` also uses a write transaction for a view. PostgreSQL opens a new connection per operation. | Add a bounded PostgreSQL connection pool. Separate chat and narrator leases from the game snapshot; avoid writing unchanged state for host-seat reads. Measure lock time and write volume before/after. SQLite's global writer lock is a particular scaling constraint. |
| P2 | Main and guest screens rebuild `app.innerHTML` when the game version changes, then rebuild scenery and rebind controls. All historical events are rendered. | Update status, seats and controls in place; append events incrementally and paginate history. Preserve focus, scroll, input drafts and private dialogs during unrelated updates. A 16-seat grid alone does not justify a framework rewrite. |
| P2 | The async audio endpoint directly performs synchronous database reads before synthesis. | Move blocking storage reads off the event loop or use an appropriate async storage interface. Keep the existing bounded synthesis, deduplication and audio cache. Measure cold/warm audio latency separately from game action latency. |

Suggested acceptance targets: good INP at or below **200ms** at the 75th percentile, no stale/double action under concurrent voting, stable focus/scroll during updates, and no asset redownload on a warm reload. [web.dev INP guidance](https://web.dev/articles/optimize-inp/)

Measure action p50/p95, snapshot bytes, request rate, database lock wait, connection count and phone battery/animation behavior for 1, 10 and 50 concurrent rooms. These room counts are test scenarios, not claimed supported capacities. Do not choose a hosting upgrade from the local tests alone.

## Recommended delivery order

1. Land the wolf voting and confirmed privacy/revocation/chat fixes with regression coverage.
2. Simplify mobile setup and keep the current action visible; add an interface-language preference.
3. Cache/resize public assets and reduce database connection/write overhead.
4. Add recovery, synchronized timers and explicit stalled-round handling.
5. Run measured concurrent-room and real-phone playtests, then decide whether SSE or further infrastructure is worthwhile.

## Final validation

- `python -m pytest -q`: **193 passed, 5 skipped**, in 9.86s. The skipped cases need `TEST_DATABASE_URL`. One existing Starlette/httpx deprecation warning remains.
- `npm run check`: passed. `npm test`: **59 passed**.
- `git diff --check`: passed.
- Temporary browser viewport overrides were reset. No production database, hosting settings or deployment was changed.

## Follow-up implementation

The subsequent release keeps setup modes beside the cast and a reachable mobile create button, places the guest seating plan before a collapsed chronicle, increases cast stepper targets, and shows pending daytime ballots only to their owner. Hosts can copy a private recovery code and restore from the homepage after losing their browser session; this code grants host access and does not revoke the original browser. Visible host/player state polls now use jitter and back off after network errors. Public artwork has a short cache, code is revalidated, text responses use gzip, and the audio endpoint moves blocking database reads off the async event loop. PostgreSQL now uses a bounded connection pool.

Still open: an interface-language preference, exclusive host transfer, a server-authoritative discussion timer, room retention and rate limits, smaller night artwork, incremental DOM rendering and measured multi-room load tests. The recovery code is a manual safeguard, not automatic host migration.
