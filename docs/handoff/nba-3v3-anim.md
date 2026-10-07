# Basketball 3v3: animation presets handoff

The owner's request is in the workflow scratchpad (`anim/owner-request.md`). Goal: NBA 2K feel. Hand made animation presets that the game logic picks before a move starts, blended with the physics underneath (ball flight, torus rim, cloth net), never pure physics floating.

## Step 1: controls and modes

Done:

* Free throw hold fix. Shoot at the line stays held as long as the thumb or key is held, and lets go at any time (`engine/free-throw-hold.test.ts`, `phone/shoot-button.ts`).
* Gold window. `SHOT.goldShare` and `SHOT.goldMinMs` in `engine/tuning.ts`; `goldHalfMs` and the `gold` grade in `engine/shot-model.ts`. The green is a little narrower than before. Gold is a forced swish in `engine/shot-launch.ts` (no hand reaches it, it never banks, a foul still lets it drop). Phone meter, big screen tag meter, gold flash word, gold haptics, gold chime (`audio/sfx.ts`), gold sparks and trail plus a glass light (`render/effects/gold-release.ts`). Tests in `engine/gold-release.test.ts`.
* Keyboard binding in `src/games/nba-3v3/keyboard/`. Keys map to whichever phone button does that job in the play (`buttonFor`). Space holds the shot on its own clock and sends `release` with heldMs like the phone. Right click holds Guard; the stage blocks the context menu.
* Small players faster. `sizeEdge` in `engine/body/mass.ts` (tuned in `BODY.size*`) scales top speed, leg power (squared) and grip (half). Playmaker 6.4 m/s, Big Man 4.6. Bot game scoring by build stayed about the same. Tests in `engine/body/size-speed.test.ts`.
* Game size. `Lobby.size` and `setSize` (1, 2 or 3 a side, 3 by default), a bench for players past the size, `SizePicker.tsx` in the lobby. The engine already played any team size; 1v1 and 2v2 were checked in the browser through live play, the replay, the ceremony and the results.
* Control switch. `host/control-switch.ts` picks the switch, `engine/hand-over.ts` swaps auto flags, `MatchDriver.athleteBySeat` now means the player a phone moves right now. `a.seat` is still the owner: name, jersey, box score and ceremony. Use `driver.pilotOf(id)` for "who moves this player" and `driver.ownerOf(seat)` for "whose player is this". Rings under controlled players in `render/control-rings.ts`.

Known gaps from step 1:

* After a switch the points go to the player who scored them, so a person's own box score line can read low. A per person line across switches would need the box score keyed by seat.
* On this machine the host page runs at a quarter of real time in a browser test, so a long hold measured on the phone is clamped by the host's own clock (`releaseJumper`). The unit tests check the hold and the grading; a browser test can only check that a long hold is never let go early.
* The demo game behind the lobby is always three a side.

## Step 2: shot endings and ball logic

Done:

* Eleven endings in `engine/shot-outcome/presets.ts`: swish, bank, frontRimIn, backRimIn, rattleIn, rollIn (toilet bowl in), rimOut, backIron (long rebound), rollOut (toilet bowl out), glassOut, airball. The coarse `Outcome` that scores and stats read is still named by the physics (`classify`).
* The picker `pick.ts` decides make or miss from the make chance, then the ending from the meter grade, contest, distance, family and the angle on the glass. Gold is always a swish. Early leans short, late leans long. Tests in `pick.test.ts` (make share equals the chance, swish most common on clean green jumpers, rolls mostly on close layups, back iron on late misses, rare airballs, banks only from the wings).
* The solver `solve.ts` draws releases from a hand made aim per ending (`recipes.ts`) and flies each ahead through the same stepper as the live ball (`trace.ts`, `flight.ts`) until one ends that way, at most 28 tries. If none does it keeps the nearest with the same make or miss. In bot games a shot costs about 0.3 ms in the middle and under 8 ms at worst on this machine. Tests in `solve.test.ts` and `live.test.ts` (every ending flown in a real match ends the way the look ahead said).
* The toilet bowl ride `rim-ride.ts`: an authored path over the top of the tube from the first touch, with a hop, a wobble, slowing laps, and a tip in or out, handed back to the physics on the tube. Tests in `rim-ride.test.ts`.
* `ShotInfo.preset` and `ShotInfo.flight` hold the plan; the `shot` event carries `preset`. A block clears the planned ride (`ball-touch.ts`), so a swat flies on physics alone. `m.forced` takes a preset or an old outcome name (`asPreset`).
* `physics/bank.ts` finds the bank spot from many more angles (damped Newton with a fresh slope each step). The bank calibration rows were refreshed; the calibration table is now only used for dunks (`planRelease` in `slam`).
* Lab scenes: `/showcase/nba-3v3?lab=shot-<preset>&step=1`, for example `shot-rollIn`, `shot-backIron`. The two toilet bowls are close layups off a drive with a defender near enough to stop a dunk.
* `shot-forced.ts` is gone; the solver replaced it.

Known gaps from step 2:

