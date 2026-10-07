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
* **Power** sets how quickly a player gets going, how far a tackle reaches, how hard a tackler's grip holds, and a ball carrier's leg drive and balance, so a strong back runs through arm tackles and stays up through bumps (see The physics).
* **Hands** set how far from the body a pass can be caught and how surely it is held, for receivers and for defenders picking it off, and how securely a carrier holds the ball in a big hit.
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

Held sideways, like a controller: moving under the left thumb, the ball and the buttons under the right, and a slim middle with the player's side, role and a status line. The score, the clock and the down stay on the big screen, so the buttons on the right take that room: they size themselves to the space the phone has, with the main action the biggest. The layout follows what the player is doing right now, straight from the engine's `seatStatus`, and every change of layout lets go of any button held.

The QB, runner and defence pads share one move stick that stays on screen between them (`phone/pad-layout.ts`). A thumb steering the QB keeps steering him through the switch when he presses Run, with no reset.

* **The call.** Before each play the QB gets three big tiles, Throw, Run and Kick, with the seconds left. After a touchdown: Kick for 1 or Go for 2.
* **The QB.** The same move stick as everyone on the left. Before the snap the middle is one big Hike button with the seconds left of the 5 second window. On the right the throw stick with the throw meter beside it: touch it and the meter starts, push toward a receiver on the big screen (the one nearest that line lights up), and let go in the green to throw. On a run call a big Pass button takes its place for the pitch. Juke and Run sit in the middle after the snap.
* **After the pass.** A QB who throws or pitches to a computer teammate takes him over for the rest of the play: the phone switches to the runner's pad and says "You have the receiver" (or the back). See One player control below.
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

**Keyboard player** (admin panel, Platform group) plays a seat with the keys (`keyboard/`): W A S D move, E jukes, Q dives, Space hikes, holds the throw meter and lets go to throw (or pitches on a run call), the arrows or the mouse aim the throw (the left mouse button throws too), Shift takes off as a runner or rushes on defence, F tackles, G holds Guard, 1 2 3 call Throw, Run and Kick (after a touchdown 1 kicks and 2 goes for two), and Space stops the kick meters and skips a replay. It sends exactly what the phone would.

**Admin shortcuts** (three quick taps on the settings gear), for the team with the ball: Touchdown, Field goal, Two point try and Win the game, which goes straight to the trophy presentation. They go through the real rules.

**Browser tests** can set `window.__footballTest` before the page loads (development only): `lowGpu`, `fullPicture` (the full broadcast picture held at its top rung, to check the look in software drawing), `quarterSeconds`, `target` and `catchUp`. The host session is on `window.__football` and a phone's on `window.__footballPhone`.

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
4. **Whistle.** A tackle, stepping out, an incomplete pass, a dive landing, or a score. A fumble stays live until someone picks it up, or until it goes out or lies dead, when the side that had it keeps it there.

### Throwing

The QB always turns square to his target to throw: he drops back with his eyes downfield, snaps his shoulders round to the receiver through the motion and follows through along the throw (`engine/passer-facing.ts`). He used to face his own run, so a throw made while drifting back left his hand with his back to the field.

The throw stick draws an invisible aim line from the QB. The receiver nearest that line is the target and its ring lights up. Letting go throws. The throw is solved to lead the receiver's run, then leaves the hand a little off, as a real throw does: the arm sets how far, and a pass rusher in the QB's face makes it worse. From there it is a real ball in the air. Once it is up, the receiver reads it and his legs take him to meet it, a person's receiver too unless he pushes the stick well away.

Who gets it is decided where the ball meets the hands (see The physics). A defender sitting in front of the target at the throw reads it and breaks on the ball, and a defender a person steers can pick it off too. A computer defender only knocks passes down. A defender on Guard never plays the ball.

The QB throws once a play, with the ball in hand. Moving or standing makes no difference to his aim. He can shuffle back while he throws.

* **Throw presets** (`engine/throw-preset.ts`). The game logic picks the throwing motion as the throw starts, from how far the ball goes, how fast the QB moves and how close the rush is. A short ball off set feet is a quick **flick**. A long one is a **bomb** with a full wind up and a long stride. Moving fast he throws **on the run** with the legs still going. With a rusher in his face he fades away **under pressure**, the arm coming round lower and sooner. The ball leaves the hand on that motion's own release frame, from the right hand, with the QB square to his target.
* **Catch presets** (`engine/catch-preset.ts`, `engine/catch/plan.ts`). Half a second before a pass arrives, every player going for it gets a move from how it will reach him. At the chest he bends his knees, catches it and turns upfield. Over his head he loads and **high points** it in the air, then lands. Led past where he can run he **dives** and lays out, leaving the ground just in time. From behind it is an **over the shoulder** catch. Hot or with a defender on him he hauls it in and **stumbles** with it. The hands still decide; the result picks how the move finishes. Held, it goes into the chest and away under the arm. Dropped, the hands fly open. A drop with a defender within a metre was a hit that **jarred** it loose, and he staggers.
* **Picks and swats.** A defender who reads a throw leaps and **picks** it off. A computer defender in the lane gets a hand up and **swats** it down, leaping only as high as the ball needs. A bad ball from the meter is easier for both.

