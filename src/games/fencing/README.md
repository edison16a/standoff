# Fencing

Status: ready. One on one fencing for two players, or one against the computer. Each phone is a sword: move it slowly and the blade follows, flick or shake it to jab, raise it up and to the right to parry. The bout plays out in 3D on the big screen.

## How to play

1. Open Fencing on the computer. Each player scans the code with their phone and types a name, or skips.
2. On the phone, one page per step:
   * **Calibrate.** A picture shows the grip: the phone flat in the hand like a sword's handle, screen up, top edge pointing at the middle of the big screen. On the next page, tilt until the bubble sits in the middle and hold still. The ring around the level fills and the guard is captured by itself, with a buzz and a chime. Nothing to tap. Then your fencer appears and copies the phone, so you can see it worked. **Redo** goes back to the level.
   * **Practice.** Jab twice, then parry twice. Each one the phone reads makes your fencer lunge or parry, buzzes and plays its sound. For a jab a gauge shows how hard you moved, and for a parry how near the parry point the blade is. From your own jabs the phone sets how hard a jab has to be for you, so a gentle mover's jabs land and a wild one's twitches do not. **Redo** runs it again, **Skip practice** keeps the last level this phone learned (or the default).
   * **Fencer.** Pick one of four, each turning on a little stage in 3D. A fencer the other player has is marked taken.
   * **Ready.** Tap Ready, or **Play the computer** to fence alone.
3. Fence. First to two touches wins. A rematch needs no new scan.
   * **Aim** by moving the phone slowly. The blade follows it and nothing else happens. A jab only lands if your blade points at your opponent.
   * **Jab** with any quick flick or shake of the phone, in any direction. A whole shake is one jab.
   * **Parry** by raising the phone up and to the right of your guard. It counts the moment the blade passes the parry point. Bring it back down before the next parry.
   * **Move** by holding **Forward** or **Back** on the phone.
   * The phone flashes **Jab** or **Parry** the moment it reads one, then the referee's verdict: **Touch**, **Parried**, **Blocked**, **Hit**, **Too far**, **Off line** or **Too soon**.

Phones without motion sensors fence with on screen **Jab** and **Parry** buttons, and can try them on the practice page.

## The fencers

* **Vale:** a modern épée fencer in bright whites, a navy mesh mask with its white bib, a yellow glove with a long cuff, blue socks and pink shoes. Épée with a bell guard and a pistol grip.
* **Duchess:** a musketeer in a purple doublet with puffed and slashed gold sleeves, a lace collar, a baldric, a short cape, a domino mask and a plumed cavalier hat. Rapier with a swept hilt.
* **Marrow:** a sea captain in a long navy coat with brass buttons and a cream waistcoat, a red bandana, a beard and a gold earring, striped trousers and tall boots. Curved saber with a brass knuckle guard.
* **Iron:** a knight in plate: a breastplate under an emerald tabard, layered pauldrons, elbow and knee cops, gauntlets and a houndskull helm with a crest. Arming sword with a wheel pommel.

Player one's colour is red and player two's is green, like the scoring lamps. Each fencer wears it: Vale on the sleeves and bib, Duchess on the baldric, hat band and cape lining, Marrow on his sash, cuffs and coat lining, Iron on his crest, belt and tabard.

## The hall

A sports hall set up for a final: the strip on a raised podium with the regulation markings and light strips along its sides, red on player one's half and green on player two's. Behind it stand the referee and the scoring machine, with a repeater lamp at each end of the strip, then a ribbon board and tiered stands full of fans, some in the players' colours. Bunting hangs across the hall, banners on the walls, and spotlights over the strip.

The light theme is a sunny afternoon competition. The dark theme is the evening final: the stands in shadow, the beams of the spotlights showing, the boards and lamps glowing.

A touch lights the scorer's lamps and their half of the podium, the referee turns and raises an arm to them, and the crowd jumps, the scorer's fans highest.

## The camera

A broadcast camera, side on and a little high, follows the midpoint between the fencers and pulls back as they part. When a touch lands the game drops to a fifth of its speed for a second and the camera cuts in close on the point of contact, from the scorer's side, so the lunge that made it is in the picture. The scorer holds the lunge out until the burst is over. It swings slowly round it. The burst goes off when the slow motion ends, then the camera eases back. At the end it circles the winner under confetti.

A lunge fits the distance to the opponent. From far off it is a full lunge with the arm locked straight. Close in it is shorter, the arm stays bent and the point angles down, so the tip lands on the jacket instead of passing through it.

## Jabs and parries

The phone reads the sword from its orientation (`deviceorientation`), measured against the guard captured at calibration. So up and right are always the player's own, however they hold the phone. It reads how hard the phone moves from motion (`devicemotion`). The gesture classifier in `motion/gesture.ts` sorts the two into three kinds of move:

* **Slow moves.** The blade follows the phone and nothing fires. This is how you aim.
* **Jab.** Any quick move: the phone's acceleration passes the jab force, or its turn passes the jab turn rate, whichever way it goes. Only sizes are used, so a gyroscope that signs its rates the other way round reads the same. Phones with no gyroscope use the turn of the orientation instead.
* **Parry.** The blade passing a point up and to the right of the guard: raised at least 30 degrees and swung at least 20 degrees right. Raising straight up, or not far enough, or up and to the left, is no parry. A steady raise is far too slow to be a jab, so it just moves the blade until it gets there.

Some rules keep one move one action:

* **One move, one jab.** Once a quick move starts, it has to calm down for 150 ms before another can start, so a long shake is a single jab. Nothing fires for the refractory period after any action either.
* **Fast parries.** A quick move waits 70 ms before it counts as a jab. If it is still heading up and right, it waits a little longer, up to 300 ms, and if the blade reaches the parry point it is a parry and not a jab.
* **Coming back down.** After a parry the blade has to drop back under six tenths of the way to the point before the next parry. Bringing it back down is quick too, so a quick move that starts while the blade is still up there is not a jab.
* **Taps.** Taps on the Forward and Back buttons hush the classifier for 150 ms, because a thumb jolts the phone.
* **Your own level.** The practice listens at half the usual jab level, measures each jab, and sets this player's level to a little over half their typical jab. It stays between 0.6 and 1.25 of the base, except that it is never set above what the weakest practice jab reached, so a gentle player who got through the practice is read in the bout too. It is kept on the phone for next time.

The phone shows and buzzes every action it reads at once. Whether it counts is the host's call.

## The referee

The host steps the match at a fixed 60 Hz and decides every exchange:

* A jab takes 220 ms to arrive, about as long as a real lunge, and is checked at arrival: in reach, on line, and not parried. It is judged by where the blade pointed 180 ms before it was read, because by then the flick has thrown the blade off where the player was aiming.
* A parry blocks the first jab that reaches it within 600 ms (the tuning drawer's parry window), then closes. A parry that reaches the host up to 80 ms after a jab landed still saves it, since phones are never quite in step over WiFi.
* A parried attacker is knocked off balance for 450 ms, and cannot strike, which is the defender's chance to riposte.
* Attacking drops your own parry. A parry cannot start while your own lunge is still going out, and a parry that blocked nothing leaves you open for 250 ms before the next, so raising the phone over and over is no defence.
* Two touches within 60 ms cancel out, like a double in épée. Bodies that collide are a corps à corps, and are put back apart.

## Sound

Everything is synthesised through the room's audio buses.

Music: "Salle d'Armes" plays in the lobby and on the results, La Folia in D minor at 78 on harpsichord over strings, pizzicato bass and brushes. "Riposte" plays under the match, an E minor Andalusian ground at 96 with a harpsichord ostinato, a pizzicato hook, castanets and a soft trip hop beat. Both run eight bars with an A and a B section, through a warm low pass. The music drops away for the slow motion after a touch and for the winner's trumpet fanfare.

Effects have a sharp transient, a body and a tail into a synthetic hall reverb, each pitched a little differently every time: the swish of a jab, the scrape of a parry, the ring of a blade on blade, the hit, the fencing box buzzer and the touch chime. The crowd murmurs, applauds each touch, gasps at a last moment parry and cheers the big moments. The referee calls "En garde", "Prêts", "Allez", "Touché" and the rest through the computer's speech, in French where the computer has a French voice, at the player's effects volume.

## Tuning

Every value worth adjusting by feel is in the tuning drawer (the sliders icon at the top right). Changes reach both phones at once. Nothing is saved. The jab force and turn are the base each player's own practiced level is measured against.

| Setting | Default | What it changes |
| --- | --- | --- |
| Jab force | 12 m/s² | How hard a quick move has to push the phone to jab, before each player's own level |
| Jab turn | 300 °/s | How fast a quick move has to turn the phone to jab, likewise |
| Parry rise | 30° | How far above the guard the blade has to rise to parry |
| Parry right | 20° | How far right of the guard it has to swing as well |
| Parry window | 600 ms | How long a parry stays open |
| Refractory period | 350 ms | Quiet time after any jab or parry |
| Music, crowd, effects | 0.5, 0.6, 0.9 | Mix levels |
| Cheer cooldown | 8 s | Minimum gap between cheers |

## Code

* `engine/`: the match as pure logic: fencers, the referee, the match clock, the computer opponent. Unit tested.
* `motion/`: the phone's sensor maths with no browser in sight: the sword pose, the gesture classifier and its parry point, and synthetic motion traces for the tests.
* `rig/`: the pose of a fencer as a handful of numbers, the guard with its footwork, and the animator that blends lunges, parries, hits and the end of the match over the live sword.
* `render/`: three.js. `fencer/` is the shared skeleton (joints solved by inverse kinematics from the pose), the anatomy, the four costumes and the weapons, all merged per bone. `hall/` is the room, the podium and strip, the scoring machine, the referee, the stands and crowd, the bunting and the lights. `effects/` has the blade trails, sparks, bursts and confetti. `preview/` draws the phone's 3D fencers, all through one WebGL context. Bloom and a vignette finish the picture.
* `showcase/`: the scripted bout the home screen's media is captured from, judged by the real referee, and a development gallery (`/showcase/fencing?view=poster&fgallery=vale,iron&fact=parry&fcam=close1`). The icon and poster freeze the clash and drop the trails and rings, which smear in a still. The clip draws once per video frame at a lighter setting, so capturing it in software stays practical. After the burst the bout runs on at a quarter speed to the end of the loop, with the camera staying on the touch. It counts its time from the moment the page says it is ready, runs the hall on its own clock, and with `?fseek=` starts part way in, so a slow machine can record it in pieces side by side and get the same frames.
* `host/`, `phone/`, `protocol/`, `audio/`: the session on the computer, the phone's controller and setup pages, the messages between them, and the synthesized sound.

`?fq=low` on the host's address draws the hall cheaply, for browser tests on software rendering.
