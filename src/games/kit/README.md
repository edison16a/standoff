# The game kit

Shared code that games may import. The kit never imports a game, and games still never import each other. Change the kit with care: every game that uses it changes too.

## What is here

* `players.ts`: one colour per seat (red, green, blue, amber), for dots, name tags and scores in every game.
* `motion/math3d.ts`: the small quaternion and vector helpers.
* `motion/orientation.ts`: `subscribeOrientation`, the phone's orientation as a quaternion on every reading.
* `steps/StepShell.tsx`: the frame for a game's phone setup. Every game uses the same order: the platform asks for a name (or Skip), then the game shows **Calibrate**, then its own choices (weapon, kart, blade), then **Ready**. Each step is its own page.
* `aim/`: pointing the phone at the big screen, for Fruit Slicer, Zombie Survival and Shooting Gallery.
* `victory/`: winners' scenes. Confetti, spotlights, a circling camera, trophies and a belt made in code, podiums, and the winners' names over it all. See Victory scenes below.

## Aiming

The phone is held flat like a remote, top edge toward the big screen. Only where the top edge points matters, so twisting the phone never moves the aim.

Phone side:

```ts
const aim = new PhoneAim(room);           // reads the sensors, or falls back to dragging
<AimCalibrate aim={aim} colour={playerColor(seat)} onDone={next} />   // plan="sword" for six targets
aim.stream(true);                         // while playing, streams the aim at up to 60 Hz
<FireButton label="Fire" onFire={() => aim.fire()} onRelease={stopAuto} />   // onRelease also fires if it turns disabled while held
aim.recenter();                           // a small button for when the gyro drifts
<AimPad aim={aim}>{/* fire button */}</AimPad>   // only when aim.getSnapshot().source is "touch"
aim.dispose();
```

Calibration is hold to calibrate, the kit's standard. Targets show on the big screen and the phone in turn. The player points at each and holds still: a ring fills, the target turns green and the next one comes up by itself. No button, so a tap never nudges the aim. A target only fills once the phone has turned away from the last one, and the first only once the phone has moved from how the page found it, so a phone lying still while the player reads is never taken as pointing at the middle. Pick how many with `plan`: `"shooter"` (the default) takes the middle and all four corners; `"sword"` takes the middle, all four corners and the middle again, for games that swing all over the screen. From them the phone learns how far this player turns to cross the screen from where they sit, left, right, up and down separately (`aim-fit.ts`). Skip the rest reuses the spans this phone measured last time. `kit/motion/steady-hold.ts` has the hold meter for any other hold to confirm page.

Pointing past the edge of the screen keeps the aim at the edge, dot and all, and it moves on smoothly the moment the phone points back in. `HostAim` pins every point and shot a touch inside its zone (`EDGE`), so a laser dot a game draws in 3D still shows whole enough to see, and every pointing game gets this. `AimOverlay` also draws its own dots and names fully inside the zone. It sits on top of the page, so a corner target stays in sight over the join card and a dot at the edge over the tool bar, while it still draws in the box of the element it is placed in. A game that draws its own pointer (`dots={false}`) still gets the kit's dot, with no name, while the aim is held at the edge (`HostAim.atEdge`), so the tool bar or the game's own scoreboard never hides it there. The measured spans are kept on the phone only.

Host side:

```ts
const aim = new HostAim(room);
aim.point(seat);                          // smoothed { x, y }, both -1 to 1, y up, or null when not aiming
aim.onFire((seat, point) => ...);         // the exact aim of every trigger pull
<AimOverlay aim={aim} players={room.players} dots targets />   // targets={false} hides calibration targets in cutscenes
```

Screen points are WebGL clip space, so `raycaster.setFromCamera(new Vector2(point.x, point.y), camera)` works as is. Messages the kit sends all have kinds starting with `aim`. Games must not use that prefix for their own.

### Aiming inside a zone

For a split screen game, where each player aims into their own view, give each player a zone: their part of the big screen as fractions from the top left, the same shape as a `SplitMap` rect. The calibration targets then show inside the zone, outlined in the player's colour, and the aim's -1 to 1 spans the zone, so a point maps straight onto that player's view.

```ts
aim.setZone(seat, { x: 0.5, y: 0, w: 0.5, h: 1 });   // host: this seat aims in the right half. null gives back the whole screen
<AimCalibrate aim={aim} colour={colour} zone={{ x: 0.5, y: 0, w: 0.5, h: 1 }} onDone={next} />   // phone: the same zone, for its pictures
```

