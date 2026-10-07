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
* Fix to step 2: the toilet bowl ride now keeps the ball out of the glass round the back of the ring (`rim-ride.ts`, test in `rim-ride.test.ts`).
* Alley oop: a pass to an open teammate running hard at the rim goes up as a lob, and he catches it into the alley oop dunk (`alley.ts`, `passing.ts`, `alley.test.ts`).
* Lab scenes in `showcase/lab-presets.ts`: `/showcase/nba-3v3?lab=layup-<kind>&step=1` and `?lab=dunk-<style>&step=1`. `lab-presets.test.ts` checks every scene plays the preset it names. Checked in the browser: two hand dunk, poster, body shield, finger roll.

Known gaps from step 3:

* Over 14 bot games: about 55 layups (reverse 15, wrongFoot 10, power 9, finger, scoop, glass, teardrop a few) and 40 dunks (poster about 10). Bots seldom see a euro, spin or up and under because they rarely drive square into a set man; a person driving does.
* Posters are common because the Dunker and the Big Man often meet a smaller man at the rim. If it feels too often, raise the strength edge in `throughHim`.
* Sounds and the phone do not tell the presets apart yet (a poster or an alley oop call could).

## Step 4: dribble, shakes and blocks

Done:

* Dribble presets in `engine/dribble-style.ts`: pound, jog, sprint, drive, retreat and protect, each a palm height, a spot ahead and out, a pound rate and how low the body sinks. `styleWeights` blends them by speed, travel direction and the nearest defender; `updateDribbleStyle` eases `a.dribbleStyle` toward the blend each step (called from `dribble.ts`). `handSpot` and `dribbleRate` read it, and the render reads `dribbleStyle.low` for the crouch. The old `driving()` is gone. A ball more than 1.3 m from the handler resets the dribble to the hand (was 2.5 m), so a teleport in a test or a film never reads as a fumble.
* A sixth move, `betweenLegs`: the stick pulled back at an angle (straight back within about 40 degrees is still the stepback). Footwork in `render/anim/moves.ts`, the ball under the hips in `handSpot`. Bots use it.
* Shakes in `engine/shake.ts`: `reactFor(move, hard)` gives bite, freeze, slip, ankles or turned, with its own time and push. `stun` in `juke.ts` plays it; the stumble action carries `react` and `turn`, the `shake` event carries `react`. Poses in `render/anim/shake-poses.ts`. A shaken man contests at 0.3 (`contest.ts`).
* Flow: Shoot pressed too early in a move is queued on the move (`move-flow.ts`) and fires as soon as `canShootOutOf`; the jumper starts with `t` set to the time held (capped short of takeoff), so the meter matches the phone's hold. A release while queued goes up and out in one motion.
* Blocks in `engine/blocks/`: `style.ts` picks the jump (stand, run, chase, help) as he leaves the floor, `plan.ts` flies the shot and the jump ahead together (`planBlock`, run at the jump and again at release by `planBlocks`) and rolls the block math for the moment the ball comes into reach, `hit.ts` picks and applies swat, spike, pin or tip, and `hook.ts` carries the plan out in the physics substeps. The block action carries `style` and `plan`; the `block` event carries `hit` and `preset`. Dunks at the rim swat or spike in `slam`. `ball-touch.ts` now only catches passes and loose balls.
* `guard-leap.ts`: Guard pressed on the run to the post as a shot or drive goes up is a `run` leap with both hands. Bots trailing a driver jump for the chase down (`bot/defence.ts`).
* Render: `render/block-reach.ts` times the strike to the plan (both hands for stand, run and help; one for chase), follows through by hit, and lets a near miss fall short. `render/anim/block-poses.ts` has a clip per jump style and the body's answer to a spike, a pin or a miss.
* Lab scenes: `move-<move>` for all six, `shake-ankles`, `dribble` (`showcase/lab-moves.ts`), and `block-stand|run|chase|help|layup|spike|pin|tip|miss` (`showcase/lab-blocks.ts`). `m.forcedHit` sets the hit or a miss, and a lab block is never fouled. The old `block` and `swat` labs now release short of gold, since step 1 made gold untouchable. Tests: `dribble-style.test.ts`, `shake.test.ts`, `blocks/blocks.test.ts`, `blocks/hit.test.ts`, `lab-moves.test.ts`, `lab-blocks.test.ts`.
* Checked in the browser: block-stand (both hands up, the hand on the ball at the touch), block-chase (one long arm over the driver's shoulder onto the ball), block-spike, shake-ankles (down on the hip, hand on the floor) and move-betweenLegs.

Known gaps from step 4:

* A jumper is usually blocked right out of the hand, because a defender must be close to reach it at all, so the strike has little lead. The pose has the arms up already, so it reads fine, but a pre release plan (guessing the release while the shooter rises) would let the hand wind up on screen.
* The plan extrapolates the defender at his current velocity. A man bumped off line after the plan just misses; the render then shows a reach that falls short, which is the right look.
* The lab move scenes force the shake (`stun`) and skip one random draw so the fixed seed does not fumble. Real games still roll `jukeChance`.
* Sounds do not tell block hits or shake reactions apart yet (a spike or ankles call could), and the phone shows none of it.

## Step 5: polish and media

Done:

* Ball off the fingers: `render/release-roll.ts` blends the drawn ball from the shooting palm onto the real flight over the first tenth of a second of a jumper or a free throw, so it leaves the hand on the follow through instead of before it. Picture only. Test in `release-roll.test.ts`.
* Odds: over 36 bot games (12 each at 1v1, 2v2 and 3v3) threes went in 54 to 59 percent and twos about 30. `SHOT.goodThree` (0.72) cuts a good, not green, release from beyond the arc; threes now land near 40 percent. `JUKE.hard` went from 0.45 to 0.25, so broken ankles drop from about a third of shakes to about one in seven. Free throws sit at 74 to 83 percent, layups 55 to 60, about one block a game. Games take 140 to 190 seconds.
* `body.test.ts` now caps a jump at `MAX_DUNK_PEAK`, the dunk plan's own limit, since a small guard with space may get up to 1.3 m.
* Icon: `showcase/icon-film.ts` is a new film. The Shooter rises at the left elbow, the Lockdown defender closes out and leaps (the block forced to fall short), held as the ball rolls off the fingers, from the floor looking up into the ring of arena lights. Tests in `icon-film.test.ts`.
* Highlight film (`script.ts`): the crossover now forces a hard shake, so the Lockdown defender breaks his ankles; the Playmaker's iso three is a gold swish. Poster moved to off the left block (`director.ts`), since the shaken defender now walks through the old spot.
* Trailer (`trailer-plan.ts`, `trailer-cams.ts`, `trailer.ts`): new `chase` film kind (the `block-chase` lab scene) with `chase` and `swat` cameras; all cuts retimed; about 13.9 s, captured with `--seconds 12.93`. Every frame moves (388 of 388 kept by mpdecimate). WebM 3.6 MB at crf 46, MP4 3.9 MB at crf 38.
* Media: `media/icon.jpg`, `media/poster.jpg`, `public/games/nba-3v3/backdrop.webm|mp4`, `docs/screenshots/nba-3v3.jpg` (the poster), and three README pictures in `media/readme/`.
* Play tested with the Keyboard player and a Playwright phone in 1v1, 2v2 and 3v3 (lobby size picker, live play, CPU free throws). Admin Free throws to the phone, Shoot held for about a second by touch: the shot only went up on the release. Phone fit passes.

Known gaps from step 5:

* Mid range jumpers in bot games go in about 30 percent, a little low next to 2K; bots take many of them contested off a stepback. Not tuned.
* The trailer is longer now, so the clip is encoded harder (crf 46 WebM) to fit 3.9 MB. A shorter cut list would buy back quality.
* The phone meter did not draw while the test held Shoot, because the test throttles the phone's frames; the hold itself and the release are covered by `free-throw-hold.test.ts`.
* Sounds and the phone still do not tell presets apart (poster, spike, ankles, gold calls).

## Notes for later steps

* Shot endings: layups and floaters (step 3) go through `launchShot`, so they get the picker and the solver for free. A new finish only needs a sensible `ReleaseInput` (family, hand point, apex, spin). A finish that must end a set way can call `solvePreset` with that ending.
* A gold release still sets `shot.rolled` to every defender, so no block can touch it.
* All five steps are done. Media is current as of step 5; redo it with `tools/media/capture.mjs` if a film's timings move (the trailer cuts are timed to the films, see the comment in `trailer-plan.ts`).
* Layup and dunk presets: engine side in `engine/finish/` and `engine/drive.ts`, poses in `render/anim/finish/`, hands in `render/finish-hands.ts`. A new preset needs a `LayupKind` or `DunkStyle`, a spec row, a track, a pose top, a selection rule and a lab setup in `showcase/lab-presets.ts`.
* Blocks read `shot.evade` for how hard a layup is to get a hand on (`blocks/plan.ts`). A new block hit needs a `BlockHit`, a branch in `applyHit` and `chooseHit`, a follow through in `render/block-reach.ts`, and a lab row in `showcase/lab-blocks.ts`. A new shake reaction needs a `ShakeReact` row in `shake.ts` and a clip in `render/anim/shake-poses.ts`.
* Stills: `?lab=block-chase&step=1&cam=2.0,0.55,4.4,0.05,2.15,2.85,46` at frame 66 and `?lab=shake-ankles&step=1&cam=3.0,0.6,7.6,0,0.9,7.6,40` at frame 36 made the README pictures.
