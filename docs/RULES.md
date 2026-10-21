# Rules and edge-case review

The web engine uses explicit house rules; Hong Kong tables may use different conventions. Agree on these before dealing.

| Situation | Web behavior |
| --- | --- |
| Setup | 5–16 players; at least one wolf; more good than wolves; at most one seer, witch, hunter in standard mode; fun mode allows multiples. Strict integer counts/targets. |
| Wolves | One collective living target, including a wolf. 空刀 is allowed by default; disable **允許狼人空刀** before dealing to require a target. Existing games without this setting retain the previous allowed behavior. |
| Witch | One antidote and one poison per witch per game, one per witch per night by default. The no-nightly-limit rule allows both together, but does not refill either potion. Self-save defaults on; acting when killed that night defaults on. Both configurable. |
| Multiple witches | Each has independent potions. All see the original wolf target; an earlier save does not reveal itself. The act-when-attacked rule uses that original target. Duplicate poison targets consume both potions but produce one death. |
| No wolf kill | Antidote cannot be spent; poison remains available. |
| Poison on wolf target | Allowed. Poison takes precedence, disabling hunter fire. Death recorded once. |
| Seer | One other living seat per night; bad-side/good-side alignment only; each seer acts separately. No repeat inspection or bypassing acknowledgement. |
| Night deaths | Resolve together at dawn. Private target lists use night-start living seats, including tonight's victims. |
| Missing/dead role | Fun mode skips witch/seer roles absent from the original cast. Eliminated holders still get cover turns; private cover clicks have no power. Host auto-passes inactive witch/seer turns after 10 seconds of inactivity. No public absence flag or pass event. |
| Hunter | May shoot after wolf/vote/shot death; poison disables it. May decline. Winner checks wait for every queued shot, including multi-hunter chains. |
| Last words (optional, on by default for new games) | First-night casualties, including poison and night hunter chains, and all voted-out players receive turns. Daytime hunter-shot victims and night deaths from night two onward do not. Resolve hunters, then queued last words, then victory/next phase. No automatic timeout. Older games retain their flow. Based on the [published rules](https://www.langrensha.net/strategy/2022111002.html). |
| Ballots | One per living voter. Self-votes and abstentions allowed; no dead target/voter. Most votes eliminates; no absolute-majority requirement. |
| Counted result | Host may enter the highest-vote seat(s) directly. One eliminates, multiple trigger the same runoff rules, none eliminates nobody. Individual ballots remain available. |
| Ties | One runoff among tied leaders; all living players vote. Another tie or all abstentions → no elimination. |
| Victory | After deaths/hunter: no wolves → village; wolves ≥ good → wolves by default. Parity off requires eliminating all good. |
| Both factions gone | Draw, evaluated before either side's victory. |
| Stale/duplicate request | HTTP 409, no mutation; browser synchronizes. |
| Finished game | No further actions. Cast and exact death causes become public. |

## Findings in the terminal application

`day_phase` checked victory before hunter actions. A kill could reach parity and end the game before the hunter shot the last wolf. Both interfaces now resolve the hunter first. Terminal setup allowed multiple witches/seers despite processing only the first, and accepted a starting wolf majority. Starting wolf majorities are rejected. The web standard mode rejects duplicate special roles; its fun mode explicitly processes every witch/seer instead of using only the first.

The terminal version retains physical role-card registration, pygame, and a moderator-entered elimination seat. The web version uses random dealing and recorded ballots; its engine does not import the interactive script. Fun-mode witches receive the same original wolf target and resolve potions simultaneously at dawn; poison wins over a save.

## Scope and privacy

This is an in-person trusted-host tool. Accounts, sheriff, lovers, role stealing, and 屠邊 rules are not implemented. Seat-scoped phone ballots, remote rooms, guardians, knights, gravediggers, Idiots and wolf variants are supported; see README for current role rules. Repeated peaceful nights can continue indefinitely; there is no arbitrary automatic draw. Composition/rules cannot change after dealing.

Host credentials can access the active role's private screen. Concealment is a shared-device courtesy, not protection against a malicious host or developer tools. Share only the audience view. Its API excludes roles, exact death causes, wolf targets, inspections, and potion inventory during play. Only roles and causes are added at recap. Players must still avoid leaking information through timing or behavior.


## Multi-device rooms (1.7)

The same game rules apply in both modes. Each phone receives one host-approved seat pass. Reveal readiness is simultaneous. All eligible living wolves submit private ballots. The highest-vote target wins; tied leaders get one fresh runoff restricted to those targets. A second tie means no kill, including when voluntary passing is disabled. Abstentions do not count as targets. Hidden Wolves join only after other wolf roles die. The round, tied targets and pack choices stay private to the pack. Shared-device and solo DEBUG hosts may use Record wolf ballots; a collective target remains available for results agreed in person. Switching play mode discards unfinished wolf ballots and any pending wolf runoff. Daytime ballots remain secret until every living seat submits, then resolve using the normal tally/runoff rules. Players may change unresolved votes; a final submission locks the result by advancing the turn. Only the current witch, seer or queued hunter may act. Dead holders retain cover turns, with the existing main-device inactive timer. Public phase control and narration remain with the main device.

Switching mode retains game state but clears unresolved phone ballots and wolf choices. An approved player's own role remains private; other roles are revealed only at game end. The trusted host retains DEBUG. Revoke an old phone before approving a replacement for its seat. Multiple rooms never share passes, roles, action queues or narrator leases.


Version 1.7.1 defaults to multi-device play. The host is automatically approved at seat 1 and acts privately on the main screen. Guest seats are allocated in join order; pending requests reserve seats. A rejected/revoked guest frees that seat. Host DEBUG may simulate every role and ballot without guest devices, subject to normal game rules.
