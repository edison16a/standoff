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
| Soccer 3v3 (guard, fouls, ref and yellow card, free kicks with a wall, penalties, bigger pitch and goal, shot auto aim, passing, keeper saves, FIFA style replays, SUI celebration, no banners) | wf_c0b12558-24e | two builds in one worktree, then a review |
| Basketball 3v3 (guard, hand fouls, free throws with a contested rebound, ref, rim physics and ball sounds, slower momentum, layups, dunks, stepbacks, winning basket replay, celebrations) | wf_c0b12558-24e | two builds, then a review |
| New game: Football 3v3 (engine, 3D, phones, replay, music) | wf_c0b12558-24e | three builds, then a review |
| Platform: phone join screen with QR scanner, loading spinner, remake lobby, home music at page open, split screen finish text | wf_2d0ebad3-f06 | build, then review |
| Admin panel (three taps on the gear) and bot difficulty for Kart, Boxing, Brawl and others | wf_2d0ebad3-f06 | build, then review |
| Hold to calibrate everywhere, pointer stays at the edge, Kart auto calibration | wf_2d0ebad3-f06 | build, then review |
| Cube Game (calmer look, faster jump, all levels open, music per level, 1v1 split screen race) | wf_80b695fe-bcf | two builds, then a review |
| Subway Runner (Easy, Medium, Hard starts, no 2 player, name tag top right) | wf_80b695fe-bcf | build, then review |
| Blade Clash (no voice, a pause and hit moment on every point) | wf_80b695fe-bcf | build, then review |
| Paintball Battle (the Counter Battle rebrand: paint splatter, thin crosshair, shoot and crouch buttons, closer camera, slower pace) | wf_80b695fe-bcf | build, then review |
| Unique usernames, Reconnect by name, a controller link per player (/play/CODE/name) that survives refresh, and the root cause of Room not found on a second game | wf_2fe4d5ee-012 | build, then review |
| Magic Kart: rotating the phone no longer breaks the controls, and the controller resumes after a refresh | wf_2fe4d5ee-012 | build, then review |
| Victory kit (confetti, trophies, belt), Boxing belt scene and Boxing builds, Kart podium, Brawl winner scene | wf_2fe4d5ee-012 | build, then review |

Shared pieces already on main for these: `src/games/kit/difficulty` (Easy, Medium, Hard, Training) and `src/platform/admin/admin-actions.ts` (test shortcuts for the admin panel).

## Queue, in order

### Batch C: running now (see Running now)

Every Computer player game gets Easy (default), Medium, Hard and Training (bots stand still). Sports games get 6 characters, host picked roles, a winner and stats screen, and replays that skip only when everyone agrees.

### Batch D: running now (see Running now)

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
2. **New home screen clips** for every updated game (Soccer, Basketball, Football, Cube, Subway, Blade, Paintball, Kart and others changed in Batch C).

## Done recently

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
