# Fencing

Status: ready. One on one fencing for two players, or one against the computer. Each phone is a sword: tilt it and the blade follows, chop down to jab, lift up to parry. The bout plays out in 3D on the big screen.

## How to play

1. Open Fencing on the computer. Each player scans the code with their phone and types a name, or skips.
2. On the phone, one page per step:
   * **Calibrate.** A picture shows the grip: the phone flat in the hand like a sword's handle, screen up, top edge pointing at the middle of the big screen. On the next page, tilt until the bubble sits in the middle and hold still. The ring around the level fills and the guard is captured by itself, with a buzz and a chime. Nothing to tap. Then your fencer appears and copies the phone, so you can see it worked. **Redo** goes back to the level.
   * **Practice.** Jab twice, then parry twice. Each one the phone reads makes your fencer lunge or parry, buzzes and plays its sound, and a gauge shows how hard you moved. From your own strikes the phone sets how hard a jab and a parry have to be for you, so a gentle mover's jabs land and a wild one's twitches do not. **Redo** runs it again, **Skip practice** keeps the last levels this phone learned (or the defaults).
   * **Fencer.** Pick one of four, each turning on a little stage in 3D. A fencer the other player has is marked taken.
   * **Ready.** Tap Ready, or **Play the computer** to fence alone.
3. Fence. First to two touches wins. A rematch needs no new scan.
   * **Aim** by tilting the phone. A jab only lands if your blade points at your opponent.
   * **Jab** with a short, sharp chop down, or a chop angled toward the screen.
   * **Parry** with a short, sharp lift up.
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

A broadcast camera, side on and a little high, follows the midpoint between the fencers and pulls back as they part. When a touch lands the game drops to a fifth of its speed for a second and the camera cuts in close on the point of contact, swinging slowly round it. The burst goes off when the slow motion ends, then the camera eases back. At the end it circles the winner under confetti.

## Jabs and parries

The phone reads the sword from its orientation (`deviceorientation`), measured against the guard captured at calibration. It reads strikes from motion (`devicemotion`), turned into the earth's frame:

* **What counts.** Each reading becomes two scores, one per strike, measured in thresholds. A jab's score is acceleration along a line tipped 25 degrees forward from straight down, so a chop angled toward the screen counts in full. A parry's is acceleration straight up. With a gyroscope, the blade's own turn adds to the score of the strike it turns toward and takes from the other.
* **Checking the gyroscope.** Browsers do not all agree which way a rotation rate is signed, and a gyroscope read backwards would push every chop toward a parry. So it is only used once it agrees with the orientation reading: while the player waves the phone about during setup, the two are compared, and the gyroscope is trusted, flipped, or left out.
* **Firing.** A strike fires when its score climbs from quiet to its level within 200 ms, which keeps slow aiming out, and when the motion behind it moved the phone (some speed gained, or some turn), which keeps a sharp tap on the screen out. Taps on the Forward and Back buttons also hush the detector for 150 ms, because a thumb jolts the phone.
* **Rebounds.** Every chop ends with the arm braking, which looks like a lift, and every lift ends like a chop. After a strike, the same strike waits out the refractory period and the other one waits a little longer. A strike also cannot start straight out of the other one: a chop too soft to be a jab still brakes like one, and that brake must not become a parry.
* **Your own levels.** The practice listens at half the usual level, measures each strike, and sets this player's jab and parry levels to a little over half their typical strike. They are kept on the phone for next time.

The phone shows and buzzes every strike it reads at once. Whether it counts is the host's call.

## The referee

The host steps the match at a fixed 60 Hz and decides every exchange:

* A jab takes 220 ms to arrive, about as long as a real lunge, and is checked at arrival: in reach, on line, and not parried. It is judged by where the blade pointed just before the chop, because by the time a chop is recognised it has tipped the phone down.
* A parry blocks the first jab that reaches it within 600 ms (the tuning drawer's parry window), then closes. A parry that reaches the host up to 80 ms after a jab landed still saves it, since phones are never quite in step over WiFi.
* A parried attacker is knocked off balance for 450 ms, and cannot strike, which is the defender's chance to riposte.
* Attacking drops your own parry. A parry cannot start while your own lunge is still going out, and a parry that blocked nothing leaves you open for 250 ms before the next, so lifting the phone over and over is no defence.
* Two touches within 60 ms cancel out, like a double in épée. Bodies that collide are a corps à corps, and are put back apart.

## Tuning

Every value worth adjusting by feel is in the tuning drawer (the sliders icon at the top right). Changes reach both phones at once. Nothing is saved. The jab and parry thresholds are the base each player's own practiced level is measured against.

| Setting | Default | What it changes |
| --- | --- | --- |
| Jab threshold | 12 m/s² | How sharp a chop down has to be, before each player's own level |
| Parry threshold | 12 m/s² | How sharp a lift up has to be, likewise |
| Parry window | 600 ms | How long a parry stays open |
| Refractory period | 350 ms | Quiet time after any strike |
| Music, crowd, effects | 0.5, 0.6, 0.9 | Mix levels |
| Cheer cooldown | 8 s | Minimum gap between cheers |

## Code

* `engine/`: the match as pure logic: fencers, the referee, the match clock, the computer opponent. Unit tested.
* `motion/`: the phone's sensor maths with no browser in sight: the sword pose, the strike detector, the gyroscope check, and synthetic sensor traces for the tests.
* `rig/`: the pose of a fencer as a handful of numbers, the guard with its footwork, and the animator that blends lunges, parries, hits and the end of the match over the live sword.
* `render/`: three.js. `fencer/` is the shared skeleton (joints solved by inverse kinematics from the pose), the anatomy, the four costumes and the weapons, all merged per bone. `hall/` is the room, the podium and strip, the scoring machine, the referee, the stands and crowd, the bunting and the lights. `effects/` has the blade trails, sparks, bursts and confetti. `preview/` draws the phone's 3D fencers, all through one WebGL context. Bloom and a vignette finish the picture.
* `showcase/`: the scripted bout the home screen's media is captured from, judged by the real referee, and a development gallery (`/showcase/fencing?view=poster&fgallery=vale,iron&fact=parry&fcam=close1`).
* `host/`, `phone/`, `protocol/`, `audio/`: the session on the computer, the phone's controller and setup pages, the messages between them, and the synthesized sound.

`?fq=low` on the host's address draws the hall cheaply, for browser tests on software rendering.
