# Magic Kart

Status: ready. A split screen kart racer for 1 to 4 players, with computer karts to fill the grid.

## How to play

1. Open Magic Kart on the computer. Everyone scans the code with their phone.
2. On the phone, after the name:
   * **Calibrate.** Hold the phone sideways and upright, screen facing you, like a steering wheel. The phone says to align the dot in the middle. Hold the level's dot between the lines for a second: a bar fills, the level turns green, and that pose is straight ahead. The next step comes up by itself, with no button. Nothing is taken while the phone lies flat or is held upright, since that is not how a wheel is held. From then on, turning the phone like a wheel steers the kart. Full lock is about 50 degrees from where you calibrated, so a slight shift gives a slight turn and a hard turn needs a real turn of the phone. Leaning it back or forward a fair way changes nothing, and either landscape works, even after turning the phone round. Phones without a tilt sensor get arrow buttons instead.
   * **Kart.** Pick one of four drivers, each with their own kart, shown turning in 3D. A driver another player has is marked taken.
   * **Ready.** Tap Ready.
3. On the computer, pick the map with the mouse and click Start race. The chosen map's demo race runs behind the map picker. The switch fills empty grid places with computer karts. Below it, Computer difficulty sets how well they drive: Easy (the default), Medium, Hard or Training. Easy and Medium karts have a lower top speed, catch up less when far behind, cut bends wider and use items less often. Hard is the full strength driver. In Training they stay parked on the grid, so you can learn a map alone. The tuning is in `engine/bot-skill.ts`. A player's kart on autopilot and every lap of honour drive at full strength.
4. Race two laps. Each player has their own view of the split screen. The map of the whole track and the standings sit at the top right. With three players they fill the free quarter there. On the phone: **Drive** under the right thumb, **Brake** under the left, and the round **power up** button just inside Brake shows what you hold and its name. Tap it to use it. When you cross the line your own view says your name and place, like "Edison Law got 1st place!", while the others race on.
5. The results open on a podium: the top three karts on their steps, each with a gold, silver or bronze cup, under spotlights with confetti raining down while the camera swings round. The winner's name goes up big in gold, with every place and time along the bottom (`host/components/Results.tsx` and `results/`, built on the victory kit). The camera stands far enough back that the winner's hop stays clear of the name. Race again on the same map, or change map. In development, `/dev/victory/kart` shows the results without racing.

A phone that joins mid race sets up and joins the next race. A player whose phone drops keeps their kart, with the computer driving until they are back.

Turning the phone never breaks the controller. A hard turn of the wheel can swing the page upright for a moment. The pedals stay put through that, and only a page that stays upright for about a second shows the card asking to turn the phone sideways. Turning it back brings the pedals straight back. If the controller page reloads or drops, it comes back on the same setup step with the same calibration and driver. Rejoin the room and it picks up the race where it was.

## Driving

* Hold Drive to accelerate. Speed builds over about four seconds, quick at first and easing off near the top. Let go and the kart coasts down gently.
* **Surge:** keep Drive held flat out for a couple of seconds and the top speed creeps up a notch more. The Drive button on the phone fills as it builds. Lifting off or braking lets it fade.
* **Brake** bites softly at first and harder the longer you hold it, so a tap only trims speed. Held at a standstill it reverses.
* **Drift:** brake into a bend at speed with the wheel turned, or lift off Drive with the wheel turned hard. The kart slides and glides through the bend, rear swung out, leaving smoke and skid marks. Turning the wheel further tightens the drift and turning back opens it, but it always turns into the bend. The faster you go in, the wider it swings. Keep Drive held with Brake for a power slide that holds its pace. Without Drive the slide slowly loses speed.
* **Mini turbo:** the longer and faster the drift, the hotter the sparks: blue, then orange, then purple. Drive out of it (Brake up, Drive down) to fire a turbo, longer for each colour. While you drift, Brake on the phone reads Drift and glows the spark colour. Computer karts drift the same way.
* **Rocket start:** press Drive in the last second before GO.
* Kerbs slow you a little, the sand or dust beyond them a lot. Glowing chevron pads give a boost.
* Ramps launch you. Every map has a big jump over a gap, and off it a **glider** opens: the mast shoots up out of the kart and the wing unfolds over it in about a third of a second. Small bumps and hops never open it, only a real flight.
* **Gliding:** steer with the phone just as on the road. The kart banks into the turn and the wing carries it on a slow, steady descent with a little lift, gentler to turn than on tarmac. Line up for the bend on the far side, or steer through the pair of power up cubes floating over the gap. Items still work in the air, and a hit spins you under the wing without closing it. The glider folds away the moment you land. Come up short, or glide off an open edge, and you fall and are put back.
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

