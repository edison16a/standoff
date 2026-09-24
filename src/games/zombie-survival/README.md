# Zombie Survival

Status: in development. The home screen shows it with its cover and player counts.

## The idea

A co-op shooter. The players work together, and the game walks them forward through the level on its own, like an on rails shooter. Zombies come at them, and bosses turn up along the way. Bosses have weak points to target together. Each player keeps their own score as well.

* **Aiming:** each phone points at the screen, and that spot is where its gun aims. See *Pointing at the screen* in `../README.md`.
* **Weapons:** before starting, each player picks one, such as an AK-47 or a shotgun, and each fires and handles differently.
* **Firing:** tap the phone screen.

## Players

1, 2 or 4 (see `info.ts`).

## Look

Its own dark, grim style, kept in this folder.

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`.