### The throw meter

Like Basketball's shot meter (`engine/pass-meter.ts`). Touching the throw stick starts a marker that climbs the bar in a second and falls back again, round and round, so the QB can take his time to find a receiver. Let go in the green for a good pass; in the thin gold band in its middle, a window of under thirty milliseconds, for a perfect one. Below the green the ball comes out weak, above it too hot. A better arm gets a wider green; the gold is the same for everyone.

| Timing | Accuracy | Velocity | Catchability | Interception risk |
| --- | --- | --- | --- | --- |
| Gold | the line almost exact, a tight spiral | a firm ball | drops a fifth as often | nobody reads it; picks a quarter as likely |
| Green | a little tighter than a plain throw | a touch firmer | drops less often | a little lower |
| Weak | off line, a wobbly floater | hangs in the air | as usual | defenders read it from further and pick it more |
| Too hot | off line | a fastball | pops out of the hands far more | a little higher |

How far outside the green it stopped makes a miss worse. The phone draws the bar on its own clock and sends how long it ran with the throw, so the grade is what the player saw. The big screen hangs the same bar beside the QB while he holds it, then the word for how it came out. Computer QBs stop the marker near the middle, closer the harder they are, so a hard QB finds the green most of the time and the gold now and then.

### One player control

Like Madden: a person who throws or pitches the ball to a computer teammate takes that teammate over the moment the ball leaves the hand, and the computer plays the passer (`engine/control.ts`). The phone's stick and buttons steer the receiver, and its pad turns to the runner's. The team ring flies across the turf from the passer to the receiver and pulses there, and the name tag follows. A phone never takes a player another person owns. When the next play lines up, everyone has their own player back. A phone that drops while steering a teammate leaves him to the computer.

**The QB and Run.** As a passer the QB is clearly slower than everyone else, slowest just after the snap while he sets up, then a little quicker a few seconds in (`QB_PACE` in `engine/tuning.ts`). To take off he presses Run. From then on he is the runner for the rest of the play: he cannot throw or pitch, his phone switches to the runner's pad with Juke and Dive, and he moves at a normal runner's speed (`engine/qb-run.ts`). Crossing the line with the ball does the same. Computer QBs press Run too, when nobody is open and there is grass ahead, or when the read goes on too long. A QB brought down after pressing Run is tackled, not sacked.

### Running the ball

On a run call one runner lines up beside the QB and a yard deeper, on the side with more room: a person's runner if there is one, so a player gets the carry. After the snap the QB presses Pass and lobs him the ball, a short soft pitch that leads his run (`engine/run-play.ts`). The ring shows who it is going to. There is no forward pass on a run call. A pitch counts as a run: nobody can pick it off, the yards are rushing yards, and one that hits the turf is dead where the play started. The QB can still press Run and keep it himself. Computer backs sweep wide and turn upfield, and computer QBs pitch a beat after the snap.

### Running and defending

* **Juke.** The stick against the run picks the move: ahead or no stick is a 360 spin, back is a back move, across is a side step. Jukes slow the runner. There is a cooldown, and each juke in quick succession comes out slower and leaves the legs heavier.
* **Dive.** A burst forward. A ball carrier is down where they land. A receiver can dive for a catch with a longer reach.
* **Rush.** A short burst that pushes through the line far more easily.
* **Tackle.** A lunge, only when the ball carrier is close enough. The kind of tackle is picked as the lunge starts (see Tackle presets). A runner mid juke makes it miss, and the tackler stays down for a while. Otherwise the two bodies collide and momentum decides (see The physics).
* **Guard.** Held, the defender tails the nearest receiver on their own. Trailing like that never puts them in front of the ball.

Everyone runs with weight: a player gets going over a couple of seconds and needs room to stop, and heavier players get going slower. A hard cut at speed is a plant and cut: speeding up, braking and turning share the grip of the cleats, so the player brakes and turns at once.

### Kicking

Two meters. A marker sweeps left and right: stop it in the green for a straight kick. Then a marker climbs and falls: stop it high for a long one. Field goals tumble end over end and can clang off the posts, in or out; punts spiral and take the hops of a real football.

## The physics

Everything that happens to the ball and the bodies comes from the simulation (`engine/physics/`, `engine/catch/`, `engine/hit.ts`, `engine/fumble.ts`). It is deterministic: the same seed and inputs play the same.

