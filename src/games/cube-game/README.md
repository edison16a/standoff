# Cube Game

A rhythm platformer in the spirit of Geometry Dash, played with your body in front of the computer's camera: jump for real and the cube jumps. It is drawn in 3D with softly lit neon blocks, a synthwave sky and a grid floor running to the horizon, but seen from the side through a long lens, so it plays like the flat original.

## How to play

1. Host Cube Game from the home screen. No phones are needed.
2. On the level select, pick any level with the mouse, choose 1 player or 1v1, and tick Practice if you like. Every level is open from the start.
3. Press **Play**. Allow the camera and stand in your outline. The camera only needs you from the waist up, so there is no need to step back until your feet show. Stand tall and still while your ring fills: that sets your head line. Then jump once so the game can see it.
4. Jump on the beat. Your head going up over its line is a jump, and that is the only move. A small hop is enough, while bobbing to the music and nodding do not count.

**Play with the keyboard** skips the camera: Space (or W) jumps for player 1, Enter (or the up arrow) for player 2. Space also works alongside the camera, for testing and for anyone who cannot jump.

**Keyboard player.** The host's admin panel has a Keyboard player for testing (three quick taps on the settings gear, then Platform). Its controls card shows the same keys: Space or W jump, and Enter or Up jump for player 2 in a 1v1. Alone, every jump key jumps player 1. The level select, Play with the keyboard and the results are clicked on the big screen. The phone panel only says the keys are there. Each jump goes through the room with the moment its key went down (`keyboard.ts`, `host/key-messages.ts`), and the round times it from that moment, as it does a key on the page, never from more than a quarter second back. The page's own key listener skips any key the keyboard player already took, so each jump counts once.

## 1v1

Two players race. The screen splits top and bottom, player 1 on top, and each pane has its own cube and its own camera following it. Player 1 stands on the left of the camera picture and player 2 on the right, and the camera kit tracks each of them on their own side, so each jumps only their own cube. Each sees the other as a ghost, and a place tag in each pane shows who is ahead once someone is. Each pane's Best is that player's own best in the race, since the saved best for the level belongs to nobody in particular.

A player who crashes restarts from the start, or in practice from their last checkpoint, and comes back on the next beat while the other keeps going. The first over the line wins, and both runs stop. Each pane then shows the shared split screen finish card with that player's place, such as "Player 1 got 1st place!" and "Player 2 got 2nd place!". Only the winner gets confetti. Then the finish celebration fills the screen: the winner's cube hops on the podium's top step beside a gold cup, the other player's cube stands second with silver, and the winner's name drops in big across the top. A moment later each player's place, best, attempts and jumps come up in the bottom left corner. For the player who was beaten, best is how far they got. Two crossings on the very same physics step are a dead heat, and both get 1st. The trophy button ends a race nobody can finish, and then the order is by how far each got. It goes once someone is over the line. Rematch plays the same level again, and Next level goes on.

## The finish celebration

When a round ends the results fill the screen with a celebration built from the shared victory kit, in the level's own colours, under spotlights with confetti coming down and the camera swinging slowly round.

* **A 1v1 race.** The winner's cube stands on the podium's top step and hops now and then, turning half a circle in the air and landing flat, beside a gold cup. The other player's cube is second with a silver cup. The winner's name drops in big across the top.
* **One player.** The cube celebrates the finish on a round pedestal with a gold cup, under the player's name and how many attempts it took.
* **A dead heat** puts both cubes on the pedestal together, both names big.
* **A race ended early** still stands the players by how far each got, with no cups, no confetti and no hops.

The names are the players' own when the room has them, or Player 1 and Player 2. Once the name has landed, the table and the ways on come up in the bottom left corner, clear of the camera's picture in the bottom right. The picture sits a little right of the middle to leave that corner free, and the runner up's cube stands in toward the middle of its step with its cup on the outside.

## The three modes

* **Cube**: each jump hops the cube, which turns half a circle in the air and lands flat.
* **UFO**: each jump flaps it upward, and gravity pulls it down between flaps.
* **Ball**: each jump flips gravity, so it rolls along the ceiling or back down to the floor.

Portals change the mode mid level: green for the cube, orange for the UFO, red for the ball. Each portal is a tall round ring turned sideways, as in the original, with a picture of what you become floating inside it: the cube with its face, the saucer, or the striped ball. Yellow pads throw you up without a jump, and a jump while touching a yellow orb gives a fresh jump in the air. Pink chevrons speed the level up.

### No way around a portal

