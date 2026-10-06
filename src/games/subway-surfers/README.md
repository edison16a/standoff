# Subway Runner

Status: ready.

An endless runner through a sunny cartoon rail yard, for one player, played from the waist up in front of the computer's camera or with the keyboard. No phones: a pose model downloads once to the computer and runs in the browser, and the camera picture never leaves it.

## How to play

1. Host the game and pick with the mouse:
   * **Camera** or **Keyboard**, how you will play. Keyboard skips the camera, the calibration and the tutorial. See Keyboard mode below.
   * How hard to start. Each level shows its score multiplier, which counts on every point of the run:
     * **Easy**, x1, starts at a jog, as the run always has.
     * **Medium**, x1.5, starts at the pace and busyness of a score near 7,000 on Easy.
     * **Hard**, x2, starts at the pace of a score near 20,000 on Easy, close to top speed.
     * **Demon**, x3, starts past top speed and stays there. The yard is packed tight: mostly the hardest patterns, shorter breaks between them, trains rolling in faster, and a tenth of a second less between two moves. Very hard, but always passable.

   Type a name for the leaderboard (optional). Without one the run goes on as Player 1.
2. **Start** turns the camera on and gets the body tracking ready. The first time it downloads the model, after that it starts from the cache.
3. **Calibrate:** stand in the middle of the picture, tall and still, until your ring fills. The camera only needs to see you from the waist up. Where your head rests becomes your head line, with a band around it.
4. **Tutorial:** move left, move right, jump and roll. Each move ticks off as the camera sees it. Skip is there for players who know it already.
5. **Run!** After 3, 2, 1:
   * **Move** or lean left or right to change track (three tracks). The runner snaps across in about 0.15 seconds, leaning into the move.
   * **Jump** so your head goes up out of the band, over low barriers, onto ramps and from roof to roof. A small hop is enough. Bobbing and nodding do not count. A jump pops up, hangs a moment at the top and snaps back down, about 0.7 seconds in all. A jump just after running off the end of a roof still counts.
   * **Duck** so your head drops below the band to roll under the high barriers. You keep rolling while your head stays down. Ducking in the air drops you straight down into a roll. Your head dipping as you land from a jump is not a duck.
6. Running head on into a barrier or the front of a train ends the run, unless you are on a hoverboard. Glancing off the side of a train, or clipping the corner of a barrier or a train as you change lanes, makes you stumble: you bounce back and the inspector and his dog close in. Stumble again within seven seconds and they catch you.
7. Your name sits at the top right beside the score, then the zone's multiplier and the level with its own multiplier, like **Hard x2**. Points from coins and power ups pop up under the coin count as they land.
8. After a crash the results show your score and your place on this computer, like **#3 on this computer**, with **New best!** when no run here has scored more. Under the score: where the points came from (running, coins and power ups), then confetti and the leaderboard beside it, scrolled to your run and lit up. Jump (or click Play again) for another go, or click Menu to change the level.

Step out of the picture and your run waits for you, then counts you back in. If the camera stops mid run, the run waits and the screen says what went wrong. The camera turns off in the lobby. The small camera picture in the corner shows what the camera sees, with your head line and band.

## Keyboard mode

Pick **Keyboard** in the menu and **Start** goes straight to the countdown, with no camera at all.

| Key | Move |
| --- | --- |
| Left arrow or A | One track left |
| Right arrow or D | One track right |
| Up arrow or W | Jump |
| Down arrow or S | Roll, for as long as it is held |

The keys go by where they sit on the keyboard, so other layouts work the same. Holding a key down does not repeat the move. On the results, Up (or W) plays again once the card says so. The keys are off in camera mode, so a camera run on the leaderboard was run with the body. If the camera or the model will not start, **Play with the keyboard** on that screen switches to keyboard mode.

The admin panel's Keyboard player (three quick taps on the settings gear, then Platform) shows these keys on its controls card (`keyboard.ts`). It sends nothing itself: pick **Keyboard** in the menu and the keys above work on the big screen.

## Leaderboard

