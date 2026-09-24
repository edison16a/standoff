# Co-op Survival

Status: in development. The home screen shows it with its cover and player counts.

## The idea

Players stand back to back and hold the line against waves coming at them. Each phone is a gun: aim by pointing it, fire with a tap or a flick. The team survives together, and each player keeps their own score.

## Players

1 or 2 (see `info.ts`).

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`. Aiming can reuse the orientation approach fencing uses for the sword.
