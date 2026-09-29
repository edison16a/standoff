# Football 3v3

American football for 2 to 6 players, with phones held sideways as controllers. Each team has a QB, up to two runners, and three computer linemen who fight it out at the line. First to 14 points wins, or the higher score when four quarters run out.

This folder is built in steps. The engine, the rules and the 3D drawing are done. The host screens, the phones, audio and registration come next.

## The rules

* **Field.** A full size field in metres: 100 yards plus two 10 yard end zones, hash marks and goal posts on the end lines. Storm (team 0) attacks toward +x, Blaze the other way, all game.
* **Downs.** Four downs to gain 10 yards. Inside the 10 it is "and goal". Failing on fourth down hands the ball over at the spot.
* **Clock.** Four quarters of 150 seconds. The clock only runs while the ball is live. A play that starts runs to the whistle. Tied after four quarters, the next score wins.
* **Scoring.** A touchdown is 6, then the team picks a kick for 1 or a play from the 2 for 2. A field goal is 3. A safety is 2. Reaching 14 ends the game at once.
* **After a score** the other team starts at its own 25.

## A play

1. **Pick.** The QB picks kick or throw. A kick in range (58 yards or less) goes for the posts, anything longer is a punt. Ten seconds with no pick means throw.
2. **Hike.** The QB has 5 seconds to hike. After that the ball is snapped anyway. Nobody on defence crosses the line before the snap. The rush starts at the snap.
3. **Live.** The QB drops back and throws, or runs. Receivers run routes. Linemen crash together and push, and the defence slowly wins, so the pocket closes.
4. **Whistle.** A tackle, stepping out, an incomplete pass, a dive landing, or a score.

### Throwing

The throw stick draws an invisible aim line from the QB. The receiver nearest that line is the target and its ring lights up. Letting go throws. The throw leads the receiver's run and bends gently after a receiver who changes course, so a good throw does not miss. It can still be picked off: a defender standing in front of the target at the throw takes the ball, and a defender a person steers into the ball's path picks it off. A defender on Guard, or a computer defender, never jumps into the path.

The QB throws once a play, from behind the line. Past the line the QB is a runner.

### Running and defending

* **Juke.** The stick against the run picks the move: ahead or no stick is a 360 spin, back is a back move, across is a side step. Jukes slow the runner. There is a cooldown, and each juke in quick succession comes out slower and leaves the legs heavier.
* **Dive.** A burst forward. A ball carrier is down where they land. A receiver can dive for a catch with a longer reach.
* **Rush.** A short burst that pushes through the line far more easily.
* **Tackle.** A lunge, only when the ball carrier is close enough. A runner mid juke makes it miss, and the tackler stays down for a while.
* **Guard.** Held, the defender tails the nearest receiver on their own. Trailing like that never puts them in front of the ball.

Everyone runs with weight: a player gets going over a couple of seconds, curves on a wide radius at speed, and needs room to stop. Heavier players get going slower.

### Kicking

Two meters. A marker sweeps left and right: stop it in the green for a straight kick. Then a marker climbs and falls: stop it high for a long one. Field goals tumble end over end; punts spiral and bounce.

### The ball

A spiral spins about its long axis, its nose tips over to follow the arc, and it wobbles a little around that line, more for a weak arm or a throw under pressure. Drag is lower nose first than side on, so a tight spiral carries farther than a tumbling kick.

## Computer players

Difficulty comes from `src/games/kit/difficulty`: Easy (the default), Medium, Hard and Training. It sets how quickly bots react, how well they read the field, tackle and kick, and how hard they run. In Training they stand still.

* The QB drops back, reads the receivers, throws to the most open one, and avoids throwing into a defender sat in front. With nobody open, it runs.
* Receivers run slants, gos, outs, curls, drags and posts, and go to meet the ball.
* Defenders cover a receiver from over the top. A spare one rushes the QB on about half the plays and sits deep as a safety on the rest. A computer defender next to a pass can knock it down, but never catches it. Once someone has the ball they chase and tackle.
* On fourth down the bot kicks, a field goal in range or a punt, unless it is fourth and short past midfield.

## The engine

`engine/` is plain TypeScript with no drawing or sound. It steps at a fixed rate (`STEP`, 60 a second) and plays the same way from the same seed and inputs.

```ts
const match = new Match({ entries: buildLineup(signups), seed, level: "easy" });
match.setMove(id, { x, z });      // the move stick, in field space
match.setAim(id, { x, z });       // the throw stick while held; null lets go and throws
match.press(id, "juke");          // hike, juke, dive, rush, tackle, guard, kick
match.release(id, "guard");
match.choose(id, "throw");        // throw or kick; after a touchdown, kick or two
match.step(STEP);
const view = buildView(match);    // everything the renderer and HUD need
const events = match.drainEvents(); // hikes, throws, catches, tackles, kicks, scores
const pad = seatStatus(match, seat); // which controls a phone should show
```

* `buildView` gives plain numbers: players with their action and its clock, the ball with its axis and spin, the lines of scrimmage and first down, down and distance, the kick meters, the clock and score. `blendViews` mixes two for slow motion replays.
* `match.lastPass` keeps the last throw's release, speed and spin for the touchdown replay.
* Sticks come in field space. The host turns a phone's stick into field space for its camera.
* The kick meters run from `meterAim` and `meterPower`. A phone can draw them itself from `seatStatus(...).meter` and send its own reading with the press.
* A phone that drops is played by the computer with `setAuto`.
* `admin.ts` has the shortcuts for the host's admin panel: `adminTouchdown`, `adminFieldGoal` and `adminTwoPoint`. They go through the real rules.

