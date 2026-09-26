# Work queue

The running list of what is being built, so work can pick up again after a break (a usage limit, a container restart or a new session). Update it whenever something starts, lands on main or gets queued.

## How to pick up again

1. Read this file top to bottom.
2. Check what is still running. Work in progress lives on branches named `worktree-wf_*` locally and is backed up to GitHub as `wip/<branch>` (see Backups below). A branch that is ahead of main and not merged still needs its work finished or merged.
3. Merge finished work into main, run the checks (`npx tsc --noEmit -p .`, `npx eslint src tools --max-warnings=0`, `npx vitest run`, `npx next build`), push, and move the item to Done.
4. Start the next queued batch.
5. If an agent has gone quiet for a long time, check whether it is stuck on a permission prompt (usually a cleanup command). Its committed work is safe; stop it and continue from its branch with a fresh agent told to leave cleanup to the lead.

## Running now

| Work | Branch | State |
| --- | --- | --- |
| Batch A (playtest fixes, sounds, bots toggle, Boxing and Subway fixes, easier jumps, Brawl flow, frame rate limiter, Zombie pace) | new worktrees from workflow wf_97a836d3-114 | five builds, each then reviewed |

The review loop looks hard at every game for 3D model errors, animation glitches and phone controller problems, fixes them, then a second pass reviews again with fresh eyes. It also adds the split screen name map (`src/games/kit/split/SplitMap.tsx`) to Magic Kart, Subway Runner, Cube Game and Boxing.

## Queue, in order

### Batch A: running now (see Running now)

1. **Basketball 3v3 and Soccer 3v3 crowd:** remove the crowd cheering entirely; the noise based crowd sounds like wind.
2. **Basketball arena sounds:** the arena beat (stomp stomp clap: kick drum and hand claps), shot clock beeps in the last seconds and the buzzer, the game horn, organ stabs. Punchy and synthesized, never noisy.
3. **Bots toggle:** Basketball and Soccer lobbies get an option to turn bots off, so people can play 1v1, 2v2 or 3v3 (or uneven) with no computer players. Team size follows the humans.
4. **Boxing bug:** during a fight the screen suddenly went dark. Find the cause and fix it.
5. **Subway Runner bug:** on top of a train the view is blocked by something above. Keep the view clear on roofs.
6. **Easier camera jumps:** in Subway Runner and Cube Game a small jump, about 30 percent of a full one, should count. Bobbing and nodding must still be ignored.
7. **Brawl Battle flow:** smoother and flowier, less mechanical. No popups for ults or KOs. It should feel like always attacking (buffered and chained attacks, cancels, quicker recovery). Fighters walk straight through each other.
8. **Frame rate limiter in Settings:** defaults to the screen's measured maximum and can be lowered (for example 30, 60, 90, 120). Applies to every game.
9. **Zombie Survival pace:** cut to 15 stages. Stage 1 already has lots of zombies, wave 2 already has a boss, stage 10 is the helicopter that carries the team to the final part, and stage 15 is the final boss stage. Faster paced throughout.

### Batch B: ready to start (Blade Clash and Counter Battle have landed)

10. **Music:** one unique song for every game that matches its vibe (Magic Kart energetic, Fruit Slicer calm and fruity, Subway Runner retro disco, and so on for all of them including Blade Clash and Counter Battle). Each game's lobby music is chill and flowy. Distinct keys, tempos, instruments and hooks, through the music bus.
11. **Magic Kart home clip:** more continuous, one or two long flowing shots instead of many cuts.
12. **Basketball and Soccer home clips:** remake them with the latest gameplay (one dunk, one shot style scenes) and the made up player names. The current clips still show old real name tags.
13. **Cube Game portals:** normal proportions, not stretched.

### Last

14. **Final README:** the new names (Fruit Slicer, Subway Runner, Basketball 3v3, Soccer 3v3, Blade Clash), Counter Battle added, the live site standoffgames.vercel.app, a fresh dark mode home photo and one picture per game, a polished pitch and how to play, then push.

## Done recently

* Blade Clash replaces Fencing: a two player split screen sword duel with free 3D swords, clashes, five hit health, four fighters.
* Review loop: two passes over ten games for 3D model, animation and phone controller glitches, plus the split screen name map.
* Counter Battle: a split screen team shooter for 1v1 or 2v2 with bots, AI movement between cover, four guns with recoil, first to five rounds.
* Phones can join the next room after a game, in the same tab or a new one.
* Home screen: tiles 25 percent smaller, the row stays still until an edge then centres the game, endless loop, no lag when holding an arrow.
* Renamed Fruit Slicer, Subway Runner, Basketball 3v3 and Soccer 3v3, with made up player names and new icons.
* Voice commentary removed from Basketball 3v3 and Soccer 3v3.
* README: play link and screenshots first, dark mode home photo, live site link.

## Known issues

* `counter-battle/engine/battle.test.ts` (same seed plays out the same) can time out in the full suite on a loaded machine; it passes alone. Give it more time or make it lighter.

## Conventions

* Commits end with the co-author and session trailers; the helper `commit.sh` in the session scratchpad adds them. Many small commits, pushed to main.
* Writing: no em dashes, no double hyphens, no hyphens used as punctuation, no midline dots or bullet characters inside sentences, no arrows standing in for words, short plain sentences.
* Code: production level, files under about 200 lines, short comments that say why.
* No server side data saving. Camera pictures never leave the computer.

## Backups

In progress branches are pushed to GitHub as `wip/<branch>` so a container restart cannot lose them. Once a branch is merged into main its `wip/` copy is deleted.
