# Go-Kart Racing

Status: in development. The home screen shows it with its cover and player counts.

## The idea

Karts race round a track on the big screen. First over the line after the last lap wins.

* **Controls:** the phone screen is the controller. On screen steering, plus buttons to accelerate and brake. No motion sensors needed.
* **Players:** up to 4 racing at once. With 1 player, race the clock or computer karts.

## Players

1, 2 or 4 (see `info.ts`).

## Look

Its own style, bright and fast, kept in this folder.

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`. Fencing's Forward and Back hold buttons show how to make buttons that never stick.
