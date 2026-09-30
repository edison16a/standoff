# Blade Clash

Status: ready. A sword duel for two players, or one against the computer, in an open air arena with a full house all round. Each phone is a sword handle. Point it and the sword on the big screen points there too. The screen is split down the middle, and each player looks over their own fighter's shoulder at the other, like Boxing.

## How to play

1. Open Blade Clash on the computer. Each player scans the code with their phone and types a name, or skips.
2. On the phone, one page per step:
   * **Calibrate.** A picture shows the grip: the phone held like the handle of a sword, top edge toward the big screen. Then a target appears on the phone and in the player's own half of the big screen: the middle, then each corner. Point at it and hold still. A ring fills and the reading is taken by itself, with a buzz and a chime. Nothing to tap. **Skip corners** keeps the usual spans. Last, the player shows a relaxed guard the same way. Then the sword appears and copies the phone, on the phone and on the big screen, so it is plain it worked. **Redo** starts the targets again.
   * **Fighter.** Pick one of four. A fighter the other player has is marked taken.
   * **Ready.** Tap Ready, or **Play the computer** to fight alone.
3. Fight. Every slash that lands scores a point. The first to five points wins, and the countdown says so. Then the winner's ceremony, then **Rematch** or **Menu** on the phone.
   * **The hit moment.** When a slash lands, play stops. The game drops into slow motion, both cameras close in, and the screen shows who slashed whom, name to name, with the score. Then both fighters go back to their start marks and the fight picks up again.
   * **Swing** by moving the phone. The sword follows it in 3D: point up for a high guard, down for a low one, turn the phone to angle the edge.
   * **Thrust** by pointing from your guard straight at the opponent. Pointing at the middle of your view stretches the arm out, and the guard pulls it back in.
   * **Block** by holding your blade where the other one is going. Blades that meet clash.
   * **Move** by holding **Forward** or **Back** on the phone. The fighters stand on a straight line.

Phones without motion sensors get a drag pad: drag a finger to point the sword, lift it to rest in guard.

## The computer

While the computer holds a seat, the lobby on the big screen shows **Computer difficulty**: Easy, Medium, Hard or Training. Easy is the default. Harder levels attack more often, swing crisper and block more of your cuts, sooner. **Training** keeps the computer on its mark in guard, standing still, so you can practise your cuts on it. The level is read live and stays for the rematch.

## The fighters

* **Knight:** full plate under a surcoat in the player's colour with a gold cross, layered pauldrons and a visored helm with a plume. A two handed longsword with a cross guard and a wheel pommel, the longest reach.
* **Samurai:** black lacquered armour laced in the player's colour, broad shoulder plates, a skirt of plates over wide trousers, a crested helmet and a red face mask. A two handed katana with a curved blade, a temper line and a wrapped handle.
* **Block Hero:** an original warrior built entirely from cubes: a tunic in the player's colour with a gold shield, a steel helmet open at a pixel art face with war paint, and a stack of plume cubes. A pixel sword drawn as sprite art in cubes, the widest blade.
* **Star Knight:** an original duellist in a white shell of armour over a dark suit, a long split coat and a smooth helmet with a glowing visor band. Lines of light in the player's colour run over the armour, the same colour as the energy blade, which glows, hums and lights up the fighters around it.

Each blade has its own length and width, which is all that changes play. Each also has its own trail, clash, hit and swing sounds.

## Look and feel

* **The arena.** A round open air arena: a stone dais on raked sand with a line of gold down the middle where the fighters walk, a full house on stone tiers all round, a great gate at each end of the line with the player's banner and flags, braziers at the dais's corners and torches and banners round the wall. By day a summer sky and the sun's shadows; by night stars, firelight and a hard spotlight over the dais, following the platform's light and dark theme.
* **Animation.** One skeleton for all four. The sword hand is placed exactly on the engine's grip and the arm reaches it by inverse kinematics; the body leans and turns into a reach, sinks for a low guard and the two handed swords take the free hand onto the grip whenever it can reach. The feet step on their own and stay planted on the floor between steps. A hit snaps the head, the body or the knees back depending on where it landed, a clash rocks both fighters, the loser of the fight stumbles, falls flat and drops the sword, and the winner raises theirs overhead. For the ceremony the loser is up on one knee, the sword laid on the floor in front, head bowed and shoulders heaving.
* **Effects.** A glowing trail per blade, a shower of sparks in the blades' colours on every clash, a flash and ring where a hit lands, the body lighting up in the hitter's colour, and bloom on everything that glows. Every point slows the game down, closes both cameras in and washes the screen in the scorer's colour, under letterbox bars and the names of who slashed whom. The winning slash does the same in gold, then bursts.
* **The screen.** Each half has its player's card along the top: their fighter's emblem, name and five slanted point blades that light up one at a time as they score. The split map between them shows who plays where.

## The ceremony

The winning slash plays out in slow motion and bursts. Then the split screen gives way to one shot across the whole screen, using the shared victory kit.

* **The champion** stands in the middle of the dais with the sword held high, pumping the air. The camera opens wide and high, eases in and swings slowly either way round them.
* **The loser** kneels on their own side of the line behind the champion, facing them, the sword laid on the floor.
* **The light.** Four spotlights fade up over the dais and drift, with soft beams through the haze. They show best by night.
* **Confetti** in the champion's colour and gold fires from a ring of cannons, then keeps falling for as long as the ceremony lasts.
* **The names.** The champion's name drops in big across the top, letter by letter in gold, with their fighter and the score under it. The players' bars and the split map step aside.
* **The result.** Once the name has landed, a panel comes up in the bottom right: both fighters with their points, the rematch votes from the phones and **Menu**. Both phones voting for a rematch starts it at once.

## Swords in the world

Hits come only from the swords themselves. There are no jab or parry gestures.

