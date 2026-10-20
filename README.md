# Moonfall · 狼人殺

**When the moon rises, trust no one. 天黑請閉眼，故事即將開始。**

A full-stack, Bilingual-friendly companion for in-person and remote Werewolf. A mysterious moonlit interface replaces terminal prompts, while a Python backend handles rules, private actions, saved games, and narration. The original terminal interface remains available.

**[▶ Play online · 免下載直接玩](https://moonfall-wolfman.onrender.com/)**

Open the link on your phone or computer—no download, Python, or setup required. 在手機或電腦開啟連結即可遊玩，無需下載或安裝。The free host may take about a minute to wake after inactivity. 免費伺服器閒置後，首次開啟可能需等約一分鐘。

Choose your house rules **before starting a new game**. To use both witch potions in one night, turn off **女巫每晚限用一瓶藥 / Limit witch to one potion per night**. Each potion is still single-use per game. Existing games keep their original settings. 如要同晚使用雙藥，請在新局開局前關閉「女巫每晚限用一瓶藥」；每種藥全局仍限一次，舊局設定不變。

![Moonfall interface](docs/preview.png)

Room invitations now include a scannable QR beside the share link in **Room / devices**. Renew invite replaces both. QR generation stays on your backend, and joining still requires host approval.

## Remote play, chat and DEBUG walkthrough

Tap the floating **旁白 / Narrator** button to open narration text, language, voice and replay settings in a glass panel.

Tap the **speaker icon beside Volume** to mute/unmute without disabling narration; it preserves your chosen volume and mute setting for the tab. Moving the slider unmutes playback.

Tap the floating **聊天 / Chat** bubble to open discussion. A translucent side panel appears on desktop; phones get a nearly full-screen sheet that follows the available keyboard height. Close with ×, Escape or the backdrop. Chat takes no space in the game layout, and unsent drafts survive closing or game updates.

New games default to **遠端遊戲 / Remote play**. Open **Tonight’s house rules** and choose one **Play mode**: Shared device, In-person phones, or Remote play. The collapsed summary reflects your choices; Start game stays visible. You can also switch through **Room / devices** during a game. Single-device and in-person phone modes remain available. Remote narration is public only: it never reads role cards, inspections or chat messages. Browsers may require **Replay narration** once before allowing sound.

- **Village chat:** approved players can read it. Living players speak during daytime discussion/voting; designated last-words speakers may speak even after elimination. Lobby and postgame chat are open to approved players. Public sending is closed during night actions.
- **Private wolf chat:** only living wolves can read/send during the wolves' action phase. The channel disappears when that phase ends. Other roles, audience links, unapproved/revoked passes and other rooms cannot read it. Wolf kill votes remain private and require unanimous agreement, with current pack choices shown in the wolf action screen.
- **Vote results:** after all ballots finish, everyone can see each voter, target or abstention, including runoff history. Pending votes remain private. A manually counted result cannot invent individual ballots.
- **Controls:** View my role is separate from the current action. The lower action button says Vote, Investigate, Choose potions, etc., and appears only when that seat can act. The chronicle and vote ledger sit above the seating plan.
- **DEBUG help:** turn DEBUG on, then press **?** for a bilingual solo walkthrough explaining each button and its purpose. Turn DEBUG off for the normal game guide. Real player ownership remains protected.

Chat uses bounded per-channel histories in the existing game database, with incremental polling independent of game versions. Sending a message cannot invalidate an open action form or retrigger narration. Chat is text-only for now; live voice discussion remains a future addition.

## Character archive and invitations

Open the **book icon beside ?** on the homepage, then tap the magic book to release all the animated character cards. The desktop gallery shows three cards above two; phone layouts adapt to two columns. It is a public art collection, independent of any game's secret assignments. Motion off and reduced motion show the collection without the opening effects.

Share these ready-to-post invitation cards; the central QR opens the public website:

- [9:16 invitation · 1080 × 1920 PNG](frontend/assets/invitations/moonfall-invite-9x16.png)
- [3:4 invitation · 1080 × 1440 PNG](frontend/assets/invitations/moonfall-invite-3x4.png)

Editable SVGs live alongside the PNGs. Optional regeneration: install `tools/requirements-artwork.txt`, run `python tools/generate_invitations.py`, then `node tools/render_invitations.cjs` with `sharp` installed or available through `NODE_PATH`. These artwork dependencies are separate from the game server.

## One device or a room of phones

**Multi-device room is the default.** Turn off **各用手機 / Multi-device room** for shared-device play, or open **房間／切換裝置 / Room / devices** in a running game.

1. The host shares the room invite. Each player opens it and enters a name. Seats are assigned in join order, starting after the host at seat 1; pending requests reserve their seats.
2. The host automatically occupies seat 1 and plays directly on the main device using **我的身份／行動 / My role / action**. No joining, self-approval, extra device or player tab is needed. The host counts toward the configured player total.
3. The host verifies each name and approves the assigned seat. Approval is required before guests can reveal roles; the host is automatically approved. There is one device per seat.
3. Everyone privately opens their illustrated role card and taps **Ready**. The first night starts after all seats are ready.
5. Players act on their own phones. Living wolves must agree on one target (or all pass, if allowed). Witches and seers act in seat order, with independent potions; only the acting seat receives its private information. Hunters decide on their own phones.
6. Living players submit a vote or abstention. Self-votes are allowed. Votes stay private and resolve automatically after everyone submits; a tie uses the existing one-runoff rule. Choices may change until the final ballot arrives.
7. The main device controls dawn, discussion and last words. In-person rooms use one narrator; Remote play gives each approved player public narration with independent mute, volume and language controls. A renewable per-game narrator lease prevents two host tabs from simultaneously starting narration; another host can take over after the old lease expires (up to 20 seconds).

**Switch modes without restarting:** roles, used potions, pending seer results and game progress are retained. Unresolved phone ballots and wolf choices are cleared when switching. If a phone disconnects, reopen the same browser; its player pass is saved locally. For a replacement phone, revoke the old seat device and approve the new request. If a player cannot reconnect, switch to single-device mode to continue. Keep the host tab and its pass private; the host is trusted and can still use DEBUG.

**DEBUG with real players:** approved guests keep control of their own roles, readiness and votes. The host can simulate unclaimed seats and their own seat. Hybrid wolf choices still require the real wolves' agreement, and hybrid ballots wait for the real players. A counted-result shortcut cannot override those ballots. Ownership persists through disconnections until the host revokes the seat or switches to shared-device play. Two host browsers share the same host permissions; version checks accept only one action against a given snapshot, and only the narrator-lease owner speaks.

Once a hunter is publicly called to shoot, their seat label shows **獵人 / Hunter** for the rest of the game. Other identities and death causes remain private until the recap. Endgame narration announces the actual good-side win, wolf win or draw in the chosen language.

**Separate groups can play simultaneously, both before and after this update.** Each game has an independent random ID, passes, state snapshot and lock. A group's player pass cannot access another group's game. Room polling runs every three seconds on visible devices. Capacity depends on the hosting plan; this has not been load-tested to a guaranteed number of rooms. PostgreSQL supports independent row locks; local SQLite serializes brief writes. On a single Render instance either works. SQLite on Render's temporary disk still loses games after disk reset/redeploy; multiple phones do not change that storage limitation.

No Supabase account is required. The existing backend supports both modes with SQLite locally or PostgreSQL when `DATABASE_URL` is set. Rooms support playing together in person or remotely with text discussion. Live voice chat is not included yet.

角色卡：好人採用金色及藍色；狼人採用暗紅及金色。使用輕量向量繪圖，在手機也保持清晰。 Role cards use gold and blue for the good side, crimson and gold for wolves, with lightweight vector illustrations.

<img src="docs/role-card-preview.png" alt="Crimson and gold wolf role card" width="300">

## Run locally (optional)

Python **3.13 or 3.14** recommended. No frontend build or npm install is needed.

```bash
git clone git@github.com:gordon10503-beep/wolfman_kill.git
cd wolfman_kill
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python run.py
```

macOS / Linux:

```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python run.py
```

The local launcher automatically reloads Python changes. After updating an older running server, stop it once with `Ctrl+C` and use `python run.py`; refreshing the browser alone cannot update an already-loaded backend. `/api/health` reports the running version.

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)**. Stop with `Ctrl+C`.

