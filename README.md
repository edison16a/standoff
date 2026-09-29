# Standoff

Standoff is the games console of the web. Open it on any computer, and everyone's phone becomes a controller that tracks how they move. Some games use the computer's camera instead and read you from the waist up. Play with up to six friends across eleven games, each one its own world.

I loved the Wii, the PS5 and the Xbox, but there were never enough controllers, and I can't bring my Xbox everywhere. Standoff runs on any computer and uses everyone's phones as controllers. There is nothing to install and no account to make: pick a game, everyone scans the QR code, types a name, and you play.

Camera games track movement with a pose model that downloads once and runs on your own computer. The camera picture never leaves it. Phones send their moves through the game server as you play, and nothing is ever saved there: close the game and it is gone.

Play it at [standoffgames.vercel.app](https://standoffgames.vercel.app).

## Screenshots

The home screen works like a console menu. Big tiles show each game, and the chosen one grows and gets a ring in its own colour. A looping clip of the game really being played fills the screen behind it, with a warm, bouncy lobby tune and menu sounds. The music starts as the page opens. Browsers hold sound back until you first interact with a page, so if yours does, it starts on your first click, tap or key press. The gear at the top right sets the music and sound effect volume.

<img src="docs/screenshots/home.jpg" alt="The home screen in dark mode with Magic Kart chosen in the row of game tiles and a clip of the race behind" width="100%" />

### Magic Kart

<img src="docs/screenshots/magic-kart.jpg" alt="Karts gliding over the lagoon on Sunny Shores" width="100%" />

### Fruit Slicer

<img src="docs/screenshots/fruit-ninja.jpg" alt="Blade trails slicing fruit over the wooden board" width="100%" />

### Zombie Survival

<img src="docs/screenshots/zombie-survival.jpg" alt="Players shooting different zombies in a night street" width="100%" />

### Shooting Gallery

<img src="docs/screenshots/shooting-gallery.jpg" alt="BB guns aiming at ducks and targets in the fairground booth" width="100%" />

### Boxing

<img src="docs/screenshots/boxing.jpg" alt="Two boxers trading punches in the ring" width="100%" />

### Subway Runner

<img src="docs/screenshots/subway-surfers.jpg" alt="A runner on the neon rails of the night city" width="100%" />

### Basketball 3v3

<img src="docs/screenshots/nba-3v3.jpg" alt="A dunk at the top of the jump in the arena" width="100%" />

### Soccer 3v3

<img src="docs/screenshots/fifa-3v3.jpg" alt="Three on three football on the big pitch" width="100%" />

### Cube Game

<img src="docs/screenshots/cube-game.jpg" alt="The cube jumping spikes in a neon level" width="100%" />

### Blade Clash

<img src="docs/screenshots/blade-clash.jpg" alt="The Knight and the Star Knight throwing sparks as their blades clash, one half of the screen for each" width="100%" />

### Brawl Battle

<img src="docs/screenshots/brawl-battle.jpg" alt="Karate releasing a charged Dragon Flight on the temple stage" width="100%" />

## The games

In the order the home screen shows them:

* **Magic Kart:** a kart racer for up to four in split screen. Hold the phone like a steering wheel, grab power ups, and glide over the big jumps.
* **Fruit Slicer:** up to four players slice fruit on one board by pointing their phones at the screen, and dodge the bombs.
* **Zombie Survival:** up to four players aim their phones like guns and fight together through 25 stages to the ship.
* **Shooting Gallery:** a fairground duck shoot. Point, shoot, top score in 20 seconds wins.
* **Boxing:** stand in front of the camera and fight. Your arms and head drive your boxer, so real blocks and dodges work.
* **Subway Runner:** run the neon rails with your body. Lean to change lanes, jump and roll, and survive as it speeds up.
* **Basketball 3v3:** three on three with the stars for up to six phones. Dribble moves, a shot meter, dunks and free throws.
* **Soccer 3v3:** three on three football for up to six phones. Hold to power a shot, tap to pass, and beat defenders with skill moves.
* **Cube Game:** jump for real to jump the cube through five levels of rhythm and spikes.
* **Blade Clash:** a split screen sword duel for two. Your phone is the sword in full 3D. Swing, block and clash until one fighter has taken five hits.
* **Brawl Battle:** a four fighter platform brawl. Charge up attacks, pile on the damage and knock everyone off the stage.

Empty spots are filled by computer players. Each game lives in its own folder under `src/games`, with a README of its own.

It runs on Vercel for play from anywhere, or on your own computer over WiFi.

## How to play

On the computer, pick a game and press **Host Game**. Scan the QR code with each phone, type a name and tap **Join**, or tap **Skip**. Every game walks the phone through the same steps, each on its own page: calibrate, the game's own choice, then **Ready**. Every phone page fits the screen without scrolling.

Opening the site on a phone goes straight to the join screen, since phones are the controllers. Type the four letter code from the big screen, or tap **Scan QR code** where the browser can read QR codes (Chrome on Android does; elsewhere the button stays hidden and the phone's own camera app works too). The Standoff logo on a phone always leads back there. When the host ends a game or leaves, every phone lands on **Join a new game** with the same code field and scanner.

The big screen checks each new room before it shows the code, so for a moment the QR code reads **Checking the room**. Right under the code sits **Regenerate room**. It opens a fresh room for the same game on a fresh connection and moves every phone that can still hear the old room to it, names and all. **Remake lobby** in the gear menu does the same. If a room is lost, see *When a room is lost* below.

Names are unique in a room, whatever the case or spacing. A phone that picks a name someone is using is asked for another. Once seated, the phone moves to its own address, `/play/<CODE>/<name>`. Reload it, or close the tab and open it again, and you land back in your seat with your score. If a phone loses its connection, it shows a **Reconnect** button. A new phone that types the name of a player who dropped is offered **Reconnect** too, and takes over that player rather than joining as someone new.

Camera games have no phones. Stand where the camera sees you from the waist up, hold still while your head line is set, and play with your body. Your head going up out of its band is a jump, and going down is a duck or roll.

* **Magic Kart:** hold the phone sideways like a wheel and turn it to steer (full lock at about 50 degrees). Hold **Drive** to go, **Brake** to slow and drift, and tap the round button to use a power up. Off a big jump a glider opens, and you steer it the same way.
* **Fruit Slicer, Zombie Survival and Shooting Gallery:** hold the phone flat like a remote and point it at the screen. Calibrate by pointing at the targets shown. Sweep fast to slice, or tap **Shoot**. Phones without motion sensors aim by dragging on a pad.
* **Boxing:** punch straight or hook with your arms. Keep your gloves where the punch is coming to block it, and duck or lean to make it miss. Head shots hurt more and can stun. Touch gloves by holding your arms out.
* **Subway Runner:** lean or step left and right to change lanes, jump to jump and dip to roll.
* **Basketball 3v3:** the joystick moves. Hold **Shoot** and let go in the green. With the ball the third button is **Dribble**: back is a stepback, sideways a crossover, forward a spin. Without it, it is **Steal** or **Block**. Reach in too often on one player and you may foul.
* **Soccer 3v3:** the joystick moves and aims. Tap **Shoot/Pass** to pass, or hold it to fill the power bar. Green is placed, red is powerful but wild. With the ball the second button is **Skill**: forward is a rainbow flick, sideways a crossover, back a drag back, centred a 360.
* **Cube Game:** jump for real to jump the cube.
* **Blade Clash:** hold the phone like the handle of a sword and calibrate by pointing at the targets. The sword on screen copies it in 3D. A hit only counts when a moving blade really touches the other fighter, and a blade held in the way blocks it. Hold **Forward** or **Back** to move. To fight alone, tap **Play the computer**.
* **Brawl Battle:** the joystick moves, and pushing up jumps (push up again in the air to double jump). Attacks change with the direction you hold. Hold an attack past 0.4 seconds to charge a stronger move, and use the Ult when its ring is full. Two lives each, and more damage means you fly further.

## Running it

There are two ways to run Standoff, and they share all their code.

### On Vercel

Import this repository into Vercel. It builds as a normal Next.js app, and needs nothing else. WebSockets need Fluid compute, which is on by default for projects created since April 2025.

Rooms live in the memory of the function instance that holds the host's WebSocket. A WebSocket stays on its instance until Vercel cuts it (five minutes on Hobby), which is why a game plays smoothly once everyone is in. When Vercel adds an instance under load, it can start sending every new connection there, the five minute handovers included, while the open sockets stay where they are. The room follows (see *When a room moves*): every instance of one deployment signs room tokens with the same secret, made at build time, so the host's next socket makes the same room, same code, on the new instance, and each phone takes back its own seat there.

What still ends open rooms is **a deploy**, because the new deployment has a new secret and has never heard of them, and now and then **a scale out** the room cannot follow, say when requests keep spreading over several instances at once. The big screen notices within seconds and either makes a new room by itself or asks you to press **Regenerate room** (see *When a room is lost*). That is the recovery, and nothing needs setting up for it. Promote deploys by hand if you want none to land during a game night. `STANDOFF_ROOM_SECRET`, if set, replaces the build's secret and so carries rooms across deploys too.

A Redis URL in the environment (`REDIS_URL`, `KV_URL` or `UPSTASH_REDIS_URL`) makes every instance share the rooms instead. It is optional and nothing asks for it. `/api/health` says which store a deployment uses and which deployment answered.

On the Hobby plan Vercel ends every socket after five minutes. The server warns each client 30 seconds early, and the client moves to a fresh socket without dropping the game (see *Socket handover* below), so a match never notices.

### On your own computer

You need Node 20.9 or newer, with the computer and the phones on the same WiFi.

```bash
npm install
npm run dev
```

The terminal prints two addresses:

```
Open on this computer:  http://localhost:3000
Phones join through:    https://192.168.1.20:3443
```

Open the first one on the computer. The QR code already points at the second one.

Phones only share motion sensor data with pages served over HTTPS, so the phone side runs on HTTPS with a certificate the server makes for itself on first start. Each phone shows a warning the first time. On iPhone tap *Show Details*, then *visit this website*. On Android Chrome tap *Advanced*, then *Proceed*. The certificate is kept in `certs/`, so this happens once per network address. To skip the warning, make a trusted certificate with [mkcert](https://github.com/FiloSottile/mkcert), install its root on the phones, and save the pair as `certs/key.pem` and `certs/cert.pem`.

Public and guest WiFi usually stop devices from reaching each other, so on those networks use the Vercel version instead. If the QR code shows the wrong address (a VPN, for example), start with `PUBLIC_HOST=192.168.1.20 npm run dev`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Local server with hot reload |
| `npm run build` | Production build |
| `npm start` | Local production server |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | none | Optional shared room store. `KV_URL` and `UPSTASH_REDIS_URL` also work |
| `STANDOFF_ROOM_SECRET` | made at build | Signs room tokens. Set it to keep rooms across deploys |
| `PORT` | `3000` | Local HTTP port for the computer |
| `HTTPS_PORT` | `3443` | Local HTTPS port for the phones |
| `HOST` | `0.0.0.0` | Local interface to listen on |
| `PUBLIC_HOST` | LAN address | Address put in the QR code locally |
| `SOCKET_LIFETIME_MS` | off | Cuts local sockets after this long, like Vercel, to try the handover |
| `STANDOFF_SIMULATE_INSTANCES` | off | `1` makes a local server act as one of several Vercel instances with rooms of their own |

## How it works

### The platform and the games

`src/platform` is the console: the home screen, rooms, joining, names, reconnects, and the frame around every game. Each game is a folder in `src/games` that plugs in through one contract, `src/platform/games/game-api.ts`. A game supplies a host screen for the computer and a phone screen, and exchanges messages of its own design with its phones. It never imports another game, so several games can be built at once without touching the same files. `src/games/README.md` explains how to add one.

A room ends with `host:retire`, which carries the room's host token, so it works from any connection, even when the one that made the room is dead. It can name where the phones go next (`movedTo`), and the relay tells them `room:moved` with the new code. The host sends it again until the relay answers, so a lost reply never leaves phones in an old game. An ended room stays behind as a tombstone for ten minutes: a phone that slept through the end and joins the old code is told the new code, or that the game ended, rather than "Room not found".

The platform keeps two message kinds for itself. A phone sends `profile` with its player's name, and the host sends every phone `players`, the line up. Games never see either.

Inside a game, the computer is the referee. Phones send raw input, and everything they show comes back from the host.

### The relay

Between the computer and the phones sits a relay that makes no game decisions. It seats players, remembers who holds which seat, and passes messages along. It checks only that a message has a `kind` and fits the size cap, so a new game needs nothing from it. Locally, one Node process (`server/index.ts`) serves the pages and accepts sockets at `/api/ws`, and rooms live in memory. On Vercel, a Next.js route at `src/app/api/ws/route.ts` takes over each socket from the runtime, and rooms live in the memory of that function instance, or in Redis when a URL is set. A second route, `/api/stream`, carries the same relay over plain HTTP for browsers whose WebSocket cannot open.

The seat rules are plain functions over a small room record (`src/platform/relay/room-state.ts` and `seat-claim.ts`): the lowest free seat goes to the next phone, up to the one to six seats the game asked for, a known seat token gets its old seat back, and a seat or a room is kept for a grace period after its player drops. Each seat keeps its player's name. A join with a name a connected player has is refused. A join with the name of a player who dropped is refused too, unless it asks to reconnect, and then it takes that same seat, so the game hears a rejoin and keeps the player's state. Two things sit under those rules:

* A **store** that updates one room atomically. In memory that is free. In Redis each update takes a short lock on the room, reads the record, applies the same rules and writes it back, so two instances racing to seat two phones can never both put them in seat one.
* A **bus** for messages. In memory it is a local pub/sub. In Redis it is Redis pub/sub, with one subscriber connection per instance that fans messages out to the sockets it holds.

Each socket is one `RelayConnection` (`src/platform/relay/relay-connection.ts`). It handles its messages one at a time in arrival order and never talks to another socket directly, only to the store and the bus. When a phone reloads and reclaims its seat on a different instance, the relay sends a kick over the bus and the old socket closes itself. If the host drops and never comes back, the phones' own connections close the room after the grace period, because on Vercel there is no central process to run that timer.

Every frame is validated with zod and rate limited per socket. Room creation and wrong room codes are capped per address, with the counters in the store so every instance shares them, and a room whose host has left gives its code back a minute later. A create, resume or join that fails part way, on a Redis error say, is undone and answered with an error the client retries. Seat and host tokens live in session storage and in the page, never in a URL or a log.

### Socket handover

Vercel ends every function at its maximum duration, sockets included. The route reads the real cutoff with `getDeadline()`, and the relay sends the client `server:rotate` 30 seconds before it (a third of the life, for shorter ones). The client (`src/platform/net/socket-client.ts`) then opens a second socket and rejoins on it. Outgoing messages switch to the new socket as soon as it opens, because the relay queues them behind the rejoin. Incoming messages switch once the new socket confirms the seat. Until then the old one keeps delivering, so nothing is lost or doubled. The relay kicks the old socket once the new one holds the seat, and the host never sees the player leave. If the new socket dies before confirming, whatever went out on it is sent again on the old one. Start the local server with `SOCKET_LIFETIME_MS=36000` to watch it happen every few seconds.

### When a room moves

Without a shared store a room lives in one instance's memory, and Vercel may start sending new connections to another instance at any time. Host tokens and seat tokens are signed (`src/platform/relay/room-sign.ts`), so any instance of the same deployment trusts them:

* The host's `host:resume` carries the game, the seat count and the players' names. An instance that has never heard of the room makes it again from a signed token, same code, and says so (`restored`).
* When the host's new socket answered from another instance, the old socket's last message, `host:migrate`, lets the old instance forget the room and ask its phones to move to a fresh socket (`server:rotate`), which lands where the host now is. Each phone's signed seat token takes back its own seat and name. A phone whose fresh socket is refused, because new connections went back to the old instance, tries again a few seconds later while its old socket still works.
* When the room is made again on an instance where phones' sockets already sit, that instance knows the seats but not their connections, so its `host:back` says `rejoin` and each phone sends its join again on the socket it has. The big screen then shows them connected, and nobody else can take their seats.
* The host moves by itself when a room check cannot find the room, or when a phone drops and does not come back within a few seconds (`src/platform/host/room-mover.ts`), since both mean new connections go somewhere else. At most one move every ten seconds.
* A phone whose host went away looks for it on a fresh socket after two seconds, and twice more, while its old socket stays (`src/platform/phone/host-search.ts`).

A match carries on through all of this with the same code. The tests in `src/platform/integration/switch.test.ts` run ten minute matches while new connections move to a fresh instance.

### When a room is lost

A room can still stop working without anyone doing anything wrong, most often because a deploy lands. The big screen watches for that (`src/platform/host/room-guard.ts`):

* **A room check.** Right after a room is made, and every 20 seconds in the lobby (every minute once it has been fine for five), the host opens a throwaway connection, the way a phone would reach the room, and asks the relay to check it: the room must exist there, and a message must reach the host and come back (`probe:room`, `room:probe`, `host:echo`). A phone joining counts as a pass. Checks wait during a match and in a background tab. The QR code only shows once the first check passes.
* **The host's own connection.** When it drops and a fresh socket's resume is refused, the QR code hides at once, and after two more looks (about two seconds) the room is gone. When the handover before a socket's five minute cut is refused, which means a deploy, the room is checked at once, and once the retries are spent the big screen says **This room is about to close** while the old socket still reaches every phone, so Regenerate room can still move them all. That warning shows during a match too.

Before anyone has joined, a broken room is simply replaced: a new room is made and checked on a fresh connection, and its code appears. At most three such tries happen in five minutes, so a server that cannot keep rooms is never asked for one after another. Once players are in, the big screen says **This room was lost** (or **Phones can't reach this room**) with one big **Regenerate room** button, because the players have to follow the new code. A big screen reloaded after its room was lost opens a new room for the same game by itself.

Regenerate room, Remake lobby and the automatic fix are the same full remake (`room-candidate.ts`): a new socket makes the new room and it is checked, while the old room and its phones carry on untouched. Only once it passes does the host move over to the new socket and retire the old room with `movedTo`, so phones that can still hear it follow by themselves, names and all. If the new room fails its check, it is ended and nothing else changes.

Ending a room, by leaving or by a remake, is a `host:retire` that is sent again until the relay confirms it (`src/platform/host/retire-queue.ts`). The answer names the instance that gave it. Without a shared store, "not found" from an instance other than the room's own only means the room lives elsewhere, so the retire keeps going for up to a minute over fresh connections that may land where the room is, and after a remake the old socket, which sits on the old room's instance, keeps sending it too until that instance confirms.

A phone whose room is gone tries to get back in for about nine seconds, still on its game screen, then says **The room was lost** and shows the code field and QR scanner for the new code.

### The HTTP fallback

WebSockets come first, everywhere: a WebSocket stays on one instance, which keeps a room together, and costs one request for five minutes of play. Chrome and Firefox only send a WebSocket over the page's HTTP/2 connection when the server offers that (the `SETTINGS_ENABLE_CONNECT_PROTOCOL` setting), and such sockets used to get a 502 on Vercel. On 29 September 2026 the live site's edge did not offer it (the setting came back false), and a plain HTTP/1.1 upgrade to `wss://standoffgames.vercel.app/api/ws` got `101 Switching Protocols`, so those browsers should now get WebSockets like Safari does. That was checked with a raw HTTP/2 and HTTP/1.1 client, not a real Chrome, since the browser here goes through a proxy. The relay logs the transport of every room handshake (`[relay] seat 1 ABCD over ws`), so the Vercel logs show the real split. To check a browser by hand, paste `new WebSocket('wss://standoffgames.vercel.app/api/ws').onopen = () => console.log('open')` into its console.

The stream stays as the fallback for a browser whose WebSocket will not open at all (`src/platform/net/transport-choice.ts`). A WebSocket that fails once proves little, since a server restart, a deploy or a phone waking with no network look the same. So a page only decides WebSockets are blocked when none has ever opened on it and the stream then opens in its place, which means the server was up all along. Then fresh connections go straight to the stream for ten minutes, and try a WebSocket again after that. On a page where WebSockets have worked, a failure is an outage and the client keeps trying WebSockets, with the stream standing in for one connection only after three failures in a row. A socket the client closed itself while it was still connecting counts for nothing. Room checks use the same transport as the host's own socket, and try the stream within the same check when their WebSocket never opens.

The stream (`src/platform/net/stream-channel.ts`) is a Server-Sent Events stream from `GET /api/stream` for messages down, and `POST /api/stream` for messages up, one request at a time so they arrive in order. Motion frames wait 200 ms so several ride in one post, and one still waiting is replaced by the newer one. Inputs such as strikes wait at most 100 ms. Every post is a request of its own, and a flood of them is what makes Vercel add instances. A POST may reach any instance, and one that does not hold the stream answers 410. It is sent again at once, and if that misses too, it goes again on the next beat with whatever queued meanwhile riding along, so one batch never costs more than two requests. Five misses in a row end the stream and the client reconnects. The stream behaves like a socket to the relay, handover included. Set `standoff:transport` to `stream` in local storage to try the fallback anywhere.

A phone only sends a motion frame when the reading actually changed, plus a keepalive four times a second. Strikes go out the instant they are detected.

## Blade Clash

Everything in this section lives in `src/games/blade-clash`, and its own README goes further.

### The sword

Each phone is the handle of a sword. It reads its orientation (`deviceorientation`) and learns the grip at calibration: the player points at the middle of their half of the screen, then at each corner, then shows a relaxed guard. From then on the phone sends how the sword is held, turned, raised, the edge's angle and how far the arm reaches. The computer puts the hand and the blade in the world from that, so the sword on screen moves in full 3D with the phone. Footwork is two hold buttons, **Forward** and **Back**, which leaves the sensors free for the sword.

### Hits and clashes

There are no gestures. A hit is a moving blade passing through the other fighter's head, body or legs. Each swing is tested along its whole path in steps no longer than a blade is thick, so a swing too fast to see in one frame still hits what it went through. Blade against blade is tested first, so a blade held in the way stops a swing. Blades that meet fast enough clash: sparks, a clang, and both swords are thrown back before they ease into the hand again. Each fighter can take five hits.

### The look

The screen is split down the middle, one shoulder camera per player, each with its own bloom. Four fighters share one skeleton with inverse kinematics: the Knight with a longsword, the Samurai with a katana, the Block Hero with a pixel sword and the Star Knight with a glowing energy blade. The arena is an open air stone dais under a full house. Blades leave trails, clashes throw sparks in the blades' colours, and the last hit plays in slow motion before the winner raises their sword under confetti. Each half has its player's card with five health blades, with the split map between them.

### Sound

All of it is synthesized with the Web Audio API through four buses (music, crowd, effects, interface). There is lobby and fight music, a whoosh, clash and hit in each weapon's own voice, the energy blade's hum, clanking armour, and a crowd that gasps at big clashes and cheers the finish.

### Tuning

The tuning drawer (the sliders icon at the top right) holds the hit and clash speeds, the knockback, the cooldowns and the mix. Nothing is saved.

## Project layout

```
server/                   Local entry: Next, HTTPS for phones, upgrades to the relay
src/
  app/                    Next routes: the home page, /join/[code], /play/[code]/[name], /api/ws and /api/stream
  platform/               The console, shared by every game
    games/                The contract between the platform and a game
    host/                 Home screen, room shell, join card, the host's room
    phone/                Name screen, joining, the phone's room, permissions
    relay/                Rooms and message routing, in memory or in Redis
    net/                  Socket client with reconnects, the handover and the HTTP fallback
    protocol/             The envelopes every frame travels in
    audio/                The Web Audio engine
  games/
    catalog.ts            Every game and how to load it
    kit/                  Shared code games may use: phone aiming, setup steps, seat colours
    blade-clash/          Sword duel in split screen, three.js
    fruit-ninja/          Slicing on a wooden board, three.js
    magic-kart/           Kart racing in split screen, three.js
    zombie-survival/      Co-op zombie shooter over 25 stages, three.js
    shooting-gallery/     Fairground duck shoot, three.js
  components/             Shared interface pieces
  styles/                 The platform's stylesheets. Each game keeps its own.
```

## Tests

```bash
npm test
```

The suite covers the relay (seating up to six, ordering, kicks, grace periods, closing, store failures and rate limits), both Vercel routes, the socket handover, the platform's host room and names, the game catalog, and for Blade Clash the motion pipeline fed with synthetic sensor data, calibration and aiming, the swept blade tests, clashes and knockback, the engine playing whole exchanges, match flow with the slow motion finish, the computer opponent, the rig, footwork and endings, the lobby, and the showcase's beats. The kit's aim math and phone aiming are tested too. Each three.js game tests its own engine: Fruit Slicer's blade sweeps and scoring, Magic Kart's laps, checkpoints, items and whole computer races on every map, Zombie Survival's guns, stages and a bot team playing all 25 stages, and Shooting Gallery's rounds, hit tests and best scores.

Rooms are tested end to end too. `src/platform/testing/fake-cluster.ts` runs several relay instances in one test, each with rooms of its own, and routes the real client's WebSockets, event streams and posts across them. On it the real host and phones play game after game in one tab, over WebSockets and over the stream, regenerate a room with players in it, and live through a deploy that takes the room, before anyone joined and after. They also end a game while the host's next connection lands on another instance, and keep phones seated after the host moved instances and new connections went back to the old one.

Two more files run against a real Redis: the relay with two separate backends standing in for two Vercel instances, and the store's locking and expiry. They run when `REDIS_TEST_URL` is set:

```bash
redis-server --port 6390 --daemonize yes
REDIS_TEST_URL=redis://127.0.0.1:6390 npm test
```