Every portal fills a gap in a wall. Blocks close the column above the ring up to the ceiling, or high into the sky where there is none, and a pillar closes it below when the ring floats in the air, so every run goes through the ring. The level builder places each ring around the path the perfect run takes through it, with room to spare for a jump a little early or late (`engine/portal-frame.ts`). `levels/portals.test.ts` checks every portal in every level: the floor or a pillar reaches the ring, a wall or ceiling runs from its top to out of reach, and the perfect run passes through the middle.

## The seven levels

| Level | Difficulty | Tempo | Key | Music | What it brings |
| --- | --- | --- | --- | --- | --- |
| First Light | Easy | 110 | F major | City pop | Single spikes to learn the jump, a platform, a pad, a gentle UFO stretch |
| Sunset Bounce | Normal | 116 | G minor | Nu disco | Stairs of platforms, a pit, and the ball twice |
| Cloud Hopper | Hard | 122 | E flat major | Airy trance | Hops on three beats in a row, orbs at the top of a pad's throw, a long UFO flight |
| Circuit Rush | Harder | 128 | E minor | Electro chiptune | A speed gate, then the ball and the UFO back to back, twice |
| Core Meltdown | Insane | 136 | C minor | Dark breakbeat | Fast from the start and faster twice, tight UFO gates straight into the ball |
| Neon Abyss | Demon | 144 | D minor | Psy trance | Jumps a beat and a quarter apart, a low ball corridor, eight changes of form |
| Inferno Gate | Demon | 150 | F sharp minor | Drumstep | The fastest run, the narrowest gates, nine changes of form with the ball and UFO meeting head on |

Each level has its own song, synthesised in the browser, with the obstacles on its beat, and its own look: a night city, a sunset desert, a violet sky of floating blocks, a green circuit town, red volcanic spires, a violet circuit abyss and crimson spires. The colours are a little muted and the glow is light, so the picture stays calm and easy to read. The world pulses gently on every beat.

The two Demon levels sit past Insane, with a red badge and red stars on the level select. They are harder in every way the tests can measure: a higher top speed, more jumps a second and more portals than any level before, with less slack for a jump off the beat (35 ms early or 40 ms late). Their ball corridors are lower, so each flip comes quicker. Both are proven finishable by the game's own computer player and by the level tests.

Crashing restarts that player at once from the start, with the attempt counter going up. With one player the song restarts too, as in the original. In a 1v1 the song plays on and a crashed player comes back on the next beat, so the obstacles always land on the music. A progress bar shows the percent through the level and a gold mark for the best. Finishing plays a fanfare with confetti. Then the finish celebration: the cube hops on a pedestal beside a gold cup with the player's name big over it, and Next level goes straight on. Bests are kept in this browser's localStorage. Saves from when levels had to be opened one by one still load. Practice saves a checkpoint every two seconds on safe ground, marked by a green diamond, and does not count toward bests.

The cube runs a little right of the old spot, about two fifths of the way across, so there is room behind it as well as ahead.

## Leaderboards

Every level has its own leaderboard on this computer, kept with the shared leaderboard kit. Every finish is saved, quickest first. A clean run always takes the level's own length, so what sets runs apart is the time lost to crashes: a run's time counts every attempt from the first start to the finish. After a win the results say where it landed, for example "#3 on this computer", show the list with the run lit up and the number of tries beside each time, and say New best when it beat every earlier finish. In a race each finisher is saved under their own name. Practice runs are never saved, and a run the admin autopilot flew is marked Autopilot. **Clear leaderboards** in the host's Settings wipes these boards with every other game's.

If a player steps out of the camera's view, even while crashed or before the start, their run pauses, and with one player the song stops too. It picks up on the beat a moment after they come back.

### Admin shortcuts

While a round runs, three quick taps on the settings gear open the host's admin panel. It lists an autopilot for each player (just Autopilot when alone). The autopilot plays that player's run on the level's perfect beats, picking up wherever the cube stands after a crash, a step out or a practice checkpoint. Tap it again to stop. One tester can race the autopilot, or put both players on it to watch a finish. The shortcuts go away when the results show, and Rematch brings them back. A finish the autopilot flew is saved on the leaderboard marked Autopilot, so it never passes for a real run.

## How it is built