### The ball

* **A real football.** A prolate spheroid 28 cm long and 17 cm across, 0.42 kg, with the moments of inertia of a leather shell. It is a rigid body: position, velocity, orientation and angular momentum, stepped 480 times a second.
* **The air.** Drag rises from nose on to side on. Lift pushes toward where the nose points off the path. The air also tries to turn the ball side on, and that is what a spiral's spin turns into a slow circling of the nose round the path: a good spiral keeps its nose along its arc and drifts a little to one side. Too little spin or too much wobble and the gyroscope cannot hold it: the ball ducks, turns side on and dies short.
* **Kicks** tumble end over end with the top going back. A kick off the green also picks up a twist, so it wobbles.
* **Bounces.** The contact is the lowest point of the spheroid. Landing on a tip, the bounce kicks the ball into a spin and up; landing on its side, it skids and rolls. A tiny change of angle sends it another way, as a real football does. Grass slows it and it settles.
* **The posts and the net.** The uprights and the crossbar are solid steel tubes, so a kick can clang off one and still go through, or bounce back out. A net behind each goal post swallows the kicks that clear. The ball keeps flying after the whistle, into the net or down the field.

### Hands

* **The reach** is a capsule round each player from the hips to a leap over the head, as wide as the arms reach out, wider for good hands, stretched along the turf in a dive.
* **The catch** happens where the ball passes nearest the hands. The odds come from how it arrives: into the chest or at full stretch, soft or a bullet, seen coming or over the shoulder, with a defender's hands in there or not, and the hands rating. A pitch is a soft toss and is rarely dropped.
* **Drops and tips.** A ball the hands do not hold is a collision with them: it pops up off soft hands, or is slapped down by a swat, and stays live. Anyone can catch the tip, the receiver too, and every player reads the new path.

### Bodies

* **Running.** The legs push hard from a standstill and fade to nothing at top speed. The cleats' grip is a friction circle, so a hard cut brakes and turns at once. The same cleats hold a heavier body back less, so a big man brakes and cuts on a longer line. At speed less grip is left for turning, so a sprinter has to plant and slow to cut sharply.
* **Jukes** push off a planted foot as hard as the cleats hold (agile players harder), then the stride bends back into the run.
* **Tackles.** A lunging tackler and the carrier meet in a hard, sticky collision along the line between them, so momentum (mass times speed) is traded and the lighter or slower man is knocked back. A change of speed past the carrier's balance is a big hit: he goes down. Otherwise the tackler's grip, strongest square on and weakest chasing from behind, has to hold the momentum of the carrier's run and his leg drive. A big back at full speed runs through arm tackles; a speedster does not. A broken tackle leaves the carrier shaken for a moment.
* **Tackle presets.** Once the momentum says he goes down, the men of the tackle are held together by its preset (`engine/tackle-bind.ts`, `engine/tackle-moves.ts`). The carrier keeps the speed the hit left him and slides out by the preset's drag, driven on while a tackler's legs still churn. The tackler, and anyone piling on, is held at the preset's place on him through the fall, the roll and his get up, so they never drift apart or sink into each other. Collisions leave the men of one tackle alone. A receiver hit while he lies in a diving catch is down by contact: he stays on his chest facing the way he dove, and the tackler lands on him.
* **Jukes beat big men.** As a juke's dodge opens, a heavy defender close in front of it bites on the fake (`engine/juke-beat.ts`). Right on top of it a stiff, heavy man's ankles go and he sits down; a little farther out he stumbles, lurching the way he bit. Linemen are the easiest to fool. A light or agile man keeps his feet.
* **Fumbles.** A big hit can jar the ball loose, more the bigger the hit, less with strong hands. The ball flies out with the hit and bounces as a real ball; the first player to it scoops it up.
* **Blocks.** Each pair of linemen pushes as one body with both men's mass: every surge is a new balance of leg drive, and the pair lurches and settles. A runner who crashes into them shoves them by his momentum and is stopped.
* **Block presets** (`engine/block-preset.ts`). Each pair is in one block move, picked at the snap and again at every shove. Off the snap it is the punch and hand fight. Then the blocker sets tall in **pass** protection, or fires out low to **drive** his man on a run. Against a rusher who is winning he sits his hips down to **anchor**. On a run, a blocker winning a big shove may **pancake** his man onto his back. Late in a pass play a rusher winning a big shove may **shed** his blocker with a swim and rip and go after the ball. A shed or a pancake breaks the pair up and both men play on alone (`engine/line-free.ts`): the free rusher chases the carrier and can grab him, the beaten blocker stumbles and turns to chase. Only one rusher sheds at a time. The line rolls its own dice, so seeded games keep their other draws.
* **Bumps and piles.** Players who run into each other trade momentum; a big jolt shakes a player's footing. Players on the ground settle apart into a pile and men on their feet step over them.