* **The hold.** The phone sends how the sword is held: turned left or right, raised or lowered, the edge's turn, and how far the arm reaches. The computer puts the hand and blade in the world from that, with the hand moving the way an arm does: up toward the head for a high guard, down to the hip for a low one, across the body for a blade swung across, out toward the opponent for a thrust.
* **Hits.** A blade that passes through the other fighter's head, body or legs lands a hit, but only if the part that touched was moving fast enough. Resting a sword on someone does nothing. The swing is tested all along its path, cut into steps no longer than a blade is thick, so a swing too fast to see in any one frame still hits what it passed through. Only the first slash of an exchange counts: the moment it lands, play stops for the point.
* **Clashes.** At every step blade on blade is tested before blade on body, so a blade held in the way stops a swing before it reaches the body. Blades that meet fast enough clash: sparks, a clang, and both swords are thrown back. The faster blade rebounds the way it came and a still blade is shoved along. For a moment the sword ignores the phone, then eases back into wherever the phone is by then, so it never jumps. A thrown sword cannot hit or clash until it is back in the hand.
* **The finish.** The winning point plays in slow motion like every other. The loser goes down, and then the ceremony begins.

## Calibration

The phone reads its orientation (`deviceorientation`). At the middle target it learns the grip: whichever of the phone's top edge or back is nearer level runs along the blade, so the phone can be held flat or upright. Each corner then tells it how far this player turns to reach that edge of their view, left, right, up and down separately, because people rarely sit square to the screen. The two corners on each side are averaged, a corner pointed the wrong way is ignored, and an edge with no good corner borrows the opposite one. The guard is where the arm is most bent.

The view's edges map to wide blade angles and keep going past them, so the sword can reach every part of the screen and further, straight up for a high guard or far out to the side.

## Sound

Everything is synthesised through the room's audio buses.

* **Music.** In the lobby, "Still Water", G major at 72 a minute: strings and a low drone hold each chord into the next, a bamboo flute carries the tune, and a koto and a soft frame drum keep an easy pulse. Its B half climbs higher over a quiet choir. In the fight, "Steel and Thunder", B minor at 132: taiko drums and driving strings under a horn hook with a koto plucking along, lifting into brass and choir for the second eight bars. Both run sixteen bars before they repeat. Each track has its own level, so both sit near an RMS of 0.05 with peaks under 0.4, under a 4.2 kHz low pass. The music ducks for the winning slash and the big moments. The winner gets a brass fanfare.
* **Blades.** Every fast swing whooshes in its weapon's voice: heavy for the longsword, a thin whistle for the katana, a chip tune sweep for the pixel sword and a rising drone for the energy blade. Clashes ring louder the harder they are; steel rings, light crackles and pixels chime. The energy blade hums the whole time it is out, brighter and higher as it swings.
* **Armour.** Each fighter's armour clanks, rattles or knocks on every step and answers every hit in its own way.
* **The crowd.** The crowd murmurs, gasps at big clashes and cheers the finish. There is no announcer or spoken voice.

## Tuning

Every value worth adjusting by feel is in the tuning drawer (the sliders icon at the top right). Nothing is saved.

| Setting | Default | What it changes |
| --- | --- | --- |
| Hit speed | 3 m/s | How fast the touching part of a blade must move to count as a hit |
| Clash speed | 1.6 m/s | How fast two blades must meet to clash |
| Clash knockback | 38° | How far a clash throws both blades |
| Knockback time | 150 ms | How long the thrown blade flies |
| Return time | 380 ms | How long it takes to ease back into the hand |
| Music, crowd, effects | 0.5, 0.6, 0.9 | Mix levels |
| Cheer cooldown | 8 s | Minimum gap between cheers |

## Code

* `engine/`: the duel as pure logic. `sword.ts` puts the hold in the world, `sweep.ts` runs the swept blade tests, `sword-driver.ts` follows the phone and throws the sword after a clash, `combat.ts` settles each tick, `match.ts` keeps the score and phases, including the pause for each point, `bot.ts` is the computer opponent and `bot-tactics.ts` maps the difficulty levels onto it. Unit tested.
* `motion/`: the phone's sensor maths with no browser in sight: the grip, the calibration from the targets, and the mapping from where the phone points to the hold.
* `render/`: three.js. `duel-renderer.ts` draws the arena twice through scissored viewports, one shoulder camera per player, each through its own bloom (`post.ts`). `arena/` is the arena. `fighter/` has the skeleton and inverse kinematics (`rig/`), the animation (`anim/`), the characters' costumes (`characters/`) and weapons (`blades/`). `effects/` has the trails, sparks and flashes. `victory/` is the ceremony: `staging.ts` says where both fighters stand and where the camera opens, and `ceremony.ts` runs the victory kit's spotlights, confetti and circling camera on the dais.
* `host/`, `phone/`, `protocol/`, `audio/`: the session on the computer, the phone's setup pages and controller, the messages between them, and the synthesised sound.
* `showcase/`: the game playing itself for the home screen media, a scripted duel through the real engine, so the clashes, slow motion and bursts are the game's own. The clip is a nine second wordless trailer (`edit.ts` picks the takes, `cinema.ts` the cameras): a low dolly as both step in, tight on the blades for two clashes, the Knight's own view as the first cut lands, a low angle as the winning overhead comes, a slow arc round its burst, and a low push in on the champion on the dais. The icon is a low shot of the first clash under the title, the poster the same clash a beat later, wide. `?ceremony` on the showcase page stays on the Knight's ceremony after the duel, names and result included, for looking it over. `?at=` starts the trailer that many milliseconds in.

`?fq=low` on the host's address draws the arena cheaply, for browser tests on software rendering. `?bdebug` puts the session on `window.__bladeClash`.
