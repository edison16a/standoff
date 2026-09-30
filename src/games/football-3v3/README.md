# Football 3v3

American football for 2 to 6 players, with phones held sideways as controllers. Each team has a QB, up to two runners, and three computer linemen who fight it out at the line. First to 14 points wins, or the higher score when four quarters run out.

## Playing it

1. **Join.** Everyone scans the code on the big screen and picks one of six builds on their phone, a way to play (see Builds below). The build turns in 3D in the side's uniform beside its rating bars. Then Ready. The name each player typed is who they are everywhere: on the back of their jersey, their tag on the field, the callouts, the winners' names and the stats.
2. **Lobby.** Ready puts a player on the smaller side. On the big screen the host moves players between Storm, Blaze and the bench, picks each side's QB with the QB and Runner chips (the old QB becomes a runner), and sets the computer difficulty: Easy, Medium, Hard or Training. Computer players fill every empty place: the QB of a side with nobody on it, and runners up to two a side. A side with people always has a person at QB. One ready player is enough to kick off. The teams move right to stay clear of the join code in the corner.
3. **The game.** The big screen shows the broadcast: the score bug along the bottom, a callout above it for big moments (Touchdown, Field goal, Interception, Sack, First down), and a name tag over each phone's player on the field. The tags are the only names in play, so there is no second row of name boxes. A player whose phone dropped keeps the tag with (CPU) after the name while the computer plays for them.
4. **Touchdowns** are celebrated live, then replayed (see below), then the try.
5. **The trophy.** A few seconds after the final whistle the broadcast cuts to midfield for the presentation (see below). Then the end screen slides in on the right: the winners and the score, the player of the game, and every player's passing, rushing and receiving yards, touchdowns, tackles and interceptions. Play again keeps the teams; Change teams goes back to the lobby. After a tie there is no trophy and the end screen comes at once.

## Builds

A build is a way to play, not a person. Each one can be taken by one player, and the computer fills the rest with the builds nobody picked, a QB build at QB when one is free. Anyone can play anywhere; the host still picks the QB.

* **Gunslinger QB.** Stands tall in the pocket and fires. Arm 10: the fastest, tightest throws and the longest kicks.
* **Scrambler QB.** Escapes the rush and makes plays on the run. Agility 9, speed 8, a good arm.
* **Speedster.** Speed 10. Takes the top off the defence.
* **Power Back.** Power 10. Runs through arm tackles and slips the linemen's grabs.
* **Route Runner.** Hands 10 and agility 9. Sharp cuts, and catches anything near him.
* **Lockdown.** Cover 10 and power 8. Reads the throw, jumps the route and finishes tackles.

Every rating runs from 1 to 10 and changes play (`engine/build-effects.ts`, and `engine/body.ts` for running):

* **Speed** sets top speed.
* **Agility** sets how sharply a player turns and how soon they can juke again.
* **Power** sets how quickly a player gets going, how far a tackle reaches, and how often a ball carrier breaks a tackle that reached him or slips a lineman's grab. Only the stronger man breaks one, and never more than two in five.
* **Hands** set how far from the body a pass can be caught, for receivers and for defenders picking it off.
* **Arm** sets the speed and spiral of a throw and how far the QB kicks.
* **Cover** sets how wide a defender reads the throw: how far from the catch spot he jumps the route, how close to the ball's path he picks it off, and how often a computer defender knocks a pass down.

## The trophy presentation

The model is Soccer 3v3's World Cup ceremony, made for football from the victory kit (`src/games/kit/victory`).