## Computer players

Difficulty comes from `src/games/kit/difficulty`: Easy (the default), Medium, Hard and Training. It sets how quickly bots react, how well they read the field, tackle and kick, and how hard they run. In Training they stand still.

* The QB drops back, reads the receivers, throws to the most open one, and avoids throwing into a defender sat in front. With nobody open and room ahead, or when the read drags on, it presses Run and takes off.
* Receivers run slants, gos, outs, curls, drags and posts, and go to meet the ball.
* Defenders cover a receiver from over the top. A spare one rushes the QB on about half the plays and sits deep as a safety on the rest. A computer defender next to a pass can knock it down; only one sitting in front of the receiver at the throw reads it well enough to catch it. Once someone has the ball they chase and tackle.
* It calls a run on about one play in four, and on half of them with three yards or less to go.
* On fourth down the bot kicks, a field goal in range or a punt, unless it is fourth and short past midfield.

## The engine

`engine/` is plain TypeScript with no drawing or sound. It steps at a fixed rate (`STEP`, 60 a second) and plays the same way from the same seed and inputs. Inside a step the ball runs in 8 fixed sub steps and the bodies in 2.

```ts
const match = new Match({ entries: buildLineup(signups), seed, level: "easy" });
match.setMove(id, { x, z });      // the move stick, in field space
match.holdThrow(id, true);        // a thumb on the throw stick: the throw meter starts
match.setAim(id, { x, z });       // the throw stick while held; null lets go and throws
match.setAim(id, null, heldMs);   // let go, graded by how long the phone's meter ran
match.steered(seat);              // the athlete a phone steers now (its teammate after a pass)
match.press(id, "juke");          // hike, juke, dive, rush, tackle, guard, kick, pass (the pitch), run (the QB takes off)
match.release(id, "guard");
match.choose(id, "throw");        // throw, run or kick; after a touchdown, kick or two
match.step(STEP);
const view = buildView(match);    // everything the renderer and HUD need
const events = match.drainEvents(); // hikes, throws, catches, tackles, kicks, scores
const pad = seatStatus(match, seat); // which controls a phone should show
```

* `buildView` gives plain numbers: players with their action and its clock and their acceleration, the ball with its orientation, axis and spin and the last thing it hit, the lines of scrimmage and first down, down and distance, the kick meters, the clock and score. `blendViews` mixes two for slow motion replays.
* `match.lastPass` keeps the last throw's release, speed and spin for the touchdown replay, and its `quality` from the meter.
* `view.meter` is the throw meter for the big screen; an athlete view's `seat` is the phone steering him now, so the ring moves with control.
* Sticks come in field space. The host turns a phone's stick into field space for its camera.
* The kick meters run from `meterAim` and `meterPower`. A phone can draw them itself from `seatStatus(...).meter` and send its own reading with the press.
* A phone that drops is played by the computer with `setAuto`.
* `admin.ts` has the shortcuts for the host's admin panel: `adminTouchdown`, `adminFieldGoal` and `adminTwoPoint`. They go through the real rules.

Files: `field` and `downs` for the field and the rules of downs, `motion`, `body` and `bodies` for running, `juke`, `juke-beat`, `tackle`, `dive`, `down`, `hit`, `collide`, `guard` and `linemen` for contact, `tackle-preset`, `tackle-moves` and `tackle-bind` for the tackle presets, `block-preset` and `line-free` for the block presets, `throw-preset` and `catch-preset` for the throw and catch presets, `fumble` for a loose ball, `physics/` for the rigid ball, the air, the turf, the posts and the net, `flight`, `aim`, `throw-error`, `passing`, `catching` and `catch/` for the ball in the air and the hands, `qb-run` for the QB's pace and the Run button, `passer-facing` for where a passer looks, `pass-meter` and `meter-live` for the throw meter, `control` for which player each phone steers, `run-play` for the run call and the pitch, `kick` and `kick-flight` for kicking, `whistle`, `score` and `phases` for how plays end and what comes next, `build-effects` for what each rating does, `ceremony` for the trophy presentation, `bots/` for the computer players.

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