* `engine/`: pure logic with tests. Fixed step physics at 240 steps a second for all three modes (`physics.ts`, `collide.ts`), a quick lookup of what is near (`world.ts`), one player's go with attempts, bests and practice checkpoints (`run.ts`), the last moments of a run so a late press can be replayed (`rewind.ts`), and the computer player (`autoplay.ts`). `builder.ts` lets levels be written in beats; `placement.ts` plays the perfect run so far and puts UFO gates, ball spikes and spike rows around the path it takes. `portal-frame.ts` sizes each portal's ring around that path and walls off the way over and under it. `run.ts` also times a whole run to the finish, crashes included, for the leaderboard.
* `levels/`: one file per level, each keeping its perfect run. `levels.test.ts` plays every level on its beats and checks it finishes, forgives jumps a little early or late, never asks for two jumps closer than a person can jump, and ends on the song's beat.
* `audio/`: a small band of synth voices (`instruments.ts`), the voices that give each level its colour (`colours.ts`: a kick per kit, a chip lead and a growling bass), a lookahead scheduler that can start any song on any beat (`music.ts`), the songs as text (`songs.ts`), a mixer with echo, a hall and pumping pads into the platform's music bus, and every effect through the platform's effects bus (`sfx.ts`). The Demon levels' songs are in `demon-songs.ts`.
  * Every level's song has its own key, tempo and style. First Light is city pop in F: electric piano offbeats and a bell hook over a soft kick with a lazy swing. Sunset Bounce is nu disco in G minor: octave bass, offbeat open hats and a brassy riff. Cloud Hopper is airy trance in E flat: a glass hook over sixteenth arpeggios. Circuit Rush is electro chiptune in E minor: a chip lead over a broken electro kick. Core Meltdown is a dark breakbeat in C minor, with a growling bass and a hard kit. Neon Abyss is a rolling psy trance in D minor, four on the floor under a square hook and a saw bass on the sixteenths. Inferno Gate is drumstep in F sharp minor, a broken kick under a reese bass, with a square lead leaping octaves through the ball.
  * The songs keep their tempo, length and sections, which are keyed to each level's beats, so the music stays on the obstacles. They play through the platform's music bus and start on the beat the run is on, as before. Leads are two detuned oscillators under a closing low pass, so they sound wide and warm instead of buzzy. The main hook is doubled an octave up on a quiet bell so it sticks. Hats and snares vary a little in level. The calm menu song on the camera steps is "Neon Drift", F major at 84 a minute: a flute over electric piano chords and a pad that washes from bar to bar, with a soft kick, a rim and a shaker. It has no plucks, no crashes and no pumping, so it stays calm. Its A section and the B answer run sixteen bars in all, with the kick dropping out for the last four. A 9 kHz low pass takes the fizz off the top of every song. Measured at the mixer's output in the full part of each song, the level songs sit around an RMS of 0.045 to 0.06, with peaks under 0.6.
  * Effects are layered and nudged in pitch on every repeat: the jump has a puff of air, the flip a soft thump, the pad a springy thump, orbs pick a pentatonic note so a chain of them sings, and the crash scatters glassy shards. Finishing a level plays the fanfare with a crowd cheer and applause on the crowd bus (`cheer.ts`), and the music ducks under it.
* `render/`: three.js. Neon shaders for blocks and spikes (`neon.ts`), the grid floor, the sky, the skyline, pads, orbs, the portals (`portals.ts`, with the pictures of each form in `portal-icons.ts`), the avatars, sparks and debris, and a light bloom over one or two stacked views (`post.ts`). The bloom is weak with a high threshold, so only the brightest edges glow, and only a little. `catch-up.ts` lets the cube rise over a few frames to where a replayed jump puts it. `victory/` is the finish celebration in the shared victory kit's own room, lit in the level's colours (`finish-scene.ts`); `finish-stage.ts` decides who stands where, how the cube hops and how the camera frames it, with tests that keep every hop under the names.
* `host/`: the session that runs a room (`session.ts`), one round from its first beat to the results with its presses, sounds and score (`round-play.ts`), the round that keeps each run on the song and decides a race (`round.ts`), race places and the winner from exact crossing times (`race.ts`), the admin autopilot (`pilot.ts`, `round-admin.ts`), the computer run behind the menus (`menu-demo.ts`), the controls, progress in localStorage, each level's leaderboard (`level-board.ts`, kept in step with Settings and other tabs by `board-sync.ts`, drawn on the results by `results/BoardPanel.tsx`), and the React screens. In a race each pane shows the split screen kit's finish card (`PaneFinish.tsx`). `names.ts` takes each player's name from the room, or Player 1 and Player 2, and `headline.ts` words the big line over the celebration.
* `showcase/`: the game playing itself for the home screen's media, cut like a trailer (see Home screen media below).

### Home screen media

