# Magic Kart

Status: ready. A split screen kart racer for 1 to 4 players, with computer karts to fill the grid.

## How to play

1. Open Magic Kart on the computer. Everyone scans the code with their phone.
2. On the phone, after the name:
   * **Calibrate.** Hold the phone sideways and lay it flat. When the level lights up, tap Calibrate. From then on, tilting the phone like a steering wheel steers the kart. A small wheel on screen turns with it so you can try it out. Phones without a tilt sensor get arrow buttons instead.
   * **Kart.** Pick one of four drivers, each with their own kart, shown turning in 3D. A driver another player has is marked taken.
   * **Ready.** Tap Ready.
3. On the computer, pick the map with the mouse and click Start race. The chosen map's demo race runs behind the map picker. The switch fills empty grid places with computer karts.
4. Race two laps. Each player has their own view of the split screen. The map of the whole track and the standings sit at the top right. With three players they fill the free quarter there. On the phone: **Drive** under the right thumb, **Brake** under the left, and the round **power up** button above Brake shows what you hold. Tap it to use it.
5. The results come up with confetti. Race again on the same map, or change map.

A phone that joins mid race sets up and joins the next race. A player whose phone drops keeps their kart, with the computer driving until they are back.

## Driving

* Hold Drive to accelerate. Brake slows down and then reverses.
* **Drift:** hold Brake while steering hard at speed. Sparks turn blue, then orange. Let go of Brake for a mini boost, bigger for orange.
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

## Code

* `engine/`: the race as pure code with no drawing: the track geometry, kart physics, laps and checkpoints, power ups, throws, obstacles, respawns and the computer drivers. Unit tested.
* `tracks/`: one file per map, as data.
* `render/`: three.js. `models/` has the four karts and drivers built from painted primitives and merged per kart, `scenery/` one file per map, `track/` the road, kerbs, barriers and markings, `props/` the cubes, obstacles and throws, `effects/` the particles.
* `host/`: the session on the computer (lobby, race driver, what the phones and the overlay see) and its React screens.
* `phone/`: the controller session, tilt steering and the phone screens.
* `audio/`: synthesized music per map, an engine per kart pitched by speed, and every effect, through the platform's audio buses.
* `protocol/`: the zod schemas for the messages between the phones and the host.

The host draws every player's view with one WebGLRenderer and scissored viewports. Scenery is instanced, karts are two or three meshes each, and shadows are soft blobs, so four views stay smooth on a laptop.
