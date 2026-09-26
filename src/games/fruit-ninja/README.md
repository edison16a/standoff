# Fruit Slicer

Status: ready. Up to 4 players slice fruit on one shared screen. Each phone is a blade: point it at the screen and swing. The highest score when the clock runs out wins.

## How to play

1. Open the card on the computer. The join code shows in the middle.
2. Each player scans it and types a name (or skips).
3. On the phone, three pages follow, one step each:
   * **Calibrate:** hold the phone flat like a remote and point it at the middle of the screen, then at the top left and bottom right targets. Phones without motion sensors get a drag pad instead.
   * **Blade:** pick a slash style. Each card plays a live preview: Plasma, Lightning, Fire, Ice, Venom, Rainbow and Gold.
   * **Ready:** a few tips, then Ready. Ready players can already try their blade on the practice fruit in the lobby.
4. On the computer, pick the round length, how many bombs and how much fruit, then press Start. A 3, 2, 1 countdown starts the round.
5. During the round there is nothing to press. Where the phone points is where the blade is. Swing through fruit fast to cut it. Slow moves never cut. The phone shows your score, your place and the clock, plus a small Recenter button for when the aim drifts.
6. When time runs out, fruit already in the air can still be cut for a moment. Then the results show the winner, everyone's score and confetti, with Play again and Change settings.

## Scoring

* Fruit: 10 points, small fruit (kiwi, strawberry, lime, plum) 15.
* Big fruit (giant melon, pomegranate) takes several hits: 5 points a hit and 40 for the final burst. Each hit knocks it back up, and cracks spread across it.
* Rare fruit glows as it flies: star fruit 60, rainbow dragonfruit 80.
* Combo: three or more fruit in one swipe earn 10 extra points per fruit.
* Bomb: minus 30 points (never below zero) and the blade is stunned for a moment.

## Players

1 to 4 at once. Someone who joins or finishes setup during a round plays from the next round. Someone who leaves keeps their score on the board, greyed out. If their phone comes back during the round, they carry on. A different phone that takes a seat mid round waits for the next one and never inherits the old score. A round that everyone leaves ends early. The join code hides for the countdown and comes back on the results, so new players can join between rounds.

## Sound

The music is a lo-fi dojo groove in G minor: a koto plays a pentatonic hook for four bars, then a bamboo flute answers over new chords, on soft taiko, wood block and shaker. Rounds play it at 90 beats a minute. The lobby plays the same song slower as a quiet garden. A bomb ducks the music.

Slices and swishes are layered and vary in pitch, so a flurry never sounds robotic. Combos of four or more draw a cheer from the crowd, and the winners get a fanfare, a cheer and applause.

## How it is built

* `engine/`: the rules, with no drawing and no network. Blades cut only above a speed, tested as a swept segment against moving circles so fast fruit never slips between frames. The spawner paces waves and speeds up in the last ten seconds. Unit tested.
* `render/`: three.js. Every fruit is built in code, turned around an axis with painted peel, and splits into two halves along the blade with its own flesh face (watermelon seeds, orange segments, apple core, kiwi rays and more). Both halves swing open so each shows its flesh. Juice drops, stains on the wood, glitter, explosions and confetti are instanced or pooled. Sparks, fire and smoke are camera facing quads rather than GL points, so they look the same on every graphics card. Only light brighter than white glows (blades, sparks, fire, rare fruit). A slow machine first gives up a little resolution, then the glow, never going below half resolution, and tries a step higher again once it keeps up.
* `host/`: the session that referees rounds, the lobby, the HUD and the text over the board.
* `phone/`: setup pages in the kit's `StepShell`, the blade previews and the play pad.
* `audio/`: every sound synthesized on the platform's buses: the music, whooshes, juicy slices, thunks, chimes, a fuse hiss, explosions, combos, the crowd, the countdown, a gong and a fanfare.
* `protocol/`: zod schemas for the few messages of its own. The aim itself travels on the aim kit's messages.

## Home screen media

`showcase/` plays the game by itself for the home screen's icon, poster and clip. Four computer players follow a script on the real board, with the real arena, fruit, blades, effects and popups. `loop-script.ts` is eight seconds that repeat: a three fruit combo, a giant melon smashed by every blade in turn, a dragonfruit, a bomb and a star fruit. `icon-script.ts` hangs fruit around a watermelon cut by a fire blade, under a sliced logo. Each hand's slashes are timed to meet their fruit, it glides between them, and it only cuts during a slash.

Random draws are seeded and time comes only from the frame clock, so every capture is the same. A test checks that the loop cuts every throw and repeats exactly. Add `&at=20` to `/showcase/fruit-ninja?view=poster` to look at another moment. To capture again, with the dev server running:

```bash
node tools/media/capture.mjs fruit-ninja --url http://localhost:3000 --ffmpeg ffmpeg
cp src/games/fruit-ninja/media/poster.jpg src/games/fruit-ninja/cover.jpg
```

## Look

Warm brown planks lit from the top left, glossy fruit throwing soft shadows onto the wood, bright blades, as on `media/poster.jpg`. The styles live in `styles/`.
