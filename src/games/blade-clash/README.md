# Blade Clash

Status: ready, with simple stand in art while the full art is made. A sword duel for two players, or one against the computer. Each phone is a sword handle. Point it and the sword on the big screen points there too. The screen is split down the middle, and each player looks over their own fighter's shoulder at the other, like Boxing.

## How to play

1. Open Blade Clash on the computer. Each player scans the code with their phone and types a name, or skips.
2. On the phone, one page per step:
   * **Calibrate.** A picture shows the grip: the phone held like the handle of a sword, top edge toward the big screen. Then a target appears on the phone and in the player's own half of the big screen: the middle, then each corner. Point at it and hold still. A ring fills and the reading is taken by itself, with a buzz and a chime. Nothing to tap. **Skip corners** keeps the usual spans. Last, the player shows a relaxed guard the same way. Then the sword appears and copies the phone, on the phone and on the big screen, so it is plain it worked. **Redo** starts the targets again.
   * **Fighter.** Pick one of four. A fighter the other player has is marked taken.
   * **Ready.** Tap Ready, or **Play the computer** to fight alone.
3. Fight. Each fighter can take five hits. The fight goes on until someone has none left, then the winner screen, then **Rematch** or **Menu** on the phone.
   * **Swing** by moving the phone. The sword follows it in 3D: point up for a high guard, down for a low one, turn the phone to angle the edge.
   * **Thrust** by pointing from your guard straight at the opponent. Pointing at the middle of your view stretches the arm out, and the guard pulls it back in.
   * **Block** by holding your blade where the other one is going. Blades that meet clash.
   * **Move** by holding **Forward** or **Back** on the phone. The fighters stand on a straight line.

Phones without motion sensors get a drag pad: drag a finger to point the sword, lift it to rest in guard.

## The fighters

* **Knight:** plate armour and a longsword, the longest reach.
* **Samurai:** lacquered armour and a katana.
* **Block Hero:** a warrior built from cubes, with a chunky pixel sword, the widest blade. An original design.
* **Star Knight:** a robed duellist with a glowing blade in the player's colour. An original design.

Each blade has its own length and width, which is all that changes play.

## Swords in the world

Hits come only from the swords themselves. There are no jab or parry gestures.

* **The hold.** The phone sends how the sword is held: turned left or right, raised or lowered, the edge's turn, and how far the arm reaches. The computer puts the hand and blade in the world from that, with the hand moving the way an arm does: up toward the head for a high guard, down to the hip for a low one, across the body for a blade swung across, out toward the opponent for a thrust.
* **Hits.** A blade that passes through the other fighter's head, body or legs lands a hit, but only if the part that touched was moving fast enough. Resting a sword on someone does nothing. The swing is tested all along its path, cut into steps no longer than a blade is thick, so a swing too fast to see in any one frame still hits what it passed through. After a hit that blade waits a moment before it can land another, and the fighter who took it cannot be hit again while they flinch.
* **Clashes.** At every step blade on blade is tested before blade on body, so a blade held in the way stops a swing before it reaches the body. Blades that meet fast enough clash: sparks, a clang, and both swords are thrown back. The faster blade rebounds the way it came and a still blade is shoved along. For a moment the sword ignores the phone, then eases back into wherever the phone is by then, so it never jumps. A thrown sword cannot hit or clash until it is back in the hand.
* **The finish.** The last hit plays in slow motion. The loser goes down and the winner cheers under confetti.

## Calibration

The phone reads its orientation (`deviceorientation`). At the middle target it learns the grip: whichever of the phone's top edge or back is nearer level runs along the blade, so the phone can be held flat or upright. Each corner then tells it how far this player turns to reach that edge of their view, left, right, up and down separately, because people rarely sit square to the screen. The two corners on each side are averaged, a corner pointed the wrong way is ignored, and an edge with no good corner borrows the opposite one. The guard is where the arm is most bent.

The view's edges map to wide blade angles and keep going past them, so the sword can reach every part of the screen and further, straight up for a high guard or far out to the side.

## Sound

Everything is synthesised through the room's audio buses. The fight starts with a gong and the announcer's call, every fast swing whooshes, clashes ring louder the harder they are, hits thump and the crowd answers. The announcer calls the start, the big clashes and the winner through the computer's speech, at the player's effects volume.

## Tuning

Every value worth adjusting by feel is in the tuning drawer (the sliders icon at the top right). Nothing is saved.

| Setting | Default | What it changes |
| --- | --- | --- |
| Hit speed | 3 m/s | How fast the touching part of a blade must move to count as a hit |
| Hit cooldown | 450 ms | How long a blade waits after landing a hit |
| Clash speed | 1.6 m/s | How fast two blades must meet to clash |
| Clash knockback | 38° | How far a clash throws both blades |
| Knockback time | 150 ms | How long the thrown blade flies |
| Return time | 380 ms | How long it takes to ease back into the hand |
| Music, crowd, effects | 0.5, 0.6, 0.9 | Mix levels |
| Cheer cooldown | 8 s | Minimum gap between cheers |

## Code

* `engine/`: the duel as pure logic. `sword.ts` puts the hold in the world, `sweep.ts` runs the swept blade tests, `sword-driver.ts` follows the phone and throws the sword after a clash, `combat.ts` settles each tick, `match.ts` keeps health and phases, and `bot.ts` is the computer opponent. Unit tested.
* `motion/`: the phone's sensor maths with no browser in sight: the grip, the calibration from the targets, and the mapping from where the phone points to the hold.
* `render/`: three.js. `duel-renderer.ts` draws the hall twice through scissored viewports, one shoulder camera per player. `fighter/` has the stand in fighters, `hall/` the room, `effects/` the trails, sparks, flashes and confetti.
* `host/`, `phone/`, `protocol/`, `audio/`: the session on the computer, the phone's setup pages and controller, the messages between them, and the synthesised sound.

`?fq=low` on the host's address draws the hall cheaply, for browser tests on software rendering. `?bdebug` puts the session on `window.__bladeClash`.