* Bot layups are mostly reverses, which cannot bank, so banks are rare in bot games until step 3 adds more layup variety. The picker never asks a reverse for the glass.
* Long range rattles are rare in the physics, so the picker gives them little weight from deep, and a failed rattle falls back to another make.
* The shot event names the ending at release, but the sounds and the phone do not use `preset` yet (a gold, swish or toilet bowl call could).

## Step 3: layup and dunk presets

Done:

* Every finish at the rim is a preset in `engine/finish/`. `spec.ts` is the shape: footwork (`steps`), gather and air time, where the body stops, a side shift, a turn, a ball path through the hands (`TrackKey`s in `tracks.ts`) and the release. `layups.ts` has 11 layups (finger, reverse, euro, upUnder, scoop, teardrop, glass, wrongFoot, spin, shield, power). `dunks.ts` has 15 dunks (twoHand, flush, tomahawk, cockback, hammer, windmill, reverse, spin360, scoop, clutch, rimhang, poster, putback, alley, jumpStop).
* Selection before the gather. `approach.ts` reads the angle (front, side, baseline), speed, natural hand, putback or alley oop, and the defender that matters (path, rim, ballSide, offSide, trail, in the air or not, strength edge). `select.ts` picks from that alone: open (nobody within `OPEN_RADIUS` 1.8 m, nobody at the rim) and able to get up there means a dunk, always. A much stronger man goes through a smaller one: poster. Otherwise a layup that beats the man where he is. `m.forcedFinish` forces one for labs and tests. Tests in `select.test.ts`.
* `plan.ts` lays out the drive for the body: finish spot (`spots.ts`), gather time capped at sprint step speed, dunk peak from the arm reach, the slam point over the ring, a hang, and the layup release from the shoulder. A layup release is kept `RING_CLEAR` out from the middle of the ring, so a putback from right under it can still drop.
* The ball in the hands: `ball-track.ts` carries the ball on the preset's path relative to the body until the release; `render/finish-hands.ts` puts the hands on the engine's real ball, then on the ring for a slap or a hang. Poses in `render/anim/finish/` (`gather.ts`, `layup-tops.ts`, `dunk-tops.ts`, `finish-pose.ts`). The old `render/anim/layups.ts`, `render/anim/dunks.ts`, `engine/finish.ts` and `engine/dunk-style.ts` are gone.
* The dunk no longer floats: the hand takes the ball over the ring and drives it down through the net, then the body hangs or drops. Test: `presets.test.ts` (ball within arm reach of a shoulder and moving no faster than an arm swing for every build and preset; every dunk released over the ring and through the net; every layup released clear of the ring and makeable, from 2.6 m and from right under).
* Blocking a layup is hard: `evade` per layup cuts the contest (`shot-launch.ts`), the touch chance (`ball-touch.ts`) and the foul chance. About one block a game in bot games.
* Up and under: a computer defender near the pump fake usually jumps at it (`drive.ts`). Poster: the man under it is knocked down as the slam comes down (`poster.test.ts`).
* Alley oop: a pass to an open teammate running hard at the rim goes up as a lob, and he catches it into the alley oop dunk (`alley.ts`, `passing.ts`, `alley.test.ts`).
* Lab scenes in `showcase/lab-presets.ts`: `/showcase/nba-3v3?lab=layup-<kind>&step=1` and `?lab=dunk-<style>&step=1`. `lab-presets.test.ts` checks every scene plays the preset it names. Checked in the browser: two hand dunk, poster, body shield, finger roll.

Known gaps from step 3:

* Over 14 bot games: about 55 layups (reverse 15, wrongFoot 10, power 9, finger, scoop, glass, teardrop a few) and 40 dunks (poster about 10). Bots seldom see a euro, spin or up and under because they rarely drive square into a set man; a person driving does.
* Posters are common because the Dunker and the Big Man often meet a smaller man at the rim. If it feels too often, raise the strength edge in `throughHim`.
* Sounds and the phone do not tell the presets apart yet (a poster or an alley oop call could).

## Notes for later steps

* Shot endings: layups and floaters (step 3) go through `launchShot`, so they get the picker and the solver for free. A new finish only needs a sensible `ReleaseInput` (family, hand point, apex, spin). A finish that must end a set way can call `solvePreset` with that ending.
* A gold release still sets `shot.rolled` to every defender, so no block can touch it.
* Step 4 and 5 are still to do: dribble, shake and block presets, then polish and media. The media (README stills, `docs/screenshots/nba-3v3.jpg`, the icon and the trailer) were not redone in step 1 on purpose; step 5 redoes them once the animations land.
* Layup and dunk presets: engine side in `engine/finish/` and `engine/drive.ts`, poses in `render/anim/finish/`, hands in `render/finish-hands.ts`. A new preset needs a `LayupKind` or `DunkStyle`, a spec row, a track, a pose top, a selection rule and a lab setup in `showcase/lab-presets.ts`.
* Step 4 (blocks) can read `act.layup` and `act.style` on a driving player to choose a block preset, and `shot.evade` says how hard the layup is to get a hand on.