## Play a night

1. Choose a 6-, 9-, or 12-player preset, or adjust the cast for 5–16 players. Agree on house rules.
2. Pass the device around. Each player explicitly reveals their random identity, then hides it.
3. Narration starts **on** in the host tab. Keep only one device speaking. Public Cantonese prompts guide the night; secrets stay silent.
4. Wolves, witch, and seer use private handoff screens. Deaths remain hidden until dawn.
5. Discuss with the pauseable timer, then record every living player's ballot. Ties trigger one runoff.
6. Resolve the hunter's shot before calculating victory. At the end, reveal the cast and death causes.

Use **觀眾畫面** for a read-only public table in another window. The host browser is trusted and can access private information; never project it to spectators. Private dialogs clear when the tab hides. Night interaction timing still depends on players.

Every action saves to the configured database (SQLite locally, or PostgreSQL when configured). Reloading the same tab resumes the game; the home page offers a resume button for its existing session. **Keep the host tab open:** credentials live in session storage; closing/clearing it can lose host access. There is no account recovery.

The table follows the game clock: wolves/witch/seer phases use a moonlit forest with mist, wolf silhouettes, and small blood traces; dawn, hunter resolution, discussion, voting, and recap switch to a bright morning palette. Setup retains the original moonlit style.

| Morning | Night |
| --- | --- |
| ![Bright morning table](docs/day-preview.png) | ![Moonlit night table](docs/night-preview.png) |

