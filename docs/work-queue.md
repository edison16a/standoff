# Work queue

The running list of what is being built, so work can pick up again after a break (a usage limit, a container restart or a new session). Update it whenever something starts, lands on main or gets queued.

## How to pick up again

1. Read this file top to bottom.
2. Check what is still running. Work in progress lives on branches named `worktree-wf_*` locally and is backed up to GitHub as `wip/<branch>` (see Backups below). A branch that is ahead of main and not merged still needs its work finished or merged.
3. Merge finished work into main, run the checks (`npx tsc --noEmit -p .`, `npx eslint src tools --max-warnings=0`, `npx vitest run`, `npx next build`), push, and move the item to Done.
4. Start the next queued batch.
5. If an agent has gone quiet for a long time, check whether it is stuck on a permission prompt (usually a cleanup command). Its committed work is safe; stop it and continue from its branch with a fresh agent told to leave cleanup to the lead.

## Paused for next week (owner is out of usage, resume from these branches)

Owner words, verbatim, are in docs/handoff/next-week/owner-requests.md. Screenshots of the bug are next to it.

1. **Basketball black streaks** (top priority). Thick black streaks radiate from the ball handler in live play, and big black loops swirl around the trophy lift in the ceremony. See docs/handoff/next-week/live.webp and ceremony.webp. It only shows on the owner's real graphics card, not in our software renderer. Lead theory: NaN or infinite pixels in the HDR finish, spread by bloom into streaks. Work so far is on branch `wip/worktree-agent-af02290b073d1ed42` (3 commits: safe math in the skin, hair and spark shaders, bad pixels cleaned through the whole finish, no black rings from the haze beams). Next: finish the depth of field part, confirm the fix, add the permanent safety net before bloom and the final composite, then ask the owner which browser and computer they use so it can be checked there.
2. **Replay black bar.** A black bar along the bottom of the big screen covers part of every replay. Remove it in Basketball, Football and Soccer. Not started; same branch as item 1.
3. **Football routes and deep runner.** Route runners must never stay out of bounds; they turn back inside so they can still be thrown to. Add one deep runner per offense who goes long when the play allows (keep eleven a side by turning one blocking support bot into him). Work so far is one WIP commit on branch `wip/worktree-agent-a004ba54ddce70b1c`.

Still waiting on the owner: pause or keep the heartbeat, re-record the Paintball trailer, keep or remove the three unrequested extras (crouched shot pops up, bots wait for range, extra Next tap), add a license, remove the duplicate screenshots lower in the README, re-take the README home screenshot with the Standoff Premium badges.

## Running now

| Work | Workflow | State |
| --- | --- | --- |

All final builds are on main: cover icons, sports phone controls, Paintball Battle controls, Subway camera still, 1.2x tiles, final README. Final check done and on main (503ea5b): every game played end to end except the live site, which this machine's browser cannot reach (certificate block). Part 1 fixes: Soccer feet, Kart, Brawl, Blade Clash, Zombie and Gallery rejoin, phone download retry.

## Queue, in order

### Batch C: running now (see Running now)

Every Computer player game gets Easy (default), Medium, Hard and Training (bots stand still). Sports games get 6 characters, host picked roles, a winner and stats screen, and replays that skip only when everyone agrees.


### Batch E: items 1 and 5 running; items 2 to 4 start when the victory kit, Basketball and the sports builds are on main

1. **(done)** **Subway Runner overhaul:** drop the neon look and make it look, move and sound like the real Subway Surfers: bright daytime rail yard, graffiti trains, the real feel of lane switches, jumps, rolls, hoverboards and the chase. Much better graphics, physics and sounds.
2. **Sports winner scenes:** Basketball team lifting an NBA style trophy with names and confetti, Soccer team lifting a World Cup style trophy, Football with a trophy too. Use the victory kit from Batch D.
3. **Builds instead of characters** in Basketball (Shooter, Dunker, and so on), Soccer and Football: each pick is a stat build and the username stays the displayed name.
4. **Winner scenes** for the other games with a clear winner: Blade Clash, Paintball Battle, Cube Game 1v1.