1. **The cut** (`engine/ceremony.ts`). The winners celebrate where they stand for a few seconds, then the scene cuts to the star at midfield. The captain, the winners' best player on the day, holds the trophy at his chest. The runners stand either side and the linemen behind, with nobody straight behind him. The beaten side stands well back, heads down.
2. **The lift.** He looks down at it, kisses it, dips at the knees and drives it over his head, then pumps it and turns to show it round (`render/anim/trophy-poses.ts`). The trophy is placed between his hands every frame, so it rises with the real lift. His team claps, then leaps with fists up and crowds in close.
3. **The trophy** (`render/ceremony/trophy.ts`). Built in code: a silver regulation football with its seams and raised laces, set on a kicking tee in kicking position, over a faceted stand that sweeps in from a wide foot, on a black plinth.
4. **The set.** Spotlights fade up with the cut and flare as the trophy goes up. Confetti in the winners' colours fires from five cannons behind the team, then rains for the rest of the scene.
5. **The cameras** (`render/camera/ceremony-cam.ts`). A low hero shot in front of the captain that drifts round, pushes in and tilts up with the lift; a cut wide as the trophy goes up and a crane that rises across the front; then the kit's slow orbit. The top third stays clear for the names, and once the stats come in the team slides to the left of the picture.
6. **The names.** As the trophy goes up the winners' own names come up huge across the top in their colours, the captain first, with the score under them (the kit's `VictoryOverlay`). A side of computer players only is named by its team. A Stats button in the corner skips ahead.
7. **The sound.** The winners' fanfare at the whistle, quiet under the lift, then the stadium horn, the touchdown fanfare and the cannons as the trophy goes up, and the tailgate groove for the stats.

## The phone

Held sideways, like a controller: moving under the left thumb, the ball and the buttons under the right, and the score, the clock, the down and a status line in the middle. The layout follows what the player is doing right now, straight from the engine's `seatStatus`, and every change of layout lets go of anything held.

* **The call.** Before each play the QB gets three big tiles, Throw, Run and Kick, with the seconds left. After a touchdown: Kick for 1 or Go for 2.
* **The QB.** The same move stick as everyone on the left. Before the snap the middle is one big Hike button with the seconds left of the 5 second window. On the right the throw stick: hold it and push toward a receiver on the big screen, the one nearest that line lights up, and let go to throw. On a run call a big Pass button takes its place for the pitch. Juke and Run sit in the middle after the snap.
* **A runner** (and the QB once he presses Run or crosses the line): the run stick, Dive and Juke.
* **The defence:** the move stick, Rush, Guard (held) and Tackle. The defence never picks a play, so its pad stays up while the offense calls one, and defenders can move to set up (never across the line before the snap). After an interception the QB defends too.
* **The kicker:** a marker sweeps across the accuracy bar, stop it in the green; then one climbs the power bar, stop it high. The phone draws both meters on its own clock and sends the reading it showed, so lag never moves the kick.
* **Replay:** one Skip button and the tally.

**Sticks follow the camera.** A phone's stick is on the screen's axes. The host turns it into a field direction with the way up the screen from the camera (`renderer.director.groundForward()` through `host/steer.ts`), so up always runs up the screen and right runs right, even after the camera turns round for a turnover. The throw stick works the same way.

The pad buttons go through the gamepad kit. The play call, the kick readings and the throw stick are the game's own messages (`protocol/phone-messages.ts`): the throw stick streams while held and the release is sent reliably with its last reading.

## The touchdown replay

After the celebration the game waits and the big screen replays the play, cut into stages like a network replay (`host/replay/`):

1. **Aim**, from behind the QB over his shoulder, at a little under full speed.
2. **Throw**, in deep slow motion, with the ball's speed and the spiral's turns a minute on the card.
3. **Flight**, chasing the ball from behind with its path traced in a glowing line into the catcher's hands, with the air yards and the hang time.
4. **Run**, at full speed from behind the scorer as he runs and dodges into the end zone, with the yards after the catch and his top speed.

A touchdown on the ground is just the run. Any button on a phone is a vote to skip, and it takes everyone in the game; a phone that drops stops counting. The music steps back under it, with the broadcast swoosh in and out.

`MatchDriver` keeps every step's still for the last 16 seconds and holds the match at the end of the celebration. `scriptReplay` reads the clip for the snap, the throw, the catch and the score, and `ReplayDirector` plays it on the animation clock, blending stills for the slow motion.

