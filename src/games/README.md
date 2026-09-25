# Games

Every game lives in its own folder here and never imports another game. That is what lets several people, or several agents, build different games at the same time without touching the same files.

## What the platform already does

The platform (`src/platform`) runs the room, the same way for every game:

* The home screen: a row of tiles showing each game's icon, with the chosen game's looping clip behind. Host Game opens a room with a seat for the most players the game takes. The room seats are fixed then, so a game should start with fewer if not everyone joins.
* The QR code: big in the middle until someone joins, then bottom left until the game calls `room.setPlaying(true)`. A game can ask for it in the corner from the start (`join: "corner"`) or not at all (`join: "hidden"`, for camera games).
* The Standoff logo top left, which always goes home, and the tool bar top right.
* On the phone: the name screen, joining, reconnecting, and the header bar. Join is the one tap that unlocks sound, motion access and the wake lock, so a game's phone screen starts with all three ready.
* Seats, names and reconnects. A phone that drops and comes back keeps its seat.

## What a game provides

A folder with:

* `info.ts`: the title, tagline, status (`ready` or `development`), the player counts it supports (1 to 6), its colour, `input: "camera"` if it is played in front of the computer's camera instead of with phones, and its `media`.
* `Cover.tsx`: art drawn in code, the fallback until the game has captured media.
* `media/icon.jpg`, `media/poster.jpg` and `public/games/<id>/backdrop.webm` plus `.mp4`: the home screen's tile, still and looping clip, captured from the real game (see below).
* `index.tsx`, once playable: a `GameModule` (see `src/platform/games/game-api.ts`).
  * `createHost(room)` returns the host `Screen`, plus optional `Tools` for the tool bar and a `JoinExtra` for under the QR code.
  * `createPhone(room)` returns the phone `Screen`.
  * `Showcase`, a component that plays the game by itself with no room or phones, for capturing media.
* Its own styles, imported from `index.tsx`.

Then add one line for its loader in `src/games/catalog.ts`.

## Home screen media

Every game shows its real self on the home screen. Give the module a `Showcase` component taking `view`:

* `loop`: a few seconds of lively play with computer players, seen from the game's best camera. It should look like a trailer.
* `icon`: a square hero shot, bold and readable when small, like a console tile, with the game's name as a stylised logo.
* `poster`: one great frame of play, 16 by 9.

The showcase must animate from `requestAnimationFrame` and `performance.now`, with no random seeds that change between runs, so time can be stepped frame by frame. Then, with the dev server running:

```bash
node tools/media/capture.mjs <game-id> --ffmpeg /path/to/ffmpeg
```

On a computer with a graphics card, add `--gpu` for full quality and much faster capture, and `--size 1920x1080 --crf 28` for sharper clips. It opens `/showcase/<game-id>` (development only), writes the icon and poster into `media/` and the clip into `public/games/<game-id>/`. Wire them into `info.ts` as `media: { icon, poster, video: { webm, mp4 } }`.

## Talking to phones

The host and phones exchange payloads of the game's own design: any object with a `kind`. Validate what arrives with zod, as fencing does in `fencing/protocol`. Two kinds are the platform's own, `profile` and `players`, and a game never sees them. The host reads names with `room.players()` and hears arrivals, departures, messages and reconnects through `room.on`.

Keep the host as the referee. Phones send raw input and draw what the host tells them.

## Pointing at the screen

Fruit Ninja, Zombie Survival and Shooting Gallery all aim the same way. Where the player points their phone at the screen is where they aim.

* **Calibrate** with the kit's `AimCalibrate`: the middle of the screen, then the top left and bottom right targets.
* **Aim:** from then on, swinging left and right moves the aim across the screen and tilting moves it up and down.
* **Laser dot:** each player's aim shows on screen in real time as a laser dot in their colour, so they always see where they are pointing.
* **Gun or blade:** the shooters draw the front of each player's gun in 3D at the bottom of the screen, turned to point at that player's dot. It is a BB gun in Shooting Gallery, and the weapon the player chose in Zombie Survival. Fruit Ninja shows a blade instead.

All of this is shared in `src/games/kit/aim` (see `kit/README.md`).

## Camera games

Boxing and Subway Surfers use no phones. They set `input: "camera"` and `join: "hidden"`, open the computer's camera, and read players' bodies with a pose model that downloads to the player's own computer and runs in the browser. The shared camera and pose code lives in `src/games/kit/camera`.

## Rules of the house

* Files stay under about 200 lines, with comments that say why.
* The platform's own screens use the tokens in `src/app/globals.css`, with the logo's purple as the accent. Each game brings its own colour in `info.ts`, which tints its home card, and inside the game it has its own look (Fruit Ninja is warm brown wood, for example), kept in its own folder. Be bold with colour.
* No imports from another game. Shared code belongs in `src/platform`, `src/components` or the game kit in `src/games/kit`.
