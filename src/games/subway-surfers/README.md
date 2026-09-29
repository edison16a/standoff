# Subway Runner

Status: ready.

An endless runner through a sunny cartoon rail yard, for one player, played from the waist up in front of the computer's camera. No phones: a pose model downloads once to the computer and runs in the browser, and the camera picture never leaves it.

## How to play

1. Host the game and pick how hard to start with the mouse:
   * **Easy** starts at a jog, as the run always has.
   * **Medium** starts at the pace and busyness of a score near 7,000.
   * **Hard** starts at the pace of a score near 20,000, close to top speed.

   Type a name to go on the best scores table (optional).
2. **Start** turns the camera on and gets the body tracking ready. The first time it downloads the model, after that it starts from the cache.
3. **Calibrate:** stand in the middle of the picture, tall and still, until your ring fills. The camera only needs to see you from the waist up. Where your head rests becomes your head line, with a band around it.
4. **Tutorial:** move left, move right, jump and roll. Each move ticks off as the camera sees it. Skip is there for players who know it already.
5. **Run!** After 3, 2, 1:
   * **Move** or lean left or right to change track (three tracks).
   * **Jump** so your head goes up out of the band, over low barriers, onto ramps and from roof to roof. A small hop is enough. Bobbing and nodding do not count.
   * **Duck** so your head drops below the band to roll under the high barriers. You keep rolling while your head stays down. Ducking in the air slams you back down. Your head dipping as you land from a jump is not a duck.
6. One hit ends the run, unless you are on a hoverboard. Glancing off the side of a train makes you stumble and brings the inspector and his dog close. Do it twice and they catch you.
7. Your name sits at the top right beside the score. After a crash the results show your score, coins, distance and level, confetti and the best runs on this computer. Jump (or click Play again) for another go, or click Menu to change the level.

Step out of the picture and your run waits for you, then counts you back in. If the camera stops mid run, the run waits and the screen says what went wrong. The camera turns off in the lobby. The small camera picture in the corner shows what the camera sees, with your head line and band.

The arrow keys also work, for trying it out without standing up, and there is a keyboard mode if the camera or the model will not start.

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
* The pace climbs fast, from 12 to 36 metres a second, about 23 after a minute and over 30 after two. It gets hard, but never impossible: the course never asks for two moves less than 0.65 seconds apart. That is 0.45 seconds to react plus the moment the camera needs to read a move.

## Power ups

| Power up | What it does | Seconds |
| --- | --- | --- |
| Super sneakers | Much higher, longer jumps, with a flip, straight onto a train roof | 12 |
| Hoverboard | Survives one crash, smashing through the barrier or up onto the roof | 25 |
| Coin magnet | Coins from every track fly to you | 12 |
| Score multiplier | Doubles the multiplier, with gold sparkles round the runner | 15 |
| Jetpack | Flies high over everything along a trail of sky coins | 7 |

Power ups float over the track in a glowing halo over a ring. Active ones show at the bottom left, each with a ring that empties as it runs out.

## Score

Distance times the multiplier, plus 10 times the multiplier for every coin. The multiplier is the zone number (1 to 5), doubled by the score multiplier power up.

A coin counts the moment it touches the runner. With the magnet, coins fly in and count as they arrive.

## Sound

The music and effects are synthesised live through the room's music, crowd and effects buses, so the volume settings apply to them. The spoken lines use the browser's own voice and follow the effects volume by hand.

* **Music.** Two songs, each sixteen bars with an A and a B section, written as text a bar a row (`score.ts`) and played through a warm low pass.
  * The run plays "Last Train Boogie" (`run-song.ts`, `disco.ts`), retro disco in A minor at 122 beats a minute. Four on the floor, open hats on the offbeats, handclaps on two and four, a funky octave bass and a clavinet. The strings sing the hook over the A section, then hold a lush chord and answer higher in the B section with stabs on the offbeats. Each half ends with a clap roll and a string sweep up into the next. It picks up a little as the run gets faster.
  * The menus play "Night Platform" (`lobby-song.ts`, `band.ts`), a slow late night groove in F major at 100. A warm pad breathes under every bar and hands each chord to the next, a soft gliding lead floats over the A section and the electric piano sings the B section, over a round bass, a padded kick, finger snaps and a shaker.
  * The music dips under crashes, power ups and new zones, and goes muffled while the runner is waiting.