If a zone changes after a player calibrated (someone joins and the halves become quarters), the host maps their points into the new zone, so the aim still lands where they really point. Saved spans are kept as if measured across the whole screen and scaled to the zone when reused. Games without zones are unchanged.

## Testing in a browser

`tools/testing/fake-sensors.js` fakes a phone's sensors for Playwright. Set `window.__sensors.alpha` (turn, right is lower), `beta` (top edge up) and `gamma` (roll) to point or tilt.

## Gamepad

For games where the phone is a controller: a floating thumb stick on the left and round buttons on the right, as in Basketball 3v3 and Soccer 3v3. Messages it sends all have kinds starting with `pad`, so games must not use that prefix.

Phone side:

```ts
const pad = new PhonePad(room);
pad.stream(true);                                         // while the pad is on screen
<Joystick onChange={(stick) => pad.setStick(stick)} colour={teamColour} />
<PadButton label="Shoot" size="lg" onDown={() => pad.press("shoot")} onUp={() => pad.release("shoot")} />
pad.releaseAll();                                         // when the pad hides
pad.dispose();
```

The stick is x right and y up, from -1 to 1, with a dead zone. Its centre is wherever the thumb lands. The stick streams often and may drop a frame. Presses and releases go reliably, each with the stick at that instant.

Host side:

```ts
const pad = new HostPad(room);
pad.stick(seat);                                          // { x, y }, centred if the phone went quiet
pad.isHeld(seat, "shoot");
pad.onPress((seat, button, down, stick) => ...);          // once per press and once per release
```

A phone that leaves has its held buttons released, so nothing sticks on.

## Camera

`camera/` gives a camera game the computer's webcam and a pose model that runs in the browser, and turns each player into a body and moves. The model downloads once to the player's computer and runs there. Nothing from the camera leaves the computer, and the screens say so.

### The kit

Make one per room in `createHost`, and dispose it with the room.

```ts
import { CameraKit } from "@/games/kit/camera";

const kit = new CameraKit({ players: 2 });   // 1 or 2 players
kit.start();                                  // camera and model at once. Call it again to retry after a problem.
kit.dispose();
```

Players stand side by side facing the screen, seen from the waist up. Only the head and shoulders are needed, never the hips or legs, since a computer camera close up rarely sees a whole body. The picture is mirrored like a selfie, so player 1 is on the left of the screen and a player who moves to their left moves left on screen. Once tracked, players never swap slots, and a player who steps out and back in keeps their slot. Everything the kit hands out is in this mirrored picture: x runs from 0 at the left to 1 at the right, y from 0 at the top to 1 at the bottom. Slots start at 1.

`useKitStatus(kit)` gives React the status: `camera` (state, problem, devices), `model` (state, download progress, variant, delegate), `ready`, `present` per player, `fps` and `inferenceMs`. It changes a few times a second at most, never per frame.

### Screens

```tsx
<ModelLoader kit={kit} />                  // until status.ready: the camera, the download bar, a way out of every problem
<CameraCalibrate kit={kit} onDone={(baselines) => play()} />
<CornerPreview kit={kit} corner="bottom-right" width={260} />   // during play, warns when someone steps out
<CameraPreview kit={kit} spots />          // the mirrored picture with each player's skeleton and head line, fills its box. spots adds the outlines.
<CameraPicker kit={kit} />                 // a camera choice, shown only when there are several
```

Each piece is bold enough for a big screen and brings its own styles. `CameraCalibrate` fills its positioned parent. Each player first steps into a head and shoulders outline in their colour, then stands tall and still while their ring fills. Where their head rests becomes their head line, drawn across the outline. If a head is too near the top of the picture it asks the player to step back, so a jump has room. Both players calibrate at once. It sets every baseline on the kit before calling `onDone`. Options:

* `names` puts the players' names on their labels.
* `onPlayerDone(slot)` is called as each player's ring fills, for the game's own sound through `room.audio`.
* `extra` adds the game's own step after standing still. It renders into the screen and calls `done` when finished:

```tsx
<CameraCalibrate
  kit={kit}
  extra={{
    title: "Show your guard",
    text: "Both fists up by your face.",
    render: ({ kit, done }) => <GuardCheck kit={kit} done={done} />,   // for example, done once every kit.moves(slot).guard holds
  }}
  onDone={(baselines) => play()}
/>
```