* **Turf.** One shader on one plane (`field/turf.ts`). Grass from a baked blade texture read at two scales, so it never shows a repeat, with blade normals up close, mowing stripes every five yards that swap light and dark with the camera's side, and worn, drier grass between the hashes. The paint is maths per pixel (`field/turf-paint.glsl.ts`): yard lines, hash marks, the six foot border, the coaches' box, the star at midfield and both end zones in team colour with the team name. The numbers and names come from distance field atlases (`field/sdf.ts`, `field/paint-glyphs.ts`), so they stay sharp from the turf to the roof and the lines never flicker in the distance.
* **Goal posts and nets.** Yellow slingshot posts on both end lines, with the crossbar and uprights where the engine scores kicks, and a ribbon on each tip.
* **Sidelines.** Each team's area behind its sideline: a mat, two rows of benches with team coloured backs, a branded backdrop, coolers and a heater. Orange pylons at the corners of both end zones and the yard markers along the far side (`field/sideline.ts`).
* **The bowl.** Two decks of seats swept round a rounded rectangle (`field/bowl.ts`, `field/ring-strip.ts`): the lower deck from a padded wall, an LED rail with the team names running round, a row of lit suites, the upper deck over them and a roof canopy. Each team's fans fill its own side. The whole building is three draw calls (`field/stands.ts`).
* **Crowd.** Some twenty thousand fans in one instanced draw, mostly in their side's colours, bouncing in the vertex shader and harder after a score. No crowd noise.
* **Floodlights.** Fourteen banks of lamps hang under the roof's inner edge, every lamp aimed at its own spot on the field (`field/light-rig.ts`, `field/lamp-banks.ts`). The faces burn far over white so the bloom catches them, and each bank throws a soft glare with a streak into the lens, strongest when it faces the camera (`field/glare.ts`).
* **Sky.** A hazy glow at the horizon over the open roof, deep navy overhead, faint cloud lit from below and a few stars (`field/sky.ts`).
* **TV lines.** The blue line of scrimmage and the yellow first down line sit on the grass under the players. They glide to the new spot between plays and hide at goal to go.

### Light and the picture

* **Light.** Physically based materials, linear light, ACES filmic tone mapping and sRGB out. Two key lights stand in for the banks over each sideline, both casting soft shadows from every player and the ball, so a player stands in two faint crossed shadows the way he does under real floods (`lighting/floodlights.ts`). The shadow boxes follow the action and snap to whole texels, so shadows never shimmer. A sky fill from above and a green bounce off the turf fill the rest.
* **Reflections.** An environment map built once from the stadium's own shapes (`lighting/stadium-env.ts`): every bank where it really hangs, the suites' glow, the turf below. Helmets and visors mirror the lights the camera sees overhead.
* **Contact shadows.** A soft dark blob under each player's body and feet and under a loose ball (`lighting/contact-shadows.ts`), one instanced draw, so players sit on the grass even where the shadow map is coarse.
* **The finish.** The scene draws into a multisampled half float target, then gets a subtle bloom on the lights and highlights, the filmic curve, a broadcast grade and a light vignette (`post/`). Depth of field comes on only for replays and the trophy presentation, focused on the subject of the shot (`broadcast-look.ts`). The grade eases between the live look, the replay look and the ceremony look, and changes at once on a cut.

### The players

Each player is one skinned body (`render/models/`): a smooth surface lofted through cross sections and bent by fifteen bones, so elbows, knees and the waist fold without gaps. The helmet rides the neck bone.

* **Build.** Real proportions from the player's height and weight: a lean receiver, a thick back, a lineman with a gut. Arms, legs and the torso swell and taper on smooth curves through their sections (`models/loft.ts`). Linemen share one big build and differ in skin.
* **Pads and jersey.** The torso is the jersey stretched over shoulder pads: a narrow waist tucked under the belt, the hard lower edge of the pads, a cap over each shoulder, a flat shelf up to a V neck with a dark lining. The print (`models/jersey-print.ts`) puts big numbers on the chest and back, the player's own name across the shoulders (shrunk to fit a long one; the computer's players wear none), numbers on the sleeves, stripes at the cuffs, mesh side panels, seams, a trim collar and the team mark under the V, each drawn at its true size on the body. A knit normal map gives the mesh its little holes and the cloth a soft sheen.
* **Below the belt.** Tight pants over thigh and knee pads with a stripe down the outside and the hem under the knee, socks banded in the trim, and cleats: a sculpted upper with laces and a side stripe on a sole plate with studs. Skill players spat white tape over their ankles.
* **Hands.** Gloves with a tacky palm, four fingers curled in two joints, a thumb and a wrist strap over white tape.
* **Helmets.** A clear coated shell whose edge runs along the brim, down each jaw flap and round the back of the neck, with a rib over the crown, a dark padded lining and rubber trim (`models/helmet-shell.ts`). Its paint (`models/helmet-paint.ts`) lays the stripe and pinstripes over the crown, the ear holes, and the team logo on both sides, facing forward: a bolt for Storm, a flame for Blaze. The shells mirror the floodlights. Masks are bent steel tubes: two bars and an upright for the QBs and receivers, a full cage for the linemen and the hitters, a tinted visor on the visor builds, and a chin strap with a cup and snaps.
* **Faces.** One smooth head inside the shell with a brow, a nose, lips and eyes that catch the light, shaded under the brim, with eye black on the builds that wear it. Locks hang from under the back of the shell.
* **Touches.** Each build keeps its own mask, sleeves (bare, short, or a long compression sleeve), towel, neck roll, locks, eye black and spats, so the six read apart at a glance.

