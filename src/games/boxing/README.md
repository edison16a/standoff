# Boxing

Status: ready.

A 3D boxing match played with your body in front of the computer's camera. There are no phones and no join code. A pose model downloads once to the player's own computer and runs in the browser, and nothing from the camera leaves the computer.

## How to play

1. **Choose players.** One player fights the computer. Two players stand side by side in front of one camera, player 1 on the left of the picture. Pick with the mouse.
2. **Get the camera ready.** The kit asks for the camera and downloads the body tracking model with a progress bar. Every problem, from a blocked camera to no internet, says what to do and has a Try again button.
3. **Calibrate.** The camera only needs you from the waist up: your head, shoulders and gloves. Step into your outline and stand tall while your ring fills, which sets your head line, then show your guard (both gloves up by your face) and throw one jab. Skip this step is there for a camera that struggles.
4. **Choose your boxer.** Lean left or right to browse, then drop your hands and hold your guard up to lock in. A guard still up from calibration does not count. The mouse works too. With one player the computer takes a different boxer.
5. **Fight.** Three rounds of 60 seconds. The boxers move and circle by themselves; you only fight.

| Move | What you do |
| --- | --- |
| Jab | Punch straight at the screen with your left hand |
| Cross | Punch straight with your right hand |
| Hook | Swing a fist in across your face with the elbow up |
| Block | Both gloves up in front of your face. Almost no damage gets through |
| Duck | Dip your head under its line. Every punch misses |
| Slip | Move your head to one side, by leaning or by shifting your shoulders. Straight punches miss, hooks still land |
| Counter | After a block, a duck or a slip, a left jab in the next moment hits hard and staggers |
| Get up | When you are knocked down, drop your gloves and raise both again before the referee reaches ten |

You cannot block while punching, and every punch costs stamina (the blue bar under your health). A tired boxer punches slower and softer. A fight ends on a knockout, on the third knockdown, or on points after the final bell.

The computer boxer lights up its gloves while it winds up a punch, so you can see it coming. It blocks, ducks and counters, and gets quicker and sharper every round.

If a player steps out of view the fight pauses with a clear message, and it gives everyone a moment to set themselves when they are back. Once the fight is decided players can walk off freely.

Each player's view sits behind and out past their boxer's right shoulder, so their own boxer stands to the left and the opponent is seen whole, gloves and all.

## What was built

* `engine/` pure fight logic with tests: the seeded match and its referee (rounds, the clock, punches judged as they land, blocks, ducks and slips, counter windows, stagger, stamina, knockdowns with a count, the ten point must scorecards), the boxers' footwork, and the computer boxer.
* `host/` the session on the computer: the camera kit, the flow from choosing players to the results, the fight driver that steps the match and pauses it for a player out of view, the player's defence and punches from the camera (a duck is the kit's head dropping under its line, and a slip is the kit's lean or the head shifting quickly sideways from where it has been resting, in `slip.ts`), the mirrored arms, choosing boxers by leaning, the overlay's data, and records against the computer kept in this browser (`localStorage`, guarded for private windows).
* `render/` three.js:
  * `models/` four sculpted boxers (Rocco "The Hammer" Vance, Marcus "Night Train" Cole, Kenji "Lightning" Sato, Diego "El Toro" Reyes) with muscle, faces painted on a canvas that bruise and swell with damage, sweat that builds through the rounds, satin trunks with names on the waistband, laced gloves and boots, and the referee in shirt and bow tie.
  * `rig/` and `anim/` joints posed every frame with two bone inverse kinematics. The player's own arms, read from the camera, drive their boxer's arms like a mirror, and a detected punch is boosted into a full powered strike at the opponent's face. Planted feet that step as the boxers circle, head snaps, stagger, a knockdown fall, corner rests, a victory pose, and a referee who counts with his arm.
  * `arena/` a ring on its platform with branded canvas, apron, four ropes, turnbuckles, steps and stools, a lighting truss with lamps and light shafts, ringside boards, a big screen, and an instanced crowd that jumps with the excitement and pops camera flashes.
  * `fx/` hit sparks and flashes, sweat spray that lands on the canvas, glove bursts on blocks and confetti for the winner. `cameras/` the over the shoulder view with camera shake, and the broadcast camera. `replay.ts` records the fight so a knockout ends on a slow motion replay of the blow.
* `audio/` every sound synthesised through `room.audio` buses, so the player's music and effects volumes rule it:
  * **Music:** "Corner Work", a laid back hip hop groove in D minor at 94 (`band.ts`, `tune.ts`, `music.ts`). Sixteen bars: a mellow horn hook in the A section, a vibraphone answer in the B section, over a Rhodes, a sub bass, a dusty swung kit and a little vinyl crackle, all under a warm low pass. It plays full in the menus, drops to a bed under the crowd during a fight, ducks for knockdowns and the replay, and comes back up for the results with a brass fanfare.
  * **Gloves:** a swish as a punch leaves, leather landing in layers (slap, thump, and a ring in the rafters for a big one) sized by weight, blocks, whooshes on a miss and the fall. Every repeat varies a little in pitch.
  * **Ring:** the bell, the ten second clapper, the referee's count and a counter ping.
  * **Crowd:** a murmur that follows the excitement, gasps, cheers and roars, and chants (`chant.ts`): a two syllable name chant on the stomp and the stadium clap with a shout. They start at the introductions, between rounds, when a boxer beats the count, and by themselves when the arena is worked up.
  * **Commentator** (`commentator.ts`): the browser's speech voice calls the introductions, each new round, knockdowns, the finish and the winner, and now and then a counter or a big shot. Its volume follows the player's effects level.
* `showcase/` a scripted exchange that ends in a slow motion knockout, cut like a trailer, for the home screen's icon, poster and clip.

## Flow on the computer

`host/boxing-host.ts` walks through five screens kept in `host/host-store.ts`: players, setup (the kit's `ModelLoader`, then `CameraCalibrate` with the guard and jab step), pick, fight and results. The 3D picture is always behind them: a demo fight between two computer boxers behind the menus, then `render/director.ts` chooses each frame between the players' over the shoulder views and the broadcast camera for the walk out, the breaks, the replay and the winner. `room.setPlaying(true)` is called as a fight starts and `false` at the results or on leaving it.

## Testing

`?camera=fake` (or `tools/testing/fake-camera.js`) runs the whole game without a camera; drive players with `window.__cameraKit`. In development `window.__boxing` is the session, `window.__boxingRoundMs` shortens the rounds and `window.__boxingRenderScale` draws at a lower resolution on software WebGL.

Play again skips calibration: the baselines stay on the kit. Choose boxers goes back to the picks, and Menu back to choosing players.