Every finished run is saved on this computer only, in the browser's localStorage, ranked by final score, however low and whether or not a name was typed. It never fills up and never ends. Each row shows the rank, the name, the level (with "keys" for a keyboard run) and the score. The lobby shows it beside the menu, and the results show it with your run lit up. **Clear leaderboards** in the host's Settings panel wipes it, with every other game's boards, after a confirm. The old best runs table from before moves onto the leaderboard by itself the first time the game opens. The board is the kit's (`src/games/kit/leaderboard`), keyed `subway-surfers` and `runs`.

## What is in the yard

* A bright sunny day: a blue sky that pales to the horizon, fluffy clouds drifting slowly round and a hazy city far off.
* Three tracks on warm gravel, with wooden sleepers, bright steel rails and a concrete cable trough down each side.
* Commuter trains in red, blue, yellow and green, with windows, doors, a white stripe and bold graffiti over the sides. Their roofs are pale and flat, to run along. Trains coming toward you have their lamps lit.
* Ramps of yellow steel up onto the roofs. Barriers in red and white stripes: low ones on a stand to jump, tall frames with a gap underneath to roll under, some with a blue sign pointing down.
* Coins in lines, arcs over barriers, along roofs and weaving between tracks. Each is gold with a star struck in the middle. Coins in a quick streak chime higher and higher.
* Along the sides: concrete walls covered in graffiti, wooden plank fences with tags, corrugated metal fences, station platforms with canopies, benches, bins and name boards, shops with striped awnings, round cartoon trees, container yards with a crane, and rows of colourful flats behind it all with water tanks on the roofs.
* Signals on posts beside the tracks and steel gantries with a signal over each track. Brick tunnel portals, and tunnels with tiled walls and warm lamps.
* A new zone every 700 metres, as the score multiplier steps up: Downtown yard, Harbour sidings, Park lane and Uptown heights. Each lines the tracks differently, all in daylight.
* The runner is a cartoon kid in a red hoodie, a blue cap, baggy jeans and white sneakers, with a backpack and a spray can in its side pocket. They run with a proper stride, tuck into a jump, roll, jolt sideways when they stumble and squash a little when they land. The inspector, in his peaked cap, tie and gold epaulettes, and his dog chase at the start and after a stumble.
* The runner bursts off the line at GO, and the pace climbs smoothly from 12 to 36 metres a second, about 23 after a minute and over 30 after two. It gets hard, but never impossible: the course never asks for two moves less than 0.65 seconds apart. That is 0.45 seconds to react plus the moment the camera needs to read a move.
* The camera sits behind and above the runner like the real game, so they run in the lower middle of the picture with the yard opening out ahead. It follows a lane change a beat behind with a slight roll, rises onto the roofs, shakes only on a crash, a stumble or a save and stays still at any speed (Demon included), widens the view as the pace climbs and kicks wider for a power up, a super sneakers leap, a hoverboard save and a new zone.

## Power ups

| Power up | What it does | Seconds |
| --- | --- | --- |
| Super sneakers | Much higher, longer jumps, with a flip, straight onto a train roof | 12 |
| Hoverboard | Survives one crash, smashing through the barrier or up onto the roof | 25 |
| Coin magnet | Coins from every track fly to you | 12 |
| Score multiplier | Doubles the multiplier, with gold sparkles round the runner | 15 |
| Jetpack | Flies high over everything along a trail of sky coins, then eases down to just over the roofs | 7 |

Power ups float over the track in a glowing halo over a ring. Active ones show at the bottom left, each with a ring that empties as it runs out. After a hoverboard save or a jetpack landing the runner passes through things for a moment and blinks while safe.

## Score

Every point is multiplied twice: by the run's multiplier, the zone number (1 to 5) doubled by the score multiplier power up, and by the level's multiplier (Easy x1, Medium x1.5, Hard x2, Demon x3).

* **Running:** one point a metre.
* **Coins:** 10 points each.
* **Power ups:** 100 points each, the moment one is picked up.

A coin counts the moment it touches the runner. With the magnet, coins fly in and count as they arrive.

The level multipliers were weighed with the test bot playing like a person on camera. Before its multiplier, a level earns more points a second the harder it is, since it runs faster and reaches higher zones sooner: in 90 seconds about 10,800 on Easy, 14,700 on Medium, 25,000 on Hard and 28,000 on Demon. The multiplier then pays for the risk, since a harder run ends sooner. A long Easy run still climbs the board, as its pace and yard catch up with Hard's after about 3,000 metres.