### How the players move

Every frame a figure picks a target pose from the engine's view and eases toward it, then stands itself on the turf: its lowest point touches the grass and its hips sit over the player's spot. Action poses run on the engine's own action clock, so the body and the ball agree. Then the legs reach for any planted feet.

* **Strides.** Walking, jogging and sprinting are one blended cycle on curves taken from real strides (`anim/strides.ts`): a heel strike and roll walking, a stance knee that takes the landing, the heel folded up behind and the knee driven high at a sprint, and a moment in the air between steps. The cadence climbs from under two steps a second walking to over four sprinting. A backpedal plays the stride backward in short, low steps.
* **Counter rotation.** The pelvis turns with the leading leg and drops on the swinging side. The chest turns back against it and the arms pump against the legs.
* **Planted feet.** Each foot locks to the turf where it lands and stays there for its whole stance (`anim/foot-lock.ts`), and the leg reaches for it with the foot flat on the grass (`anim/leg-ik.ts`, `figures/feet.ts`). As the body moves past, the heel rolls up onto the toes. Standing players keep both feet down and step them round when they turn or drift. A juke holds its push off foot still while the body drives away from it. Dives, falls and set moves leave the feet free.
* **Turning.** The engine can turn a man in one step: a lunge squares to its line, a beaten blocker wheels round to chase, a drive tackle faces the carrier into the hit. The drawn body follows the short way round in a few frames instead of popping (`figures/facing.ts`), quick enough that a spin juke keeps up, and snaps only when a man is moved for the next play.
* **Momentum.** The body leans into a push, sits back on bent knees with the arms out front when braking, in quicker and shorter steps, banks into curves and plants the outside leg wide on a hard cut (`anim/lean.ts`). The engine's acceleration drives all of it.
* **Weight.** Every body rocks over the foot it stands on and a heavy one more: the hips slide out over the planted foot, its knee sinks as it takes the load, and a big man spends less time in the air. Braking into a cut plants the outside foot in the turf. Locked linemen lean in or sit up with each surge of their pair.
* **Contact.** A hit is a change of speed far beyond what legs make: the torso, head and arms whip with it on a spring and settle back (`anim/reactions.ts`). A shaken player wobbles on loose knees with his arms out until he finds his footing. Blocking linemen sit their hips back so their pads meet at the hands.
* **Ball moves.** Every one follows through. The pitch is an underhand toss with both hands, the body turned to the back and the hands carrying on up after the ball. A catch is pulled into the chest with the eyes on it, then tucked away under the arm.
* **Idle.** Nobody stands frozen: the chest rises and falls, the weight drifts from leg to leg with the free knee unlocking, and the head looks about. Set stances breathe too.
* **Moves.** Three point stances for linemen, the center's snap, the QB in the shotgun, receivers in a two point stance, the drop back, the throwing motion, running with the ball tucked under the arm, cuts, the spin, back move and side step, dives, tackles and misses, lying on the ground, rolling over and getting up, linemen locked together driving their legs, and reaching for a pass.
* **Tackles.** Hand made presets, never a ragdoll (`anim/tackle/`). The engine picks one as the lunge starts, from the angle, the gap and the two men's sizes (`engine/tackle-preset.ts`), so the leap already looks like the tackle it will be. From the side or behind it is a **wrap**: a leap at the hips, the arms locked round him, both men going over and rolling together with the tackler over the top. Head on at close range a man his size makes it a **drive**: shoulder into the chest, legs churning, the carrier driven back onto his back and the tackler down astride him. A smaller man head on, or a much lighter one from the side, goes low at the **ankles** and the carrier topples forward over him. Chasing a man pulling away it is a **shoestring** dive that clips a heel, and the carrier stumbles on a few strides before he pitches forward. If another defender is close when the hit lands it is a **gang** tackle: the first man stands him up and the second dives on top. A lineman reaching out of his block trips the carrier the shoestring way. Every pose track runs on the engine's clock for the action, authored for a tackler on the left and mirrored for one on the right, and each man gets up the way he ended up lying: off his front, sitting up off his back, rolling over off his side. Bodies can roll about the spine, so a tumble is a real roll.
* **Misses.** A lunge at nothing lands on its belly and log rolls on with its momentum. A tackler the juke left grabbing air lands on his shoulder and tumbles over. One the carrier ran through is spun round and dumped on his seat. A man whose ankles a juke broke sits down hard, and a stumble lurches him with one hand dropping to the turf.
* **The throw.** The QB faces his target, closes the chest with the ball by the right ear and the left shoulder at the target, steps, turns through, and finishes with the hand across the body by the left hip. Each throw preset has its own load, release and follow through, keyed to the engine's release frame (`anim/throw/`). The drawn ball leaves from the hand and joins the engine's spiral within a tenth of a second.
* **Catches.** Hand made presets on the move's own clock, so the hands meet the ball on the frame it arrives (`anim/catch/`). The knees give on a ball caught near standing; running, the stride carries on under the hands. A high point loads low, leaps with the arms straight up and lands with the knees soaking it up. A dive lays out flat with the arms past the helmet. Over the shoulder the head turns back and the hands go up behind it. Picks leap for the ball; swats raise one hand and whip it down through the ball. Each finish has its own shape: tucked away, hands flung open, rocked back by a hit, or clapping on nothing.
* **The line.** From the snap to the whistle each pair of linemen plays the block move the engine picked (`anim/block/`), with choppy feet, busy hands and a lean that follows each shove: the punch and hand fight, a tall pass set against a low bull rush, a drive block with the other man sitting up, a deep anchor. A pancake throws the blocker down over his man, who goes up and over onto his back, then the blocker stands over him. A shed is a swim over the top and a rip past while the blocker spins round reaching after him.
* **Reaching.** Anyone going for a pass without a picked move reaches for it. The passer's own linemen leave it alone.
* **Rings.** A bold magenta ring with a white edge pulses under the receiver the throw stick is on (or the back on a run call), and stays lit on the receiver the ball was thrown to until it arrives. No team or seat wears magenta, so it is never mistaken for another ring. A thin ring in team trim marks each player a person controls. When a phone takes over the teammate it passed to, that ring skims across the turf to him, swelling on the way, and pulses there (`figures/control-switch.ts`).
* **The ball.** A laced football drawn exactly as the engine's rigid body is turned: the spiral's spin, a duck's wobble, a kick's tumble. A fast spin smears the laces round the ball the way a camera sees it, and a hard knock off the turf or the posts squashes it along the hit for a moment. Held, it sits in the carrier's hands.
* **The posts and the nets.** A kick off the steel sets the goal post shaking and dying away. The net behind each goal post is thin dark cord. It rises for kicks and drops away for the rest of play, and it bulges where a kick hits it and swings back.
* **Touchdowns.** The scorer spikes it if that is their style, and the ball bounces away. Everyone else celebrates their own way: a dance, a flex, a salute, a leap or a point to the crowd. At the end the winners celebrate and the losers hang their heads.

