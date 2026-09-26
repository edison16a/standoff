# Brawl Battle

Status: ready. The engine, the big screen, the phone controller, the sound and the home screen media are all done.

A platform fighter for 1 to 4 players on one big screen, with phones as controllers. Computer fighters fill the empty places if the host wants them. Each fighter has two lives. Hits add damage, and the more damage a fighter carries the further the next hit sends them. Fly past the edge of the screen and you lose a life. The last fighter with lives left wins.

## How to play

1. Open Brawl Battle on the computer. Everyone scans the code with their phone.
2. On the phone, after the name, pick a fighter, tap Next, then tap Ready. Two players may pick the same fighter. Each is tinted in their own player colour.
3. On the computer, the host sets how many computer fighters join and how good they are (Easy, Normal or Hard), then starts. A player alone always gets one computer fighter to face. The computer picks one of four stages at random.
4. The phone is now a controller. It works held sideways or upright:
   * **Stick**: push it to move. Push it up to jump. Let it come back toward the middle and push up again in the air to double jump. Hold down in the air to fall faster. Flick down on a floating platform to drop through it.
   * **Direction**: the stick picks each move's variant. It snaps to the nearest of four directions, so right and a little up is still right. Only a stick left near the middle is neutral.
   * **Attack**: tap for a quick move. What it does depends on the direction: neutral, side, up or down on the ground, and an aerial in the air (neutral, up or down).
   * **Special**: tap for a heavy move, again by direction. Up is the recovery move that carries you back to the stage, once per trip into the air.
   * **Hold to charge**: hold Attack or Special for more than 0.4 seconds and the fighter winds up a charged move. It glows and a ring fills round the button. Let go to throw it. The longer the hold, the harder it hits, and at full charge it lets go by itself a moment later. Up on Special never charges, so the recovery always comes out at once.
   * **Moving while attacking**: most moves let you keep walking slowly and steer in the air. Charged moves, the ult and the biggest slams hold you in place.
   * **Ult**: fills slowly over time and faster when you land hits. The ring round the button shows how full it is. It only works when full.
   * **Shield**: hold down on the main platform. It blocks everything but ults, and shrinks while held and with each block. Blocked too much, it breaks and leaves you dizzy.
5. After a fall you come back on a platform that floats down from above. You cannot be hurt for a moment. Move to step off it.
6. The last fighter with lives left wins. Play again keeps everyone on a new stage; Change fighters goes back to the lobby.

## The fighters

| Fighter | Style | Signature moves |
| --- | --- | --- |
| Karate | Fast and light, strong in the air | Roundhouse, Flying Kick, Rising Dragon, ult Dragon Rush |
| Samurai | Longest blade reach, a little slower | Wide Slash, Iai Draw, Dash Cut, ult Thousand Cuts |
| Mage | Floaty, fights from afar | Magic Bolt, Arcane Blast, Nova, Blink, ult Arcane Storm |
| Bear | Heavy and slow, armored slams | Big Paw, Charge, Ground Pound, ult Earthquake |

Each fighter has five charged moves: three on Attack (side or neutral, up and down) and two on Special (side or neutral, and down).

| Fighter | Attack side | Attack up | Attack down | Special side | Special down |
| --- | --- | --- | --- | --- | --- |
| Karate | Tornado Kick | Dragon Uppercut | Split Kick | Dragon Flight, a long flying kick | Heel Drop, a leap and a crack on the floor |
| Samurai | Flying Slash, a crescent that leaves the blade | Heaven Cut | Whirlwind | Lightning Draw, a dash clean through | Earth Splitter, waves running both ways |
| Mage | Big Orb, which grows with the charge | Light Pillar | Frost Ring | Arcane Beam | Star Fall, stars dropping ahead |
| Bear | Haymaker | Grizzly Uppercut | Shockwave Slam | Roar, a blast that blows foes away | Meteor Belly, a leap that crashes down |

