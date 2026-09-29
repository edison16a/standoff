# Zombie Survival

Status: ready. A co-op, first person, on rails shooter for 1 to 4 players. Each phone is a gun: point it at the big screen to aim, press to shoot. The team runs through a dead city in the fog and fights at 15 checkpoints. The helicopter on the hospital roof lifts it out at stage 10 and drops it at the docks, where it fights on to the cargo ship.

## How to play

1. Open the game on the computer and scan the code with each phone. Type a name or skip.
2. On the phone, **Calibrate**: hold the phone flat, top edge toward the screen, and point at the middle, then at the four corner targets, holding still on each until its ring fills and turns green. The next target comes up by itself (or skip the rest). Pointing past the edge keeps the dot at the edge.
3. Pick a **Weapon**. Each turns in 3D with its numbers, damage, fire rate, range, magazine and reload, and each has its own crosshair on the big screen:
   * **Shotgun**: nine pellets in a wide cone, pump action, eight shells loaded one at a time. It shreds anything up close, even a crowd, and buckshot tears weak points open. The pellets fade fast with range, so far off it barely scratches. Its crosshair is a wide ring the size of the cone.
   * **Submachine Gun**: sprays a big magazine and reloads fast. Its rounds drop a walker up close, but they fade with range and bounce off riot vests. Its crosshair is four ticks on the edge of its spray.
   * **Assault Rifle**: tight at any range, with a gentle kick. The big ones need a clean hit or two. Its crosshair is a fine scope ring.
   * **AK-47**: heavy rounds that drop almost anything and go through riot armour. It kicks hard, so a held trigger climbs off the target. Fire it in bursts. Its crosshair is a chevron.
4. Say **Ready**. The run starts when everyone connected is ready, or when someone presses Start on the big screen. Late players set up and drop straight into the run.
5. Before the run the big screen offers Computer difficulty for the zombies: Easy (the default), Medium, Hard or Training. Easy plays the run as written. Medium and Hard run every stage faster still and hit harder. The number of zombies stays the same. In Training they stand where they appear and never swing, so you can learn your gun and the weak points. The tuning is in `engine/difficulty.ts`.
6. In the run the phone shows a big Shoot button (hold it with an automatic gun), Reload, the rounds left and a Recenter button for when the aim drifts. Phones without motion sensors aim by dragging on a pad around the button.

Every shot kicks the gun. The crosshair jumps with it and springs back to where the phone points, and the next shot leaves from wherever the gun is at that moment. The phone's aim itself never moves. A faint ring marks it while the gun is off it, and the gun always comes back to it. The shotgun kicks hardest but settles before the next pump, the rifle and the submachine gun barely move, and the AK climbs if you hold the trigger. The kick is in `engine/recoil.ts` and each gun's numbers are in `engine/weapons.ts`.

Speed makes it hard, not numbers. On the first stage the dead come at their own pace, and each stage after runs them ten percent faster, up to twice as fast from stage 11 on. Walkers fall to one rifle round anywhere. Brutes soak up body hits but drop fast to head shots, and riot zombies shrug off body shots unless an AK round hits them. Bosses only hurt through the glowing weak points on their joints, so the team has to aim together. Zombies that reach the team hurt the shared health. At zero, the team retries the stage from its checkpoint with its stats kept.

## What is in it

