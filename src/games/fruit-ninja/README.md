# Fruit Ninja

Status: ready. Up to 4 players slice fruit on one shared screen. Each phone is a blade: point it at the screen and swing. The highest score when the clock runs out wins.

"Fruit Ninja" is the name of an existing game by Halfbrick, so pick a name of our own before this ships.

## How to play

1. Open the card on the computer. The join code shows in the middle.
2. Each player scans it and types a name (or skips).
3. On the phone, three pages follow, one step each:
   * **Calibrate:** hold the phone flat like a remote and point it at the middle of the screen, then at the top left and bottom right targets. Phones without motion sensors get a drag pad instead.
   * **Blade:** pick a slash style. Each card plays a live preview: Plasma, Lightning, Fire, Ice, Venom, Rainbow and Gold.
   * **Ready:** a few tips, then Ready. Ready players can already try their blade on the practice fruit in the lobby.
4. On the computer, pick the round length, how many bombs and how much fruit, then press Start. A 3, 2, 1 countdown starts the round.
5. During the round there is nothing to press. Where the phone points is where the blade is. Swing through fruit fast to cut it; slow moves never cut. The phone shows your score, your place and the clock, plus a small Recenter button for when the aim drifts.
6. When time runs out, fruit already in the air can still be cut for a moment. Then the results show the winner, everyone's score and confetti, with Play again and Change settings.

## Scoring

* Fruit: 10 points, small fruit (kiwi, strawberry, lime, plum) 15.
* Big fruit (giant melon, pomegranate) takes several hits: 5 points a hit and 40 for the final burst. Each hit knocks it back up, and cracks spread across it.
* Rare fruit glows as it flies: star fruit 60, rainbow dragonfruit 80.
* Combo: three or more fruit in one swipe earn 10 extra points per fruit.
* Bomb: minus 30 points (never below zero) and the blade is stunned for a moment.

## Players

1 to 4 at once. Someone who joins or finishes setup during a round plays from the next round. Someone who leaves keeps their score on the board, greyed out; if they come back during the round they carry on. A round that everyone leaves ends early.

## How it is built

* `engine/`: the rules, with no drawing and no network. Blades cut only above a speed, tested as a swept segment against moving circles so fast fruit never slips between frames. The spawner paces waves and speeds up in the last ten seconds. Unit tested.
* `render/`: three.js. Every fruit is built in code, turned around an axis with painted peel, and splits into two halves along the blade with its own flesh face (watermelon seeds, orange segments, apple core, kiwi rays and more). Juice drops, stains on the wood, glitter, explosions and confetti are instanced or pooled. Slow machines step down in quality to keep the frame rate.
* `host/`: the session that referees rounds, the lobby, the HUD and the text over the board.
* `phone/`: setup pages in the kit's `StepShell`, the blade previews and the play pad.
* `audio/`: every sound synthesized on the platform's buses: whooshes, juicy slices, thunks, chimes, a fuse hiss, explosions, combos, the countdown, a gong and a fanfare.
* `protocol/`: zod schemas for the few messages of its own. The aim itself travels on the aim kit's messages.

## Look

Warm brown planks lit from the top left, glossy fruit throwing soft shadows onto the wood, bright blades, as on `cover.jpg`. The styles live in `styles/`.