5. **(done)** **Zombie Survival rework:**
   * Each weapon gets its own crosshair and a real trade off (the shotgun has a wide spread and short range, and so on).
   * Recoil kicks the gun, which springs back to where the player points. The aim itself never moves.
   * Shorter, faster waves: at most 10 zombies a round early on and about 20 in late rounds.
   * Difficulty comes from speed, not numbers. Zombies are fast from the start (1x), about 10 percent faster each round, capped at 2x.
   * A big slow boss every 5 rounds, with fast zombies rushing in behind it. A mini boss every other round.

### Batch F: the second to last changes, after Batch E and before the final steps (Subway keyboard mode, Demon, multipliers, coin score and the shared leaderboard are done; the rest waits for the Cube Game and Soccer winner work to land)

1. **Cube Game portals:**
   * Turned sideways, like Geometry Dash, each showing a picture of what the player becomes (ship, ball and so on).
   * Can't be skipped: walls, spikes or ceilings block every way around a portal, so the player is forced through it.
2. **Cube Game Demon levels:** two new levels labelled Demon, genuinely harder than everything before them, each with its own song.
3. **Cube Game camera:** the cube sits a bit further to the right on screen.
4. **Local leaderboards for Cube Game and Subway Runner:**
   * Saved on each computer only, and never ending (every result is kept).
   * After a win or a new score, the game says your rank, for example "#3 on this computer".
   * Cube Game ranks each level by finish time; Subway Runner ranks by score.
   * Settings gets a button to wipe the leaderboards.
   * A shared kit piece, so both games use the same one.
5. **Subway Runner keyboard mode:** play with the arrow keys or WASD (left and right switch lanes, up jumps, down rolls) as well as the camera.
   * **Subway Runner Demon difficulty:** a fourth level after Hard, very difficult (faster start, denser obstacles, less reaction time).
   * **Score multipliers by difficulty:** each level carries its own multiplier (for example Easy 1x, Medium 1.5x, Hard 2x, Demon 3x; tune by playing), shown before the run and on the score.
   * **Coins add to the score:** every coin and pickup raises the score (on top of distance), also scaled by the multiplier. The leaderboard stores the final score.

6. **Soccer 3v3 fixes from play testing:**
   * Free kick curve changes only how much the ball bends (from a straight kick to a wide curve). It must never move the aim.
   * The keeper is still a brick wall: make the goal 1.5 to 2 times bigger (tune within that range by playing until shots beat the keeper often enough to be fun) and keep the keeper exactly the same size, reach and speed, so scoring is fair.

7. **No duplicate name boxes:** in every game where each player's name already shows on or above their character, remove the separate boxes along the bottom of the big screen that just repeat names like "Edison Law". Audit every game. If a box also carries something useful (health, score, ammo), move that onto the name tag or the main HUD instead of losing it.

### Batch G: right before the final builds (owner play test notes)

**Football 3v3**
1. **Defense controls stay on screen:** a defender's pad must never disappear while the offense picks kick or throw. Defense does not choose, so its controls stay up the whole time.
2. **QB movement:** a normal joystick for moving, like the other players.
3. **QB speed and RUN (owner changed this, it replaces the earlier accuracy idea):** the QB is clearly slower than the other players, especially early in the play, and can shuffle back while throwing with the same accuracy every time (no accuracy penalty for moving). A **RUN** button turns the QB into a runner: from then on he can't throw, and he moves like a normal player at normal runner speed. Remove the "accuracy depends on standing still" logic if it was built.
4. **New play call, Run the ball:** besides Kick and Throw, the QB can pick Run. One runner automatically lines up close to the QB, and after the hike the QB presses Pass to toss that runner a short lob (a pitch) to start the run.
5. **Clearer throw target:** the ring under the receiver being thrown to turns a completely different colour (for example red) and stands out on screen, so it is obvious who the pass is going to.

**Basketball 3v3**
6. **Controls always on:** a player's controls never grey out when the ball is passed between teammates. They stay active the whole time.
7. **Guard keeps following:** holding Guard always follows your assigned man, through passes and every change of possession on the same play.
8. **Stronger jukes:** a juke (crossover and so on) is more powerful, and the beaten defender is visibly stunned for a moment (a stumble or off balance animation). No big text announcement for jukes.

### Last (in this order: README, clips, icons and tiles first, then the final check)