* **Sunny Shores:** the cover's beach. Purple tarmac, rainbow kerbs, palm trees and a rainbow finish arch. A glide over a lagoon into a left hand bend, crabs scuttling across, and one open stretch by the sea.
* **Star Ring:** a neon road floating in space, with portal rings, planets and an asteroid belt. Long stretches have no rail, and a boosted launch glides across the void onto a stretch with no rails at all.
* **Neo City:** night streets between glowing towers, with tight right angle corners, patrol drones, and a flyover ramp that glides you over a neon canal.
* **Magma Peak:** climbs a live volcano past lava rivers, with rolling boulders, basalt pillars and a glide over a lava river into a long right hander.

Every map has chevron boards on the outside of each tight bend, painted arrows before them, striped kerbs and a clear barrier or drop at the edge.

## The karts

Every kart is its own design, built in code with no model files.

* **Blaze, Flame Rod:** a long candy red hot rod with an open supercharged engine, chrome intake trumpets, heat blued titanium side pipes, a carbon front wing, a big rear wing and flames down the side pods. Chrome five spoke wheels on road slicks.
* **Pip, Lily Buggy:** a dune buggy on long travel coilovers, with a yellow roll cage, a light bar on the roof, a bull bar, a skid plate, mud flaps and a spare wheel on the back. Yellow beadlock rims on knobbly balloon tyres.
* **Nova, Comet Glider:** a wide pearl white wedge with a smoked windscreen, blue fins, neon lines that follow the bodywork and a jet turbine in the tail. Turbine wheels with a cyan stripe on the sidewall.
* **Mochi, Dumpling Tank:** a retro bubble car in pearl pink and cream, with round fenders, chrome bumpers, a smiling chrome grille, big round headlamps, a steamed bun on the bonnet and whitewall tyres on chrome hub caps.

Each kart wears its own badge on the bonnet, the hub caps, the steering wheel and the driver's chest, and its own race number on the back. Tyres have tread and lettering on the sidewall. Rims have hubs, lug nuts and a brake disc behind them. The axle, the wishbones and the coilover springs show under the bodywork.

The paint is clear coated. It reflects the map's own sky and road plus soft boxes like a photo studio's, so long highlights slide over the bodywork as a kart turns. Chrome, brushed metal, carbon, rubber, leather and glass each have their own finish.

The drivers sit in bucket seats in racing suits and gloves. Blaze wears an open face helmet with goggles, Pip a backwards cap, Nova a visor with glowing eyes and Mochi a headband with a bow. Their hands hold the steering wheel and turn it, and their arms bend at the elbow to follow it. They lean into bends, tip forward under braking and look where they are going.

On the move, the wheels spin with the speed and the front ones steer, the inside one a little more. The body rides on springs. It rolls toward the outside of a bend, dips its nose under braking, squats under power, sinks and bounces back on a landing, and jiggles over kerbs and sand. A drifting kart tips into its slide. Brake lights flare while braking and lamps get a soft halo, brighter at night. On boost the exhaust tips glow, pop the odd backfire and puff smoke, and the flames flicker, blue plasma from Nova's turbine. Drift sparks fly as streaks that skip off the road behind the tyres, white at first, then blue, orange and purple as the turbo charges. Each kart has a contact shadow drawn from its own wheels.

A kart's body is one draw, its driver one more and each wheel one, since paint, chrome, rubber and lamps are one material with each part's finish stored in its vertices. Every kart shares one texture with all the tyres, stickers and badges. A kart more than 15 metres from a view's camera is drawn in a coarse cut with about a third of the triangles, so a race draws about as many triangles as it did with the old blocky karts. If a machine still runs below 50 frames a second for a couple of seconds, the race steps down one level at a time: a little less resolution, the coarse cut sooner, then no clear coat (`render/quality.ts`). A frame rate the player capped lower is left alone.

## Fair play

Laps count by checkpoints in order: only driving through each one forwards counts. A kart that finds its way too far past the next checkpoint, or far back behind the last, is put back on the road. Falling off, or sitting stuck for a few seconds with the pedal down, also puts a kart back. Facing back down the track shows Wrong way.

## Sound

The lobby plays Paddock Sunset, a chill tune in D flat major at 84 beats a minute. Each chord lasts two bars, so warm pads melt into each other under an electric piano, a round sub bass, a soft half time kit and a slow hummed melody. Every race plays Turbo Bloom, one song in B minor at 140. The A section is a bright synth hook over a busy funk bass. The B section climbs on long notes over brass stabs and a rolling arpeggio, and a riser and a snare fill carry the last bar back into the hook. It runs sixteen bars before it repeats. On the final lap the song gets a touch faster and fuller: the hats double up, the kick and clap push harder, the arpeggio never stops and the lead gains a higher octave. All music is synthesized, goes through the music bus under a low pass filter, and dips under the final lap jingle and the race caller.

Effects are layered and each repeat lands at a slightly different pitch. A glider opens with a whoosh and the crack of cloth pulling tight, the wind under it rises with speed, and it folds with a rustle and a click. The crowd roars at the start and at every finish and claps through the podium. A spoken race caller, using the browser's voice at the player's sound effects volume, calls the start, the final lap, big hits, some of the glides and the finishers. The music dips while it talks.

