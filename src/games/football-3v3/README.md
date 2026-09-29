# Football 3v3

American football for 2 to 6 players, three a side, on a full size field. Phones are held sideways as controllers. Each side has a quarterback and up to two runners, and six computer linemen fight it out at the line on every snap. First to 14 wins, or whoever leads when the fourth quarter runs out.

This folder holds the game's rules engine so far. The 3D renderer, the host screens, the phone controls, audio, the replay and registration come next and plug into the engine through `engine/index.ts`.

## The rules

* **The field.** 100 yards plus two 10 yard end zones, NFL hash marks and goal posts on the end lines. Units are yards. Red attacks the right end zone (+x), Blue the left, for the whole game.
* **Drives.** A drive starts first and ten from the team's own 25. Ten yards for a first down, four downs to get them. Inside the 10 it is goal to go. A failed fourth down hands the ball over where it lies.
* **The call.** Before each play the quarterback calls Kick or Throw. Kick is a field goal when the posts are within 57 yards, otherwise a punt. A call left for 12 seconds is made by the computer.
* **The hike.** The quarterback has 5 seconds to hike. Then the ball is snapped anyway and the rush is on.
* **Scoring.** A touchdown is 6. Then the scoring side picks Kick for one (an extra point from the 15) or Throw to go for two (a play from the 2). A field goal is 3 and a safety is 2.
* **The clock.** Four quarters of 90 seconds. The clock runs only while the ball is live or a kick is in the air. The other side gets the ball to start the second half. A tie after four goes to sudden death.
* **After a score.** The other side starts at its own 25. After a safety the side that scored gets the ball. Missed field goals give the ball back at the line, or the 20. Punts are downed where they land, or go back to the 20 from the end zone.

## How it plays

* **Heavy bodies.** Players have mass, drive, braking and grip. They take seconds to reach top speed, turn in a circle that widens with speed, and have to plant a foot to cut. Heavier players feel heavier.
* **Quarterback.** Slower than the runners. A move bar and a throw stick. The throw stick draws an invisible line out from him, and the receiver nearest that line lights up. Letting go throws to him.
* **Assisted throws.** The throw is aimed where the receiver will be, so it never misses a receiver who keeps running. A defender standing in front of the target always intercepts it. One who gets into the ball's path may pick it or tip it, and one draped on the receiver may knock it away.
* **Jukes.** Stick forward or centred is a 360 spin, back is a back move, to the side a side step. A juke sheds pace. Each one adds heat that cools off, and spamming them makes the jukes, the cooldown and the running slower. A tackle that arrives during a juke whiffs.
* **Dives.** A dive gains a couple of yards and ends the play, with the ball stretched out ahead. Across the goal line it scores. Without the ball it reaches further for a catch.
* **Defence.** Rush sheds blocks far sooner. Tackle lunges at the carrier if he is close enough. A whiff leaves the tackler on the grass for a while. Guard, held down, tails one runner but can never intercept: only a player steering himself in front of the ball can.
* **The line.** Three linemen a side meet at the snap and push back and forth. Offensive linemen hold up rushers until they shed the block.
* **The ball.** A spiral flies with gravity and quadratic drag. The long axis swings over to follow the path and a nutation wobble dies away. Spin and wobble come from the arm and the pressure. Kicks tumble end over end with more drag.
* **Kicking.** An accuracy bar sweeps left to right, and its green centre is dead straight. Then a power bar goes up and down. The phone runs its own bars and sends where it stopped them, so lag never moves a kick.
* **Computer players.** Receivers run routes from a playbook: slant, go, out, curl, drag and post. The computer quarterback reads the field and throws to the open man, earlier under pressure. Defenders play man coverage, rush with the spare man, chase the carrier and tackle. Difficulty comes from `src/games/kit/difficulty`: Easy by default, and in Training they stand still.

## The engine

Pure TypeScript with no browser code. Everything is deterministic from the seed, so a replay or a test plays out the same way every time.

* `match.ts` creates a game and steps it at a fixed 60 steps a second: `stepMatch(state, commands)`.
* `types.ts` and `athlete-types.ts` hold the state. `tuning.ts` and `tuning-flight.ts` hold every number that sets the feel.
* `flow.ts` runs the call, the hike window, quarters and the end. `whistle.ts` ends plays, scores and moves on. `live.ts` steps a live play. `downs.ts` moves the chains.
* `body.ts`, `athlete.ts` and `collide.ts` are the heavy movement and bumps. `juke.ts`, `dive.ts`, `tackle.ts` and `guard.ts` are the moves.
* `aim.ts` and `pass.ts` are the assisted throw, catches and interceptions. `ball.ts` is the spiral. `kick.ts`, `kick-flight.ts` and `meters.ts` are kicking.
* `linemen.ts` is the fight at the line. `routes.ts` is the playbook. `bot-*.ts` are the computer players.

### For the renderer

`viewOf(state)` returns a plain snapshot: every athlete with action, juke, stride and whether his ring is lit (`targeted`), the six linemen, the ball with its nose direction (wobble included), roll, spin and tumble, the line of scrimmage and first down line, the down and distance, the clock and the score. `state.lastScore.celebration` says whether the scorer spikes the ball or dances. `events.ts` lists what happened each step, such as pads hitting, a throw, a tackle or a score, for sound and the camera.

### For the host and phones

* `buildLineup` fills the sides with computer players and makes sure each has one quarterback, a human one when the side has a human.
* Commands are in field directions, one per athlete per step: `move`, the throw stick `aim` and `throw` on release, `juke`, `dive`, `tackle`, held `rush` and `guard`, `hike`, the `call`, and the stopped kicking bars `kickAim` and `kickPower`.
* `seatControls(state, seat)` tells a phone which controls to show: call, hike, pocket, runner, defense, kick or wait, with the time left and the bar to stop.
* `setOnline(state, seat, online)` lets a computer play for a phone that dropped.
* `PlayTape` records the last play from the snap, with the throw's speed in mph, spin in rpm and wobble, for the touchdown replay. The match waits in the `replay` phase until the host calls `endReplay`.
* `adminTouchdown`, `adminFieldGoal` and `adminTwoPoint` are the admin panel's test shortcuts, played through the real rules.

## Tests

```bash
npx vitest run src/games/football-3v3
```

They cover the body model, the spiral, routes, the line up, downs, kicking bars and field goal range, assisted throws, interceptions, jukes, tackles, sacks, dives, guard, the line, calls, the hike window, touchdowns through the try, safeties, quarters, full games between computer teams, and the play tape.