**Push checkpoints (owner request, in case usage runs out):** before the final builds start, every finished game change must already be merged and pushed to main. After the final builds (README, clips, icons, tiles) pass their checks, push them to main right away, before the final check starts.

1. **Final README:** every new feature and game, Football 3v3 and Paintball Battle, new screenshots.
2. **New home screen clips for every game, cut like wordless game trailers** (think Fortnite ads): only the high intensity best moments, cinematic cameras, a smooth seamless loop, no text. Examples from the owner:
   * Paintball Battle: close ups of a player running then sliding, then a 3v3 firefight seen from one player's view.
   * Basketball 3v3: a cinematic dunk, then an iso play into a three that banks in, then the team celebrating as champions, looping smoothly.
   * Every other game gets the same treatment with its own best moments (Soccer goals and the SUI, Football touchdowns, Kart drifts and glides, Blade Clash slashes, Boxing knockdowns and the belt, and so on).
   * Zombie Survival: the team riding in the back of a car or truck, zombies bursting out and chasing them, then a cut to gameplay.
3. **Cinematic game icons for every game, like movie posters or key art** (almost photo like, very tough, the single most exciting moment, drawn from the real game in 3D with the stylised title). Examples from the owner:
   * Basketball 3v3: one player dunking on another.
   * Boxing: one boxer landing a punch and the other falling, knocked out.
   * Soccer 3v3: a player jumping over a slide tackle with the ball.
   * Zombie Survival: third person, not first person: the team on a car being chased by zombies.
   * Paintball Battle: one player crouched behind a wall, facing the camera, paintballs flying past him, the other team shooting in the background.
   * Shooting Gallery and every other game get the same treatment with their own most cinematic moment.
4. **Home screen tiles (app icons) 1.2 times bigger.**
5. **Final check that everything works:** every game played end to end in a real browser with a host page and phone pages (lobby, calibration, a full round, results, back home, a second game without a reload), and the live site's connections checked after the deploy: iPhones on WebSockets, Chrome's fallback, room loss noticed and Regenerate room working. This runs last, after the README, clips, icons and tiles, so it also checks those. Fix anything found.

## Done recently