The clip is a wordless eight second trailer of the demon levels, cut from a computer player's perfect runs (`showcase/cuts.ts`). It opens on Inferno Gate's speed arrows, catches the pad and orb in slow motion, flips into Neon Abyss's ball mode, dives through Core Meltdown's UFO portal from a low tilted angle, slows right down as Inferno Gate's UFO hits its ball portal, lands the UFO back as a cube in Neon Abyss and pulls wide on one last portal. Each cut sets its own camera: how close, a swing ahead or behind, a low eye and a tilt, with an eased push in or out (`render/view-camera.ts` takes these for the showcase only). The cuts add up to exactly eight seconds and repeat, so the clip loops without a seam. Slow motion slows the sparks and the beat too, since they run on level time.

The icon works as a game cover: the cube big and close with its face to us, leaping Inferno Gate's first spikes in front of the red sun, from low with a tilt, over the logo. The cut sets `settle`, so the camera holds the icon's own framing through the preroll and a still never keeps play's height. The poster is Neon Abyss's UFO slipping through its green portal between the towers. To capture again, with the dev server running:

```sh
node tools/media/capture.mjs cube-game --url http://localhost:3000 --ffmpeg ffmpeg
```

### Reading the jump

The camera kit reads the jump from the head line it sets at calibration. The head going up over the top of its band quickly is a jump, measured in shoulder widths so it works near or far from the camera, and the line follows a player who steps nearer or further. Only the head and shoulders need to be in the picture. Cube Game lowers the top of the band to a quarter of a shoulder width, about 9 cm, so the beat never waits (`host/jump-tuning.ts`). On the kit's sample jump it fires about 100 ms after take off, once per jump. Rising onto the toes, a quick bob, a bow and a slow stretch never count. Every mode uses the same jump: the cube hops, the UFO flaps and the ball flips. A press is timed by when it happened, the camera frame or the key's own time stamp, not by when the next frame gets to it, so a slow frame never moves a jump. Camera jumps closer than 260 ms apart count as one. Keys are never read twice, so quick taps on a key all count.

### Making the jump feel instant

A camera jump used to reach the cube about a tenth of a second or more after the body left the ground. The delay came from four places, and each is cut:

* **Smoothing.** The kit steadies every point with a One Euro filter, which held a quick rise back by about a frame. Cube Game passes the kit lighter smoothing (`JUMP_SMOOTHING` in `host/jump-tuning.ts`) that is just as steady at rest but lets go sooner once the head moves.
* **The jump line.** A jump is only seen once the head is clearly up, a frame or two into the rise. The line stays where it is, so bobbing never counts. Instead the controls keep the last few frames of each head (`host/takeoff.ts`) and, on a jump, trace back to the moment the head left its line. The press is timed from there.
* **Frame timing.** The model runs after the camera frame arrives, and the run only moved on at the next drawing. A press in the past used to land at the next step. Now the run keeps its last 0.12 seconds step by step and replays them with the press at its own time (`engine/rewind.ts`), so the cube is where it would be had the game seen the jump at once. Sounds already heard are not played twice.
* **The physics step.** It was already fine at 240 steps a second, so a press lands within about 4 ms of its time.

On the kit's sample jumps the press now lands within about 20 ms of the head starting to rise, where it used to wait for the jump to be seen some 70 to 90 ms later plus the model's time. Bobbing to the music, a nod, tiptoes and the bend of a landing still never count.

### Testing

`levels.test.ts`, `portals.test.ts`, `portal-frame.test.ts`, `level-board.test.ts`, `physics.test.ts`, `run.test.ts`, `rewind.test.ts`, `round.test.ts`, `round-race.test.ts`, `race.test.ts`, `pilot.test.ts`, `jump-tuning.test.ts`, `jump-latency.test.ts`, `catch-up.test.ts`, `timeline.test.ts` and the song tests run with `npx vitest run src/games/cube-game`. In development the session is on `window.__cubeGame`, with `pressAt(slot, songTime)` for exact presses and `presses` recording when each press landed, and the kit's pose injection drives it from Playwright with the fake camera. `window.__cubeGameRenderScale` draws at a fraction of the resolution on a slow machine. The showcase takes `?plan={...}` to film any moment of any level as one cut (`{"level":"neon-abyss","from":19.7,"angle":{...}}`), and `?finish=solo`, `race`, `tie` or `early` shows the results with sample players and a sample leaderboard.

Every level has been played to the finish in the browser: by exact presses, by the space and Enter keys, and by injected camera jumps, with one player and with two. The 1v1 has been raced in the browser with each player winning, in practice with a crash back to a checkpoint while the other ran on, and ended early with the trophy button. With two injected people, a jump on the left moved only player 1's cube and a jump on the right only player 2's. A camera or model that fails shows what went wrong, with a button to try again and one to play with the keyboard instead.