### Frame rate

* **Shared shapes.** Every kind of body, the helmet shell, each team's masks and the visor are built once and shared (`models/athlete-shapes.ts`), so a player rebuilt for a new name keeps his body. A player is three draws for the body (skin, gear and jersey) and two for the helmet.
* **Levels of detail.** A player who fills less than about a fifth of the picture's height swaps to a lighter body and helmet. Close up a body is about 23 thousand triangles and a helmet about 7 thousand; far away about 8 and 3 thousand.
* **Automatic quality.** Where the browser can time the graphics card, frames over 12 ms walk down a ladder (`quality/ladder.ts`, `quality/governor.ts`): first the second set of shadows goes, then a little resolution, then half the multisampling, then the bloom, the upper deck's crowd and the rest of the multisampling, down to six tenths of full resolution. It climbs back once there is room. Where the card cannot be timed it watches the frame pace instead (`quality/pace.ts`). Software graphics (the `lowGpu` test hook) skip the finish and the shadows and always get the light bodies, half size textures and no sheen or skin glow.
* **The venue's cost.** The building is three draws, the floodlights four, the crowd one and the turf one. Textures: the grass tile, two small distance field atlases, the LED rail and the suites.
* **Measured** in Chromium with software WebGL, a game from the broadcast camera at 1920 by 1080 on the top rung: 220 draw calls and 890 thousand triangles a frame across every pass, with both shadow maps, the finish and the crowd. Before the new stadium, at 1600 by 900: 140 draw calls with shadows and 650 thousand triangles a frame, of which the twelve players are 270 thousand across both passes (1.1 million before the far bodies). Animating all twelve, feet included, takes about 0.9 ms of the CPU a frame. Textures: one 1024 by 768 jersey print per player and one 1024 square helmet paint per team.

### The camera