* **Effects.** Coins chime higher through a streak. Jumps, landings, rolls and lane swishes are layered from a short attack, a body and a tail, and drift a little in pitch so repeats never sound the same. Lane swishes travel across the stereo field the way you moved.
* **The yard.** Train horns and rushing air, a clang when you glance off a train, the inspector's whistle and his dog barking as they close in, and a boom with falling debris on a crash.
* **Celebrations.** Power ups get a rising arpeggio and a short hype voice line. The results get a horn fanfare and a cheer from the platform, bigger for a new best.

## How it is built

* `engine/`: pure run logic with vitest tests. The runner and collisions (`runner.ts`, `solids.ts`), coins and power ups (`collect.ts`), the course laid from a seed in patterns (`course.ts`, `patterns.ts`, `block.ts`), power ups, the inspector, the bot, the tutorial and the best scores table. It runs on a fixed step, so the same inputs always give the same run. The pace and the least gap between moves live in `tuning.ts`. The difficulty (`difficulty.ts`) is a head start in metres on the pace and on how busy the yard is, 1,600 for Medium and 3,000 for Hard, measured with the test bot. The score still starts at zero. A bot with a person's limits (`hands.ts`: the camera's lag, and the gap before the next move) runs several seeds in the tests up to top speed without a crash, and a second test checks the gap between obstacles in each lane.
* `render/`: three.js, in a bold cartoon look. Every lit surface uses one toon material on a soft banded ramp (`toon.ts`), with no tone mapping, so the painted colours come out as painted. Outlines are ink hulls: each part can carry a copy of itself grown a little and drawn inside out, all merged into one extra draw per model (`mesh-builder.ts`). Characters use the same idea through a shader that pushes their skin out along the normals (`outline.ts`), and their faces sit on a mesh of their own with no line. Models are built in code from rounded boxes, capsules and spheres merged per bone or per train (`models/`), textures are painted on canvases (`art/`), and poses are eased between key poses, with a stumble and a landing laid on top (`anim/`, `actors/`).
* The yard is cheap to draw. Scenery comes in chunks of 30 metres from shared prefabs (`world/`). Every chunk, train, barrier and power up is a copy of a prefab taken from a pool and given back as it falls behind (`prefabs.ts`), so a long run allocates next to nothing. Coins are one instanced mesh with an instanced ink twin. Facades, shop signs and train sides are texture atlases, so a street of flats or a whole train draws its paint in one call. There are no shadow maps, just soft patches under things. A run draws in about 200 calls.
* `audio/`: the two songs and their bands (`run-song.ts`, `disco.ts`, `lobby-song.ts`, `band.ts`, `music.ts`), the effects in layers (`moves.ts`, `hits.ts`, `cues.ts`), the results celebration and the hype voice, all driven by `sound-director.ts`.
* `host/`: the session (camera kit, phases, the round), the controls that turn head line moves into runner input (`camera-input.ts`, with the keys in `controls.ts`), and the React screens.
* `showcase/`: the game playing itself for the home screen media, with a director that picks the camera.

## Testing

Run the dev server and add `tools/testing/fake-camera.js` in Playwright (or `?camera=fake`). `window.__subwaySurfers` is the session and `window.__cameraKit` drives the player:

```js
await page.evaluate(() => window.__cameraKit.inject(1, { x: 0.3 }));    // move left
await page.evaluate(() => window.__cameraKit.play(1, window.__cameraKit.timelines.jump()));   // head up out of the band
await page.evaluate(() => window.__cameraKit.play(1, window.__cameraKit.timelines.duck()));   // head down: roll
await page.evaluate(() => window.__cameraKit.inject(1, null));          // step out of view
await page.evaluate(() => window.__subwaySurfers.playWithKeys());       // skip the camera and run with the arrow keys
```

While a run is going, the host's hidden admin panel (three quick taps on the settings gear) can start any power up or skip to the next zone (`host/admin.ts`).

## Home screen media

`showcase/` plays a seeded run with a computer runner and a director that picks the camera, so every capture is the same. The tile shows the runner on a hoverboard by a graffiti wall above the logo, from a spot with nothing standing close by, the poster has a train rolling in, and the clip is eight seconds of the yard: lane changes, coins picked up as the runner touches them, super sneakers for a few seconds with a high flip seen from the side, then a roll. The showcase turns every power up on its course into super sneakers (or clears them), since the magnets the yard lays early on pull coins in from afar.

```sh
node tools/media/capture.mjs subway-surfers --url http://localhost:3000 --ffmpeg ffmpeg --size 960x540
```

The clip in `public/games/subway-surfers/` is kept at the capture size, 960 by 540, so both files stay under 4 MB.