Files: `field` and `downs` for the field and the rules of downs, `motion` and `body` for running, `juke`, `tackle`, `guard` and `linemen` for contact, `flight`, `aim`, `passing` and `catching` for the ball in the air, `kick` and `kick-flight` for kicking, `whistle`, `score` and `phases` for how plays end and what comes next, `bots/` for the computer players.

## Drawing the game

`render/` draws the match with three.js. It reads only `buildView` stills, so live play and slow motion replays draw the same way.

```ts
const renderer = new MatchRenderer(canvas, { quality: "high" });
renderer.resize(width, height, devicePixelRatio);
for (const event of match.drainEvents()) renderer.onEvent(event);
renderer.draw(buildView(match), performance.now());
const board = scoreboard(view); // for <Scoreboard board={board} />
```

### The stadium

* **Field.** One painted texture: grass mowed in 5 yard bands, yard lines, hash marks at every yard, the numbers 10 to 50 facing their sideline, both end zones in team colours with the team name, a star at midfield and the white border. The layout is plain data in `field/marks.ts`.
* **Goal posts.** Yellow slingshot posts on both end lines, with the crossbar and uprights where the engine scores kicks, and a ribbon on each tip.
* **Around it.** Team benches, a bowl of stands, a crowd of thousands in team colours that bounce harder after a score, four light towers and a night sky.
* **TV lines.** The blue line of scrimmage and the yellow first down line sit on the grass under the players. They glide to the new spot between plays and hide at goal to go.

### The players

* **Looks.** A jointed body with a helmet, shoulder pads under a printed jersey with big numbers front and back and the name across the back, pants with a stripe, socks and cleats. Size follows height and weight. Each star has their own touches on top of the roster look: mask style (open, cage or tinted visor), sleeves, towels, neck rolls, locks under the helmet and eye black. Linemen share one big build.
* **Animation.** Every frame a figure picks a target pose from the engine's view, eases toward it, then stands itself on the turf: its lowest point touches the grass and its hips sit over the player's spot. So stances, dives and tackles land right without hand tuned heights. Action poses run on the engine's own action clock, so the body and the ball agree.
* **Moves.** Three point stances for linemen, the center's snap, the QB in the shotgun, receivers in a two point stance, the drop back, the throwing motion, running with the ball tucked under the arm, cuts, the spin, back move and side step, dives, tackle lunges, lying on the ground, rolling over and getting up, linemen locked together driving their legs, and reaching for a pass. Strides match the ground speed so the feet do not skate.
* **The throw.** The QB closes the chest with the ball by the right ear and the left shoulder at the target, steps, turns through, and finishes with the hand across the body by the left hip.
* **The line.** From the snap to the whistle each pair of linemen is locked together, low and driving. The engine marks them `blocked` for that, so the drawing never guesses.
* **Reaching.** The target and nearby defenders go up for a pass. The passer's own linemen leave it alone.
* **Rings.** A yellow ring pulses under the receiver the throw stick is on, and stays lit on the receiver the ball was thrown to until it arrives. A thin ring in team trim marks each player a person controls.
* **The ball.** A laced football that follows the engine's flight: its long axis, the wobble and the spiral spin, or the tumble of a kick. Held, it sits in the carrier's hands.
* **Touchdowns.** The scorer spikes it if that is their style, and the ball bounces away. Everyone else celebrates their own way: a dance, a flex, a salute, a leap or a point to the crowd. At the end the winners celebrate and the losers hang their heads.

### The camera

* **Behind the play.** High behind the team with the ball, looking downfield. Before the snap and while the QB is in the pocket it keeps the whole formation in the picture, receivers split wide included: `camera/fit.ts` backs it straight up its line of sight until they fit, so a narrow screen sees the same players as a wide one. Once someone runs with the ball it comes in tighter behind them. It backs up and rises a little as a pass goes deep, turns round after a turnover and glides rather than jerks.
* **Phone sticks.** `renderer.director.groundForward()` is the way up the screen on the ground, in field space, for turning a phone's stick into a field direction that matches the camera.
* **Kicks.** Low behind the kicker through the posts, then up and after the ball.
* **Touchdowns.** A slow orbit round the scorer. At the final whistle, a wide orbit of the winners.
* A big hit shakes it a little. A shot change that would sweep across the field cuts instead.

### The scoreboard

`render/hud` has the broadcast score bug for the big screen: both teams with their scores and a dot for the side with the ball, the quarter and clock, down and distance with the spot, the play clock while a pick or a hike is due, and the target score. `scoreboard(view)` in `render/hud/board.ts` turns a view into its text.

### The showcase

`showcase/` plays a seeded bot match under the lights with the score bug. For development: `?seed=` and `?seek=` (seconds to jump ahead), `?quality=low`, `?cam=x,y,z,lookX,lookY,lookZ,fov` to pin the camera, and `?lab=<move>` for the animation lab, where all six stars do one move on a loop next to a pair of linemen. The moves are idle, run, tuck, ready, throw, kick, spin, back, side, dive, lunge, down, tackled, celebrate, spike, stance, block and catch. A spin turns the whole body round, as the engine does in a game.

## Tests

```bash
npx vitest run src/games/football-3v3
```