* **Route**: 16 segments of streets, the Butcher's alley, the park, the army roadblock, the hospital car park, the parking ramp, the hospital roof and the docks out to pier nine. The team runs between fights, about six seconds a leg, and turns corners on its own. From the roof it flies.
* **Stages**: 15, in three laps of five: a plain fight, a mini boss, a plain fight, a mini boss, then a big boss. Rounds are short. Whatever the size of the team, a stage holds at most ten of the dead early on and about twenty at the end. The mini bosses are quicker and lighter: the Butcher in his alley at 2, the Surgeon at 4 and 9, the Hook at 7 and 12, and the Butcher and the Hook together at 14. A mini boss steps out once part of the crowd has come. The big bosses are huge and slow: the Juggernaut at the fountain at 5, the Tank on the hospital roof at 10 before the chopper, and the Behemoth at pier nine at 15. Each comes alone, and every few seconds a pack of runners rushes in from behind it. A bigger team gets a few more of the dead where a stage has room under that cap, and they come sooner, so its fights are no longer. The few that reach it hit harder. Boss weak points get tougher with each extra gun. As the dead close in they bunch toward the middle of the street, so none attacks from past the edge of the screen. Bosses keep to the middle of the road, and as one closes in the view tilts to sit midway between its lowest and highest joints still glowing, so every weak point left stays on screen. Only the front line can swing: the rest wait their turn behind it. From the third stage on they sometimes come in pairs. The table is in `engine/stages.ts` and the timing of who comes when is in `engine/spawner.ts`.
* **Balance**: `engine/balance.test.ts` plays the run with bots that aim with a shaky hand through the real guns, with their cones, falloff and kick. Steady aim clears all 15 stages alone on Easy with any gun, and a steady team clears it on Hard. Sloppy aim falls short on Medium and well short on Hard. Fights last under twenty seconds on average. Duels in the same file show what each gun is best at: the shotgun on a boss up close, the rifle far off, the AK on riot zombies, and the submachine gun for an average hand on Hard.
* **Checkpoints**: after a fight the team stops for a second and a half, enough to reload, while a small note under the top strip says which checkpoint it made and what health it found. Only the story's big moments, the roof and the pier, stop for the full summary card, and only for four seconds.
* **Story**: radio calls on the way to each stage. After stage 10 the chopper lands on the roof, the team runs aboard, and it flies them over the city and sets them down at the docks before it pulls away. After the Behemoth at stage 15 comes the escape up the gangway as the ship sails, with the dead piling up at the end of the pier behind it.
* **Scores**: kills, accuracy, head shots, weak point hits, damage and best streak per player, a summary at the roof and the pier, the top gun on the end screen, and achievements popping up as they are earned.
* **Sound**, all synthesised through the room's audio buses: a gunshot per weapon with a street echo, reloads, pump and dry clicks, growls panned to where each zombie is and louder as it closes in, shrieks as runners rush in behind a boss, footsteps that echo off the empty street, the odd step that is not the team's, a boss's stomp, a heartbeat at low health, the rotor, a horror drone, radio squelch and murmur, the ship's horn. Shots cycle the action and drop brass, and kills land with a wet crunch.
* **Music**: the lobby plays Embers, a warm safehouse tune in E major at 70 beats a minute. Each chord lasts two bars and the pads overlap, so it flows without a gap, with a soft horn melody over a slow electric piano, a round bass, a brushed kit and record crackle. A run plays Last Stand, in F sharp minor at 118 so the C sharp drone is its fifth. A cold glass bell plays the hook over a pulsing low synth and dark strings, then heroic horns climb over brighter chords that end on the major fifth and pull back to the top. On the road it pulses in eighths over a half time kit. In a fight the pulse doubles, the kit drives on every beat, toms roll into each phrase and the horns gain an octave. Both run sixteen bars before they repeat, through the music bus under a low pass filter. The music dips for bosses, radio calls and checkpoints, and stops for the endings. Escaping resolves to a major chord with the survivors cheering.
* **Looks**: the dead are modelled from rounded, tapering forms, merged per bone. Every zombie material shares one shader with a cold rim light on its outline and thinner fog than the city, and each has glowing eyes, so they read in the murk while the street stays dark.

## Code

* `engine/`: pure game logic with unit tests. Weapons with their range and kick, guns, zombie kinds and bosses, stages and the spawner, the route, encounters, stats, achievements, the chopper's path and flight, and bots and duels for balancing.
* `protocol/`: the zod schemas for everything the host and phones say.
* `host/`: the host session (the referee), the lobby, phone sync and the React HUD.
* `phone/`: the phone session, the hold to fire trigger and the setup and play screens.
* `render/`: three.js. `models/` holds the guns, the zombies and bosses, and the chopper and ship. `world/` builds the city segment by segment around the team. `crosshair/` draws each gun's crosshair where the gun points, kick included. The renderer also raycasts every shot from the camera through the player's aim.
* `audio/`: the sound, from the same events that drive the picture.
* `showcase/`: the game playing itself for the home screen's media. Four computer players hold the Butcher's alley, stage 2, against the Butcher and his escort, with the real engine, city, models and effects. Every random number comes from one seed, and on every beat the team's fire staggers the boss back to the same spot, so the clip loops. The icon adds the name as a logo drawn in SVG.

## Home screen media

`media/icon.jpg`, `media/poster.jpg` and `public/games/zombie-survival/backdrop.webm` and `.mp4` are captured from the showcase. With the dev server running:

```bash
node tools/media/capture.mjs zombie-survival --ffmpeg /path/to/ffmpeg
```

Then copy the new poster over `cover.jpg`, the fallback art.

## Hidden switches for testing

Add these to the host page's address:

* `?zstage=10` starts the run at any stage from 1 to 15.
* `?zdebug` exposes the session and renderer on `window` for browser tests.
* `?zlow` draws at low resolution with cheap filtering and bigger time steps, for software rendering.
* `?zgallery=butcher,tank` stands those zombies in front of the lobby. Add `&zpose=attack`, `&zpose=dead`, or `&zset=hospital` or `&zset=industrial` for outfits.

While a run is on, the host's hidden admin panel (three quick taps on the settings gear) can win the stage at hand, skip to the next boss or top up the team's health.