To skip calibration next round, keep the baselines and give them back with `kit.setBaseline(slot, baseline)`.

`CameraPreview` and `CornerPreview` draw each calibrated player's head line with the band around it, so players can see what counts. The edge being crossed lights up while a jump or a duck lasts. `headLines={false}` hides them.

### Reading players

Tracking runs on every new camera frame, apart from the game's render loop. Read the latest state each frame, or listen for moves as they happen. Punches only come as events.

```ts
// In the render loop:
const body = kit.body(1);      // player 1's body, or null when out of view
const moves = kit.moves(1);    // { present, calibrated, lane, head, jumping, ducking, lean, guard, confidence, amounts, line }

// Or on the camera frame it happens:
const stop = kit.onMove((move) => {
  switch (move.type) {
    case "jump":               // the head went up out of its band, then "land"
    case "duck":               // the head went down out of its band, then "stand"
      break;
    case "lane":               // move.lane and move.from: -1, 0 or 1 with three lanes
      break;
    case "punch":              // move.hand "left" or "right", move.style "straight" or "hook", move.power 0 to 1
      break;
    case "lean":               // move.side: -1 left, 0 upright, 1 right
    case "guard":              // move.up
    case "away":               // a player left the picture, and "back" when they return
  }
});
```

Every move carries `slot` and `time`. `kit.latest()` is the whole last frame, and `kit.onFrame(fn)` hears every frame.

Games should read moves, not points. `moves.head` is `{ rise, side }`: how far the head is above its line (negative below) and how far the head and shoulders are right of home (negative left), both in the player's shoulder widths. `moves.line` is where the line and band sit in the picture, for a game that draws its own. `amounts.rise` and `amounts.drop` are the same height split into up and down.

A `Body` holds:

* `landmarks` and `world`: the model's 33 points, named in `LM` (`LM.leftWrist`). Left and right are the player's own. World points are metres around the hips, and a smaller z is nearer the camera. Points below the waist are usually out of view.
* `head` (the middle of the face points seen), `shoulders`, `hips` and `torso` (their middle), as picture points. `headSeen` is false when the head has left the picture, as in a big jump. `hipsSeen` is false when the hips are out of view, and then `hips` is a guess one torso length below the shoulders, square to the shoulder line.
* `shoulderWidth` in frame heights, as if facing the camera, so turning never changes it and only distance does. `scale`, the unit for arm moves, is about one torso length worked out from it. Also `torsoLength` and `confidence`, how clearly the head and shoulders are seen.
* `arms.left` and `arms.right`: `wrist`, `offset` from the shoulder in torso lengths, `reach` in the picture, `extension` (0 folded to 1 straight, from the 3D points), `forward` (metres in front of the shoulder) and `visible`.
* `velocity` of the torso, head and both wrists, in torso lengths per second.

### Moves and tuning

Jumps, ducks and lanes are measured against each player's head line, in their own shoulder widths, so a child near the camera and an adult far back read alike. They need a baseline. Guard, punches and leans work without one.

The head line is where the head rested while the ring filled. A band sits around it. The head going up over the top of the band quickly is a jump, and a slow stretch never is. The head staying under the bottom of the band for a moment is a duck, held while it stays down. Each ends once the head is well back inside the band, so an edge never flickers. The head dropping just after a landing is the knees soaking it up, so it only counts as a duck if it is still down once the landing is over. If a jump carries the head out of the top of the picture, the shoulders show where it went, and a player lost from view mid jump is waited for a little longer before they count as away.

Coming nearer the camera makes a player bigger and moves their head away from the middle of the picture. The line moves with them at once by the change in shoulder width, so leaning in or stepping back is never a move. On top of that its height follows each player slowly while they rest, faster after a clear change of size, and it holds still during a move. Home across the picture only moves with size, so standing in a side lane never drifts back to the middle. A player who sits down or stands up between rounds first reads as a duck or a jump. No real move lasts that long, so once the head has stayed down for `settleDownMs` 5000 or up for `settleUpMs` 2500, and for at least `settleFrames` 12 camera frames, the move ends and the line moves to where the head is now. The frames matter on a slow machine, which may see a whole jump in a few frames seconds apart.