For testing, toggle **DEBUG on** in the host header. It shows all seat identities, potion inventory, and pending night actions in a host-only panel. During role reveal, **跳過身份交接（DEBUG）** skips unclaimed seats and waits for approved guests to confirm their roles before starting the first night without changing the assigned identities. During discussion it replaces the timer with **跳過討論（DEBUG）**, which goes straight to voting. The toggle is saved in the tab session and can be turned off at any time. Audience links never receive debug information. Turn debug off before handing the host device to players.

In **今晚的約定**, **允許狼人空刀** controls whether wolves may choose no target (on by default). Turn it off before starting a new game to require a living target every night; the server enforces this too. Existing games keep the earlier allow-abstain behavior.

Choose **語音語言 → 廣東話 / English** during setup or in the game's narrator card. English defaults to the male Guy voice; Cantonese defaults to the original female HiuMaan voice. Both languages offer a manual female/male selector and remember overrides separately per language. English uses translated public prompts. The language preference is saved per tab and can change during a game without changing roles or rules. Chinese labels have English subtext across setup rules and instructions, private role screens, voting, timers, debug details, public events, errors, and the endgame seat recap. Private translations stay inside the private dialog; unrevealed roles and death causes stay hidden until the recap; publicly called hunters retain their revealed identity.

For solo testing, enable **DEBUG** on the main device. No player joins are needed: skip role reveals, act for the wolves/each witch/each seer/hunters, skip discussion and enter counted votes or individual ballots. The room stays in multi-device mode. Turn DEBUG off to return to normal player-device actions. The host override remains host-only and still follows all role, target, potion and phase rules.

## What changed

| Area | Implementation |
| --- | --- |
| Frontend | Responsive HTML/CSS/ES modules, moonlit forest artwork, SVG icons, dark teal and antique gold, English/Traditional Chinese copy |
| Backend | FastAPI, pure game state machine, strict validation, SQLite transactions, optimistic version checks |
| Privacy | Separate host/viewer capabilities, server-side public/private views, no private TTS, no-store responses |
| Audio | One cancellable playback owner, stale-response guards, timeouts/retry/cache, Cantonese system-voice fallback, captions |
| Rules | Simultaneous dawn deaths, poison precedence, potion limits, validated ballots/runoff, hunter-before-victory ordering |
| Engineering | Python/Node tests, GitHub Actions, Docker, architecture and rules documentation |

The original script could declare victory before a dying hunter acted and accepted duplicate special roles it could not process. Both are fixed in the terminal version too. See [the rules review](docs/RULES.md).

## Audio reliability

The default is **the same Microsoft neural voice as the original terminal script**: `zh-HK-HiuMaanNeural`, original rate `+0%`. The library is now `edge-tts==7.3.1`; the earlier 7.2.8 installation returned 403 in our live check and fell back to a less natural local browser voice. Upgrading restored real neural MP3 output.

