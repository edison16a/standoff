# Boxing

Status: ready.

A 3D boxing match played with your body in front of the computer's camera. There are no phones and no join code. A pose model downloads once to the player's own computer and runs in the browser, and nothing from the camera leaves the computer.

## How to play

1. **Choose players.** One player fights the computer. Two players stand side by side in front of one camera, player 1 on the left of the picture. Pick with the mouse.
2. **Get the camera ready.** The kit asks for the camera and downloads the body tracking model with a progress bar. Every problem, from a blocked camera to no internet, says what to do and has a Try again button.
3. **Calibrate.** Step into your outline, stand tall while your ring fills, then show your guard (both gloves up by your face) and throw one jab. Skip this step is there for a camera that struggles.
4. **Choose your boxer.** Lean left or right to browse, then hold your guard up to lock in. The mouse works too. With one player the computer takes a different boxer.
5. **Fight.** Three rounds of 60 seconds. The boxers move and circle by themselves; you only fight.

| Move | What you do |
| --- | --- |
| Jab | Punch straight at the screen with your left hand |
| Cross | Punch straight with your right hand |
| Hook | Swing a fist in across your face with the elbow up |
| Block | Both gloves up in front of your face. Almost no damage gets through |
| Duck | Dip your head and shoulders. Every punch misses |
| Slip | Lean to one side. Straight punches miss, hooks still land |
| Counter | After a block, a duck or a slip, a left jab in the next moment hits hard and staggers |
| Get up | When you are knocked down, raise both gloves before the referee reaches ten |

You cannot block while punching, and every punch costs stamina (the blue bar under your health). A tired boxer punches slower and softer. A fight ends on a knockout, on the third knockdown, or on points after the final bell.

The computer boxer lights up its gloves while it winds up a punch, so you can see it coming. It blocks, ducks and counters, and gets quicker and sharper every round.

If a player steps out of view the fight pauses with a clear message, and it gives everyone a moment to set themselves when they are back.

## What was built

* `engine/` pure fight logic with tests: the seeded match and its referee (rounds, the clock, punches judged as they land, blocks, ducks and slips, counter windows, stagger, stamina, knockdowns with a count, the ten point must scorecards), the boxers' footwork, and the computer boxer.
* `host/` the session on the computer: the camera kit, the flow from choosing players to the results, the player's defence and punches from the camera, the mirrored arms, choosing boxers by leaning, the overlay's data, and records against the computer kept in this browser (`localStorage`, guarded for private windows).
* `render/` three.js:
  * `models/` four sculpted boxers (Rocco "The Hammer" Vance, Marcus "Night Train" Cole, Kenji "Lightning" Sato, Diego "El Toro" Reyes) with muscle, faces painted on a canvas that bruise and swell with damage, sweat that builds through the rounds, satin trunks with names on the waistband, laced gloves and boots, and the referee in shirt and bow tie.
  * `rig/` and `anim/` joints posed every frame with two bone inverse kinematics. The player's own arms, read from the camera, drive their boxer's arms like a mirror, and a detected punch is boosted into a full powered strike at the opponent's face. Planted feet that step as the boxers circle, head snaps, stagger, a knockdown fall, corner rests, a victory pose, and a referee who counts with his arm.
  * `arena/` a ring on its platform with branded canvas, apron, four ropes, turnbuckles, steps and stools, a lighting truss with lamps and light shafts, ringside boards, a big screen, and an instanced crowd that jumps with the excitement and pops camera flashes.
  * `fx/` hit sparks and flashes, sweat spray that lands on the canvas, glove bursts on blocks and confetti for the winner. `cameras/` the over the shoulder view with camera shake, and the broadcast camera. `replay.ts` records the fight so a knockout ends on a slow motion replay of the blow.
* `audio/` every sound synthesised through `room.audio` buses: gloves landing by weight, blocks, whooshes, the bell, the ten second clapper, the referee's count, the fall, a counter ping, and a crowd that murmurs, gasps, cheers and roars.
* `showcase/` a scripted exchange that ends in a slow motion knockout, cut like a trailer, for the home screen's icon, poster and clip.

## Flow on the computer

`host/boxing-host.ts` walks through five screens kept in `host/host-store.ts`: players, setup (the kit's `ModelLoader`, then `CameraCalibrate` with the guard and jab step), pick, fight and results. The 3D picture is always behind them: a demo fight between two computer boxers behind the menus, then `render/director.ts` chooses each frame between the players' over the shoulder views and the broadcast camera for the walk out, the breaks, the replay and the winner. `room.setPlaying(true)` is called as a fight starts and `false` at the results or on leaving it.

## Testing

`?camera=fake` (or `tools/testing/fake-camera.js`) runs the whole game without a camera; drive players with `window.__cameraKit`. In development `window.__boxing` is the session, `window.__boxingRoundMs` shortens the rounds and `window.__boxingRenderScale` draws at a lower resolution on software WebGL.

Play again skips calibration: the baselines stay on the kit. Choose boxers goes back to the picks, and Menu back to choosing players.
