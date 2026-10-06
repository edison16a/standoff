# Boxing

Status: ready.

A 3D boxing match played with your body in front of the computer's camera. There are no phones and no join code. A pose model downloads once to the player's own computer and runs in the browser, and nothing from the camera leaves the computer.

## How to play

1. **Choose players.** One player fights the computer. Two players stand side by side in front of one camera, player 1 on the left of the picture. Pick with the mouse. Computer difficulty sits under the choices: Easy (the default), Medium, Hard or Training.
2. **Get the camera ready.** The kit asks for the camera and downloads the body tracking model with a progress bar. Every problem, from a blocked camera to no internet, says what to do and has a Try again button.
3. **Calibrate.** The camera only needs you from the waist up: your head, shoulders and gloves. Step into your outline and stand tall while your ring fills, which sets your head line, then show your guard (both gloves up by your face) and throw one jab. Skip this step is there for a camera that struggles.
4. **Choose your build.** A build is how you box, not who you are: your own name stays on your trunks, over your health bar and on the results. Each card shows the build's power, speed, reach, defense and stamina out of five. Lean left or right to browse, then drop your hands and hold your guard up to lock in. A guard still up from calibration does not count. The mouse works too. With one player the computer takes a different build.
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

### Keyboard mode

For testing without a camera, pick **Keyboard** beside the difficulty in the first menu. Then **One player** goes straight to choosing a build, with no camera and no calibration, and you box the computer with the keys. Two players need the camera, so that card is greyed out.

| Key | Move |
| --- | --- |
| J | Jab |
| K | Cross |
| U | Left hook |
| I | Right hook |
| A and D, or Left and Right | Slip the head, for as long as it is held |
| S or Down | Duck, for as long as it is held |
| S held while punching | The punch goes to the body, as dipping the knees does on camera |
| Space | Guard: both gloves in front of the face. Also gets you up from a knockdown: let go, then hold it |
| Shift | Both gloves up by the ears, against hooks |
| F | Elbows tucked over the ribs, against body shots |
| E | Both gloves held out, to touch gloves |

On the build choice, A and D browse and Space locks in. Everything else is clicked. The keys feed the very same input the camera does (`host/key-boxer.ts`): the head eases to a full slip or duck in about a tenth of a second, the gloves cover what a real guard covers, and a punch thrown from a key is a firm one. As on camera, the feet move by themselves and there is no uppercut. The keys only count in keyboard mode, so a camera fight never fights them.

The host's admin panel has a **Keyboard player** for testing (three quick taps on the settings gear, then Platform). It takes a seat and says hello, and the first menu switches to keyboard mode by itself. Its controls card shows the keys above. Each key goes through the room down and up (`keyboard.ts`, `host/key-messages.ts`), and the page's own key listener skips any key the keyboard player already took, so each press counts once.

About fifteen clean body shots empty the health bar, and a head shot does two and a half times as much. A big head shot or a counter to the head stuns: the stunned boxer reels back to their corner, their guard barely works and they cannot punch, and the other boxer follows them in and pins them there for a moment. A boxer who has just been hurt, or has taken a run of shots, punches slower and softer for a few seconds, marked Hurt on their bar. Every punch also costs stamina (the blue bar under your health), and a tired boxer is slower and softer too.

At the bell the boxers walk to their corners and sit on their stools. Each gets back about two and a half body shots' worth of health, then they walk out to the middle, touch gloves and go again. A fight ends on a knockout, on the third knockdown, or on points after the final bell.

The boxers move like real boxers, each in their build's style. They circle, switching direction now and then, rock in and out of range, step back out after a combination, and circle off the ropes.

| Build | Good at | Pays for it | In the fight |
| --- | --- | --- | --- |
| Slugger | Power 5 | Speed 2, stamina 2 | Hits 30% harder. Hands 18% slower, punches cost 15% more stamina. Walks you down and cuts off the ring. |
| Out Boxer | Speed 5, reach 5 | Power 2 | Hands 20% quicker. Long arms follow a moving head 35% further, so it takes a bigger slip or duck to get away. Hits 15% softer. Fights from range and never stands still. |
| Counter Puncher | Defense 5 | Nothing stands out | Gloves cover 20% more. The counter window after a block or a dodge stays open 55% longer, and counters hit 25% harder. Boxes in the middle of the road. |
| Swarmer | Stamina 5, speed 4 | Reach 2, defense 2 | Punches cost 28% less stamina and it comes back 45% faster. Hands 10% quicker. Shorter reach and a leakier guard. Right in your chest. |

