# Go-Kart Racing

Status: in development. The home screen shows it with its cover and player counts.

## The idea

Karts race round a track on the big screen. Each phone is a steering wheel: hold it sideways in both hands and tilt to steer. On screen buttons accelerate and brake. First over the line after three laps wins.

## Players

1, 2 or 4 (see `info.ts`). With 1 player, race against the clock or computer karts.

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`. Join works through the QR code like every game, and the code sits bottom left until `room.setPlaying(true)`.
