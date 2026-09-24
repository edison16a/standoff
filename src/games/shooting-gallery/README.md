# Shooting Gallery

Status: ready. A fairground duck shoot for 1 to 4 players. Stand still, aim well, and top score wins.

## How to play

1. Open Shooting Gallery on the computer and scan the code with each phone.
2. On the phone, set up in three steps, one page each:
   * **Calibrate:** hold the phone flat like a remote and point its top edge at the targets the big screen shows. Middle first, then two corners (or skip the corners).
   * **Gun:** your own BB gun turns on a stand in 3D. Pick a finish: Walnut, Cherry, Midnight, Birch, Forest or Showman. Drag to turn it.
   * **Ready:** tap Ready.
3. The round starts once every connected phone is ready, or when someone presses Start on the computer. The computer also picks the round length: 20, 30 or 45 seconds.
4. After "3, 2, 1" point your phone at a duck or a target and tap the big Shoot button. The gun pumps between shots, so the button greys for a moment after each one. Recenter points your aim back at the middle if it drifts.
5. At the buzzer the results show the winner, everyone's score and accuracy, and where the scores landed in the best scores table. Tap Play again on every phone, or press Play again on the computer.

Phones without motion sensors aim by dragging around the Shoot button instead.

## What is worth what

| Target | Points |
| --- | --- |
| Duck | 10 |
| Bullseye | 15, or 40 in the red centre |
| Duckling (small) | 25 |
| Plate on the top rail (small and fast) | 30 |
| Golden duck (rare) | 50 |

Everything speeds up by about a third over the round, so the end is the busiest part.

## The booth

A three.js scene after the cover: a red and cream striped cloth wall, a scalloped canopy under a marquee of bulbs, a string of bulbs along the wall, three painted wave boards, and a wooden counter. Two lanes of rubber ducks ride behind the waves in opposite directions. Bullseyes on sticks pop up behind the back wave and slide about. Small plates race along a steel rail near the top. Once in a while a golden duck comes by.

Anything hit falls with a real animation: ducks flip back on their hinge and drop behind their wave, bullseyes tip over and sink, plates swing up and over on their trolley. Flecks fly, the points float up in the shooter's colour, and a miss leaves a pock mark on whatever it struck.

Each player has a pump BB gun along the bottom of the screen, front half in view like the cover, turning to follow their aim. A gun turns about a point on its barrel, so the barrels keep to their own lanes and never cross, and they stay low enough to leave the ducks in view. In the lobby the guns gather left of the panel. It has a laser in their colour and a glowing dot where a shot would land. Firing kicks it back with a puff from the muzzle, a short BB streak flies to the target, and the pump is worked for the next shot.

The canopy casts no shadow, so there is no dark band across the wall.

## Rules the host keeps

* The computer is the referee. Phones send their aim and trigger pulls through the aim kit. Every hit is a ray from the camera through the aim point, tested against the same shapes the models are built on, so the dot, the shot and the picture always agree. Wave boards and the counter block shots at whatever they hide.
* One shot can hit one target. Whoever's shot arrives first gets a target two players aim at.
* Late joiners set up and wait for the next round. A player who leaves mid round keeps their score in the results. If everyone in a round drops out for more than a few seconds, the booth goes back to the lobby.
* After a host reload the phones send their setup again by themselves. The platform holds those messages until the game is listening, so nobody has to start over.
* A player who leaves the lobby no longer holds up the others: if everyone left is ready, the round starts.
* The best 8 scores for each round length are kept in this computer's browser (localStorage) only. Nothing is sent to a server. Only players who typed a name go on the board, since "Player 2" means someone else next week. The results say so.

## Sound

All synthesised with Web Audio through the room's buses: a BB pop, the pump's clicks, a bell on targets, a squeaky rubber quack on ducks, a sparkle for the golden duck, a clack or clang when things land, ticks for the countdown and the last seconds, a buzzer at the end, a fanfare, and two steam organ tunes (a waltz in the lobby and a polka during the round). The tool bar has a music switch.

## Code

* `engine/` the round, with no screen or network: layout, spawning, motion, ray hits, scoring and the best scores table. Unit tested.
* `protocol/` zod schemas for the messages between host and phones.
* `host/` the session that referees rooms, and its React screens.
* `phone/` the phone session and its setup, play and result screens.
* `render/` the three.js renderer, with `models/` for the gun, ducks, targets, booth, canopy, bulbs and waves, and `effects/` for the BB, puffs, flecks, dents, points and confetti. A governor lowers the drawing resolution while frames run slow, to hold 60 frames a second.
* `audio/` effects, tunes and the sequencer.
