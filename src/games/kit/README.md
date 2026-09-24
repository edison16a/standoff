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
