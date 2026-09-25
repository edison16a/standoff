# Magic Kart

Status: ready. A split screen kart racer for 1 to 4 players, with computer karts to fill the grid.

## How to play

1. Open Magic Kart on the computer. Everyone scans the code with their phone.
2. On the phone, after the name:
   * **Calibrate.** Hold the phone sideways and upright, screen facing you, like a steering wheel. Turn it until the level lights up, then tap Calibrate. Calibrate stays off while the phone lies flat, since that is not how a wheel is held. From then on, turning the phone like a wheel steers the kart. Leaning it back or forward a fair way changes nothing, and either landscape works, even after turning the phone round. A small wheel on screen turns with it so you can try it out. Phones without a tilt sensor get arrow buttons instead.
   * **Kart.** Pick one of four drivers, each with their own kart, shown turning in 3D. A driver another player has is marked taken.
   * **Ready.** Tap Ready.
3. On the computer, pick the map with the mouse and click Start race. The chosen map's demo race runs behind the map picker. The switch fills empty grid places with computer karts.
4. Race two laps. Each player has their own view of the split screen. The map of the whole track and the standings sit at the top right. With three players they fill the free quarter there. On the phone: **Drive** under the right thumb, **Brake** under the left, and the round **power up** button just inside Brake shows what you hold and its name. Tap it to use it.
5. The results come up with confetti. Race again on the same map, or change map.

A phone that joins mid race sets up and joins the next race. A player whose phone drops keeps their kart, with the computer driving until they are back.

## Driving

* Hold Drive to accelerate. Speed builds over about four seconds, quick at first and easing off near the top. Let go and the kart coasts down gently.
* **Surge:** keep Drive held flat out for a couple of seconds and the top speed creeps up a notch more. The Drive button on the phone fills as it builds. Lifting off or braking lets it fade.
* **Brake** bites softly at first and harder the longer you hold it, so a tap only trims speed. Held at a standstill it reverses.
* **Drift:** brake into a bend at speed with the wheel turned, or lift off Drive with the wheel turned hard. The kart slides and glides through the bend, rear swung out, leaving smoke and skid marks. Turning the wheel further tightens the drift and turning back opens it, but it always turns into the bend. The faster you go in, the wider it swings. Keep Drive held with Brake for a power slide that holds its pace. Without Drive the slide slowly loses speed.
* **Mini turbo:** the longer and faster the drift, the hotter the sparks: blue, then orange, then purple. Drive out of it (Brake up, Drive down) to fire a turbo, longer for each colour. While you drift, Brake on the phone reads Drift and glows the spark colour. Computer karts drift the same way.
* **Rocket start:** press Drive in the last second before GO.
* Kerbs slow you a little, the sand or dust beyond them a lot. Glowing chevron pads give a boost.
* Ramps launch you. In the air you cannot steer. Miss a jump over a gap and you fall and are put back on the far side.
* Moving obstacles (crabs, asteroids, drones, rolling boulders) spin you out. Static ones just bump you.

## Power ups

Drive through a glowing cube for a random power up. You hold one at a time. A kart already holding one passes through and leaves the cube for others. Cubes come back after a few seconds. The leader tends to get defence, the back of the pack speed. The slot at the top of each view and the round button on the phone spin through the power ups, then show what you got.

* **Star Orb:** homes in on the nearest kart ahead and spins it out. From first place it flies on down the road.
* **Nitro:** a big speed boost that also carries you across sand at full pace.
* **Ice Blast:** freezes the wheels of the kart ahead: slippery and slow for a few seconds.
* **Vanish:** you turn nearly invisible. Throws lose you and fly straight through you, and you drop off the map.

A spin out ends with a second of protection, shown by a blink, so hits never chain one after another.
* **Shield:** a bubble that soaks up one hit.

## The maps

* **Sunny Shores:** the cover's beach. Purple tarmac, rainbow kerbs, palm trees and a rainbow finish arch. A jump over a lagoon, crabs scuttling across, and one open stretch by the sea.
* **Star Ring:** a neon road floating in space, with portal rings, planets and an asteroid belt. Long stretches have no rail, and a boosted leap crosses the void.
* **Neo City:** night streets between glowing towers, with tight right angle corners, a flyover ramp and patrol drones.
* **Magma Peak:** climbs a live volcano past lava rivers, with rolling boulders, basalt pillars and a jump over the lava.

Every map has chevron boards on the outside of each tight bend, painted arrows before them, striped kerbs and a clear barrier or drop at the edge.

## Fair play

Laps count by checkpoints in order: only driving through each one forwards counts. A kart that finds its way too far past the next checkpoint, or far back behind the last, is put back on the road. Falling off, or sitting stuck for a few seconds with the pedal down, also puts a kart back. Facing back down the track shows Wrong way.

## Sound

Every map has its own eight bar tune: an A section with the hook and a B section that answers it on new chords, with soft drums under a low pass filter. The lobby is a bell tune in F, the beach a steel drum calypso in C, space a reed arpeggio in A minor, the city a plucky groove in E minor and the volcano a driving tune in D minor. The last lap speeds the tune up a touch.

Effects are layered and each repeat lands at a slightly different pitch. The crowd roars at the start and at every finish and claps through the podium. A spoken race caller, using the browser's voice at the player's sound effects volume, calls the start, the final lap, big hits, big air and the finishers. The music dips while it talks.

## Code

* `engine/`: the race as pure code with no drawing: the track geometry, kart physics (the pedals, surge and drift model in `drive.ts`), laps and checkpoints, power ups, throws, obstacles, respawns and the computer drivers. Every number that shapes the feel is in `tuning.ts`. Unit tested.
* `tracks/`: one file per map, as data.
* `render/`: three.js. `models/` has the four karts and drivers built from painted primitives and merged per kart, `scenery/` one file per map, `track/` the road, kerbs, barriers and markings, `props/` the cubes, obstacles and throws, `effects/` the particles.
* `host/`: the session on the computer (lobby, race driver, what the phones and the overlay see) and its React screens.
* `phone/`: the controller session, the steering wheel maths and the phone screens. Steering reads where "up" points across the screen, so it holds however far the phone leans and never flips the way Euler angles do.
* `audio/`: synthesized music per map, an engine per kart pitched by speed, every effect, the crowd and the race caller, through the platform's audio buses (see Sound above).
* `protocol/`: the zod schemas for the messages between the phones and the host.
* `showcase/`: the game playing itself for the home screen's media (see below).

The host draws every player's view with one WebGLRenderer and scissored viewports. Scenery is instanced, karts are two or three meshes each, and shadows are soft blobs, so four views stay smooth on a laptop.

## Home screen media

The home screen's tile, still and looping clip are captured from `showcase/`, which plays real races with four computer karts and no room. Each shot is a seeded race, so it plays out the same way every time, and the computer karts are held in a tight pack so the camera always has close racing to show. The shots were picked by running many seeds and keeping the liveliest seconds: the pack hitting the boost pads and flying the lagoon jump on Sunny Shores, with an orb and an Ice Blast landing as they touch down, then the whole pack power sliding through a bend in Neo City, turbos firing. Changing the driving model changes every seeded race, so the shots must be picked again after any change to `engine/`. The icon is Blaze in the air over the lagoon under the logo, and the poster is the whole pack in the air.

With the dev server running:

```bash
node tools/media/capture.mjs magic-kart --ffmpeg /path/to/ffmpeg
```

The showcase draws 30 frames a second, the rate the clip is captured at, so each captured frame is drawn once. To change a shot, edit `showcase/shots.ts` and look at it at `/showcase/magic-kart?view=loop`.