## Sound

The music and effects are synthesised live through the room's music, crowd and effects buses, so the volume settings apply to them. The spoken lines use the browser's own voice and follow the effects volume by hand.

* **Music.** Two songs, each sixteen bars with an A and a B section, written as text a bar a row, with drum parts as rows of sixteen steps (`score.ts`), and played through a low pass that each song opens as far as it needs.
  * The run plays "Rail Yard Bounce" (`run-song.ts`, `crew.ts`), sunny hip hop in C major at 104 beats a minute with a lazy swing. A kick that knocks, a snare with a clap on it, soft hats with a roll into every fourth bar, a round sub bass, and warm keys over a pad. A marimba hook bounces over the A section and a whistled tune floats over the B section, whose kick gets busier. Each half ends on a record scratch and a soft rush into the next. Every voice is round rather than bright, so the beat never gets harsh. It picks up a little as the run gets faster.
  * The menus play "Night Platform" (`lobby-song.ts`, `band.ts`), a slow late night groove in F major at 100. A warm pad breathes under every bar and hands each chord to the next, a soft gliding lead floats over the A section and the electric piano sings the B section, over a round bass, a padded kick, finger snaps and a shaker.
  * The music dips under crashes, power ups and new zones, and goes muffled while the runner is waiting.
* **Effects.** Coins chime higher through a streak, climbing an octave and a half and no further. Jumps and landings thump, rolls swish and lane changes whoosh, each layered from a short attack, a body and a tail, and drift a little in pitch so repeats never sound the same. Lane swishes travel across the stereo field the way you moved.
* **The yard.** Through the countdown the kid shakes a spray can on three and two and tags the train on one, then the inspector blows his whistle at GO. Trains rolling in rumble low, swelling as they close in, and honk twice on a chord. Rushing air as they pass, a clang when you glance off a train, the dog barking as they close in, and a boom with falling debris on a crash.
* **Celebrations.** Power ups get a rising arpeggio with a sound of their own on top (`jingles.ts`): a jetpack ignition, a sneaker spring, a magnet hum, a hoverboard swell and a cash bell for the score multiplier. Then a short hype voice line. The results get a horn fanfare and a cheer from the platform, bigger for a new best.

## How it is built

