# Baseball Pitch

Status: in development. The home screen shows it with its cover and player count.

## The idea

A 1v1 duel at the plate. The pitcher throws with a real overarm motion, and the speed and spin come from the phone's motion. The batter swings the phone like a bat, and timing decides the hit. Swap after each at bat, and most runs wins.

## Players

2 (see `info.ts`).

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`. The fencing folder shows how motion is read, calibrated and streamed, which a pitch and a swing both need.
