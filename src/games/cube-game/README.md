# Cube Game

A rhythm platformer in the spirit of Geometry Dash, played with your body in front of the computer's camera: jump for real and the cube jumps. It is drawn in 3D with softly lit blocks, a synthwave sky and a faint grid floor running to the horizon, but seen from the side through a long lens, so it plays like the flat original.

## How to play

1. Host Cube Game from the home screen. No phones are needed.
2. On the level select, pick a level with the mouse, choose 1 or 2 players, and tick Practice if you like.
3. Press **Play**. Allow the camera and stand in your outline. The camera only needs you from the waist up, so there is no need to step back until your feet show. Stand tall and still while your ring fills: that sets your head line. Then jump once so the game can see it.
4. Jump on the beat. Your head going up over its line is a jump, and that is the only move. A small hop is enough, while bobbing to the music and nodding do not count.

**Play with the keyboard** skips the camera: Space (or W) jumps for player 1, Enter (or the up arrow) for player 2. Space also works alongside the camera, for testing and for anyone who cannot jump.

Two players get the screen split top and bottom, player 1 on top. Player 1 stands on the left of the camera picture. Each runs the same level on their own, and sees the other as a ghost.

## The three modes

* **Cube**: each jump hops the cube, which turns half a circle in the air and lands flat.
* **UFO**: each jump flaps it upward, and gravity pulls it down between flaps.
* **Ball**: each jump flips gravity, so it rolls along the ceiling or back down to the floor.

Portals change the mode mid level: green for the cube, orange for the UFO, red for the ball. Yellow pads throw you up without a jump, and a jump while touching a yellow orb gives a fresh jump in the air. Pink chevrons speed the level up.

## The five levels

Every level is open from the start, so anyone can jump straight to the one they want.

| Level | Difficulty | Tempo | Song | What it brings |
| --- | --- | --- | --- | --- |
| First Light | Easy | 110 | Dreamy synth pop in G major | Single spikes to learn the jump, a platform, a pad, a gentle UFO stretch |
| Sunset Bounce | Normal | 116 | Nu disco in F major | Stairs of platforms, a pit, and the ball twice |
| Cloud Hopper | Hard | 122 | Airy trance in E flat major | Hops on three beats in a row, orbs at the top of a pad's throw, a long UFO flight |
| Circuit Rush | Harder | 128 | Chiptune electro in B minor | A speed gate, then the ball and the UFO back to back, twice |
| Core Meltdown | Insane | 136 | Dark broken beat in E Phrygian | Fast from the start and faster twice, tight UFO gates straight into the ball |

Each level has its own song, synthesised in the browser, with the obstacles on its beat, and its own look: a night city, a sunset desert, a violet sky of floating blocks, a green circuit town and red volcanic spires. The colours are muted and the glow is soft, so a whole song is easy on the eyes. The world pulses gently on every beat.

Crashing restarts that player at once from the start, with the attempt counter going up. With one player the song restarts too, as in the original. With two, the song plays on and a crashed player comes back on the next beat, so the obstacles always land on the music. A progress bar shows the percent through the level and a gold mark for the best. Finishing plays a fanfare with confetti, and the results offer the next level. Bests are kept in this browser's localStorage. Practice saves a checkpoint every two seconds on safe ground, marked by a green diamond, and does not count toward bests.

If a player steps out of the camera's view, even while crashed or before the start, their run pauses, and with one player the song stops too. It picks up on the beat a moment after they come back.

## How it is built