* Basketball animation presets (e3841f8) and Football animation presets (e0d8eac), with new screenshots, icons, trailers and posters, on main. Basketball icon redone: shooter facing camera, defender leaping.
* Keyboard bindings for all 11 other games, reviewed, plus a Boxing uppercut (80daf8e, 0d21b1d, 7ac0ff3), on main.
* Keyboard player for dev testing: admin toggle, floating phone panel, controls card, bindings API in src/platform/keyboard (a56e0ab), on main.
* Football 3v3 quality pass: rigid body ball with a real spiral, drag and turf bounces, new athletes with pads and helmets, new stadium, broadcast camera, touchdown replay and ceremony, re-recorded trailer, icon and poster (cd1c9d4), on main. Poster retimed to a planted stride.
* Basketball 3v3 quality pass: real ball physics with torus rim and cloth net, hand driven dribble, charges and blocking fouls, clean drives, stepbacks and floaters, NBA style defence, the cream and orange ball with visible spin, new athletes, arena and camera, re-recorded trailer, icon and poster (c988101), on main.
* Soccer 3v3 quality pass: real ball physics with spin, curl and giving nets, skinned athletes, roofed stadium with floodlights, broadcast camera, re-recorded trailer, icon and poster (0384347), on main.
* Magic Kart media: re-recorded trailer, icon and poster with the new karts and double boxes (ff83d1a), on main.
* Magic Kart quality pass: detailed karts, double item boxes with a two item queue, gold marking only double boxes (7ba15e6), on main.
* Trailer style home clips and posters for all 13 games (six media groups, each reviewed), on main.
* Batch G: Football (defence pad stays, normal QB stick, slower QB with a RUN button, Run the ball call with a pitch, magenta target ring, no player strip) and Basketball (buttons always lit, Guard sticks to your man, stronger jukes with a stun), and no duplicate name boxes (Soccer's strip removed).
* Room reliability: signed room tokens so any Vercel instance can rebuild a room with the same code and players, a host room check over a fresh connection, QR hidden until the room passes, Regenerate room under the QR, phones that follow a moved room, WebSockets first with a leaner stream fallback, and the client bugs from the investigation fixed.
* Basketball 3v3 and Football 3v3: trophy ceremonies, and builds instead of named characters under each player's username.
* Cube Game: sideways portals with a picture of the next form, walls so no portal can be skipped, two Demon levels with their own songs, the cube further right, and a leaderboard per level.
* Soccer 3v3: free kick curve only bends the path (the kick always ends on the aim), and the goal is 1.75 times bigger with the keeper unchanged.
* Basketball 3v3 part 2: torus rim and backboard physics with spin, real ball sounds, slower momentum, layups, dunks and stepbacks, the winning basket replay with a skip vote, celebrations, box scores.
* Football 3v3, a new game: full field, Madden style camera, QB and runners plus bot linemen, hike window, assisted throws, jukes, dives, tackles, guard, kicking bars, extra point or two, touchdown replay, celebrations, NFL style music, sideways phones.
* Soccer 3v3: the World Cup ceremony (the captain lifts the cup, confetti cannons, CHAMPIONS and the names), and builds with ten ratings each instead of named stars, under each player's username.
* Winner scenes for Blade Clash (sword raised, loser kneeling), Paintball Battle (the splattered team lifts a cup) and Cube Game (podium or pedestal).
* Subway Runner: keyboard mode (arrows or WASD), a Demon level, score multipliers per level (Easy x1 to Demon x3), coins and power ups in the score, and a leaderboard on each computer that shows your rank after every run (src/games/kit/leaderboard). Settings has Clear leaderboards.
* Subway Runner overhaul: no neon, a sunny rail yard with graffiti trains, ramps and barriers, a cartoon runner chased by the inspector and his dog, snappy lanes, real jump arcs, rolls and stumbles, working power ups, a new song and sounds.
* Zombie Survival rework: a crosshair and a real trade off per weapon, recoil that springs back to the aim, short rounds of at most 10 early and about 20 late, 10 percent faster each round up to double, big bosses every 5 rounds with runners behind them and mini bosses between.
* Hold to calibrate in every pointing game: 6 targets for sword games, 5 for shooters, Magic Kart holds the middle dot for a second, pointers stay at the edge.
* The victory kit (confetti, spotlights, trophies and a belt made in code), with winner scenes for Boxing (belt overhead), Magic Kart (podium) and Brawl Battle (pedestal), and Boxing builds with stat bars under the player's own name.
* Cube Game: calmer look, a quicker camera jump, every level open, a song per level, and 2 players race 1v1 in split screen.
* Vercel Web Analytics, with room codes and player names taken out of page addresses.
* Soccer 3v3: Guard, fouls with a referee and yellow card, free kicks with a jumping wall and aimed curve, penalties, bigger pitch and goals, shot auto aim with blocks, smart passing, keeper saves that bounce out, FIFA style replays with a skip vote, the SUI, no banners, six stars, host roles, difficulty.
* Blade Clash: no voice, a slow motion hit moment on every point, then both fighters reset; difficulty picker.
* Paintball Battle (was Counter Battle): paint markers and splats, thin crosshair, Shoot and Crouch buttons, closer camera, slower fight from cover, shared difficulty.
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

* Calibration look: the Blade Clash calibration UI is the standard for every aiming game (owner, repeated).

* Disk: the session has a fixed disk allowance. Every check in, delete `.next` folders in worktrees whose work is merged or idle, and anything big left in /dev/shm or /tmp.
* Calibration is always the modern hold to calibrate (point, hold still, it fills and moves on, no button) in every pointing game, with 4 to 6 targets as the owner asked: 6 for sword games (Fruit Slicer, Blade Clash), 5 for shooters (the middle and all four corners). Never go back to 3, and never add more than 6: the fit only learns the middle and four edge spans, so extra holds add waiting without accuracy.
* Commits end with the co-author and session trailers; the helper `commit.sh` in the session scratchpad adds them. Many small commits, pushed to main.
* Writing: no em dashes, no double hyphens, no hyphens used as punctuation, no midline dots or bullet characters inside sentences, no arrows standing in for words, short plain sentences.
* Code: production level, files under about 200 lines, short comments that say why.
* No server side data saving. Camera pictures never leave the computer.

## Backups

In progress branches are pushed to GitHub as `wip/<branch>` so a container restart cannot lose them. Once a branch is merged into main its `wip/` copy is deleted.
