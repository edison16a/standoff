# Basketball 3v3: playtest handoff

The owner's notes are in `docs/handoff/next-week/owner-requests.md` (last section). The goal is NBA 2K feel: hand made presets that the game logic picks, never raw physics collisions or ragdoll flops. Earlier preset work is in `nba-3v3-anim.md`.

## Step 1: finishes and controls

Done:

* **The layup that cut off.** Root cause: the shot clock. It runs while the ball is held, and a layup's gather holds the ball for about half a second. A person driving late in the 12 second clock ran it out mid gather: the violation knocked the ball loose and the body went on up into an empty layup. Bots never hit it because they shoot with two seconds left, which is why bot games looked clean. Reproduced with bot games (no cut in 269 drives), a human probe (1500 scripted drives with the clock left alone, all clean) and a drive started with 0.25 s on the clock (the ball popped out at once). Fix: `engine/shot-motion.ts`. A jumper rising, a floater, a gathered layup or dunk, or a press at the rim being read holds the clock until the ball leaves the hands (`rules.ts`). Regression test: `engine/shot-clock-motion.test.ts`.
* **Tap, hold and double tap at the rim** (`engine/finish/pick-up.ts`, wired in `finish/rim-press.ts`). Only for people, and only where Shoot would be a finish anyway (`finish/zone.ts`: driving at the rim inside 3.3 m, within 1.7 m, under the glass, or on a floater run). There the press does not throw at once; the player runs on until it reads as:
  * a hold (still down after 0.17 s): a layup,
  * a double tap (let go inside 0.17 s and pressed again inside 0.3 s of the first press): a dunk attempt,
  * one quick tap and nothing more: a layup, once the 0.3 s window shuts.
  A hold past 0.17 s is already a layup, so a late second press never turns it into a dunk. From the floater band past 3.3 m the layup is the floater. Away from the rim Shoot is the jumper exactly as before. The computer, films and labs call their finish at once (`Match.finishTaps`, turned on by `host/match-driver.ts`). Tests: `finish/pick-up.test.ts`.
* **The phone and the keys.** `CourtState.rim` tells the phone when Shoot is a finish. There the meter stays off and the status shows "Hold layup, Tap tap dunk" (`phone/components/Controller.tsx`, `styles/pad-status.css`). The keyboard card has an "At the rim" group and its meter follows the same flag (`keyboard/`). A clanged or short dunk flashes "Off the iron" or "Too far out" on the dunker's phone.
* **The stick picks the layup** (`finish/steer-layup.ts`), read against the line to the rim as Shoot is held:
  * at the rim, within 20 degrees: straight on (finger roll, off the glass from the wing, a power layup when slow),
  * 20 to 60 degrees off: a euro step that way,
  * 60 to 115 degrees, across the line: a step through under the rim to that side,
  * past 115 degrees, pulled back: a hop step,
  * from the wing or the baseline, past the rim toward the far baseline: a reverse under the backboard on that side,
  * stick let go with a man in front: a juke (pump fake, he bites, jab step past him). With nobody there the game picks as it does for a bot.
  Tests: `finish/steer-layup.test.ts`.
* **Three new layup presets**, each with its own footwork (`finish/footwork.ts`), ball path (`finish/tracks.ts`), spec (`finish/layups.ts`), gather keys (`render/anim/finish/gather.ts`) and air shape (`render/anim/finish/layup-tops.ts`): `stepThrough` (a plant, one long stride across in front of the rim to the far side, `throughSpot` in `finish/spots.ts`), `hop` (a hop onto both feet with the ball at the chin, the hop height from `gatherLift`), `juke` (stop, pump fake, the shoulders sold the other way, a jab step out past him; a computer man close by bites as on the up and under). Bots use them now and then.
* **Dunk odds** (`finish/dunk-odds.ts`, read off the court in `finish/dunk-read.ts`). Rolled before the gather so the fail is its own preset. Inputs: distance (past 3.4 m he comes up short, certain by 4.6 m), speed (a standstill out from the rim clangs), heading (running across or away clangs), balance (just landed, a hard plant, a missed lunge), the dunk rating (spring, strength and reach headroom; Dunker 10, Big Man about 9, guards about 6.5) and the man nearest the rim (a bigger, longer man waiting stuffs it; one the dunker overpowers is posterized). A good dunk lands about 97 percent of the time. Tests: `finish/dunk-odds.test.ts`.
* **Fail presets** (`finish/dunk-fail.ts`, poses in `render/anim/finish/dunk-fails.ts`):
  * `stuff`: the stopper walks to the spot under the slam and jumps with a block plan timed so his hand meets the ball at the slam (`finish/stopper.ts`); the ball is swatted or spiked out, the dunker is thrown back, arms snapped over his head, and lands heavy.
  * `clang`: up there but off the iron (back iron or rattled out); the body jolts back off the rim.
  * `short`: took off well out and gets the ball only to the front of the ring from under it; he comes down still reaching.
  A failed dunk holds its preset 0.36 s on the floor after landing for the heavy landing and getting up (`FAIL_SETTLE` in `drive.ts`).
* **The computer reads the odds**: a bot whose dunk goes down less than 45 percent of the time lays it up instead (`BOT_DUNK_SENSE` in `drive.ts`). In 24 hard bot games about one dunk in eight fails.
* **Lab scenes**: `/showcase/nba-3v3?lab=layup-stepThrough|layup-hop|layup-juke|dunkfail-stuff|dunkfail-clang|dunkfail-short&step=1`. Tests in `showcase/lab-presets.test.ts` (each plays its preset; the stuff is a block by the stopper; no fail scores).
* The bot game stat tests (`sim/scoring.test.ts`, `game-stats.test.ts`) were passing by luck of the seeds: adding one extra random roll per dunk to main alone moved the jumper and layup rates past their bands. They now play more games or allow the swing that was measured, with comments.

Known gaps from step 1:

* The stuff's block is the existing block hand (`render/block-reach.ts`) with a plan; the defender's whole body is not yet an authored preset. Step 2 replaces it.
* The press at the rim waits up to 0.3 s before the finish starts (the player runs on meanwhile). If that feels slow, `FINISH_TAPS.double` can come down to about 0.25.
* The rim flag on the phone comes from the last state sent, so on the edge of the zone the phone may run a meter for a press the host reads as a finish, or the other way. Both sides cope: the host uses its own hold time.
* Bots never steer a layup with the stick; their choice stays the selection rules.

## Notes for later steps

* Step 2 (blocks): a planned stuff is `act.fail === "stuff"` with `act.stopper` on the dunker's drive; `finish/stopper.ts` walks him in and gives his jump `plan = { at, point, hit }`. A block preset can take over from there. `failSlam` in `finish/dunk-fail.ts` applies the hit at the slam.
* Step 3: tune `DUNK_ODDS` and `BOT_DUNK_SENSE` from play; the README controls section needs the rim rules.
