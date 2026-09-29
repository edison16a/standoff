# Work queue

The running list of what is being built, so work can pick up again after a break (a usage limit, a container restart or a new session). Update it whenever something starts, lands on main or gets queued.

## How to pick up again

1. Read this file top to bottom.
2. Check what is still running. Work in progress lives on branches named `worktree-wf_*` locally and is backed up to GitHub as `wip/<branch>` (see Backups below). A branch that is ahead of main and not merged still needs its work finished or merged.
3. Merge finished work into main, run the checks (`npx tsc --noEmit -p .`, `npx eslint src tools --max-warnings=0`, `npx vitest run`, `npx next build`), push, and move the item to Done.
4. Start the next queued batch.
5. If an agent has gone quiet for a long time, check whether it is stuck on a permission prompt (usually a cleanup command). Its committed work is safe; stop it and continue from its branch with a fresh agent told to leave cleanup to the lead.

## Running now

| Work | Workflow | State |
| --- | --- | --- |
| **Room reliability (top priority):** find why rooms fail about every other time and fix the cause, a host watchdog that checks the room like a phone would and fully remakes it when broken, the QR code hidden until the room passes its check, and a Regenerate room button right under the QR code | wf_3938ab23-6cc | four investigations (live site repro, local multi instance repro, client audit, relay audit), two designs and a judge, one build, then stress, code and production reviews with fix rounds |
| Batch C and D, finishing what the restart interrupted, in the same worktrees, two at a time | wf_9713e4a2-c2a | reviews for Soccer, Blade Clash and Paintball Battle; finish and review Cube Game 1v1, hold to calibrate, winner scenes and Boxing builds, Basketball part 2, Football 3v3 steps 2 and 3 |

A resume after the container restart went wrong: with a changed script, finished steps ran again inside other builds' worktrees. It was stopped, every branch was put back to its state before the resume, and the duplicate work was kept on `salvage/*` branches. Lesson: resume a workflow only with its script unchanged.

## Queue, in order

### Batch C: running now (see Running now)

Every Computer player game gets Easy (default), Medium, Hard and Training (bots stand still). Sports games get 6 characters, host picked roles, a winner and stats screen, and replays that skip only when everyone agrees.


### Batch E: starts when Batch C's Subway and sports work is on main

1. **Subway Runner overhaul:** drop the neon look and make it look, move and sound like the real Subway Surfers: bright daytime rail yard, graffiti trains, the real feel of lane switches, jumps, rolls, hoverboards and the chase. Much better graphics, physics and sounds.
2. **Sports winner scenes:** Basketball team lifting an NBA style trophy with names and confetti, Soccer team lifting a World Cup style trophy, Football with a trophy too. Use the victory kit from Batch D.
3. **Builds instead of characters** in Basketball (Shooter, Dunker, and so on), Soccer and Football: each pick is a stat build and the username stays the displayed name.
4. **Winner scenes** for the other games with a clear winner: Blade Clash, Paintball Battle, Cube Game 1v1.

5. **Zombie Survival rework:**
   * Each weapon gets its own crosshair and a real trade off (the shotgun has a wide spread and short range, and so on).
   * Recoil kicks the gun, which springs back to where the player points. The aim itself never moves.
   * Shorter, faster waves: at most 10 zombies a round early on and about 20 in late rounds.
   * Difficulty comes from speed, not numbers. Zombies are fast from the start (1x), about 10 percent faster each round, capped at 2x.
   * A big slow boss every 5 rounds, with fast zombies rushing in behind it. A mini boss every other round.

### Last

1. **Final README:** every new feature and game, Football 3v3 and Paintball Battle, new screenshots.
2. **New home screen clips for every game, cut like wordless game trailers** (think Fortnite ads): only the high intensity best moments, cinematic cameras, a smooth seamless loop, no text. Examples from the owner:
   * Paintball Battle: close ups of a player running then sliding, then a 3v3 firefight seen from one player's view.
   * Basketball 3v3: a cinematic dunk, then an iso play into a three that banks in, then the team celebrating as champions, looping smoothly.
   * Every other game gets the same treatment with its own best moments (Soccer goals and the SUI, Football touchdowns, Kart drifts and glides, Blade Clash slashes, Boxing knockdowns and the belt, and so on).

## Done recently

* Unique names in a room, a Reconnect button, and each controller at its own /play/CODE/name address so a refresh takes it back to its seat.
* Magic Kart: turning the phone no longer loses the controls, and a reloaded controller keeps its setup.
* Subway Runner: Easy, Medium and Hard starts, no two player mode, the name beside the score in plain text.
* Full screen stays on when going back home, and the home screen has a Full screen button.
* The loader's triangles stay solid while they hop.
* Platform: phones land on a join screen with a QR scanner, a new loader, Remake lobby in Settings, home music at page open, and split screen finish text.
* Admin panel (three quick taps on the gear) and Easy, Medium, Hard and Training bots in Magic Kart, Boxing, Brawl Battle and Zombie Survival.
* Batch B: a song and a lobby tune for every game, the continuous Magic Kart clip, new Basketball and Soccer clips, round Cube Game portals and a fresh Brawl clip.
* Batch A: Basketball and Soccer arena sounds with no crowd and a bots off option, the Boxing dark screen and Subway roof view fixes, easier camera jumps, the Brawl Battle flow pass, the frame rate limiter, and Zombie Survival at 15 faster stages.
* Blade Clash replaces Fencing: a two player split screen sword duel with free 3D swords, clashes, five hit health, four fighters.
* Review loop: two passes over ten games for 3D model, animation and phone controller glitches, plus the split screen name map.
* Counter Battle: a split screen team shooter for 1v1 or 2v2 with bots, AI movement between cover, four guns with recoil, first to five rounds.
* Phones can join the next room after a game, in the same tab or a new one.
* Home screen: tiles 25 percent smaller, the row stays still until an edge then centres the game, endless loop, no lag when holding an arrow.
* Renamed Fruit Slicer, Subway Runner, Basketball 3v3 and Soccer 3v3, with made up player names and new icons.
* Voice commentary removed from Basketball 3v3 and Soccer 3v3.
* README: play link and screenshots first, dark mode home photo, live site link.

## Known issues

* `counter-battle/engine/battle.test.ts` (same seed plays out the same) can time out in the full suite on a loaded machine; it passes alone. The Paintball Battle build is fixing it.

## Conventions

* Commits end with the co-author and session trailers; the helper `commit.sh` in the session scratchpad adds them. Many small commits, pushed to main.
* Writing: no em dashes, no double hyphens, no hyphens used as punctuation, no midline dots or bullet characters inside sentences, no arrows standing in for words, short plain sentences.
* Code: production level, files under about 200 lines, short comments that say why.
* No server side data saving. Camera pictures never leave the computer.

## Backups

In progress branches are pushed to GitHub as `wip/<branch>` so a container restart cannot lose them. Once a branch is merged into main its `wip/` copy is deleted.