Weapons reach further, so the Samurai's Wide Slash and the Mage's Spark carry a short dash forward. The staff counts as a weapon when it is swung; the Mage's Arcane Blast is a spell cast in place, so it stays still.

## The stages

Dojo Rooftop, Floating Temple, Crystal Cave and Forest Treetop. Each has a solid main platform, a few floating platforms you can jump up through, and a blast zone well past the edges.

## Technical notes

### The engine

`engine/` is pure TypeScript with no rendering and no timers. It steps at a fixed 60 steps a second (`STEP`), and the host feeds it one command per phone per step. Everything random goes through a seeded `Rng`, so the same seed and the same commands replay the same match. The showcase relies on this.

* `match.ts`: `createMatch(entrants, options)` and `stepMatch(state, commands)`. Phases run `ready` (the Ready, Fight countdown), `fight`, `game` (the Game call) and `over`. Events for the step are left in `state.events` for the host to turn into sound, shakes and phone buzzes.
* `fighter.ts`: the state machine. Actions are idle, run, jumpsquat, air, land, attack, charge, hurt, shield, dizzy, dead, respawn and out. Hit stop freezes a fighter completely. Presses are buffered for 6 frames, so a press made just before a move ends still comes out.
* `control.ts`: what the controls do when a fighter is free. An attack pressed with a jump wins, so pushing up and tapping Attack together is an up attack, not a jump. Holding Attack from the crouch keeps the feet down too, so up with a held Attack charges the up move.
* `charge.ts`: tap or hold. A press still held is timed instead of acted on (`hold`). Let go before `CHARGE.threshold` (24 frames) and it becomes an ordinary buffered tap. Held past it, the fighter enters `charge` as soon as they are free, with `move` naming the charged move and `frame` counting the wind up. On release, or at `CHARGE.cap`, the move starts with `charged` set from 0 to 1; hits and projectiles then deal up to half again the damage and a quarter more launch, and projectiles grow. A hit clears the hold. `chargeLevel(f)` is the 0 to 1 the renderer and sound use. The `charge` event marks the start of a wind up.
* `physics.ts`: steering, gravity and fast fall, then the stage. Floating platforms only catch a fighter coming down. The main platform is a solid block. Most moves let the stick still move the fighter at `ATTACK_MOVE` (45 percent of the run on the ground, 85 percent of the air speed). A move marked `root` (every charged move, every ult, Big Paw, Charge, Ground Pound, Body Drop, Iai Draw, Dash Cut and Flying Kick) takes the stick away and slides to a stop. Charging creeps at a quarter of the run.
* `moves/`: every move is frame data: total frames, hitboxes live for a window of frames, lunges, projectiles, armor and invincible frames, landing lag. Offsets are written facing right and mirrored by facing. `select.ts` maps a button and the stick to a move. The stick snaps to four 90 degree sectors with edges at 45 degrees, and on an exact diagonal the side wins; only a stick inside the dead zone is neutral. The charged moves live in their own files, `karate-charged.ts` and so on.
* `combat.ts`: all contacts in a step are found first and then applied, so two fighters who swing into each other both land. A box behind the fighter sends the target backwards.
* `knockback.ts`: launch speed is `(base + growth x percent) x 200 / (weight + 100)`, using the percent after the hit. A launch slows at a steady rate, so it carries speed squared over twice that rate. Double the speed flies four times as far. Hitstun and hit stop grow with it.
* `stocks.ts`: leaving the blast zone costs a life, with credit to whoever hit the fighter in the last 8 seconds. Places go by who lasted longest. Fighters out on the same step share a place, and two last fighters falling together is a draw.
* `ult.ts`, `shield.ts`, `projectiles.ts`: the ult meter, the shield and everything thrown. A move's projectile names a `look` (a bolt, an orb, a crescent, a wave or a star) that only the renderer reads.
* `bots/`: computer fighters. They look again every few frames (26 on easy, 13 on normal, 6 on hard), try each move against where the target stands now, and pick the one that does the most. They shield wind ups on normal and hard, use the ult when it would connect, wait at the edge instead of following someone off it, and recover with the double jump and the up special. `charge-plan.ts` has them wind up a charged move when the target is stunned, dizzy or busy in a long move, and now and then on a hunch (4, 8 and 10 percent of decisions from easy to hard). They charge longer the better their judgement, never start a long charged dash that would carry them off the edge, and let go facing the target.
* `input.ts`: `PadInput` turns a phone's stick and buttons into commands, with jump fired once each time the stick crosses up. Attack and Special are also reported while held (`lightHeld`, `heavyHeld`); a press and release between two steps still reads as a tap.

