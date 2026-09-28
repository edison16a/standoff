# Football 3v3

American football for 2 to 6 players, with phones held sideways as controllers. Each team has a QB, up to two runners, and three computer linemen who fight it out at the line. First to 14 points wins, or the higher score when four quarters run out.

This folder is built in steps. The engine and the rules are done. The 3D field and players, the host screens, the phones, audio and registration come next.

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

## Tests

```bash
npx vitest run src/games/football-3v3
```