The numbers are in `engine/builds.ts`, and a test checks that every card's bars rank the builds the same way their effects do.

The computer boxer lights up its gloves while it winds up a punch, so you can see it coming. It covers the right spot, ducks and slips, mixes in body shots, counters, and gets quicker and sharper every round.

The difficulty tilts its round by round table in `engine/ai-difficulty.ts`. Medium is the table as tuned. Easy winds up longer, waits longer between attacks, blocks, dodges and counters less often and stays down longer. Hard does the opposite. In Training the computer is a sparring partner: it holds its spot and never punches, blocks or dodges, but still touches gloves and gets up after a knockdown.

When the fight is decided, after the knockout replay or a moment on the winner, the results open on the ceremony. The picture cuts to the champion in the middle of the ring holding the championship belt at the chest, who dips and presses it up over their head, holds it high with a pump of the arms now and then and turns to show it round the arena. The loser slumps back on the ropes in their corner. Cannons fire confetti from the corner posts, more keeps raining down, spotlights fade up on the champion, and the camera opens wide and swings in. The champion's name goes up big in gold across the top, with the build and how they won under it. A panel in the bottom left corner has the scorecards and each boxer's numbers, a column per boxer, with the buttons under them. The loser always slumps on the right of the picture, so the panel never hides anyone. A draw skips the belt.

If a player steps out of view the fight pauses with a clear message, and it gives everyone a moment to set themselves when they are back. Once the fight is decided players can walk off freely.

Each player's view sits behind and out past their boxer's right shoulder, so their own boxer stands to the left and the opponent is seen whole, gloves and all.

With two players the screen splits down the middle during the rounds, player 1 on the left. A small map at the top right shows which half is whose, each name in its player's colour. The walk out, the breaks and the end are one wide broadcast picture, with one set of health bars across it.

## What was built

* `engine/` pure fight logic with tests:
  * `match.ts` the seeded match and its referee, with `rounds.ts` (the walk out, touching gloves, the rounds and the rest on the stools) and `count.ts` (knockdowns and the count).
  * `reach.ts` where a punch aims and how squarely it finds the head as it lands, `cover.ts` how much of it the gloves are in the way of, and `resolve.ts` and `landing.ts` what it does: damage, stuns, counter windows. `fatigue.ts` wears a punished boxer down.
  * `builds.ts` the four builds: their stat bars and what each changes, from damage and hand speed to reach, guard, counters, stamina and footwork.
  * `footwork.ts` and `ring-craft.ts` the boxers' feet, in the styles of `styles.ts`, and `ai.ts` the computer boxer, whose head and gloves come from `stance.ts` and go through the same rules as a player's.
  * `scoring.ts` the ten point must scorecards.
* `host/` the session on the computer: the camera kit, the flow from choosing players to the results, the fight driver that steps the match and pauses it for a player out of view, the player's defence and punches from the camera (`head-reader.ts` turns the kit's head against its line, in shoulder widths, into the boxer's head with a light ease, and `gloves.ts` scores each glove for covering the face, the side of the head and the body, and spots both arms held out to touch gloves), the mirrored arms, choosing builds by leaning, the overlay's data, and records against the computer kept in this browser (`localStorage`, guarded for private windows).
* `render/` three.js:
  * `models/` a sculpted body for each build, with its own face, hair and kit colours, and muscle, faces painted on a canvas that bruise and swell with damage, sweat that builds through the rounds, satin trunks with the player's own name across the front of the waistband and the build round the sides, laced gloves and boots, and the referee in shirt and bow tie.
  * `rig/` and `anim/` joints posed every frame with two bone inverse kinematics. The player's own arms, read from the camera, drive their boxer's arms like a mirror, and the trunk and head follow the same head spot the match judges punches on, for players and the computer alike. A detected punch is boosted into a full powered strike at the opponent's face or body. Planted feet that step as the boxers circle, head snaps, a stagger, a knockdown fall, gloves out to touch, sitting on the stool, a victory pose, and a referee who counts with his arm.
  * `arena/` a ring on its platform with branded canvas, apron, four ropes, turnbuckles, steps and stools, a lighting truss with lamps and light shafts, ringside boards, a big screen, and an instanced crowd that jumps with the excitement and pops camera flashes.
  * `fx/` hit sparks and flashes, sweat spray that lands on the canvas and glove bursts on blocks. `cameras/` the over the shoulder view with camera shake, and the broadcast camera. `replay.ts` records the fight so a knockout ends on a slow motion replay of the blow.
