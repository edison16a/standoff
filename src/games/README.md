# Games

Every game lives in its own folder here and never imports another game. That is what lets several people, or several agents, build different games at the same time without touching the same files.

## What the platform already does

The platform (`src/platform`) runs the room, the same way for every game:

* The home screen cards, and Play, which opens a room for the chosen game and player count.
* The QR code: big in the middle until someone joins, then bottom left until the game calls `room.setPlaying(true)`.
* The Standoff logo top left, which always goes home, and the tool bar top right.
* On the phone: the name screen, joining, reconnecting, and the header bar. Join is the one tap that unlocks sound, motion access and the wake lock, so a game's phone screen starts with all three ready.
* Seats, names and reconnects. A phone that drops and comes back keeps its seat.

## What a game provides

A folder with:

* `info.ts`: the title, tagline, status (`ready` or `development`) and the player counts it supports (any of 1, 2 and 4).
* `Cover.tsx`: the art on its card on the home screen. A still `cover.jpg` is fine until the game can draw itself, as fencing does.
* `index.tsx`, once playable: a `GameModule` (see `src/platform/games/game-api.ts`).
  * `createHost(room)` returns the host `Screen`, plus optional `Tools` for the tool bar and a `JoinExtra` for under the QR code.
  * `createPhone(room)` returns the phone `Screen`.
* Its own styles, imported from `index.tsx`.

Then add one line for its loader in `src/games/catalog.ts`.

## Talking to phones

The host and phones exchange payloads of the game's own design: any object with a `kind`. Validate what arrives with zod, as fencing does in `fencing/protocol`. Two kinds are the platform's own, `profile` and `players`, and a game never sees them. The host reads names with `room.players()` and hears arrivals, departures, messages and reconnects through `room.on`.

Keep the host as the referee. Phones send raw input and draw what the host tells them.

## Pointing at the screen

Fruit Ninja, Zombie Survival and Shooting Gallery all aim the same way. Where the player points their phone at the screen is where they aim.

* **Calibrate** by pointing at the middle of the screen, the way fencing does, so the phone's heading and tilt at that moment mean "centre".
* **Aim:** from then on, swinging left and right moves the aim across the screen and tilting moves it up and down. The phone's orientation maps straight to a point on screen, with no drift.
* **Laser dot:** each player's aim shows on screen in real time as a laser dot in their colour, so they always see where they are pointing.
* **Gun or blade:** the shooters draw the front of each player's gun in 3D at the bottom of the screen, turned to point at that player's dot. It is a BB gun in Shooting Gallery, and the weapon the player chose in Zombie Survival. Fruit Ninja shows a blade instead.

Once two of these games need it, this belongs in one shared place (say `src/platform/aim`), not copied into each game.

## Rules of the house

* Files stay under about 200 lines, with comments that say why.
* The platform's own screens use the tokens in `src/app/globals.css`, with the logo's purple as the accent. Each game brings its own colour in `info.ts`, which tints its home card, and inside the game it has its own look (Fruit Ninja is warm brown wood, for example), kept in its own folder. Be bold with colour.
* No imports from another game. Shared code belongs in `src/platform` or `src/components`.
