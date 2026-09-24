# Magic Kart

Status: in development. The home screen shows it with its cover and player counts.

## The idea

A party kart racer in the spirit of the classic console ones. Karts race round a bright, magical track on the big screen, and first over the line after the last lap wins.

* **Track:** a beach course with sand, sea and palm trees, rainbow kerbs, sparkles in the air and a rainbow finish arch. More tracks can follow in the same spirit.
* **Power up cubes:** glowing see through cubes with a star on each face float across the track in rows. Driving through one gives a random power up, like a speed boost, a shield or something to throw at the kart ahead.
* **Controls:** the phone screen is the controller. On screen steering, plus buttons to accelerate, brake and use a power up. No motion sensors needed.
* **Players:** up to 4 racing at once. With 1 player, race the clock or computer karts.

## Players

1, 2 or 4 (see `info.ts`).

## Look

Bright, sunny and magical, kept in this folder. The cover shows the target look: purple asphalt, rainbow kerbs, turquoise sea and glowing cubes.

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`. Fencing's Forward and Back hold buttons show how to make buttons that never stick.