Tuning lives in `tuning.ts` (physics, launch, hit stop, ult, shield, respawn), `roster.ts` (each fighter's body) and the move tables. In four bot matches a fall usually comes between 110 and 140 percent, and a match lasts about 50 seconds.

### Balance

`sim/balance.ts` plays seeded bot matches with the start order and the stage rotating, and counts wins, damage, KOs, falls nobody caused, the percent at each KO and the damage each move lands. `sim/balance.test.ts` is skipped unless asked for, since it plays about 3,000 matches:

```
BRAWL_BALANCE=1 npx vitest run src/games/brawl-battle/engine/sim --reporter=verbose --silent false
```

`BRAWL_BALANCE_GAMES` sets the four bot matches per difficulty (1000 by default, each pairing plays a fifth of that) and `BRAWL_BALANCE_SEED` moves the seeds. It fails if a fighter wins under 18 or over 32 percent of four bot matches, or a one on one leaves the 33 to 67 range, on normal or hard.

The first run found Mage and Bear winning 40 percent of four bot matches each and Karate 4 to 6 percent, with Karate losing 93 of 100 one on ones to Mage. The causes:

* Mage fought from out of reach. Arcane Blast reached 2.8 metres, Nova covered 2 metres all round, and a bolt crossed most of the stage, so the Mage dealt the most damage and took the least.
* Bear lived too long. At weight 124 it fell at about 150 percent against 110 to 125 for the others, and the Charge and Big Paw shrugged off most of the hits meant to stop them.
* Karate was too slow to be the fast one. Its moves were short, light and long to recover from, so it landed the least damage and fell the most.
* The Mage and Bear ults covered most of the stage, and the ult meter fills fastest for whoever already deals the most damage.

What changed, keeping each fighter's style:

* Karate: shorter recovery on every ground move, a little more damage and reach, weight 97 and a faster run. Still the lightest body after the Mage and the quickest jab.
* Samurai: quicker Wide Slash and Iai Draw with a longer tip, so the blade outreaches every other melee move. Thousand Cuts and the up aerial hit a little softer.
* Mage: Arcane Blast and Spark reach 2.2 metres, Nova 1.8, bolts fly 13 metres and cost more time to cast. Slightly less floaty, so it is not juggled forever. Still the longest reach of all.
* Bear: weight 108 with shorter armor on the Charge and Big Paw, softer slams and a narrower Earthquake. Still the heaviest, and Big Paw is still the hardest launch.

After the change, in 1000 or more seeded four bot matches per difficulty, every fighter wins 21 to 30 percent on normal and hard. In 200 matches per pairing every one on one lands between 38 and 64 percent, and Karate beats Mage on hard but loses to it on normal, where the bots react more slowly.

Charged moves and moving while attacking shifted things again, so the second pass tuned them together. The first run with bots charging had Karate at 16 to 19 percent and the Mage at 31 to 35 percent on hard. The causes and the fixes:

* Rooted moves in the air first kept their speed, so Karate's Flying Kick and Dragon Flight carried it off the stage. A rooted move now slides to a stop, as it always did on the ground, and bots skip a long charged dash near the edge.
* The Mage's charged Big Orb and Arcane Beam out ranged everyone. The orb is smaller, shorter lived and softer, the beam reaches 4.1 metres, Magic Bolt comes out a frame later with 6 damage, Arcane Blast reaches a little less and does not dash, and the Mage weighs 80.
* Karate weighs 99, and its charged moves and Power Punch launch harder. Bear's Paw Swipe is quicker and Big Paw's armor longer, with softer Charge, Ground Pound and Earthquake. Samurai's Wide Slash keeps its 2 metre tip behind the new dash, and Quick Cut is 2 frames quicker.

Now, over seeds 1 and 13 at 1000 four bot matches per difficulty, every fighter wins 20 to 30 percent on normal and on hard. Every one on one lands between 37 and 62 percent; Karate beats the Samurai 60 to 62 percent, and the Samurai loses to the Mage about 38 percent.

### The render

`render/` draws a match with three.js and never changes it. `BrawlRenderer` owns the scene. The host calls `beforeStep()` and `afterStep()` round each engine step, then `render(dt, alpha)` each screen frame, where `alpha` is how far the clock is between steps. Fighters and bolts blend between the last two steps, so motion is smooth at any refresh rate.

* `models/`: stylised low poly fighters on one shared rig (hips, torso, head, two segment arms and legs). Every part is a painted primitive with flat faces. Parts on the same bone merge, so a fighter costs about twenty draws. Heads are big, with cartoon eyes, fierce brows and chunky fists, so faces and hands read from across the stage. A duplicate fighter wears the player's colour on the belt, armour, robe or wrestling belt.
* `anim/`: a pose is a set of joint angles. `motion.ts` covers idle, run, jumpsquat, jumps, the double jump somersault, landing, hurt, tumbling, shield, dizzy and the winner's pose. Each fighter's file (`karate.ts` and so on) has a stance, a run, a guard, a win and one animation per move. A move animation is a wind up pose and a hit pose. `strike.ts` places them from the move's own frame data: the wind up peaks just before the first hitbox, sinking a touch deeper at the last moment, the hit holds while the hitboxes are live, the swing carries on past it (`follow`, or worked out from the swing), then the body settles. Flurries alternate poses per hit, and the ults and the moves that dash or leap use explicit keys timed to their motion. `pose.ts` eases every joint toward its target, and a somersault or tumble cut short rolls back upright the short way instead of snapping.
* `fighter-view.ts`: the view of one fighter. It turns the fighter to face along the stage with a small turn toward the camera, picks the pose, glows when hit (brighter for bigger hits but never full white, and dimmer when one hit lands on several fighters at once, see `hit-flash.ts`), shivers in hit stop, blinks while invincible and squashes on landings. The winner turns to face the crowd. `fighter-trails.ts` lays a ribbon behind the fist, foot, blade tip or staff gem while a move is live, a streak and smoke behind a fighter flung by a big hit, and a mark where each big hitbox comes out. `fighter-extras.ts` draws the shadow, the colour marker over the head, the shield bubble, dizzy stars, the respawn platform and the ult ready ring. `anchors.ts` finds the fist, foot, blade tip or staff gem that leads a move.
* Charging: `anim/charged.ts` has every charged move's wind up, hit and follow through, and each starts from the wind up because it comes out of the held charge. `anim/charging.ts` is the pose held meanwhile: it sinks into the wind up as the charge builds and coils a little past it at full power, breathes deeper and faster, and trembles near the top. `charge-fx.ts` adds an aura in the fighter's colour that swells and pulses faster, a hot light on the limb that will strike, sparks drawn in from all round, rings closing on the feet, a flash when full and a flare where the move lands first, bigger for a longer charge. The body glows in the same colour.
* `move-fx.ts`: the Mage's Arcane Beam and Light Pillar as solid rays with a white core, and speed lines and dust behind every dash (Wide Slash, Spark, Lightning Draw, Dragon Flight).
* `projectiles/`: each look drawn its own way in the owner's colour: a crackling bolt, a big orb with a halo and a spinning ring that grows with the charge, the Flying Slash as a crescent lying flat with an after image, the Earth Splitter and Shockwave Slam waves as crests running along the floor kicking up dust and grit, and Star Fall as spinning stars with tails.
* `effects/`: engine events become impact stars, shockwave rings, sword streaks, dust, a colour beam from the blast line on a KO, the flare of an ult and confetti for the winner. Particles are one draw per pool, and the flat glowing shapes come from a fixed pool of 48.
* `camera/`: `framing.ts` works out the box to keep in view (every fighter, padded, never narrower than 17 metres, never past the blast zone) and how far back to stand. The HUD cards cover the bottom of the big screen, so the canvas measures how far they reach up and the camera fits the box into the open part above them. `FrameCamera` eases toward it, opens wide for the countdown, closes in on the winner, pushes in a little on heavy hits and shakes with a trauma that fades.
* `stages/`: one file per stage. Platforms sit exactly on the engine's surfaces, with a bright lip on every edge you can fall from. Static scenery merges into one solid and one glowing mesh. Petals, clouds, motes, leaves and fireflies drift in one instanced mesh each, placed from the clock alone so a filmed showcase always matches. Each stage has its own gradient sky, fog and three lights. There are no shadow maps; a soft disc under each fighter does the job.

A full match draws in about 80 draw calls and under 10,000 triangles.

### The big screen

`host/` runs a room. `BrawlHost` is the session and the referee: phones send their pad, and everything they show comes back from it.

* `lobby.ts`: each phone's pick and ready state, how many computer fighters join and how good they are. Places fill with ready players first, then places still open, then computers, who take the fighters nobody picked first.
* `match-driver.ts`: steps the engine at a fixed 60 a second from however fast the screen draws, with one `PadInput` per phone. A frame longer than 0.1 s is not caught up, and the match slows for a moment on the final KO. A phone that drops has a bot play for it until it comes back.
* `brawl-host.ts`: picks the stage at random, turns each step's events into sound, announcer lines, banners and phone buzzes, and publishes state to the big screen (a zustand store, refreshed ten times a second and on every hit) and to each phone (only when it changed, see `phone-link.ts`).
* `demo.ts`: four hard computer fighters brawl behind the lobby, silently, a new stage each round.
* `components/`: the lobby, the HUD, the results and the canvas. The canvas calls `renderer.beforeStep()` and `afterStep()` round every engine step, then `render(dt, alpha)` each frame. The HUD shows a card per fighter: portrait, ult ring, lives, and a percent that runs from white to deep red and shakes harder as it climbs, with a jolt on each hit. Name tags float over the fighters as HTML.
* `callouts.ts` and `buzz.ts`: what the announcer says and which phones buzz, as pure functions of the event.

### The phone

`phone/` walks the player through two steps in the kit's `StepShell` (fighter, ready), then shows the controller while they are in a match and their place after it.

* The stick is the kit's `Joystick`, shown at rest like Basketball 3v3 and Soccer 3v3. It streams through the pad kit, and crossing up past the jump line also goes as a reliable `up` button press, because a quick flick can live in one stick sample that the lossy stream drops. `PadInput` takes either and never jumps twice for one push. The engine also keeps a jump pressed in the last few frames of a move, as it does for attacks.
* Attack and Special are `ChargeButton`s: the kit's `PadButton` with a ring that fills on the phone's own clock from the moment a hold becomes a charge to full power, and glows when full. Their releases go to the host too, since letting go is what throws a charged move. Ult is a plain `PadButton`, disabled until full, wearing its meter as a ring.
* The page fits the visible screen exactly: the game's own CSS sets the phone frame to `100dvh` (with `100vh` before it for older browsers), pads for the notch with the safe area insets, and the layout switches between sideways and upright with orientation media queries. Nothing scrolls on an iPhone 16 either way up.

### Sound

`audio/` plays everything through the room's buses: music on `music`, hits and moves on `sfx`, the crowd on `crowd`. Nothing connects to the speakers directly.

* `tunes.ts` and `band.ts`: a lobby tune ("Warm Up", D major, 112 a minute) and one battle theme ("Clash", A minor, 144 a minute, four on the floor with a pumping octave bass). Each stage plays the battle theme in its own key and lead voice: a pluck on the dojo, bells at the temple, crystal tones in the cave and a flute in the forest. `music.ts` schedules notes ahead on the audio clock and crossfades between tunes.
* `hits.ts` and `sfx.ts`: five kinds of hit (punch, kick, slash, magic, slam), louder the harder the launch, swings in each fighter's style, a hum rising in pitch while a move charges, jumps, landings, shields, bolts, the ult, a KO boom, the countdown drums and a final gong.
* `crowd.ts`: a murmur that rises with the damage on screen, an "ooh" for big launches, cheers and whistles for KOs, and stomp clap for the winner.
* `announcer.ts`: "Ready?", "Fight!", KO calls, ult names and "Game!" through the browser's speech, with each line's volume scaled by the player's effects setting.

### Messages

`protocol/` holds the zod schemas. Phones send `hello`, `pick` and `ready`, plus the pad kit's stick and the buttons `attack`, `special`, `ult` and `up`. The host sends each phone a `state` with its phase, pick, percent, lives, ult meter, KOs and place, and `buzz` for moments worth a vibration.

### The showcase

`showcase/` is the game playing itself for the home screen: four hard computer fighters on the Dojo Rooftop. `script.ts` holds the seed, where the loop starts, the still moment and the still camera shots, and builds the match. `director.ts` steps it at the engine's fixed rate from `performance.now` and draws it with the real renderer, so the same seed always films the same fight. The icon puts the logo over a close shot.

The loop starts 15.6 seconds into the match, so its film holds four KOs: the samurai knocks the mage out, the bear sends the samurai after, the karate takes the bear and the samurai the karate, with the bear's charged Haymakers and the mage's charged Frost Ring along the way. The poster and the icon hold the moment the karate lets go of a charged Dragon Flight in a flare, with the samurai slashing down from the air onto the mage and the bear stepping in. For stills the match is run ahead without drawing, then the pinned camera cuts in and one frame is drawn.

For looking around in development, `/showcase/brawl-battle?view=poster&at=8.2&cam=1,3,15&seed=4` holds another moment, pins the camera at x, y and distance, or films another fight. Add `lab=samurai` (or any fighter) for the move lab in `lab.ts`: that fighter plays every move in turn, tapped and then charged, beside a partner who stands still, and both go back to their marks before each move. On a still, `window.__brawlFilm(seconds)` steps on and draws, so a script can take a frame every 1/30 of a second to check motion, and `window.__brawlLab` lists when each move starts.

### Home screen media

The icon, the poster and the clip are filmed with `node tools/media/capture.mjs brawl-battle --url http://localhost:3000 --ffmpeg ffmpeg --size 1280x720` while `npm run dev` is running. The first three seconds the tool lets run are stepped without drawing, and the loop draws once per filmed frame. A slow frame on a software renderer counts as one filmed frame, so the clip never skips. The showcase test fails if an engine or bot change moves the filmed fight; pick new moments and film again when it does. The current icon, poster and clip were filmed after the second pass, with the charge auras, flares and new projectile looks.

### Tests

`npx vitest run src/games/brawl-battle` covers the knockback formula, move selection, the pad, physics against the stages, the state machine, hits, the shield, armor, bolts, lives and respawn, the ult meter, bot recovery and choices, full bot matches on every stage, replay from a seed, and a hard bot beating an easy one. On the render side it checks that every move has an animation that strikes while live and settles by the end, that movement poses stay finite, that a tumble rolls upright the short way, that follow through is capped, the camera framing above the HUD, the softer hit flash, and fighter colours. The host side checks the lobby's places and computer fighters, the match driver's fixed steps and bot hand over, which phones buzz and what the announcer calls. The stick's four sectors, tap or hold and charging, moving while attacking, bots charging, the percent's heat colour and the tunes' bar lengths are checked too. The showcase test pins the filmed fight: the stage, at least three KOs and ten hits inside the loop, and a charged move let go at the stills. The balance check above runs on request.
