# Standoff

Standoff is a 1v1 fencing game for two people and one computer. Each player's phone becomes their sword. Tilt the phone and the blade on screen follows it, leaving a fading trail behind the tip. Thrust it to jab and snap it back to parry. Two big buttons on the phone walk you up and down the strip. The computer shows the strip, referees every touch and replays each point. First to two touches wins.

There is nothing to install on the phones and no account to make. Open the site on a computer, press Create game, and scan the QR code. On your own? Play the computer. It runs on Vercel for play from anywhere, or on your own computer over WiFi. Nothing is saved: close it and the game is gone.

Play it at [standoff-five.vercel.app](https://standoff-five.vercel.app).

## Screenshots

The start screen, in light and dark mode.

<img src="docs/screenshots/landing-light.png" alt="Start screen in light mode" width="100%" />

<img src="docs/screenshots/landing-dark.png" alt="Start screen in dark mode" width="100%" />

After Create game the whole window is the strip. The QR code waits in the middle, and players appear on their lines as they pick fencers.

<img src="docs/screenshots/stage-join.png" alt="The strip with the QR code before anyone joins" width="100%" />

<img src="docs/screenshots/stage-lobby.png" alt="Both players connected, standing on their lines" width="100%" />

Playing alone, the computer takes the second line. A friend who scans the code later takes its place.

<img src="docs/screenshots/stage-solo.png" alt="One player and the computer on the strip" width="100%" />

The blade follows the phone, and its tip leaves a short trail so you can see exactly where the sword went.

<img src="docs/screenshots/match-trail.png" alt="A blade sweeping up with a fading trail" width="100%" />

A parry turning a jab away, and a lunge landing.

<img src="docs/screenshots/match-parry.png" alt="A parry deflecting a jab" width="100%" />

<img src="docs/screenshots/match-lunge.png" alt="A lunge landing a touch" width="100%" />

Every touch gets a replay, slowed down around the moment it lands, then the result.

<img src="docs/screenshots/replay.png" alt="Replay in slow motion" width="100%" />

<img src="docs/screenshots/match-over.png" alt="The match over bar" width="100%" />

On the phone: one tap to start, pick a fencer, and calibrate. A drawing shows how to hold the phone. A short countdown gives you time to settle, then the fencer on the phone copies every tilt so you can see it worked.

<p>
  <img src="docs/screenshots/phone-start.png" alt="Phone start screen" width="32%" />
  <img src="docs/screenshots/phone-select.png" alt="Fencer select on a phone" width="32%" />
  <img src="docs/screenshots/phone-hold.png" alt="The drawing that shows how to hold the phone" width="32%" />
</p>

<p>
  <img src="docs/screenshots/phone-countdown.png" alt="The calibration countdown" width="32%" />
  <img src="docs/screenshots/phone-calibrate.png" alt="The fencer copying the phone's tilt after calibrating" width="32%" />
  <img src="docs/screenshots/phone-pad.png" alt="The Forward and Back buttons during a bout" width="32%" />
</p>

## How to play

1. On the computer, press **Create game**. Scan the QR code and tap **Tap to play**.
2. Pick a fencer. Hold the phone like a sword, pointing at the screen, and tap **Calibrate**. Hold still through the countdown. Tilt the phone and check the fencer follows, then tap **Ready**.
3. Fence:
   * **Aim** by tilting the phone. A jab only lands if your tip points at your opponent.
   * **Jab** with a short, fast thrust toward the screen.
   * **Parry** with a short, fast snap back toward you. For one second any jab that reaches you is blocked and the attacker is knocked off balance.
   * **Move** by holding **Forward** or **Back** on the phone.
4. Each touch gets a replay, which both players can skip. First to two wins. A rematch needs no new scan.

To play alone, tap **Play the computer** on the phone, or **Play solo** on the join card. The computer waits just out of reach and attacks every couple of seconds. It parries about half your jabs. A device without motion sensors (a laptop joining to test, say) gets on screen Jab and Parry buttons as well.

## Running it

There are two ways to run Standoff, and they share all their code.

### On Vercel

1. Import this repository into Vercel. It builds as a normal Next.js app.
2. In the project, open **Storage**, add **Upstash for Redis** from the Marketplace and connect it to the project. That sets `REDIS_URL`.
3. Redeploy, so the new variable reaches the functions.

Redis is what lets the host and the phones find each other. On Vercel each connection is held by one function instance, and the three connections may land on three different instances. Without Redis the host shows *No shared room store*, and some joins fail to find the room. Phones retry a few times, so it often still works, but not reliably. WebSockets need Fluid compute, which is on by default for projects created since April 2025.

Chrome and Firefox can only reach the game through the HTTP fallback on Vercel today (see *The HTTP fallback* below). That fallback leans on Redis even more, so treat Redis as required.

On the Hobby plan Vercel ends every socket after five minutes. The server warns each client 30 seconds early, and the client moves to a fresh socket without dropping the game (see *Socket handover* below), so a match never notices.

### On your own computer

You need Node 20.9 or newer, with the computer and both phones on the same WiFi.

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
| `REDIS_URL` | none | Shared room store. Set by the Vercel Redis integration. `KV_URL` also works |
| `PORT` | `3000` | Local HTTP port for the computer |
| `HTTPS_PORT` | `3443` | Local HTTPS port for the phones |
| `HOST` | `0.0.0.0` | Local interface to listen on |
| `PUBLIC_HOST` | LAN address | Address put in the QR code locally |
| `SOCKET_LIFETIME_MS` | off | Cuts local sockets after this long, like Vercel, to try the handover |

## How it works

### The pieces

The computer's browser tab is the referee. It runs the match, draws the strip and plays the sound. Each phone reads its own sensors, turns them into sword angles and strikes, adds the footwork buttons, and streams the result to the host. Everything a phone shows comes back from the host as one small state message, so a phone that reconnects is up to date on the first message it gets.

Between them sits a relay that makes no game decisions. It seats players, remembers who holds which seat, and passes messages along. The same relay runs in both places. Locally, one Node process (`server/index.ts`) serves the pages and accepts sockets at `/api/ws`, and rooms live in memory. On Vercel, a Next.js route at `src/app/api/ws/route.ts` takes over each socket from the runtime, and rooms live in Redis. A second route, `/api/stream`, carries the same relay over plain HTTP for browsers whose WebSocket cannot open.

### The relay

The seat rules are plain functions over a small room record (`src/relay/room-state.ts`): the lowest free seat goes to the next phone, a known seat token gets its old seat back, and a seat or a room is kept for a grace period after its player drops. Two things sit under those rules:

* A **store** that updates one room atomically. In memory that is free. In Redis each update takes a short lock on the room, reads the record, applies the same rules and writes it back, so two instances racing to seat two phones can never both put them in seat one.
* A **bus** for messages. In memory it is a local pub/sub. In Redis it is Redis pub/sub, with one subscriber connection per instance that fans messages out to the sockets it holds.

Each socket is one `RelayConnection` (`src/relay/relay-connection.ts`). It handles its messages one at a time in arrival order and never talks to another socket directly, only to the store and the bus. When a phone reloads and reclaims its seat on a different instance, the relay sends a kick over the bus and the old socket closes itself. If the host drops and never comes back, the phones' own connections close the room after the grace period, because on Vercel there is no central process to run that timer.

Every frame is validated with zod and rate limited per socket. Room creation and wrong room codes are capped per address, with the counters in the store so every instance shares them, and a room whose host has left gives its code back a minute later. A create, resume or join that fails part way, on a Redis error say, is undone and answered with an error the client retries. Seat and host tokens live in session storage and in the page, never in a URL or a log.

### Socket handover

Vercel ends every function at its maximum duration, sockets included. The route reads the real cutoff with `getDeadline()`, and the relay sends the client `server:rotate` 30 seconds before it (a third of the life, for shorter ones). The client (`src/net/socket-client.ts`) then opens a second socket and rejoins on it. Outgoing messages switch to the new socket as soon as it opens, because the relay queues them behind the rejoin. Incoming messages switch once the new socket confirms the seat. Until then the old one keeps delivering, so nothing is lost or doubled. The relay kicks the old socket once the new one holds the seat, and the host never sees the player leave. If the new socket dies before confirming, whatever went out on it is sent again on the old one. Start the local server with `SOCKET_LIFETIME_MS=36000` to watch it happen every few seconds.

### The HTTP fallback

Chrome and Firefox open a WebSocket over the page's existing HTTP/2 connection whenever the server allows it, and Vercel's edge does. Those WebSockets currently fail at the edge with a 502, before our code ever sees them. Vercel's own WebSocket demo fails the same way. Safari opens WebSockets over HTTP/1.1, so iPhones are not affected.

So when a WebSocket fails before it ever opens, the client switches to an HTTP stream for good (`src/net/stream-channel.ts`). A Server-Sent Events stream from `GET /api/stream` carries messages down. Messages going up are batched into `POST /api/stream`, one request at a time so they arrive in order, with whatever queued meanwhile riding in the next one. The stream behaves like a socket to the relay, handover included. A POST may reach any instance, so it travels to the stream's instance over the Redis bus. Without Redis about half the posts land on the wrong instance. Each of those is retried a few times, which helps, but Redis is the real fix. Set `standoff:transport` to `stream` in local storage to try the fallback anywhere.

To stay inside the free Redis quota, a phone only sends a motion frame when the reading actually changed, plus a keepalive four times a second. Jabs and parries go out the instant they are detected.

### Sword tracking

The phone's orientation (`deviceorientation`) becomes a quaternion. People hold a phone "like a sword" in two ways: flat with the top edge forward, or upright with the back facing forward. Calibration takes whichever of those two edges is closer to level as pointing at the screen, and remembers that direction in the phone's own frame as the blade. From then on the blade's elevation and swing relative to the guard drive the sword on screen every frame, so tilting up raises the sword however the phone is held. It reads an angle directly, so there is nothing to drift. Swinging the blade toward or away from the camera foreshortens it and dips the tip a little, which is how circling the phone shows up as the blade circling in a side view.

### Jabs and parries

Acceleration (`devicemotion`, with gravity removed) is rotated into the earth frame and projected onto the strip line, the level direction the phone pointed at when calibrating. So a thrust counts the same with the tip high or low.

A jab is that signal climbing from quiet past the jab threshold within 160 ms. A parry is the same thing backwards. The rise window is what keeps a slow move of the arm from reading as a strike. Both are edge triggered, and after either one the detector ignores everything for a short refractory period, because every jab ends with the arm braking and every parry ends with it springing back, and those recoveries look exactly like the opposite strike.

### Footwork

Footwork is two hold buttons, Forward on top and Back below, since the top of the screen points at the opponent. Early versions read steps from the accelerometer, and every jab looked like a lunge to it. Buttons are instant and never drift, which leaves the sensors free for the sword. Holding both stands still, and lifting a finger anywhere, even off the button, stops the fencer.

### The blade trail

Each blade tip leaves a short line behind it that thins and fades within 280 ms. The tip positions are kept in strip metres and stamped with the frame clock, so the trail pans with the camera and slows down with a slow motion replay. Player one's trail is the accent colour and player two's is the text colour. The calibration preview on the phone draws the same trail.

### The computer opponent

`src/game/bot.ts` drives a fencer through the same `control` and `strike` calls a phone uses, so the referee judges it by the same rules. It waits just outside reach, steps in to attack every couple of seconds, backs off again, and tries to parry about half of your jabs with a human sized reaction time. Some of those parries arrive too late, which is the point. It skips replays and accepts rematches at once, so it never holds you up.

### The referee

The host steps the match at a fixed 60 Hz. A jab does not land when it is detected: the tip takes 140 ms to arrive, and the defender's parry window is checked at the moment of arrival. That gap is what lets a fast reaction save a touch. A jab also has to be in range and on target (the live blade pointing within 55 degrees of the line). Two touches within 60 ms of each other cancel out, like a double in épée. If both fencers walk into each other, it is called corps-à-corps and they are put back at a safe distance.

### Fencers and characters

Every fencer is a cutout rig: separate art pieces for the head, torso, arms, legs and sword, hung on one skeleton and drawn with canvas paths. A pose is a handful of numbers (hip position, lean, where each foot and hand is, blade angle). Knees and elbows are solved with two bone IK, so poses stay small enough to blend field by field.

The sword arm follows the phone. Jabs, parries, deflections, hits, and the victory and defeat poses are layered on top by a small animator. Each action has a weight that snaps toward 1 when it starts and eases back to 0 after, which is how a lunge briefly takes over the tracked sword and then springs back to following your hand. The feet step in time with distance travelled, so a retreat plays the same step backwards, back foot first, which is how fencers actually retreat.

The four characters (Vale, Duchess, Marrow, Iron) share that skeleton and animation. A character is only a choice of art pieces and tones, so all of them stay fully reactive. Player one's details are drawn in the accent colour and player two's in white.

### Replays

While play is live the engine records every frame (positions, blade angles, the current action and how far into it) and every event. A frame is a few numbers, so seconds of history cost almost nothing, and there is no video. After a touch the replay feeds the last three seconds back through the same renderer, slowing to 30 percent around the touch and interpolating frames so the slow part stays smooth. It ends when it finishes, when both players skip, or after the timeout, so a phone that drops out cannot stall the match.

### Sound

All of it is synthesized with the Web Audio API, so there are no audio files. Four buses (music, crowd, effects, interface) feed a limiter. Each combat sound fires off the same game event that starts the animation, so they land on the same frame. The music is two step sequenced loops, an ambient one for the lobby and a driving one for the match, scheduled ahead on the audio clock. It ducks under cheers and drops right back during replays.

The crowd murmurs under the whole match. Cheers are rationed on purpose: only a clash (both fence at once and one parries) or a match point earns one, with a cooldown between them.

iOS will not start audio or share motion until the user taps, so the phone's first screen does both in a single tap, along with a screen wake lock. Haptics use `navigator.vibrate`, which works on Android. iOS Safari has never supported it and the old checkbox trick was closed in iOS 26.5, so on iPhones the computer's sound carries the feedback.

### Tuning

Every value worth adjusting by feel is in the tuning drawer (the sliders icon at the top right of the stage). Changes reach both phones at once. Nothing is saved, so a new game starts from the defaults.

| Setting | Default | What it changes |
| --- | --- | --- |
| Jab threshold | 14 m/s² | How hard a thrust has to be |
| Parry threshold | 12 m/s² | How hard a pull back has to be |
| Parry window | 1000 ms | How long a parry blocks |
| Refractory period | 350 ms | Quiet time after any strike |
| Replay timeout | 10 s | When a replay ends on its own |
| Music, crowd, effects | 0.5, 0.6, 0.9 | Mix levels |
| Cheer cooldown | 8 s | Minimum gap between cheers |

These are starting points. Expect to move them once two people are actually playing.

## Project layout

```
server/                 Local entry: Next, HTTPS for phones, upgrades to the relay
  realtime/             Local WebSocket server and the optional socket lifetime
src/
  app/                  Next routes: the host page, /join/[code], /api/ws and /api/stream
  relay/                Rooms and message routing, with memory and Redis backends
  shared/               Protocol schemas, tuning, characters, shared types
  motion/               Phone side sensor processing, no browser APIs
  game/                 Host side engine: fencers, referee, match, replay, the computer opponent
  rig/                  Skeleton, IK, poses, animator, art pieces, skins
  render/               Canvas renderer, camera, strip, blade trail, hit flash
  audio/                Web Audio engine, effects, crowd, music, director
  net/                  Socket client with reconnects, the handover and the HTTP fallback
  host/                 Host session, lobby and the full screen stage
  controller/           Phone session, sensors and screens
  components/           Shared interface pieces
  styles/               Stylesheets per area
```

The motion, game, rig and relay folders have no DOM code in them, which is what lets the tests drive them with synthetic sensor readings, scripted matches and fake sockets.

## Tests

```bash
npm test
```

The suite covers the relay (seating, ordering, kicks, grace periods, closing, store failures and rate limits), both Vercel routes, the socket handover, the motion pipeline fed with synthetic sensor data for either grip, jab and parry detection, the referee, match flow, replay timing, the engine playing whole exchanges, the computer opponent, the blade trail, the rig's IK and animator, the lobby and seating rules, tuning clamps and protocol validation.

Two more files run against a real Redis: the relay with two separate backends standing in for two Vercel instances, and the store's locking and expiry. They run when `REDIS_TEST_URL` is set:

```bash
redis-server --port 6390 --daemonize yes
REDIS_TEST_URL=redis://127.0.0.1:6390 npm test
```
