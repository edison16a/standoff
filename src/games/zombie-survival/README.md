# Zombie Survival

Status: ready. A co-op, first person, on rails shooter for 1 to 4 players. Each phone is a gun: point it at the big screen to aim, press to shoot. The team walks through a dead city in the fog, fights at 25 checkpoints, reaches the helicopter on the hospital roof, watches it go down, and fights on to the cargo ship at the docks.

## How to play

1. Open the game on the computer and scan the code with each phone. Type a name or skip.
2. On the phone, **Calibrate**: hold the phone flat, top edge toward the screen, and point at the middle, then at the two corner targets (or skip the corners).
3. Pick a **Weapon**. Each turns in 3D with its numbers:
   * **Shotgun**: eight pellets, pump action, six shells loaded one at a time. Brutal up close, and buckshot tears weak points open.
   * **Submachine Gun**: fast and forgiving, light hits, big magazine, quick reload.
   * **Assault Rifle**: accurate and steady, puts every bullet where you point.
   * **AK-47**: heavy rounds, slower, kicks hard, long reload.
4. Say **Ready**. The run starts when everyone connected is ready, or when someone presses Start on the big screen. Late players set up and drop straight into the run.
5. In the run the phone shows a big Shoot button (hold it with an automatic gun), Reload, the rounds left and a Recenter button for when the aim drifts. Phones without motion sensors aim by dragging on a pad around the button.

Precision matters more than speed. Walkers fall to one bullet anywhere early on. Later they need two light rounds, brutes take two body hits or one to the head, riot zombies shrug off body shots but not head shots. Bosses only hurt through the glowing weak points on their joints, so the team has to aim together. Zombies that reach the team hurt the shared health. At zero, the team retries the stage from its checkpoint with its stats kept.

## What is in it

* **Route**: 26 segments of streets, a back alley, the park, the hospital car park, the parking ramp, the hospital roof, downtown, six stretches of highway and the docks out to pier nine. The team walks between fights and turns corners on its own.
* **Stages**: 25, with bosses at 5 (the Butcher), 10 (the Tank, on the roof), 15 (the Juggernaut), 20 (the Tank again) and 25 (the Behemoth). Early stages are sparse and slow. Later ones come faster, closer and tougher, a few at a time, sometimes in pairs. The table is in `engine/stages.ts`, and `engine/balance.test.ts` plays it with bot players: steady aim clears the route with any gun, alone or in a team, and sloppy aim falls short.
* **Story**: radio calls on the way to each stage, the chopper crashing onto the roof after stage 10, and the escape up the gangway as the ship sails.
* **Scores**: kills, accuracy, head shots, weak point hits and damage per player, a checkpoint summary after each stage, the top gun on the end screen, and achievements popping up as they are earned.
* **Sound**, all synthesised through the room's audio buses: a gunshot per weapon with a street echo, reloads, pump and dry clicks, growls panned to where each zombie is and louder as it closes in, footsteps, a heartbeat at low health, the rotor, the crash, a horror drone, radio squelch and murmur, the ship's horn.

## Code

* `engine/`: pure game logic with unit tests. Weapons and guns, zombie kinds and bosses, stages, the route, encounters, stats, achievements, the chopper's path and a bot simulator for balancing.
* `protocol/`: the zod schemas for everything the host and phones say.
* `host/`: the host session (the referee), the lobby, phone sync and the React HUD.
* `phone/`: the phone session, the hold to fire trigger and the setup and play screens.
* `render/`: three.js. `models/` holds the guns, the zombies and bosses, and the chopper and ship. `world/` builds the city segment by segment around the team. The renderer also raycasts every shot from the camera through the player's aim.
* `audio/`: the sound, from the same events that drive the picture.

## Hidden switches for testing

Add these to the host page's address:

* `?zstage=10` starts the run at any stage.
* `?zdebug` exposes the session and renderer on `window` for browser tests.
* `?zlow` draws at low resolution with cheap filtering and bigger time steps, for software rendering.
* `?zgallery=butcher,tank` stands those zombies in front of the lobby. Add `&zpose=attack`, `&zpose=dead`, or `&zset=hospital` or `&zset=industrial` for outfits.
