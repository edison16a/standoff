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

## Notes for later steps

* Shot outcome today: `engine/shot-release.ts` plans a release error from the make chance through the calibration table, and `engine/shot-forced.ts` draws errors until the physics gives a chosen ending. Step 2 can build on `forcedLaunch` to fly an authored outcome.
* A gold release reaches `forcedLaunch(..., "swish")` and sets `shot.rolled` to every defender, so no block can touch it. Keep that true when the outcome picker lands (step 2).
* Step 2 to 5 are still to do: shot outcome presets, layup and dunk presets, dribble, shake and block presets, then polish and media. The media (README stills, `docs/screenshots/nba-3v3.jpg`, the icon and the trailer) were not redone in step 1 on purpose; step 5 redoes them once the animations land.
* Layup and dunk poses live in `render/anim/layups.ts` and `render/anim/dunks.ts`; the engine side is `engine/drive.ts`, `engine/finish.ts` and `engine/dunk-style.ts`.