* `engine/`: pure run logic with vitest tests. The runner (`runner.ts`, `body.ts`), how it moves (`motion.ts`: the jump arc, falling faster than it rises, the lane change and the burst off the line), what it hits (`contact.ts`, `solids.ts`: head on, from the side, or a clipped corner), coins and power ups (`collect.ts`), the course laid from a seed in patterns (`course.ts`, `patterns.ts`, `block.ts`), power ups, the inspector, the bot and the tutorial. It runs on a fixed step, so the same inputs always give the same run. The pace and the least gap between moves live in `tuning.ts`. The difficulty (`difficulty.ts`) is a head start in metres on the pace and on how busy the yard is, 1,600 for Medium, 3,000 for Hard and 6,000 for Demon, measured with the test bot, plus each level's score multiplier. Demon also tightens the yard itself (`yard.ts`): a tenth faster pace, 0.55 seconds as the least gap between moves instead of 0.65, and a pattern mix that runs past the usual busiest. The score still starts at zero, and `points.ts` keeps it by where it came from. A bot with a person's limits (`hands.ts`: the camera's lag, and the gap before the next move) runs several seeds in the tests up to top speed without a crash, on Hard and on Demon too, and a second test checks the gap between obstacles in each lane on every level.
* `render/`: three.js, in a bold cartoon look. Every lit surface uses one toon material on a soft banded ramp (`toon.ts`), with no tone mapping, so the painted colours come out as painted. Outlines are ink hulls: each part can carry a copy of itself grown a little and drawn inside out, all merged into one extra draw per model (`mesh-builder.ts`). Characters use the same idea through a shader that pushes their skin out along the normals (`outline.ts`), and their faces sit on a mesh of their own with no line. Models are built in code from rounded boxes, capsules and spheres merged per bone or per train (`models/`), textures are painted on canvases (`art/`), and poses are eased between key poses, with a stumble, a sideways shove and a landing laid on top (`anim/`, `actors/`). The chase camera (`chase-camera.ts`) places the lens, and its knock shake and wider view at speed live apart in `camera-feel.ts`.
* The yard is cheap to draw. Scenery comes in chunks of 30 metres from shared prefabs (`world/`). Every chunk, train, barrier and power up is a copy of a prefab taken from a pool and given back as it falls behind (`prefabs.ts`), so a long run allocates next to nothing. Coins are one instanced mesh with an instanced ink twin. Facades, shop signs and train sides are texture atlases, so a street of flats or a whole train draws its paint in one call. There are no shadow maps, just soft patches under things. A run draws in about 200 calls. While the menus are up, the yard warms up one piece a frame (`world/warmup.ts`): every zone's sides, the trains, barriers, tunnels and power ups are built, their shaders compiled and their textures sent to the graphics card, so a new zone never stalls a frame mid run.
* `audio/`: the two songs and their bands (`run-song.ts`, `crew.ts`, `lobby-song.ts`, `band.ts`, `music.ts`), the effects in layers (`moves.ts`, `hits.ts`, `cues.ts`, `jingles.ts`, `yard.ts`), the results celebration and the hype voice, all driven by `sound-director.ts`.
* `host/`: the session (camera kit, phases, the round), the controls that turn head line moves or keys into runner input (`controls.ts`, with the camera in `camera-input.ts` and keyboard mode in `key-input.ts`), saving each run to the leaderboard (`results.ts`, `run-board.ts`), the React screens, and in development an autopilot that hands the player's run to the test bot (`autopilot.ts`).
* `showcase/`: the game playing itself for the home screen media, with a director that picks the camera.

## Testing

Run the dev server and add `tools/testing/fake-camera.js` in Playwright (or `?camera=fake`). `window.__subwaySurfers` is the session and `window.__cameraKit` drives the player:

```js
await page.evaluate(() => window.__cameraKit.inject(1, { x: 0.3 }));    // move left
await page.evaluate(() => window.__cameraKit.play(1, window.__cameraKit.timelines.jump()));   // head up out of the band
await page.evaluate(() => window.__cameraKit.play(1, window.__cameraKit.timelines.duck()));   // head down: roll
await page.evaluate(() => window.__cameraKit.inject(1, null));          // step out of view
await page.evaluate(() => window.__subwaySurfers.playWithKeys());       // keyboard mode, as if picked in the menu: straight to the countdown
await page.evaluate(() => window.__subwaySurfers.autopilot(true, true)); // the test bot plays, with a person's lag, showing off on the roofs
```

While a run is going, the host's hidden admin panel (three quick taps on the settings gear) can start any power up or skip to the next zone (`host/admin.ts`).

## Home screen media

`showcase/` films computer runners on seeded runs, so every capture is the same. The clip is a wordless eight second trailer cut together from several runs (`showcase/trailer.ts`): the inspector and his dog on the runner's heels seen from low ahead, a leap over the rails that slows right down as the camera swings round, super sneakers flipping high in slow motion, a run along the train roofs from the game's own camera, a jetpack flight past the rooftops from below, and one last leap. Each cut is a run played unseen up to its moment and filmed from its own camera, with an eased push. Slow motion runs the game slower, so poses and sparkle slow too. The cuts add up to exactly eight seconds and repeat, and everything moves on run time, so the clip loops without a seam. Cuts with a camera in front take away the coins just ahead of the runner, which would fill the lens. Every placed camera also shrinks any coin that would cover the runner or sit against the lens (`showcase/unblock.ts`). That only changes the drawing, so the computer runner still makes the same moves.

The icon is a cover: the runner bursts at the viewer on the hoverboard with arms flung up under a bright sky, a train alongside and the inspector chasing behind, over the logo. The poster is the same chase from further back as a train rolls in on the next track. Both are graded a little like a film still: more contrast and colour and a dark edge. `?cut={...}` on `/showcase/subway-surfers` films any one moment of any seed, in development only. To capture again, with the dev server running:

```sh
node tools/media/capture.mjs subway-surfers --url http://localhost:3000 --ffmpeg ffmpeg --size 1280x720 --max-mb 3.7
```

The clip in `public/games/subway-surfers/` is kept at 1280 by 720, and the tool counts its cap in MiB, so `--max-mb 3.7` keeps both files under 3.9 MB.