## Sound

Everything is synthesised through the audio engine, with no crowd: the brass and the whistles carry the big moments.

* **Prime Time**, the game's theme: a big brass and drums broadcast theme in D major at 138, with trumpets on the fanfare, horns on the answer, trombones and tuba, driving strings, a marching snare that rolls into every turn, timpani and a crash on each section.
* **Tailgate**, the lobby and results: a laid back soul groove in F at 82 with a vibraphone, an electric piano, a round bass and brushes.
* **Stings:** a touchdown fanfare over a timpani roll, a lift for a good kick, a sinking line for a turnover or a miss, a bumper at the end of a quarter, the winners' fanfare, and the horn and fanfare as the trophy goes up.
* **Effects:** the officials' pealess whistle (one blast for a dead ball, a long one for a score, two short and a long for a quarter), pads cracking, bodies hitting the turf, the kick thump, the snap, the throw, the catch, cleats cutting, the stadium horn, and a soft chime for a first down.

## The host

`host/football-host.ts` is the session for one room: the lobby, the game, the replays, the sound and the phones. `host/inputs.ts` routes the room's events and the phones' messages; `host/match-driver.ts` runs the fixed steps; `host/publish.ts` writes the store for the big screen and each phone's state. The big screen is plain React over the 3D canvas in `host/components`.

**Admin shortcuts** (three quick taps on the settings gear), for the team with the ball: Touchdown, Field goal, Two point try and Win the game, which goes straight to the trophy presentation. They go through the real rules.

**Browser tests** can set `window.__footballTest` before the page loads (development only): `lowGpu`, `quarterSeconds`, `target` and `catchUp`. The host session is on `window.__football` and a phone's on `window.__footballPhone`.

**Phone pages** fit one iPhone 16 screen: `node tools/phone-fit.mjs --games football-3v3` walks every layout.

## The rules

* **Field.** A full size field in metres: 100 yards plus two 10 yard end zones, hash marks and goal posts on the end lines. Storm (team 0) attacks toward +x, Blaze the other way, all game.
* **Downs.** Four downs to gain 10 yards. Inside the 10 it is "and goal". Failing on fourth down hands the ball over at the spot.
* **Clock.** Four quarters of 150 seconds. The clock only runs while the ball is live. A play that starts runs to the whistle. Tied after four quarters, the next score wins.
* **Scoring.** A touchdown is 6, then the team picks a kick for 1 or a play from the 2 for 2. A field goal is 3. A safety is 2. Reaching 14 ends the game at once.
* **After a score** the other team starts at its own 25.

## A play

1. **Pick.** The QB picks throw, run or kick. A kick in range (58 yards or less) goes for the posts, anything longer is a punt. Ten seconds with no pick means throw. The defence can move while the offense decides.
2. **Hike.** The QB has 5 seconds to hike. After that the ball is snapped anyway. Nobody on defence crosses the line before the snap. The rush starts at the snap.
3. **Live.** The QB drops back and throws, or runs. Receivers run routes. Linemen crash together and push, and the defence slowly wins, so the pocket closes.
4. **Whistle.** A tackle, stepping out, an incomplete pass, a dive landing, or a score.

### Throwing

The throw stick draws an invisible aim line from the QB. The receiver nearest that line is the target and its ring lights up. Letting go throws. The throw leads the receiver's run and bends gently after a receiver who changes course, so a good throw does not miss. It can still be picked off: a defender standing in front of the target at the throw takes the ball, and a defender a person steers into the ball's path picks it off. A defender on Guard, or a computer defender, never jumps into the path.

The QB throws once a play, with the ball in hand, and his accuracy is the same on every throw. He can shuffle back while he throws.

