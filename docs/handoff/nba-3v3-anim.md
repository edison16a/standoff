# Basketball 3v3: animation presets handoff

The owner's request is in the workflow scratchpad (`anim/owner-request.md`). Goal: NBA 2K feel. Hand made animation presets that the game logic picks before a move starts, blended with the physics underneath (ball flight, torus rim, cloth net), never pure physics floating.

## Step 1: controls and modes

Done:

* Free throw hold fix. Shoot at the line stays held as long as the thumb or key is held, and lets go at any time (`engine/free-throw-hold.test.ts`, `phone/shoot-button.ts`).
* Gold window. `SHOT.goldShare` and `SHOT.goldMinMs` in `engine/tuning.ts`; `goldHalfMs` and the `gold` grade in `engine/shot-model.ts`. The green is a little narrower than before. Gold is a forced swish in `engine/shot-launch.ts` (no hand reaches it, it never banks, a foul still lets it drop). Phone meter, big screen tag meter, gold flash word, gold haptics, gold chime (`audio/sfx.ts`), gold sparks and trail plus a glass light (`render/effects/gold-release.ts`). Tests in `engine/gold-release.test.ts`.
* Keyboard binding in `keyboard/`. Keys map to whichever phone button does that job in the play.

Left for step 1 is listed at the end of this file while it is in progress.

## Notes for later steps

* Shot outcome today: `engine/shot-release.ts` plans a release error from the make chance through the calibration table, and `engine/shot-forced.ts` draws errors until the physics gives a chosen ending. Step 2 can build on `forcedLaunch` to fly an authored outcome.
* A gold release reaches `forcedLaunch(..., "swish")`. Keep that true when the outcome picker lands.
* Layup and dunk poses live in `render/anim/layups.ts` and `render/anim/dunks.ts`; the engine side is `engine/drive.ts`, `engine/finish.ts` and `engine/dunk-style.ts`.