* **Behind the play.** High behind the team with the ball, looking downfield. Before the snap and while the QB is in the pocket it keeps the whole formation in the picture, receivers split wide included: `camera/fit.ts` backs it straight up its line of sight until they fit, so a narrow screen sees the same players as a wide one. Once someone runs with the ball it comes in tighter behind them. It backs up and rises a little as a pass goes deep, turns round after a turnover and glides rather than jerks.
* **Phone sticks.** `renderer.director.groundForward()` is the way up the screen on the ground, in field space, for turning a phone's stick into a field direction that matches the camera.
* **Kicks.** Low behind the kicker through the posts, then up and after the ball, staying with it after the whistle as it flies on into the net.
* **Touchdowns.** A slow orbit round the scorer. At the final whistle, a wide orbit of the winners until the trophy presentation takes over with its own shots.
* **Broadcast feel.** The camera's spot and its aim ride critically damped springs (`camera/broadcast.ts`), so moves ease in and out like a heavy broadcast head and never overshoot. The lens leads the ball a little the way it is moving, and the zoom breathes with the play: a touch tighter while the teams set, opening as the ball moves fast or flies deep. The formation is fitted after the zoom, so it is never cropped.
* A big hit shakes it a little. Any move that would sweep across the field cuts instead, like the lobby giving way to the game or the ball spotted far downfield.

### The scoreboard

`render/hud` has the broadcast score bug for the big screen: both teams with their scores and a dot for the side with the ball, the quarter and clock, down and distance with the spot, the play clock while a pick or a hike is due, and the target score. `scoreboard(view)` in `render/hud/board.ts` turns a view into its text.

### The showcase

`showcase/` makes the home screen media from a seeded game of computer players (`SHOWCASE_SEED` in `scene.ts`) and its trophy presentation, drawn by the real renderer. `reel.ts` records every still of the game, so any moment can be shown at any speed and from any camera.

* The loop is a wordless eight second trailer (`trailer.ts`, cameras in `film-cams.ts`). The QB winds up and throws in slow motion, filmed from low in front of him so the ball comes off his hand toward the lens. A camera rides the spiral. The receiver catches it and side steps a diving tackler. A camera on the turf by the pylon watches him race over the goal line with the defence chasing, then he dances in the end zone. Later the Storm's speedster lays out for a pass over the middle and the Blaze's corner leaves his feet and wraps him up as he comes up with it, deep in slow motion. The captain lifts the trophy. The film runs in a circle, so its last frame cuts straight into its first and the clip loops with no seam.
* The icon is key art (`keyart.ts`): a ball carrier at full sprint with the ball tucked, two defenders leaving their feet at him from either side, held a beat before they reach him, from low on the turf in front of him under the FOOTBALL 3v3 logo. The seeded game has no moment like it, so it is the lab's `keyart` stage: the real engine pieces, ending in a real gang tackle. `keyart.test.ts` fails if a change moves the moment. The still turns up the warm key light, so the carrier's front reads at a glance. The poster is the late hit from the trailer's side camera: the speedster laid out with the ball and the corner flying in at him with the goal posts behind them.
* `film-lights.ts` dims the stadium's fill and adds a hard rim light and a warm key that follow the camera, and the page grades the picture with more contrast and a vignette.

`trailer.test.ts` fails if an engine or bot change moves these moments, as a reminder to film again. To film them, with the dev server running:

```bash
node tools/media/capture.mjs football-3v3 --url http://localhost:3000 --ffmpeg /path/to/ffmpeg
```

For development: `?t=<seconds>` holds the trailer at that moment, and on a still `window.__fbHold(seconds)` moves the hold, for a review script. `?lab=<move>` shows the animation lab, where all six builds do one move on a loop next to a pair of linemen. The moves are idle, run, tuck, ready, throw, kick, spin, back, side, dive, lunge, down, tackled, celebrate, spike, stance, block and catch. A spin turns the whole body round, as the engine does in a game, and runners really run, round a loop, so their feet plant. The staged moves play one moment with the real engine pieces and the outcome forced (`lab-stage.ts`, `lab-scenes.ts`): wrap, drive, ankle, shoestring and gang tackles, the whiff, missed and shed misses, a lineman juked off his feet, a heavy man stumbling, a plant and cut, a lineman running beside a speedster, and the icon's keyart, two defenders diving at a carrier from both sides. The pass and line stages run a whole match with the real engine and try seeds until the move they show comes out (`lab-pass.ts`, `lab-pass-scenes.ts`): chest, highpoint, layout, shoulder, traffic and jarred catches, a pick, a swat, and the passset, driveblock, anchor, pancake and ripby blocks. With `labstep` the lab's clock only moves when a script calls `window.__fbLabStep(seconds, draw)`. `cam=x,y,z`, `look=x,y,z` and `fov` move the lab's camera for close looks. `?game=<seconds>` plays the seeded game from that moment through the broadcast camera: `speed=0` holds it, and `speed=step` moves it only when a script calls `window.__fbStep(frames)`, a thirtieth of a second a frame. `follow=<id>` tracks one player close from the sideline.

## Tests

```bash
npx vitest run src/games/football-3v3
```