* `audio/` every sound synthesised through `room.audio` buses, so the player's music and effects volumes rule it:
  * **Music:** two songs, each sixteen bars with an A and a B section, played by a lookahead scheduler through a warm low pass (`music.ts`, with the notes written as text in `score.ts`).
    * "Hand Wraps" plays in the menus and on the results (`lobby-song.ts`, `lounge.ts`). A slow locker room soul tune in A flat major at 76. A string pad swells under every bar and hands each chord to the next, so it never stops. A muted flugelhorn sings the A section and a vibraphone answers in the B section, over a Rhodes, a sub bass and a brushed kit.
    * "Corner Work" plays under the fight (`fight-song.ts`, `band.ts`, `grit.ts`). Gritty boom bap in C minor at 88. Two horns blow the hook together through the A section. In the B section one horn answers while the section punches chord stabs under it. The swung kit is pushed into a soft clipper like a sampler run hot, with a sub bass, a dark held chord that wobbles like old tape, a dusty piano chop, vinyl crackle and a record scratch on the turnaround. It sits as a bed under the crowd, ducks for knockdowns and the replay, and the results open with a brass fanfare.
  * **Gloves:** a swish as a punch leaves, leather landing in layers (slap, thump, and a ring in the rafters for a big one) sized by weight, blocks, whooshes on a miss and the fall. Every repeat varies a little in pitch.
  * **Ring:** the bell, the ten second clapper, the referee's count and a counter ping.
  * **Crowd:** a murmur that follows the excitement, gasps, cheers and roars, and chants (`chant.ts`): a two syllable name chant on the stomp and the stadium clap with a shout. They start at the introductions, between rounds, when a boxer beats the count, and by themselves when the arena is worked up.
  * **Commentator** (`commentator.ts`): the browser's speech voice calls the introductions, each new round, knockdowns, the finish and the winner, and now and then a counter or a big shot. Its volume follows the player's effects level.
* `showcase/` the home screen's media. The clip is an eleven second wordless trailer: close and low cuts through a scripted exchange, a body shot that drops the blue corner, a cut over the count once he beats it (`timeline.ts`), the knockout hook tight in slow motion, the fall seen from the canvas, and a low angle on the champion lifting the belt under the spotlights. The poster is key art of the knockout hook landing, the puncher held at full stretch while the other boxer's knees go (`still.ts`). The icon is a fight poster of its own (`icon-art.ts`): the red champion big and close under a hard ring light, his right hook coming round level toward the lens, and the blue boxer sagging to his knees behind him. A hard side light and a film grade are added for the showcase only. On the showcase page, `?hold=` and `?after=` change the still's moment, in milliseconds after the blow, and on the icon `?hold=` may be negative to catch the hook before it lands.

## Flow on the computer

`host/boxing-host.ts` walks through five screens kept in `host/host-store.ts`: players, setup (the kit's `ModelLoader`, then `CameraCalibrate` with the guard and jab step), pick, fight and results. The 3D picture is always behind them: a demo fight between two computer boxers behind the menus, then `render/director.ts` chooses each frame between the players' over the shoulder views and the broadcast camera for the walk out, the breaks, the replay and the winner. `room.setPlaying(true)` is called as a fight starts and `false` at the results or on leaving it.

## Testing

While a fight runs, the host's hidden admin panel (three quick taps on the settings gear) has a button for either boxer to win on the spot, straight to the ceremony. `render/victory/` holds the ceremony: `ceremony.ts` places the boxers, the belt and the spotlights, and `champion-pose.ts` times the lift, with tests. The belt, confetti, spotlights and camera come from the victory kit. In development, `/dev/victory/boxing` plays the ceremony under the real results from a short demo fight (`?step=0.1` moves its clock a tenth of a second a frame, for slow software rendering), and `/dev/boxing/builds` shows the build choice (`?players=2` for two) without a camera.

`?camera=fake` (or `tools/testing/fake-camera.js`) runs the whole game without a camera; drive players with `window.__cameraKit`. A pose with both arms `{ punch: 1 }` touches gloves, `crouch` ducks and `lean` or `x` slips. In development `window.__boxing` is the session, `window.__boxingRoundMs` changes the round length and `window.__boxingRenderScale` draws at a lower resolution on software WebGL. Every number that shapes a fight, from the round length to how much a head shot does, is in `engine/rules.ts`.

Play again skips calibration: the baselines stay on the kit. Choose builds goes back to the picks, and Menu back to choosing players, which turns the camera off until the next fight.