**The QB and Run.** As a passer the QB is clearly slower than everyone else, slowest just after the snap while he sets up, then a little quicker a few seconds in (`QB_PACE` in `engine/tuning.ts`). To take off he presses Run. From then on he is the runner for the rest of the play: he cannot throw or pitch, his phone switches to the runner's pad with Juke and Dive, and he moves at a normal runner's speed (`engine/qb-run.ts`). Crossing the line with the ball does the same. Computer QBs press Run too, when nobody is open and there is grass ahead, or when the read goes on too long. A QB brought down after pressing Run is tackled, not sacked.

### Running the ball

On a run call one runner lines up beside the QB and a yard deeper, on the side with more room: a person's runner if there is one, so a player gets the carry. After the snap the QB presses Pass and lobs him the ball, a short soft pitch that leads his run (`engine/run-play.ts`). The ring shows who it is going to. There is no forward pass on a run call. A pitch counts as a run: nobody can pick it off, the yards are rushing yards, and one that hits the turf is dead where the play started. The QB can still press Run and keep it himself. Computer backs sweep wide and turn upfield, and computer QBs pitch a beat after the snap.

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

* The QB drops back, reads the receivers, throws to the most open one, and avoids throwing into a defender sat in front. With nobody open and room ahead, or when the read drags on, it presses Run and takes off.
* Receivers run slants, gos, outs, curls, drags and posts, and go to meet the ball.
* Defenders cover a receiver from over the top. A spare one rushes the QB on about half the plays and sits deep as a safety on the rest. A computer defender next to a pass can knock it down, but never catches it. Once someone has the ball they chase and tackle.
* It calls a run on about one play in four, and on half of them with three yards or less to go.
* On fourth down the bot kicks, a field goal in range or a punt, unless it is fourth and short past midfield.

## The engine

`engine/` is plain TypeScript with no drawing or sound. It steps at a fixed rate (`STEP`, 60 a second) and plays the same way from the same seed and inputs.

