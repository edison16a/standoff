# Soccer 3v3

Status: ready.

Three on three football on a big floodlit pitch for up to six phones. A computer goalkeeper stands in each goal, and computer players fill any empty places. The stars have their own looks, stats and goal celebrations.

## How to play

1. Host Soccer 3v3 from the home screen. Computer players kick about behind the lobby while everyone joins.
2. On each phone: type a name, pick a star (a turning 3D preview with their stats; stars someone else has are marked), then tap Ready.
3. On the big screen the host puts each player on Red or Blue with the mouse. Empty places are filled by computer players, three a side. Press Kick off.
4. First to five goals, or the most goals after four minutes. Level at the end means golden goal: the next goal wins.
5. At full time the results show everyone's goals, shots, passes and tackles. Play again keeps the same teams; Change teams goes back to the lobby.

### The controller

Hold the phone sideways.

* **Thumb stick (left):** run, relative to the screen. With the ball you dribble on your own.
* **Shoot/Pass (big red button):**
  * **Tap to pass.** Pointing roughly at a team mate passes to them, leading them if they are running. Short passes with a clear lane go along the ground; long ones, or ones with a defender in the way, are lofted over. Pointing anywhere else plays the ball into space that way. With the stick centred it finds the best pass.
  * **Hold to shoot.** After a fifth of a second a charge bar pops up on the phone, and a small one over your player on the big screen. It fills from left to right through green, yellow and red. Let go to shoot: green is a placed shot, yellow a strong one, red full power. More power means less accuracy, and a red shot can fly wide or balloon over the bar. The bar stops at full; hold on a little longer and the shot goes by itself at full power.
  * The shot goes where the stick points. Toward goal it aims at that part of the goal; up or down the screen picks the far or the near side; centred leaves it to the game.
  * Pressed and let go just before the ball reaches you, the pass or shot is played first time.
  * Without the ball, Shoot/Pass calls for it from a computer team mate.
* **Slide (orange button):** a slide tackle in the stick's direction. Strength, timing and the angle decide who wins; from behind is hardest. A miss leaves you on the floor for a moment.
* **Skill (the same button, purple, while you have the ball):** a skill move picked by the stick against the goal you attack.
  * Forward: a rainbow flick, the ball rolled up the back of the leg and over the defender's head.
  * Left or right: a crossover to that side, or an elastico for the best dribblers.
  * Back: a drag back under the sole, turning away.
  * Centred: a 360 roulette, spinning away from the nearest defender.
  * Done at a close defender it can leave them wrong footed for a moment. Moves have a short cooldown, and spamming them, or running one straight into a man or a sliding boot, can give the ball away. Computer players use them too.

The phone buzzes for kicks, passes, tackles and goals, and shows your team, the score and the clock.

## The shot model

Every shot's outcome is decided when it is struck, from the distance, the angle, the shooter's shooting stat, pressure from defenders, where the keeper stands, which side you aimed at and the power from the charge bar. A placed green shot hits the post or the bar about one time in twenty and flies over about as often; a red one sprays wide or over far more, but is harder to save when it is on target. Then the ball is flown with real physics (spin, drag, bounces), aimed so it does exactly what was decided: into the corner, into the keeper's gloves, parried back into play, off the woodwork, or over. The net bulges and the post rings.

A ball over the end boards is a goal kick: the keeper rolls it out to a team mate up the pitch. Only a shot that misses is called over the bar or wide.

## The roster

`roster.ts` holds every star: name, number, stylised look (build, height, skin, hair, beard, boots, kit), the four stats (speed, shooting, strength, dribbling) and the goal celebration. Edit it there and everything follows.

## Sound

Everything is synthesised through the room's audio buses.

Music: "Beach Kickabout" plays in the lobby and on the results, a D major bossa at 108 with a marimba hook over nylon guitar, shaker and clave. "Golden Hour" plays under the match, an A minor afro house groove at 118 with a steel pan hook and a falling log drum bass, mixed lower so the crowd leads. Both run eight bars with an A and a B section, through a warm low pass. A brass sting and timpani mark every goal and a fanfare the full time whistle, and the loop steps aside for them.

Effects have a sharp hit, a body and a tail into a synthetic stadium reverb, each pitched a little differently every time: strikes, passes, tackles, slides, saves, the post and the bar, the net, the boards, the referee's whistle, the goal horn and fireworks. The crowd murmurs and rises as the ball nears a goal, roars for goals, goes "ooh" at near misses, groans, applauds and starts up a clapping chant now and then. There is no spoken commentary.

## Code map

* `engine/`: the pure match with tests. `play.ts` runs a step, `buttons.ts` turns the two buttons into passes, shots, slides and skill moves, `charge.ts` is the charge bar shared with the phone, `assist.ts` reads the stick for a pass or a shot, `kick.ts` and `passing.ts` strike the ball, `shot-odds.ts` and `shot-aim.ts` decide and aim shots, `keeper*.ts` the goalkeepers, `tackle.ts` slides and challenges, `skills.ts` and `skill-moves.ts` the skill moves, `bots.ts`, `bot-shape.ts` and `bot-skill.ts` the computer players, `rules.ts` kickoffs, restarts and full time.
* `render/`: three.js. The arena (pitch, boards, goals with nets, stands, crowd, floodlights), the players built from the roster, animations, effects (grass spray, confetti, fireworks) and the broadcast camera.
  * Players are animated by where their feet go. `engine/stride.ts` sets the running rhythm, and both the simulation and the drawing use it. The dribble touch lands on the lead boot's swing. `anim/gait.ts` pins each foot to the turf for its stance. `anim/leg-ik.ts` solves the legs to reach those spots. `anim/kicks.ts` and `anim/skill-poses.ts` steer a boot onto the ball where it is drawn, so the ball stays at the feet. `figures/athlete-figure.ts` cross fades from one move to the next.
* `host/`: the room on the big screen: lobby, match driver, goal replays, HUD, results, and what each phone is sent.
* `phone/`: the setup steps and the controller, on the kit's gamepad.
* `audio/`: the crowd, effects and music, through `room.audio` buses. There is no spoken commentary.
* `protocol/`: the zod schemas for messages both ways.
* `showcase/`: the game playing itself for the home screen's icon, poster and clip.

Players who leave are played by a computer until they come back, and a host that reconnects sends every phone its state again.