| Move | What counts | Main thresholds |
| --- | --- | --- |
| lane | the head and shoulders move or lean sideways from home | `lanes` 3, `width` 1 shoulder width per lane, `hysteresis` 0.15 of a lane |
| jump | the head goes over the top of the band within `riseMs` 350 of resting | `head.up` 0.35 shoulder widths above the line |
| duck | the head stays under the bottom of the band for `duckMs` 40 | `head.down` 0.4 shoulder widths below the line, `landingMs` 400 |
| lean | the head moves sideways over the hips, seen or guessed | `offset` 0.3 torso lengths |
| guard | both wrists by the face and in front of it, elbows bent | `forward` 0.08 metres, on at 0.6 and off at 0.4 |
| punch | the arm straightens fast as the wrist drives toward the camera, or the fist swings in fast with the elbow up | `straight` 0.82, `forward` 0.12 metres, `cooldownMs` 250, `hookSpeed` 2.4 |

Each has more in `engine/gestures/`, with the defaults in `DEFAULT_MOVES`. `line` tunes how the head line follows (`followMs` 2000, `resizeAt` 0.12, `restSpeed` 0.8). Tune any of them per game, at the start or later:

```ts
const kit = new CameraKit({ players: 1, moves: { lane: { lanes: 5 }, punch: { cooldownMs: 300 } } });
kit.tune({ head: { up: 0.3 } });
```

The pure pieces are exported too, for games that want their own flow: `MoveReader`, `BaselineCollector`, `spotsFor` and `checkSpot`.

### The model

* MediaPipe Pose Landmarker, the full model (9.4 MB), with its wasm runtime (11.8 MB) from jsdelivr pinned to the installed `@mediapipe/tasks-vision`. A unit test fails if the two drift apart.
* Both download with progress into Cache Storage. The next visit starts from the cache, and works offline.
* It runs on the GPU, or the CPU when the GPU fails or WebGL is drawn in software. On a machine too slow for it, the kit steps down to the lite model (5.8 MB), then to the CPU, while play goes on. `new CameraKit({ players, model: "lite", delegate: "CPU" })` forces either.
* It runs on the page's main thread. After each frame it rests for half the time the frame took, so a slow machine drops frames instead of freezing the game. On a laptop GPU it should take well under the 33 ms between camera frames.

Camera problems arrive as `status.camera.problem`: `insecure`, `unsupported`, `no-camera`, `denied`, `busy`, `lost` or `failed`, with plain advice for each in `PROBLEM_TEXT`. Browsers only give the camera to https pages and localhost, so the host must be opened at localhost or its https address.

### Testing camera games

Without a camera or the model, for game tests: add `tools/testing/fake-camera.js` with `context.addInitScript`, or `?camera=fake` to the address. The kit starts at once and each player stands still in their spot, so calibration finishes by itself. Then drive players through `window.__cameraKit`:

```ts
await context.addInitScript({ path: "tools/testing/fake-camera.js" });
await page.evaluate(() => window.__cameraKit.calibrate());              // or wait out CameraCalibrate, about 2 seconds
await page.evaluate(() => window.__cameraKit.inject(2, { crouch: 0.6 })); // player 2 holds a pose
await page.evaluate(() => window.__cameraKit.play(1, window.__cameraKit.timelines.jump()));   // resolves when done
await page.evaluate(() => window.__cameraKit.inject(1, null));          // player 1 steps out of view
await page.evaluate(() => window.__cameraKit.release());                // back to standing in their spots
const moves = await page.evaluate(() => window.__cameraKit.takeEvents());
```

