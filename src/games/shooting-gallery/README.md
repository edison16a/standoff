# Shooting Gallery

Status: in development. The home screen shows it with its cover and player counts.

## The idea

Up to 4 players compete for score. Ducks and floating targets move across the screen, and players shoot them for points. Harder and faster targets are worth more. Top score at the end wins.

* **Aiming:** each phone points at the screen, and that spot is where its gun aims. See *Pointing at the screen* in `../README.md`.
* **Weapon:** a BB gun for everyone.
* **Firing:** tap the phone screen.

## Players

1, 2 or 4 (see `info.ts`).

## Look

Its own style, a funfair shooting gallery, kept in this folder.

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`.
