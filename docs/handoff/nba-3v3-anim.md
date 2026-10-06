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

## Notes for later steps

* Shot endings: layups and floaters (step 3) go through `launchShot`, so they get the picker and the solver for free. A new finish only needs a sensible `ReleaseInput` (family, hand point, apex, spin). A finish that must end a set way can call `solvePreset` with that ending.
* A gold release still sets `shot.rolled` to every defender, so no block can touch it.
* Step 3 to 5 are still to do: layup and dunk presets, dribble, shake and block presets, then polish and media. The media (README stills, `docs/screenshots/nba-3v3.jpg`, the icon and the trailer) were not redone in step 1 on purpose; step 5 redoes them once the animations land.
* Layup and dunk poses live in `render/anim/layups.ts` and `render/anim/dunks.ts`; the engine side is `engine/drive.ts`, `engine/finish.ts` and `engine/dunk-style.ts`.
