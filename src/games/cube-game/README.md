# Cube Game

A rhythm platformer in the spirit of Geometry Dash, played with your body in front of the computer's camera: jump for real and the cube jumps. It is drawn in 3D with glowing neon blocks, a synthwave sky and a grid floor running to the horizon, but seen from the side through a long lens, so it plays like the flat original.

## How to play

1. Host Cube Game from the home screen. No phones are needed.
2. On the level select, pick a level with the mouse, choose 1 or 2 players, and tick Practice if you like.
3. Press **Play**. Allow the camera, stand in your outline, stand tall and still while your ring fills, then jump once so the game can see it.
4. Jump on the beat. That is the only move.

**Play with the keyboard** skips the camera: Space (or W) jumps for player 1, Enter (or the up arrow) for player 2. Space also works alongside the camera, for testing and for anyone who cannot jump.

Two players get the screen split top and bottom, player 1 on top. Player 1 stands on the left of the camera picture. Each runs the same level on their own, and sees the other as a ghost.

## The three modes

* **Cube**: each jump hops the cube, which turns half a circle in the air and lands flat.
* **UFO**: each jump flaps it upward, and gravity pulls it down between flaps.
* **Ball**: each jump flips gravity, so it rolls along the ceiling or back down to the floor.

Portals change the mode mid level: green for the cube, orange for the UFO, red for the ball. Yellow pads throw you up without a jump, and a jump while touching a yellow orb gives a fresh jump in the air. Pink chevrons speed the level up.

## The five levels

| Level | Difficulty | Tempo | What it brings |
| --- | --- | --- | --- |
| First Light | Easy | 110 | Single spikes to learn the jump, a platform, a pad, a gentle UFO stretch |
| Sunset Bounce | Normal | 116 | Stairs of platforms, a pit, and the ball twice |
| Cloud Hopper | Hard | 122 | Hops on three beats in a row, orbs at the top of a pad's throw, a long UFO flight |
| Circuit Rush | Harder | 128 | A speed gate, then the ball and the UFO back to back, twice |
| Core Meltdown | Insane | 136 | Fast from the start and faster twice, tight UFO gates straight into the ball |

Each level has its own song, synthesised in the browser, with the obstacles on its beat, and its own look: a night city, a sunset desert, a violet sky of floating blocks, a green circuit town and red volcanic spires. The world pulses on every beat.

Crashing restarts that player at once from the start, with the attempt counter going up. With one player the song restarts too, as in the original. With two, the song plays on and a crashed player comes back on the next beat, so the obstacles always land on the music. A progress bar shows the percent through the level and a gold mark for the best. Finishing plays a fanfare with confetti and opens the next level. Bests and open levels are kept in this browser's localStorage. Practice saves a checkpoint every two seconds on safe ground, marked by a green diamond, and does not count toward bests.

If a player steps out of the camera's view, even while crashed or before the start, their run pauses, and with one player the song stops too. It picks up on the beat a moment after they come back.

## How it is built

* `engine/`: pure logic with tests. Fixed step physics at 240 steps a second for all three modes (`physics.ts`, `collide.ts`), a quick lookup of what is near (`world.ts`), one player's go with attempts, bests and practice checkpoints (`run.ts`), and the computer player (`autoplay.ts`). `builder.ts` lets levels be written in beats; `placement.ts` plays the perfect run so far and puts UFO gates, ball spikes and spike rows around the path it takes.
* `levels/`: one file per level, each keeping its perfect run. `levels.test.ts` plays every level on its beats and checks it finishes, forgives jumps a little early or late, never asks for two jumps closer than a person can jump, and ends on the song's beat.
* `audio/`: a small band of synth voices (`instruments.ts`), a lookahead scheduler that can start any song on any beat (`music.ts`), the songs as text (`songs.ts`), a mixer with echo, a hall and pumping pads into the platform's music bus, and every effect through the platform's effects bus (`sfx.ts`).
* `render/`: three.js. Neon shaders for blocks and spikes (`neon.ts`), the grid floor, the sky, the skyline, pads, orbs and portals, the avatars, sparks and debris, and bloom over one or two stacked views (`post.ts`).
* `host/`: the session that runs a room, the round that keeps each run on the song (`round.ts`), the controls, progress in localStorage, and the React screens.
* `showcase/`: the game playing itself for the home screen's media.

### Reading the jump

The camera kit reads the jump, tuned a touch quicker than its default (`host/jump-tuning.ts`): on the kit's sample jump it fires about 70 ms after take off, once per jump. A press is timed by when it happened, the camera frame or the key's own time stamp, not by when the next frame gets to it, so a slow frame never moves a jump. Camera jumps closer than 260 ms apart count as one. Keys are never read twice, so quick taps on a key all count.

### Testing

`levels.test.ts`, `physics.test.ts`, `run.test.ts`, `round.test.ts`, `jump-tuning.test.ts` and the song tests run with `npx vitest run src/games/cube-game`. In development the session is on `window.__cubeGame`, with `pressAt(slot, songTime)` for exact presses and `presses` recording when each press landed, and the kit's pose injection drives it from Playwright with the fake camera. `window.__cubeGameRenderScale` draws at a fraction of the resolution on a slow machine. The showcase takes `?plan={...}` to show any moment of any level.

Every level has been played to the finish in the browser: by exact presses, by the space and Enter keys, and by injected camera jumps, with one player and with two. A camera or model that fails shows what went wrong, with a button to try again and one to play with the keyboard instead.
