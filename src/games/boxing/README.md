# Boxing

Status: ready.

A 3D boxing match played with your body in front of the computer's camera. There are no phones and no join code. A pose model downloads once to the player's own computer and runs in the browser, and nothing from the camera leaves the computer.

## How to play

1. **Choose players.** One player fights the computer. Two players stand side by side in front of one camera, player 1 on the left of the picture. Pick with the mouse.
2. **Get the camera ready.** The kit asks for the camera and downloads the body tracking model with a progress bar. Every problem, from a blocked camera to no internet, says what to do and has a Try again button.
3. **Calibrate.** The camera only needs you from the waist up: your head, shoulders and gloves. Step into your outline and stand tall while your ring fills, which sets your head line, then show your guard (both gloves up by your face) and throw one jab. Skip this step is there for a camera that struggles.
4. **Choose your boxer.** Lean left or right to browse, then drop your hands and hold your guard up to lock in. A guard still up from calibration does not count. The mouse works too. With one player the computer takes a different boxer.
5. **Touch gloves.** The boxers walk out to the middle. Hold both gloves straight out in front of you until they touch. The computer boxer does it by itself. If nobody does, the bell goes anyway after a few seconds.
6. **Fight.** Four rounds of 20 seconds. The boxers move their feet by themselves; you only fight with your upper body.

Your boxer copies your whole upper body: your arms, and your head as you duck, lean, shift about, bob and weave. Every punch is judged on where your boxer's head and gloves really are as it lands.

| Move | What you do |
| --- | --- |
| Jab | Punch straight at the screen with your left hand |
| Cross | Punch straight with your right hand |
| Hook | Swing a fist in across your face with the elbow up |
| Body shot | Punch low, at the height of your chest, or dip your knees as you punch |
| Block a jab or a cross | Both gloves in front of your face |
| Block a hook | The glove on that side up by your ear. A plain guard only takes half of it |
| Block a body shot | Elbows down and tucked in by your ribs |
| Dodge | Move your head out of the way before the punch arrives: dip under it, or slip to the side. A hook sweeps across, so only a duck gets under it. A punch aims where your head is as it winds up, so move late, as it comes |
| Counter | After a block or a dodge, a left jab in the next moment hits hard and stuns |
| Get up | When you are knocked down, drop your gloves and raise both again before the referee reaches ten |

Gloves that only half cover a punch take only part of the damage away, and a head that only half gets away turns it into a glancing blow. You cannot block while punching.

About fifteen clean body shots empty the health bar, and a head shot does two and a half times as much. A big head shot or a counter to the head stuns: the stunned boxer reels back to their corner, their guard barely works and they cannot punch, and the other boxer follows them in and pins them there for a moment. A boxer who has just been hurt, or has taken a run of shots, punches slower and softer for a few seconds, marked Hurt on their bar. Every punch also costs stamina (the blue bar under your health), and a tired boxer is slower and softer too.

At the bell the boxers walk to their corners and sit on their stools. Each gets back about two and a half body shots' worth of health, then they walk out to the middle, touch gloves and go again. A fight ends on a knockout, on the third knockdown, or on points after the final bell.

The boxers move like real boxers, each in their own style. They circle, switching direction now and then, rock in and out of range, step back out after a combination, and circle off the ropes. Rocco is a pressure fighter who walks you down and cuts off the ring. Diego swarms, right in your chest. Kenji is an out boxer who fights from long range and never stands still. Marcus does a bit of everything.

The computer boxer lights up its gloves while it winds up a punch, so you can see it coming. It covers the right spot, ducks and slips, mixes in body shots, counters, and gets quicker and sharper every round.

If a player steps out of view the fight pauses with a clear message, and it gives everyone a moment to set themselves when they are back. Once the fight is decided players can walk off freely.

Each player's view sits behind and out past their boxer's right shoulder, so their own boxer stands to the left and the opponent is seen whole, gloves and all.

## What was built

* `engine/` pure fight logic with tests:
  * `match.ts` the seeded match and its referee, with `rounds.ts` (the walk out, touching gloves, the rounds and the rest on the stools) and `count.ts` (knockdowns and the count).
  * `reach.ts` where a punch aims and how squarely it finds the head as it lands, `cover.ts` how much of it the gloves are in the way of, and `resolve.ts` and `landing.ts` what it does: damage, stuns, counter windows. `fatigue.ts` wears a punished boxer down.
  * `footwork.ts` and `ring-craft.ts` the boxers' feet, in the styles of `styles.ts`, and `ai.ts` the computer boxer, whose head and gloves come from `stance.ts` and go through the same rules as a player's.
  * `scoring.ts` the ten point must scorecards.
* `host/` the session on the computer: the camera kit, the flow from choosing players to the results, the fight driver that steps the match and pauses it for a player out of view, the player's defence and punches from the camera (`head-reader.ts` turns the kit's head against its line, in shoulder widths, into the boxer's head with a light ease, and `gloves.ts` scores each glove for covering the face, the side of the head and the body, and spots both arms held out to touch gloves), the mirrored arms, choosing boxers by leaning, the overlay's data, and records against the computer kept in this browser (`localStorage`, guarded for private windows).
* `render/` three.js:
  * `models/` four sculpted boxers (Rocco "The Hammer" Vance, Marcus "Night Train" Cole, Kenji "Lightning" Sato, Diego "El Toro" Reyes) with muscle, faces painted on a canvas that bruise and swell with damage, sweat that builds through the rounds, satin trunks with names on the waistband, laced gloves and boots, and the referee in shirt and bow tie.
  * `rig/` and `anim/` joints posed every frame with two bone inverse kinematics. The player's own arms, read from the camera, drive their boxer's arms like a mirror, and the trunk and head follow the same head spot the match judges punches on, for players and the computer alike. A detected punch is boosted into a full powered strike at the opponent's face or body. Planted feet that step as the boxers circle, head snaps, a stagger, a knockdown fall, gloves out to touch, sitting on the stool, a victory pose, and a referee who counts with his arm.
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

`?camera=fake` (or `tools/testing/fake-camera.js`) runs the whole game without a camera; drive players with `window.__cameraKit`. A pose with both arms `{ punch: 1 }` touches gloves, `crouch` ducks and `lean` or `x` slips. In development `window.__boxing` is the session, `window.__boxingRoundMs` changes the round length and `window.__boxingRenderScale` draws at a lower resolution on software WebGL. Every number that shapes a fight, from the round length to how much a head shot does, is in `engine/rules.ts`.

Play again skips calibration: the baselines stay on the kit. Choose boxers goes back to the picks, and Menu back to choosing players.
