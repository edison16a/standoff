# Brawl Battle

Status: in development. The engine is built and tested. The big screen, the phone controller, sound and the home screen media come next.

A platform fighter for 1 to 4 players on one big screen, with phones as controllers. Computer fighters fill the empty places if the host wants them. Each fighter has two lives. Hits add damage, and the more damage a fighter carries the further the next hit sends them. Fly past the edge of the screen and you lose a life. The last fighter with lives left wins.

## How to play

1. Open Brawl Battle on the computer. Everyone scans the code with their phone.
2. On the phone, after the name, pick a fighter and tap Ready. Two players may pick the same fighter. Each is tinted in their own player colour.
3. On the computer, the host sets how many computer fighters join and how hard they are, then starts. The computer picks one of four stages at random.
4. Turn the phone sideways. It is a controller:
   * **Stick**: move left and right. Push up to jump, and push up again in the air to double jump. Hold down in the air to fall faster. Flick down on a floating platform to drop through it.
   * **Attack**: a quick move. What it does depends on the direction held: neutral, side, up or down on the ground, and an aerial in the air (neutral, up or down).
   * **Special**: a heavy move, again by direction. Up is the recovery move that carries you back to the stage, once per trip into the air.
   * **Ult**: fills slowly over time and faster when you land hits. The ring on the button shows how full it is. It only works when full.
   * **Shield**: hold down on the main platform. It blocks everything but ults, and shrinks while held and with each block. Blocked too much, it breaks and leaves you dizzy.
5. After a fall you come back on a platform that floats down from above. You cannot be hurt for a moment. Move to step off it.

## The fighters

| Fighter | Style | Signature moves |
| --- | --- | --- |
| Karate | Fast and light, strong in the air | Roundhouse, Flying Kick, Rising Dragon, ult Dragon Rush |
| Samurai | Longest blade reach, a little slower | Wide Slash, Iai Draw, Dash Cut, ult Thousand Cuts |
| Mage | Floaty, fights from afar | Magic Bolt, Arcane Blast, Nova, Blink, ult Arcane Storm |
| Bear | Heavy and slow, armored slams | Big Paw, Charge, Ground Pound, ult Earthquake |

## The stages

Dojo Rooftop, Floating Temple, Crystal Cave and Forest Treetop. Each has a solid main platform, a few floating platforms you can jump up through, and a blast zone well past the edges.

## Technical notes

### The engine

`engine/` is pure TypeScript with no rendering and no timers. It steps at a fixed 60 steps a second (`STEP`), and the host feeds it one command per phone per step. Everything random goes through a seeded `Rng`, so the same seed and the same commands replay the same match. The showcase relies on this.

* `match.ts`: `createMatch(entrants, options)` and `stepMatch(state, commands)`. Phases run `ready` (the Ready, Fight countdown), `fight`, `game` (the Game call) and `over`. Events for the step are left in `state.events` for the host to turn into sound, shakes and phone buzzes.
* `fighter.ts`: the state machine. Actions are idle, run, jumpsquat, air, land, attack, hurt, shield, dizzy, dead, respawn and out. Hit stop freezes a fighter completely. Presses are buffered for 6 frames, so a press made just before a move ends still comes out.
* `control.ts`: what the controls do when a fighter is free. An attack pressed with a jump wins, so pushing up and tapping Attack together is an up attack, not a jump.
* `physics.ts`: steering, gravity and fast fall, then the stage. Floating platforms only catch a fighter coming down. The main platform is a solid block.
* `moves/`: every move is frame data: total frames, hitboxes live for a window of frames, lunges, projectiles, armor and invincible frames, landing lag. Offsets are written facing right and mirrored by facing. `select.ts` maps a button and the stick to a move.
* `combat.ts`: all contacts in a step are found first and then applied, so two fighters who swing into each other both land. A box behind the fighter sends the target backwards.
* `knockback.ts`: launch speed is `(base + growth x percent) x 200 / (weight + 100)`, using the percent after the hit. A launch slows at a steady rate, so it carries speed squared over twice that rate. Double the speed flies four times as far. Hitstun and hit stop grow with it.
* `stocks.ts`: leaving the blast zone costs a life, with credit to whoever hit the fighter in the last 8 seconds. Places go by who lasted longest. Fighters out on the same step share a place, and two last fighters falling together is a draw.
* `ult.ts`, `shield.ts`, `projectiles.ts`: the ult meter, the shield and magic bolts.
* `bots/`: computer fighters. They look again every few frames (26 on easy, 13 on normal, 6 on hard), try each move against where the target stands now, and pick the one that does the most. They shield wind ups on normal and hard, use the ult when it would connect, wait at the edge instead of following someone off it, and recover with the double jump and the up special.
* `input.ts`: `PadInput` turns a phone's stick and button taps into commands, with jump fired once each time the stick crosses up.