```ts
const match = new Match({ entries: buildLineup(signups), seed, level: "easy" });
match.setMove(id, { x, z });      // the move stick, in field space
match.setAim(id, { x, z });       // the throw stick while held; null lets go and throws
match.press(id, "juke");          // hike, juke, dive, rush, tackle, guard, kick, pass (the pitch), run (the QB takes off)
match.release(id, "guard");
match.choose(id, "throw");        // throw, run or kick; after a touchdown, kick or two
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

Files: `field` and `downs` for the field and the rules of downs, `motion` and `body` for running, `juke`, `tackle`, `guard` and `linemen` for contact, `flight`, `aim`, `passing` and `catching` for the ball in the air, `qb-run` for the QB's pace and the Run button, `run-play` for the run call and the pitch, `kick` and `kick-flight` for kicking, `whistle`, `score` and `phases` for how plays end and what comes next, `build-effects` for what each rating does, `ceremony` for the trophy presentation, `bots/` for the computer players.

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

* **Looks.** A jointed body with a helmet, shoulder pads under a printed jersey with big numbers front and back and the player's own name across the back (shrunk to fit a long one; the computer's players wear none), pants with a stripe, socks and cleats. Size follows height and weight. Each build has its own touches on top of its look: mask style (open, cage or tinted visor), sleeves, towels, neck rolls, locks under the helmet and eye black. Linemen share one big build.
* **Animation.** Every frame a figure picks a target pose from the engine's view, eases toward it, then stands itself on the turf: its lowest point touches the grass and its hips sit over the player's spot. So stances, dives and tackles land right without hand tuned heights. Action poses run on the engine's own action clock, so the body and the ball agree.
* **Moves.** Three point stances for linemen, the center's snap, the QB in the shotgun, receivers in a two point stance, the drop back, the throwing motion, running with the ball tucked under the arm, cuts, the spin, back move and side step, dives, tackle lunges, lying on the ground, rolling over and getting up, linemen locked together driving their legs, and reaching for a pass. Strides match the ground speed so the feet do not skate.
* **The throw.** The QB closes the chest with the ball by the right ear and the left shoulder at the target, steps, turns through, and finishes with the hand across the body by the left hip.
* **The line.** From the snap to the whistle each pair of linemen is locked together, low and driving. The engine marks them `blocked` for that, so the drawing never guesses.
* **Reaching.** The target and nearby defenders go up for a pass. The passer's own linemen leave it alone.
* **Rings.** A bold magenta ring with a white edge pulses under the receiver the throw stick is on (or the back on a run call), and stays lit on the receiver the ball was thrown to until it arrives. No team or seat wears magenta, so it is never mistaken for another ring. A thin ring in team trim marks each player a person controls.
* **The ball.** A laced football that follows the engine's flight: its long axis, the wobble and the spiral spin, or the tumble of a kick. Held, it sits in the carrier's hands.
* **Touchdowns.** The scorer spikes it if that is their style, and the ball bounces away. Everyone else celebrates their own way: a dance, a flex, a salute, a leap or a point to the crowd. At the end the winners celebrate and the losers hang their heads.

### The camera

* **Behind the play.** High behind the team with the ball, looking downfield. Before the snap and while the QB is in the pocket it keeps the whole formation in the picture, receivers split wide included: `camera/fit.ts` backs it straight up its line of sight until they fit, so a narrow screen sees the same players as a wide one. Once someone runs with the ball it comes in tighter behind them. It backs up and rises a little as a pass goes deep, turns round after a turnover and glides rather than jerks.
* **Phone sticks.** `renderer.director.groundForward()` is the way up the screen on the ground, in field space, for turning a phone's stick into a field direction that matches the camera.
* **Kicks.** Low behind the kicker through the posts, then up and after the ball.
* **Touchdowns.** A slow orbit round the scorer. At the final whistle, a wide orbit of the winners until the trophy presentation takes over with its own shots.
* A big hit shakes it a little. Any move that would sweep across the field cuts instead, like the lobby giving way to the game or the ball spotted far downfield.

### The scoreboard

`render/hud` has the broadcast score bug for the big screen: both teams with their scores and a dot for the side with the ball, the quarter and clock, down and distance with the spot, the play clock while a pick or a hike is due, and the target score. `scoreboard(view)` in `render/hud/board.ts` turns a view into its text.

### The showcase

`showcase/` makes the home screen media from a seeded game of computer players (seed 11) and its trophy presentation, drawn by the real renderer. `reel.ts` records every still of the game, so any moment can be shown at any speed and from any camera.

* The loop is a wordless eight second trailer (`trailer.ts`, cameras in `film-cams.ts`). The QB winds up and throws in slow motion from low in front of him. A camera rides the spiral. The receiver catches it, then side steps a diving tackler. A corner flies in and buries a runner on a juke, deep in slow motion. The captain lifts the trophy. The film runs in a circle, so its last frame cuts straight into its first and the clip loops with no seam.
* The icon is a cover: the runner in the big hit shot drives straight at the viewer with the ball, a beat before contact, the tackler flying in over his shoulder, from low on the turf under the FOOTBALL 3v3 logo. The still turns up the warm key light, so his front reads at a glance. The poster is the diving tackler reaching for the receiver as he leaps clear.
* `film-lights.ts` dims the stadium's fill and adds a hard rim light and a warm key that follow the camera, and the page grades the picture with more contrast and a vignette.

`trailer.test.ts` fails if an engine or bot change moves these moments, as a reminder to film again. To film them, with the dev server running:

```bash
node tools/media/capture.mjs football-3v3 --url http://localhost:3000 --ffmpeg /path/to/ffmpeg
```

For development: `?t=<seconds>` holds the trailer at that moment, and on a still `window.__fbHold(seconds)` moves the hold, for a review script. `?lab=<move>` shows the animation lab, where all six builds do one move on a loop next to a pair of linemen. The moves are idle, run, tuck, ready, throw, kick, spin, back, side, dive, lunge, down, tackled, celebrate, spike, stance, block and catch. A spin turns the whole body round, as the engine does in a game.

## Tests

```bash
npx vitest run src/games/football-3v3
```
