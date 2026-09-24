# Fruit Ninja

Status: in development. The home screen shows it with its cover and player counts.

"Fruit Ninja" is the name of an existing game by Halfbrick, so pick a name of our own before this ships.

## The idea

Up to 4 players compete on one screen. Fruit flies up. Each player slices it, avoids the bombs, and chases the highest score before the timer runs out.

* **Aiming:** each phone points at the screen, and that spot is its blade. Swing the phone to slice through whatever the blade crosses. See *Pointing at the screen* in `../README.md`.
* **Settings:** before the round starts, the host sets the round length and how often bombs come.
* **Bombs:** slicing one costs points and briefly stuns that player's blade.
* **Winning:** highest score when time runs out.

## Players

1, 2 or 4 (see `info.ts`). Everyone plays at once on the same screen.

## Look

Its own style, not the platform's: warm brown wood, like a cutting board, with the fruit bright against it. Keep the style in this folder's own stylesheet and canvas palette.

## To build

Follow `../README.md`: add `index.tsx` with a `GameModule`, then its loader in `../catalog.ts`.