Tuning lives in `tuning.ts` (physics, launch, hit stop, ult, shield, respawn), `roster.ts` (each fighter's body) and the move tables. In four bot matches a fall usually comes between 100 and 160 percent, and a match lasts about a minute.

### The render

`render/` draws a match with three.js and never changes it. `BrawlRenderer` owns the scene. The host calls `beforeStep()` and `afterStep()` round each engine step, then `render(dt, alpha)` each screen frame, where `alpha` is how far the clock is between steps. Fighters and bolts blend between the last two steps, so motion is smooth at any refresh rate.

* `models/`: stylised low poly fighters on one shared rig (hips, torso, head, two segment arms and legs). Every part is a painted primitive with flat faces. Parts on the same bone merge, so a fighter costs about twenty draws. A duplicate fighter wears the player's colour on the belt, armour, robe or wrestling belt.
* `anim/`: a pose is a set of joint angles. `motion.ts` covers idle, run, jumpsquat, jumps, the double jump somersault, landing, hurt, tumbling, shield, dizzy and the winner's pose. Each fighter's file (`karate.ts` and so on) has a stance, a run, a guard, a win and one animation per move. A move animation is a wind up pose and a hit pose. `strike.ts` places them from the move's own frame data: the wind up peaks just before the first hitbox, the hit holds while the hitboxes are live, then the body settles. Flurries alternate poses per hit, and the ults use explicit keys.
* `fighter-view.ts`: turns the fighter to face along the stage with a small turn toward the camera, picks the pose, flashes white when hit, shivers in hit stop, blinks while invincible and squashes on landings. `fighter-trails.ts` lays a ribbon behind the fist, foot, blade tip or staff gem while a move is live, a streak and smoke behind a fighter flung by a big hit, and a mark where each big hitbox comes out. `fighter-extras.ts` draws the shadow, the colour marker over the head, the shield bubble, dizzy stars, the respawn platform and the ult ready ring.
* `effects/`: engine events become impact stars, shockwave rings, sword streaks, dust, a colour beam from the blast line on a KO, the flare of an ult and confetti for the winner. Particles are one draw per pool, and the flat glowing shapes come from a fixed pool of 48.
* `camera/`: `framing.ts` works out the box to keep in view (every fighter, padded, never narrower than 17 metres, never past the blast zone) and how far back to stand. `FrameCamera` eases toward it, opens wide for the countdown, closes in on the winner, pushes in a little on heavy hits and shakes with a trauma that fades.
* `stages/`: one file per stage. Platforms sit exactly on the engine's surfaces, with a bright lip on every edge you can fall from. Static scenery merges into one solid and one glowing mesh. Petals, clouds, motes, leaves and fireflies drift in one instanced mesh each, placed from the clock alone so a filmed showcase always matches. Each stage has its own gradient sky, fog and three lights. There are no shadow maps; a soft disc under each fighter does the job.

A full match draws in about 80 draw calls and under 10,000 triangles.

### Messages

`protocol/` holds the zod schemas. Phones send `hello`, `pick` and `ready`, plus the pad kit's stick and the buttons `attack`, `special` and `ult`. The host sends each phone a `state` with its phase, pick, percent, lives, ult meter and place, and `buzz` for moments worth a vibration.

### Tests

`npx vitest run src/games/brawl-battle` covers the knockback formula, move selection, the pad, physics against the stages, the state machine, hits, the shield, armor, bolts, lives and respawn, the ult meter, bot recovery and choices, full bot matches on every stage, replay from a seed, and a hard bot beating an easy one. On the render side it checks that every move has an animation that strikes while live and settles by the end, that movement poses stay finite, the camera framing, and fighter colours.