The **聲線** dropdown also offers `zh-HK-WanLungNeural` at `-5%` rate for a slower male delivery. These are voice choices, not guaranteed acting/emotion styles. Edge TTS supports voice/rate/pitch adjustments, but not arbitrary expressive SSML ([library documentation](https://github.com/rany2/edge-tts)). Microsoft lists both Cantonese neural voices in [its language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts).

- **Replay:** reuses an in-memory browser audio blob, without another download or synthesis. Rapid clicks share one pending load; only the latest requested playback starts.
- **Morning results:** after the host publishes dawn results, narration announces eliminated seat numbers or a peaceful night before the next instruction. Each report belongs to the first morning cue and is marked as announced when playback starts. Interrupting an instruction or taking a later hunter shot does not repeat it; Replay includes it only while replaying that same morning cue. Cantonese and English are supported, without reading roles or death causes.
- **Upcoming phases:** prefetch their fixed public prompts while the current clip is ready.
- **Server cache:** atomic MP3 files in `data/audio-cache/` survive reloads/restarts; memory hits bypass generation. The server warms all original-voice prompts in the background at startup. A cold install still needs internet/time to generate clips once.
- **Outages:** synthesis is bounded to 12 seconds, repeated failures back off for 30 seconds, and cached clips remain usable. The server generates at most two clips concurrently and deduplicates identical requests.
- **Voice quality:** local browser fallback is **off by default**, so the original voice cannot silently become a robotic system voice. Enable **允許本機備用語音（較機械）** if you prefer that fallback to captions during an outage. Status text identifies the actual source.

Prime a full language/voice pack before a game (using your virtual environment's Python):

```bash
python -m backend.prepare_audio
python -m backend.prepare_audio --voice narrator
python -m backend.prepare_audio --language en
python -m backend.prepare_audio --language en --voice narrator
```

Set `WOLFMAN_AUDIO_CACHE` to choose another cache directory. Only public instructions and already-published morning casualty seat numbers are cached/sent to the provider; no identities, pending targets, causes of death or inspections are voiced. Cached packs work without the speech provider; uncached clips require internet. Audio defaults on for the host and off for audience views; explicit mute choices are saved per tab. **In-person play:** keep one narrator device. **Remote play:** each approved player may narrate and adjust their own volume; audience pages stay silent. A browser may require a click on Replay before allowing its first audio.

## Tests and development

Using your virtual environment's Python, install development requirements and run:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
npm run check
npm test
```

Node **22+** is needed only for JS checks/tests. Tests cover rules, privacy, replay protection, concurrent writes, restart persistence, synthesis failures/caching, and audio cancellation races without real TTS requests. A real speaker/headphone check is still useful before a game.

For autoreload, run `python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000`. Refresh after frontend changes. Raw API schema: `/openapi.json`.

## Docker

```bash
docker build -t moonfall .
docker run --rm -p 127.0.0.1:8000:8000 -v moonfall-data:/app/data moonfall
```

The named volume preserves games; the image runs as a non-root user. A local Docker installation is required.

## Project map

```text
backend/
  app.py        API, authentication, static serving
  engine.py     deterministic rules and public/private views
  store.py      transactional SQLite snapshots
  speech.py     bounded Cantonese synthesis
frontend/
  index.html    application shell
  style.css     responsive moonlit design
  app.js        table, handoffs, ballots, timer, audience mode
  audio.mjs     single cancellable audio owner
  forest.mjs    animated scenery and motion control
  transitions.mjs wolf and sun/moon transitions
  role-effects.mjs private reminders and target effects
  night-cover.mjs host-only inactive-turn timer
  assets/       SVG artwork and generated night forest
tests/          rules, API, speech, and audio tests
docs/           architecture, rules review, terminal guide
wolfman_kill.py original terminal application
```

See [Architecture](docs/ARCHITECTURE.md), [Rules and edge cases](docs/RULES.md), and [Changelog](CHANGELOG.md).

Current checks and their limits are recorded in [Validation](docs/VALIDATION.md).

## Storage and hosting

For a public link and an installable phone/desktop web app, follow [Free cloud deployment](docs/DEPLOYMENT.md). Render serves the website/backend; optional Neon/PostgreSQL storage through `DATABASE_URL` preserves cloud games. Local runs retain SQLite.

Set `WOLFMAN_DB` to change `data/games.sqlite3`. The database contains plaintext roles and is excluded from Git/Docker build contexts. Protect host files and backups. Use one server worker; speech locks/caches are per process.

This release serves a trusted, in-person table. Pushing to GitHub does not deploy a live website. Public hosting needs HTTPS, access controls, rate limits, and a configured reverse proxy. The documented server binds to loopback. Audience links use the same origin; another device requires a reachable, securely hosted server. Discussion timers are independent and advisory; only the host advances the game.

## Terminal version

```bash
python -m pip install edge-tts pygame
python wolfman_kill.py
python wolfman_kill.py --mute
python wolfman_kill.py --debug --skip-confirm
```

The terminal version uses physical role-card registration and moderator-entered elimination results. See the [original terminal guide](docs/LEGACY.md). `pygame` is not needed by the web app.

## Appearance and motion

The lobby and role-handoff forest use staggered star twinkles, a slow moon drift, and gentle tree sway. A small module loads the existing SVG once and mounts its layers in the page so animation works under the page’s content security policy. Rounded panels use static glass-like highlights and shadows; no animation library, canvas, or JavaScript animation loop is needed. Forest motion is on by default. The bilingual switch beside LOCAL TABLE lets players explicitly enable or pause it and remembers that choice per tab. The sky is anchored at the top so stars remain visible instead of being cropped away. Mobile dialogs omit backdrop blur. Day and night keep their own palettes.

The animation switch sits next to **LOCAL TABLE** and the debug control. Role handoff displays the current seat as a large number. A brief wolf silhouette sweeps from right to left when starting a new game and after the final role confirmation (including debug skip). The page changes under the sweep; pausing motion skips the transition immediately.

## Guide, fun mode, and faster hosting

Use **? 玩法指南 · How to play** on the homepage or the header’s **?** button for bilingual rules, role abilities and the app-specific privacy reminder. The reminder also appears on the homepage and special-role reveal cards: eliminated role holders should keep opening their private screen and making the usual cover clicks at night. Cover clicks cannot use powers.

New games enable **witch self-save** by default. Saved games keep their original rules. **Fun mode / 娛樂模式** allows up to 15 of each non-wolf role within the 5–16 player limit; wolves must still start fewer than the good side. Role holders act privately in seat order, including cover turns for eliminated holders. Each witch has her own antidote and poison. **Limit witch to one potion per night** is on by default; switching it off allows both in one night, while each potion remains single-use per game. Witches see the original wolf target, so an earlier witch’s save is not revealed to the next witch; potions resolve together at dawn and poison still prevents a hunter shot. Each seer sees only their own **Bad side / Good side** result. All eligible hunter shots resolve before victory, including long hunter chains. Each new hunter turn replays the cached final-shot prompt; repeated polls do not replay it.

With the host page visible, an inactive witch/seer turn advances after **10 seconds without interaction**. Opening or using the private screen renews the interval. Living actors and hunter shots are never auto-skipped; the audience receives no inactivity status or automatic-pass log entry. Close DEBUG before passing the host device. Physical clicks and players’ timing still need cooperation.

The voting screen shows **Votes counted in person** directly, with individual ballots in an optional dialog. Select one highest-vote seat to eliminate it, all tied leaders for a runoff, or no seats for no elimination. A second tie ends without elimination. The server validates targets and preserves hunter and victory resolution.

Day/night boundaries animate the setting sun or moon and rising counterpart. The daytime panorama has moving clouds, sunlight and trees. Private actions send a flask, magnifier or role symbol to the target card, flip it 360°, then show the result or advance. Cancelling the screen cancels an unfinished effect. The motion toggle skips these effects when paused. The wolf transition uses soft haze and a page crossfade instead of a sliding rectangular backdrop.

Enable **遺言 / Last words** in house rules to give every first-night casualty and voted-out player a speaking turn. Daytime hunter-shot victims and deaths from night two onward get none. Hunters resolve first, then the host confirms each speaker before victory or the next phase. It is on by default for new games; existing games keep their saved setting. Fun mode skips witch/seer roles absent from the cast; eliminated holders still get cover turns.

## License

No license has been selected. Add an explicit license before inviting redistribution under particular terms.


Role artwork is preloaded as a shared vector sprite. Private cards reveal the character first, then a fading, slowly orbiting halo. Homepage symbols have subtle idle motion. Player rooms share day/night animated scenery and the styled public village/chronicle, while private roles remain inside dialogs. Motion off and reduced-motion settings provide static artwork.

Remote spectators and eliminated players have a separate chat, hidden from living players. They may read village chat but cannot post there, except an eliminated player during their designated last words. Spectators use the existing audience link; their messages are labelled Spectator (shared-link spectators share a one-second sending cooldown). Wolf chat remains inaccessible to spectators and eliminated players.
