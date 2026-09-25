# Subway Surfers

Status: ready.

An endless runner on the rails, played with your whole body in front of the computer's camera. No phones: a pose model downloads once to the computer and runs in the browser, and the camera picture never leaves it.

## How to play

1. Host the game and pick **1 player** or **2 players** with the mouse. Type names to go on the best scores table (optional).
2. **Start** turns the camera on and gets the body tracking ready. The first time it downloads the model, after that it starts from the cache.
3. **Calibrate:** stand in the middle of your half of the picture, tall and still, until your ring fills. Player one stands on the left.
4. **Tutorial:** step left, step right, jump and duck. Each move ticks off as the camera sees it. Skip is there for players who know it already.
5. **Run!** After 3, 2, 1:
   * **Step** left or right to change track (three tracks).
   * **Jump** over low barriers, onto ramps and from roof to roof.
   * **Duck** to roll under the high barriers. Ducking in the air slams you back down.
6. One hit ends the run, unless you are on a hoverboard. Glancing off the side of a train brings the guard and his dog close. Do it twice and they catch you.
7. With two players each runs their own copy of the same yard, side by side. When one crashes the other keeps going. When both are out the results show the winner, confetti and the best runs on this computer. Jump (or click Play again) for another go.

Step out of the picture and your run waits for you, then counts you back in. The small camera picture in the corner shows what the camera sees.

The arrow keys (player one) and WASD (player two) also work, for trying it out without standing up, and there is a keyboard mode if the camera or the model will not start.

## What is in the yard

* Three tracks of gravel, sleepers and rails, signal gantries and overhead wires.
* Standing trains, trains coming toward you with their lamps lit and horn blaring, ramps up onto the roofs, low barriers to jump and high ones to roll under.
* Coins in lines, arcs over barriers, along roofs and weaving between tracks. Coins in a quick streak chime higher and higher.
* A new look every 700 metres, as the score multiplier steps up: a sunny yard, downtown, sunset docks and neon night, with walls of graffiti, platforms, shipping containers, palm trees, billboards and tunnels.
* The pace rises the further you run.

## Power ups

| Power up | What it does | Seconds |
| --- | --- | --- |
| Jump boots | Much higher, longer jumps, with a flip, straight onto a train roof | 12 |
| Hoverboard | Survives one crash, smashing through the barrier or up onto the roof | 25 |
| Coin magnet | Pulls in coins from every track | 12 |
| Double score | Doubles the multiplier | 15 |
| Jetpack | Flies high over everything along a trail of sky coins | 7 |

Active power ups show at the bottom left of each view, each with a ring that empties as it runs out.

## Score

Distance times the multiplier, plus 10 times the multiplier for every coin. The multiplier is the zone number (1 to 5), doubled by the Double score power up.

## How it is built

* `engine/`: pure run logic with vitest tests. The runner and collisions (`runner.ts`, `solids.ts`), the course laid from a seed in patterns (`course.ts`, `patterns.ts`, `block.ts`), power ups, the guard, the bot, the tutorial and the best scores table. It runs on a fixed step, so the same inputs always give the same run, and two players on one seed meet the same trains.
* `render/`: three.js. Models are built in code from rounded boxes, capsules and spheres merged per bone or per car (`models/`), textures are painted on canvases (`art/`), poses are eased between key poses (`anim/`), and scenery comes in chunks from shared prefabs (`world/`). Each player has their own scene, drawn side by side on one canvas.
* `audio/`: every sound synthesised through the room's buses, panned to each player's side, and a looping tune with a whistled hook.
* `host/`: the session (camera kit, phases, rounds), the controls that turn camera moves into runner input, and the React screens.
* `showcase/`: the game playing itself for the home screen media, with a director that picks the camera.

## Testing

Run the dev server and add `tools/testing/fake-camera.js` in Playwright (or `?camera=fake`). `window.__subwaySurfers` is the session and `window.__cameraKit` drives the players:

```js
await page.evaluate(() => window.__cameraKit.inject(1, { x: 0.38 }));   // step left
await page.evaluate(() => window.__cameraKit.play(1, window.__cameraKit.timelines.jump()));
await page.evaluate(() => window.__cameraKit.inject(2, null));          // player two steps out
```
