import { rest, slash, sweep, type Script } from "./script";

/**
 * Eight seconds of a four player round at its busiest: a three fruit
 * combo, a giant melon kept up by every blade in turn until it bursts, a
 * glowing dragonfruit, a bomb someone should have left alone, and a star
 * fruit to finish. The board is 10 units tall and about 17.8 wide.
 */
export const LOOP: Script = {
  period: 8,
  throws: [
    { id: "melon", t: 0, kind: "watermelon", from: -1.5, apex: { x: -4.8, y: 0.5 } },
    { id: "orange", t: 0, kind: "orange", from: -0.5, apex: { x: -1.2, y: 1 } },
    { id: "peach", t: 0, kind: "peach", from: 0.5, apex: { x: 2.4, y: 0.6 } },
    { id: "banana", t: 0.45, kind: "banana", from: 7.5, apex: { x: 5.2, y: -0.3 } },
    { id: "pineapple", t: 0.45, kind: "pineapple", from: -7.8, apex: { x: -6.2, y: -0.9 } },
    { id: "giant", t: 1.3, kind: "giant-melon", from: 0.8, apex: { x: 0.6, y: -0.8 } },
    { id: "dragon", t: 2.6, kind: "dragonfruit", from: -8.3, apex: { x: -4.6, y: 1.9 } },
    { id: "berry", t: 4.2, kind: "strawberry", from: -7, apex: { x: -2.5, y: -0.1 } },
    { id: "kiwi", t: 4.35, kind: "kiwi", from: 7, apex: { x: 1.5, y: 0.3 } },
    { id: "lime", t: 4.5, kind: "lime", from: -6.5, apex: { x: -0.5, y: -0.5 } },
    { id: "bomb", t: 4.5, kind: "bomb", from: 6.5, apex: { x: 2.8, y: 1.3 } },
    { id: "plum", t: 4.6, kind: "plum", from: 0, apex: { x: 3.8, y: -0.9 } },
    { id: "star", t: 5.3, kind: "star-fruit", from: -8.3, apex: { x: -4, y: 1.7 } },
    { id: "coconut", t: 5.9, kind: "coconut", from: -3, apex: { x: -5.8, y: -0.7 } },
    { id: "lemon", t: 5.9, kind: "lemon", from: 3, apex: { x: 6, y: -0.1 } },
    { id: "apple", t: 6.05, kind: "apple", from: 8, apex: { x: 5, y: 1.3 } },
  ],
  bots: [
    {
      seat: 1,
      name: "Ada",
      blade: "fire",
      moves: [
        rest(0.6, -7, -3.2),
        sweep(
          [
            { t: 1.25, fruit: "melon" },
            { t: 1.33, fruit: "orange" },
            { t: 1.41, fruit: "peach" },
          ],
          5,
        ),
        slash(2.6, "giant", -20, 2.6, 0.1),
        slash(3.8, "giant", 10, 2.6, 0.1),
        sweep(
          [
            { t: 5.45, fruit: "berry" },
            { t: 5.55, fruit: "lime" },
            { t: 5.65, fruit: "kiwi" },
          ],
          10,
        ),
        sweep(
          [
            { t: 7.15, fruit: "lemon" },
            { t: 7.25, fruit: "apple" },
          ],
          70,
        ),
      ],
    },
    {
      seat: 2,
      name: "Bo",
      blade: "lightning",
      moves: [
        rest(0.7, 7.2, -3),
        slash(1.55, "banana", -60),
        slash(2.9, "giant", 200, 2.6, 0.1),
        slash(4.1, "giant", 240, 2.6, 0.1),
        slash(5.85, "bomb", -40),
        rest(6.9, 7, -3.4),
      ],
    },
    {
      seat: 3,
      name: "Cy",
      blade: "rainbow",
      moves: [
        rest(1.2, -5.5, 3.6),
        slash(2.25, "giant", 30, 2.6, 0.1),
        slash(3.5, "giant", 160, 2.6, 0.1),
        slash(4.45, "dragon", -45),
        slash(5.95, "plum", 120),
        slash(7.3, "coconut", -110),
      ],
    },
    {
      seat: 4,
      name: "Di",
      blade: "plasma",
      moves: [
        rest(0.9, 6, 3.6),
        slash(1.7, "pineapple", 250),
        slash(3.2, "giant", -70, 2.6, 0.1),
        rest(4.8, 3, 4),
        slash(6.8, "star", 120),
        rest(7.7, 5.5, 3.4),
      ],
    },
  ],
};