* `engine/`: pure logic with tests. Fixed step physics at 240 steps a second for all three modes (`physics.ts`, `collide.ts`), a quick lookup of what is near (`world.ts`), one player's go with attempts, bests and practice checkpoints (`run.ts`), and the computer player (`autoplay.ts`). `builder.ts` lets levels be written in beats; `placement.ts` plays the perfect run so far and puts UFO gates, ball spikes and spike rows around the path it takes.
* `levels/`: one file per level, each keeping its perfect run. `levels.test.ts` plays every level on its beats and checks it finishes, forgives jumps a little early or late, never asks for two jumps closer than a person can jump, and ends on the song's beat.
* `audio/`: a small band of synth voices (`instruments.ts`), a lookahead scheduler that can start any song on any beat (`music.ts`), the songs as text, one file each in `tracks/` (`songs.ts` lists them), a mixer with echo, a hall and pumping pads into the platform's music bus, and every effect through the platform's effects bus (`sfx.ts`).
  * The songs keep their tempo, length and sections, which are keyed to each level's beats, so the music stays on the obstacles. Each level has its own key and style: its own drum pattern, bass, lead voices and swing. The ball parts switch to the answer melody and the UFO parts float in half time. Leads are two detuned oscillators under a closing low pass, so they sound wide and warm instead of buzzy. The main hook is doubled an octave up on a quiet bell so it sticks. Hats and snares vary a little in level. The calm menu song on the camera steps is "Neon Drift", F major at 84 a minute: a flute over electric piano chords and a pad that washes from bar to bar, with a soft kick, a rim and a shaker. It has no plucks, no crashes and no pumping, so it stays calm. Its A section and the B answer run sixteen bars in all, with the kick dropping out for the last four. A 9 kHz low pass takes the fizz off the top of every song. Rendered offline, music sits around an RMS of 0.04 to 0.055 before the bus, with peaks under 0.6.
  * Effects are layered and nudged in pitch on every repeat: the jump has a puff of air, the flip a soft thump, the pad a springy thump, orbs pick a pentatonic note so a chain of them sings, and the crash scatters glassy shards. Finishing a level plays the fanfare with a crowd cheer and applause on the crowd bus (`cheer.ts`), and the music ducks under it.
* `render/`: three.js. Shaders for blocks and spikes with a thin lit rim (`neon.ts`), the grid floor, the sky, the skyline, pads, orbs and portals, the avatars, sparks and debris, and a faint bloom over one or two stacked views (`post.ts`).
* `host/`: the session that runs a room, the round that keeps each run on the song (`round.ts`), the controls, progress in localStorage, and the React screens.
* `showcase/`: the game playing itself for the home screen's media.

### Reading the jump

The camera kit reads the jump from the head line it sets at calibration. The head going up over the top of its band quickly is a jump, measured in shoulder widths so it works near or far from the camera, and the line follows a player who steps nearer or further. Only the head and shoulders need to be in the picture. Cube Game lowers the top of the band so a small hop counts (`host/jump-tuning.ts`), and adds two things to cut the delay without false jumps:

* A rush. Head and shoulders rising faster than four shoulder widths a second count once they are 70% of the way to the band's top. Only a push off rises that fast, so the jump fires a camera frame sooner, about 35 ms at 30 frames a second. On a jump with a dip it fires within 40 ms of the head passing its standing height. Frames more than 50 ms apart never rush, since a gap blurs a bob into one fast step.
* A rested line. The head line only follows a player who has stayed still for 400 ms. The bottom of each bob is still for an instant, and following those instants used to drag the line down until bobbing to the music read as jumping after half a minute or so.

The rest of the delay is the camera and the pose model. A press is applied on the same frame the pose model reads it, since the camera frame is read just before the game draws. Rising onto the toes, bobbing to the beat for a whole song, a bow and a slow stretch never count. Every mode uses the same jump: the cube hops, the UFO flaps and the ball flips. A press is timed by when it happened, the camera frame or the key's own time stamp, not by when the next frame gets to it, so a slow frame never moves a jump. Camera jumps closer than 260 ms apart count as one. Keys are never read twice, so quick taps on a key all count.

### Testing

`levels.test.ts`, `physics.test.ts`, `run.test.ts`, `round.test.ts`, `jump-tuning.test.ts` and the song tests run with `npx vitest run src/games/cube-game`. In development the session is on `window.__cubeGame`, with `pressAt(slot, songTime)` for exact presses and `presses` recording when each press landed, and the kit's pose injection drives it from Playwright with the fake camera. `window.__cubeGameRenderScale` draws at a fraction of the resolution on a slow machine. The showcase takes `?plan={...}` to show any moment of any level.

Every level has been played to the finish in the browser: by exact presses, by the space and Enter keys, and by injected camera jumps, with one player and with two. A camera or model that fails shows what went wrong, with a button to try again and one to play with the keyboard instead.
