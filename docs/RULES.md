# Rules and edge-case review

The web engine uses explicit house rules; Hong Kong tables may use different conventions. Agree on these before dealing.

| Situation | Web behavior |
| --- | --- |
| Setup | 5–16 players; at least one wolf; more good than wolves; at most one seer, witch, hunter. Strict integer counts/targets. |
| Wolves | One collective living target, including a wolf. 空刀 allowed. |
| Witch | One antidote and one poison per game, at most one per night. Self-save defaults off; acting when killed that night defaults on. Both configurable. |
| No wolf kill | Antidote cannot be spent; poison remains available. |
| Poison on wolf target | Allowed. Poison takes precedence, disabling hunter fire. Death recorded once. |
| Seer | One other living seat per night; wolf/good alignment only. No repeat inspection or bypassing acknowledgement. |
| Night deaths | Resolve together at dawn. Private target lists use night-start living seats, including tonight's victims. |
| Missing/dead role | Same public phase and neutral prompt; host acknowledges privately. No announcement of absence. |
| Hunter | May shoot after wolf/vote/shot death; poison disables it. May decline. Winner checks wait for the shot. |
| Ballots | One per living voter. No self-vote or dead target/voter. Abstain allowed. Most votes eliminates; no absolute-majority requirement. |
| Ties | One runoff among tied leaders; all living players vote. Another tie or all abstentions → no elimination. |
| Victory | After deaths/hunter: no wolves → village; wolves ≥ good → wolves by default. Parity off requires eliminating all good. |
| Both factions gone | Draw, evaluated before either side's victory. |
| Stale/duplicate request | HTTP 409, no mutation; browser synchronizes. |
| Finished game | No further actions. Cast and exact death causes become public. |

## Findings in the terminal application

`day_phase` checked victory before hunter actions. A kill could reach parity and end the game before the hunter shot the last wolf. Both interfaces now resolve the hunter first. Terminal setup allowed multiple witches/seers despite processing only the first, and accepted a starting wolf majority. Both configurations are now rejected.

The terminal version retains physical role-card registration, pygame, and a moderator-entered elimination seat. The web version uses random dealing and recorded ballots; its engine does not import the interactive script.

## Scope and privacy

This is an in-person trusted-host tool. Remote accounts, secret phone ballots, sheriff, guard, lovers, last words, role stealing, and 屠邊 rules are not implemented. Repeated peaceful nights can continue indefinitely; there is no arbitrary automatic draw. Composition/rules cannot change after dealing.

Host credentials can access the active role's private screen. Concealment is a shared-device courtesy, not protection against a malicious host or developer tools. Share only the audience view. Its API excludes roles, exact death causes, wolf targets, inspections, and potion inventory during play. Only roles and causes are added at recap. Players must still avoid leaking information through timing or behavior.
