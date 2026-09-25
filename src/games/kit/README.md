# The game kit

Shared code that games may import. The kit never imports a game, and games still never import each other. Change the kit with care: every game that uses it changes too.

## What is here

* `players.ts`: one colour per seat (red, green, blue, amber), for dots, name tags and scores in every game.
* `motion/math3d.ts`: the small quaternion and vector helpers.
* `motion/orientation.ts`: `subscribeOrientation`, the phone's orientation as a quaternion on every reading.
* `steps/StepShell.tsx`: the frame for a game's phone setup. Every game uses the same order: the platform asks for a name (or Skip), then the game shows **Calibrate**, then its own choices (weapon, kart, blade), then **Ready**. Each step is its own page.
* `aim/`: pointing the phone at the big screen, for Fruit Ninja, Zombie Survival and Shooting Gallery.

## Aiming

The phone is held flat like a remote, top edge toward the big screen. Only where the top edge points matters, so twisting the phone never moves the aim.

Phone side:

```ts
const aim = new PhoneAim(room);           // reads the sensors, or falls back to dragging
<AimCalibrate aim={aim} colour={playerColor(seat)} onDone={next} />
aim.stream(true);                         // while playing, streams the aim at up to 60 Hz
<FireButton label="Fire" onFire={() => aim.fire()} onRelease={stopAuto} />   // onRelease also fires if it turns disabled while held
aim.recenter();                           // a small button for when the gyro drifts
<AimPad aim={aim}>{/* fire button */}</AimPad>   // only when aim.getSnapshot().source is "touch"
aim.dispose();
```

Calibration shows three targets on the big screen in turn (middle, top left, bottom right). From them the phone learns how far this player turns to cross the screen from where they sit, left, right, up and down separately. Skip corners reuses the spans this phone measured last time. The measured spans are kept on the phone only.

Host side:

```ts
const aim = new HostAim(room);
aim.point(seat);                          // smoothed { x, y }, both -1 to 1, y up, or null when not aiming
aim.onFire((seat, point) => ...);         // the exact aim of every trigger pull
<AimOverlay aim={aim} players={room.players} dots targets />   // targets={false} hides calibration targets in cutscenes
```

Screen points are WebGL clip space, so `raycaster.setFromCamera(new Vector2(point.x, point.y), camera)` works as is. Messages the kit sends all have kinds starting with `aim`. Games must not use that prefix for their own.

## Testing in a browser

`tools/testing/fake-sensors.js` fakes a phone's sensors for Playwright. Set `window.__sensors.alpha` (turn, right is lower), `beta` (top edge up) and `gamma` (roll) to point or tilt.

## Gamepad

For games where the phone is a controller: a floating thumb stick on the left and round buttons on the right, as in NBA 3v3 and FIFA 3v3. Messages it sends all have kinds starting with `pad`, so games must not use that prefix.

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

Coming nearer the camera makes a player bigger and moves their head away from the middle of the picture. The line moves with them at once by the change in shoulder width, so leaning in or stepping back is never a move. On top of that its height follows each player slowly while they rest, faster after a clear change of size, and it holds still during a move. Home across the picture only moves with size, so standing in a side lane never drifts back to the middle. A player who sits down or stands up between rounds first reads as a duck or a jump. No real move lasts that long, so once the head has stayed down for `settleDownMs` 5000 or up for `settleUpMs` 2500, the move ends and the line moves to where the head is now.

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