A pose is a few numbers, any of them left out: `x` (across the picture), `height` (the whole person's size in frame heights, 1.9 by default, which is close up and waist up), `head` (where the nose sits, 0.32 by default), `near` (size about the middle of the picture, as when walking nearer), `lift` (metres, a jump), `crouch`, `bow` and `lean`, and each arm as `{ guard, punch, wide, hook, raise }` from 0 to 1. The model sees nothing below the waist unless the pose says `legs: true`. A pose with no `x` stands in the player's own spot. `timelines` has `jump`, `duck`, `step` and `punch`. A timeline is a list of `{ at, pose }` keys in milliseconds, blended between. The same hooks work over a real camera, where an injected pose replaces what the camera sees for that player. `status()`, `body(slot)` and `moves(slot)` read the kit back, and `modelHistory` lists every change of the model's status.

With the real model, `/dev/camera` (development only) walks through loading, calibration and a live readout of every move. Add `?players=1`, `camera=fake`, `model=lite`, `delegate=CPU` or `guard=1` to try options. Two scripts drive it with a real person on video:

```bash
# A clip of one or two people jumping, ducking, stepping to the sides and out of view, from any still photo of someone standing.
node tools/testing/camera-clip.mjs --photo person.jpg --crop 217,150,340,420 --out clip.mjpeg --ffmpeg /path/to/ffmpeg > clip.json
# Chromium plays the clip as its webcam. The script checks the download, the slots and every move.
node tools/testing/camera-e2e.mjs --clip clip.mjpeg --timeline clip.json --out shots/
```

`--crop` is a box around the person in the photo, from the top of the head to the waist. The clip shows each player waist up, as in front of a computer camera. A CC0 photo of one person facing the camera is enough: the clip uses it twice, flipped for player 2. On a very slow machine add `--slow 8 --width 640 --height 360` to the clip, so every pose holds long enough to be seen. If the test browser cannot reach the CDN, `--mirror folder/` serves the model files from a local folder that it fills once with curl.

## Split screen map

`split/SplitMap.tsx` draws a small picture of the split screen with each player's name written big in the pane they play in, in their colour, inside a frame with four corner marks. Pass it the same rects the renderer uses (`{ name, color, rect: { x, y, w, h } }` as fractions of the screen) and put it in the game's side panel. It draws nothing for a single view.

## Split screen finish

`split/SplitFinish.tsx` is the card a player sees in their own pane once they cross the line, for example "Edison Law got 1st place!", while the other panes keep racing. Render `<SplitFinish name={name} place={place} color={color} />` inside the pane's positioned box and it centres itself. A HUD that only knows who has finished, not their place, can get places from `useFinishPlaces(finished)`, which numbers players in the order they finished and starts over when a new round clears them. The words and the order live in `split/finish.ts`, tested on their own. Magic Kart and Cube Game use it. Subway Runner has no finish line, so it does not.

## Victory scenes

`victory/` has everything for a winners' scene in three.js, and the names that go over it. Each piece works on its own, in a game's own scene. Units are metres, y is up, and trophies stand on their origin. Boxing, Magic Kart and Brawl Battle use it. `/dev/victory` (development only) shows every piece; add `?show=basketball`, `worldcup`, `belt`, `cup` or `podium` for one.

```ts
import { VictoryConfetti, StageLights, OrbitCamera, createBoxingBelt, studioEnvironment } from "@/games/kit/victory";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
```

### Metal needs something to reflect

Gold and silver only show what they reflect. Without an environment a trophy looks like a dark lump. If the scene has none, give it one:

```ts
scene.environment = studioEnvironment(renderer);   // dispose the texture with the scene
```

### Confetti

Paper and foil cards with a slight curl, some square and some long strips. They fall with real air drag: flat to the fall they float, edge on they drop, and a tilted card skates sideways. A cannon's load leaves as a clump and opens out, so it carries high before it drifts down. Pieces tumble, catch the light and settle flat on the floor. Two instanced meshes draw them all.

```ts
const confetti = new VictoryConfetti({ count: 1600, size: 0.05, colours, foil: 0.2, physics: { floorY: 0 }, seed: 7 });
scene.add(confetti.object);
confetti.burst({ x, y, z }, { direction: { x: 0, y: 1, z: 0 }, count: 260, speed: 11, spread: 0.35 });
confetti.cannons({ x: 0, y: 1.2, z: 0 }, { ring: 3.5, cannons: 4 });   // a ring of cannons angled in over a spot
confetti.startRain({ x: 0, y: 8, z: 0 }, 4, 100);                      // keeps falling over a disc, per second
confetti.update(dt);                                                   // every frame
confetti.clear();
```

`size` is the side of a square piece. Pieces that lie on the floor longer than `physics.restS` are reused, so rain can run for as long as the scene is up. `foil` is the share of metal foil pieces, spread evenly through all of them (`spreadFoil`), so a rain that follows the cannons is as colourful as they were. The physics alone is `ConfettiSim`, with tests.

### Spotlights

Lamps in a ring high overhead, all aimed at one spot, with soft visible beams through the haze. Their aims drift slowly round the spot.

```ts
const lights = new StageLights({ count: 4, colours: ["#fff1d6", "#ffd27a"], radius: 5, height: 9, intensity: 260, angle: 0.22, beamStrength: 0.3, sweep: 0.35 });
scene.add(lights.object);
lights.aimAt(point);      // snaps; focus(point) slides over
lights.setLevel(0.5);     // 0 dark to 1 full, for a fade up
lights.update(time, dt);
```

`intensity` is in candela with physical falloff. Scenes lit brighter need more, as Boxing's arena does at 650. A lamp costs shading on every lit pixel even at level 0, so in a game's own scene hide `lights.object` until the celebration starts, as Boxing does. The first show compiles the scene's shaders for the extra lamps once.

### Circling camera

It opens wide and high, eases in, then circles the subject with a gentle rise and fall, or swings back and forth on an arc.

```ts
const orbit = new OrbitCamera(camera, { centre, radius: 4, height: 1.6, lookHeight: 1.2, startAngle, speed: 0.12, arc: 0.5, introS: 2.4, pullBack: 1.8, rise: 1.6, bob: 0.2 });
orbit.play({ startAngle });   // starts the shot from its opening
orbit.update(dt);
```

`startAngle` is round +y from +z, so a subject facing angle `a` is seen from the front with `startAngle: a`. `orbitPose(shot, t)` is the same shot as plain numbers.

### Trophies

Each returns a `THREE.Group` with its own materials. `userData.height` is its height. Free one with `disposeTree(group)`.

* `createBasketballTrophy({ metal })`: a gold ball dunked into a rim, a diamond net that tapers into a tall column, on a black plinth. About 0.6 m.
* `createWorldCupTrophy({ metal })`: two gold figures spiral up out of the base and hold a globe with raised continents. Two green stone bands round the base. About 0.37 m.
* `createBoxingBelt({ strap, enamel, gems, title, bend })`: a stitched leather strap, a big gold scalloped centre plate with a crown, a star on enamel ringed by gems and a lettered banner, and four gold side plates with gems. It runs along x with the plate facing +z, origin at the plate's middle. `userData.grips` holds the two points hands hold it by, 0.61 m apart. `bend` curls the strap back.
* `createCupTrophy({ metal })`: a two handled cup on a plinth, in `gold`, `silver` or `bronze`. About 0.41 m.

`metal`, `satinMetal`, `gem`, `lacquer` and `malachite` are the materials, for a game's own pieces.

### Podium and pedestal

```ts
const podium = createPodium({ width: 1.4, height: 0.9 });   // first in the middle, second on its left, third on its right, from the front (+z)
scene.add(podium.object);
scene.updateMatrixWorld();
kart.position.copy(podium.topOf(1));
const pedestal = createPedestal({ radius: 0.8, height: 0.7 });   // one winner; its top is at userData.top
```

### A ready made room

For a game whose own renderer cannot host the scene, as on a results screen over the game, `VictoryRoom` makes its own canvas filling a holder, with a dark glossy stage, the studio environment, a key light with shadows, spotlights, confetti and the circling camera. Add models to `room.scene`, then start it.

```ts
const room = new VictoryRoom(holder, { background, floorColour, lights, confetti, orbit });
room.scene.add(winner, trophy);
room.onFrame((dt, time) => animate(dt, time));
room.start();
room.dispose();   // frees the canvas and everything in the scene. Take out shared geometry first.
```

`room.advance(seconds)` runs the scene forward without drawing, to open part way through. Software rendering in a headless browser runs far below real time, so in development every open room is also listed on `window.__victoryRooms`; a test driver can advance them all and then take its screenshot.

### Leave room for the names

The names and the subtitle take about the top third of the screen. Stand the camera back until the winner's highest point, a raised trophy included, stays under the subtitle all through the shot, hop and bob included. Put a game's own tables and buttons in a bottom corner panel rather than along the bottom middle, so the winner has the middle to themselves. In a game played with phones the room's QR code comes back to the bottom left once the match is over, so use the bottom right. Brawl Battle does this, and Boxing, which has no phones, uses the bottom left; Magic Kart's podium is wide, so its places run along the bottom under it.

### Names over the scene

`VictoryOverlay` fills its positioned parent and keeps the middle clear. The names drop in letter by letter in gold, each with its player's colour under it.

```tsx
<VictoryOverlay
  eyebrow="Champion"
  names={[{ name: "Edison", colour: playerColor(1) }]}      // one winner, or a whole team
  subtitle="Wins by knockout in round 3"
  placings={[{ place: 1, name, colour, detail: "1:23.45" }]}   // optional
  align="top"                                                // or "bottom"
>
  <button>Play again</button>                                // anything, in a row along the bottom
</VictoryOverlay>
```
