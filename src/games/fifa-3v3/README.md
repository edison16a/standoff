# FIFA 3v3

Status: ready.

Three on three football under the floodlights for up to six phones. A computer goalkeeper stands in each goal, and computer players fill any empty places. The stars have their own looks, stats and goal celebrations.

## How to play

1. Host FIFA 3v3 from the home screen. Computer players kick about behind the lobby while everyone joins.
2. On each phone: type a name, pick a star (a turning 3D preview with their stats; stars someone else has are marked), then tap Ready.
3. On the big screen the host puts each player on Red or Blue with the mouse. Empty places are filled by computer players, three a side. Press Kick off.
4. First to five goals, or the most goals after four minutes. Level at the end means golden goal: the next goal wins.
5. At full time the results show everyone's goals, shots, passes and tackles. Play again keeps the same teams; Change teams goes back to the lobby.

### The controller

Hold the phone sideways.

* **Thumb stick (left):** run, relative to the screen. With the ball you dribble on your own.
* **Shoot (big red button):** kicks the ball the way the stick points. Hold it a moment for more power, and let go to kick.
  * Pointing roughly at a team mate passes to them, leading them if they are running. Short passes with a clear lane go along the ground; long ones, or ones with a defender in the way, are lofted over.
  * Pointing roughly at goal shoots at that side of the goal. Picking the corner the keeper left open helps.
  * Pointing anywhere else plays the ball into space that way.
  * With the stick centred it shoots when in range, and otherwise passes to the best team mate.
  * Pressed just before the ball reaches you, it kicks first time.
  * Without the ball, Shoot calls for it from a computer team mate.
* **Slide (orange button):** a slide tackle in the stick's direction. Strength, timing and the angle decide who wins; from behind is hardest. A miss leaves you on the floor for a moment.

The phone buzzes for kicks, passes, tackles and goals, and shows your team, the score and the clock.

## The shot model

Every shot's outcome is decided when it is struck, from the distance, the angle, the shooter's shooting stat, pressure from defenders, where the keeper stands and which side you aimed at. About one shot in twenty hits the post or the bar and about one in twenty flies over. Then the ball is flown with real physics (spin, drag, bounces), aimed so it does exactly what was decided: into the corner, into the keeper's gloves, parried back into play, off the woodwork, or over. The net bulges and the post rings.

## The roster

`roster.ts` holds every star: name, number, stylised look (build, height, skin, hair, beard, boots, kit), the four stats (speed, shooting, strength, dribbling) and the goal celebration. Edit it there and everything follows.

## Code map

* `engine/`: the pure match with tests. `play.ts` runs a step, `assist.ts` reads the stick for a kick, `kick.ts` and `passing.ts` strike the ball, `shot-odds.ts` and `shot-aim.ts` decide and aim shots, `keeper*.ts` the goalkeepers, `tackle.ts` slides and challenges, `bots.ts` and `bot-shape.ts` the computer players, `rules.ts` kickoffs, restarts and full time.
* `render/`: three.js. The arena (pitch, boards, goals with nets, stands, crowd, floodlights), the players built from the roster, animations, effects (grass spray, confetti, fireworks) and the broadcast camera.
* `host/`: the room on the big screen: lobby, match driver, goal replays, HUD, results, and what each phone is sent.
* `phone/`: the setup steps and the controller, on the kit's gamepad.
* `audio/`: the crowd, the announcer (speech synthesis), effects and music, through `room.audio` buses.
* `protocol/`: the zod schemas for messages both ways.
* `showcase/`: the game playing itself for the home screen's icon, poster and clip.

Players who leave are played by a computer until they come back, and a host that reconnects sends every phone its state again.