## Code

* `engine/`: the race as pure code with no drawing: the track geometry, kart physics (the pedals, surge and drift model in `drive.ts`, the glider in `glide.ts`), laps and checkpoints, power ups, throws, obstacles, respawns and the computer drivers. Every number that shapes the feel is in `tuning.ts`. Unit tested.
* `tracks/`: one file per map, as data.
* `render/`: three.js. `models/` has the four karts in `karts/` (one file per kart and one per driver's head), the parts they share in `parts/` (tyres, rims, suspension, exhausts, lamps, seats, the steering wheel and the rigged driver), the kit they are made with in `kit/` (lofted bodies, projected decals, the shared sticker texture and the one kart material), the springs the body rides on (`kart-motion.ts`), the driver's pose (`driver-pose.ts`), and each driver's glider (`glider.ts`, with the cloth in `glider-sail.ts`), which `glider-view.ts` unfolds, `scenery/` one file per map, `track/` the road, kerbs, barriers and markings, `props/` the cubes, obstacles and throws, `effects/` the particles, spark streaks, boost flames and lamp halos.
* `host/`: the session on the computer (lobby, race driver, what the phones and the overlay see) and its React screens. While a race runs, the host's hidden admin panel (three quick taps on the settings gear) offers Final lap, which puts every kart on the last lap in the same order, and Finish the race, which sends everyone over the line as they stand, straight to the podium (`host/admin.ts`, `engine/shortcuts.ts`).
* `phone/`: the controller session, the steering wheel maths and the phone screens. Steering reads where "up" points across the screen, so it holds however far the phone leans and never flips the way Euler angles do. The response is tuned in `phone/tilt.ts`: `FULL_LOCK` is the wheel angle for full lock (50 degrees, fine anywhere from 45 to 60), `DEAD_ZONE` keeps a steady hand going straight, and `LINEAR_SHARE` blends a linear and a cubic curve so small turns stay fine. With these values a braking drift starts from about 25 degrees of wheel. `phone/orientation-watch.ts` tells whether the page is upright from every signal a turn gives, and reads again shortly after, since iOS can report the new size late. `phone/controller-memory.ts` keeps the setup step, steering mode, calibration and driver in session storage per room and seat, so a reload resumes.
* `audio/`: the synthesized lobby tune and race song (`lobby-song.ts`, `race-song.ts`, played on the instruments in `kart-band.ts`), an engine per kart pitched by speed, every effect, the crowd and the race caller, through the platform's audio buses (see Sound above).
* `protocol/`: the zod schemas for the messages between the phones and the host.
* `showcase/`: the game playing itself for the home screen's media (see below).

The host draws every player's view with one WebGLRenderer and scissored viewports. Scenery is instanced, karts are six draws each and coarse when far away, and shadows are soft pictures under each kart, so four views stay smooth on a laptop.

## Home screen media

The home screen's tile, still and looping clip are captured from `showcase/`, which plays real races with four computer karts and no room. Each shot is a seeded race, so it plays out the same way every time, and the computer karts are held in a tight pack so the camera always has close racing to show.

The clip is a wordless trailer of fast cuts, each landing on a big moment. On Magma Peak the pack roars past the boost pads with flames out. In slow motion, low beside the pack, an orb hits Blaze as they launch off the ramp over the lava. The camera circles under Blaze's wing against the sunset, then Mochi takes an orb in mid air, again at half speed. Pip slides through a neon bend in Neo City into a turbo and is frozen solid by an ice throw, and the clip ends under all four gliders among the stars of Star Ring, which cuts back to the start. The plan runs exactly the 8 seconds the tool records, so the second it fades over the start is the start again and the loop has no seam. Cameras are close and low, and angles are measured from the road, so a kart spun by a hit does not whirl the camera round. A film grade and a vignette give the light more bite.

The icon is a game cover: Blaze bursting toward the viewer out of a power slide on Magma Peak, turbo flames out, Pip and Nova on his tail and the volcano behind, above the logo. The poster is all four gliders among the stars with the ringed planet behind.

The shots live in `showcase/plans.ts`: a map and seed, the race time a shot starts, how long it runs on screen, an optional slow motion rate and a camera rig. `showcase/shots.ts` holds the rig types and works out which shot is on at any moment. The capture tool warms up for 3 seconds before it records, so the loop starts its first shot then. Changing the driving model changes every seeded race, so the shots must be picked again after any change to `engine/`.

With the dev server running:

```bash
node tools/media/capture.mjs magic-kart --ffmpeg /path/to/ffmpeg
```

The showcase clock ticks 60 times a second, as animation frames do. The capture tool records 30 frames a second, so every recorded frame shows a new moment and none is held, and a half speed shot moves the race exactly one step a frame. To change a shot, edit `showcase/plans.ts` and look at it at `/showcase/magic-kart?view=loop`. In development, `?plan=` with a plan as JSON plays that plan instead, and `window.__magicKartShowcase.pin(seconds)` holds any moment.
