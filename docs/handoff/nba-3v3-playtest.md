# Basketball 3v3: playtest handoff

The owner's notes are in `docs/handoff/next-week/owner-requests.md` (last section). The goal is NBA 2K feel: hand made presets that the game logic picks, never raw physics collisions or ragdoll flops. Earlier preset work is in `nba-3v3-anim.md`.

## Step 1: finishes and controls

Done:

* **The layup that cut off.** Root cause: the shot clock. It runs while the ball is held, and a layup's gather holds the ball for about half a second. A person driving late in the 12 second clock ran it out mid gather: the violation knocked the ball loose and the body went on up into an empty layup. Bots never hit it because they shoot with two seconds left, which is why bot games looked clean. Reproduced with bot games (no cut in 269 drives), a human probe (1500 scripted drives with the clock left alone, all clean) and a drive started with 0.25 s on the clock (the ball popped out at once). Fix: `engine/shot-motion.ts`. A jumper rising, a floater, a gathered layup or dunk, or a press at the rim being read holds the clock until the ball leaves the hands (`rules.ts`). Regression test: `engine/shot-clock-motion.test.ts`.
* **Tap, hold and double tap at the rim** (`engine/finish/pick-up.ts`, wired in `finish/rim-press.ts`). Only for people, and only where Shoot would be a finish anyway (`finish/zone.ts`: driving at the rim inside 3.3 m, within 1.7 m, under the glass, or on a floater run). There the press does not throw at once; the player runs on until it reads as:
  * a hold (still down after 0.17 s): a layup,
  * a double tap (let go inside 0.17 s and pressed again inside 0.3 s of the first press): a dunk attempt,
  * one quick tap and nothing more: a layup, once the 0.3 s window shuts.
  A hold past 0.17 s is already a layup, so a late second press never turns it into a dunk. From the floater band past 3.3 m the layup is the floater. Away from the rim Shoot is the jumper exactly as before. The computer, films and labs call their finish at once (`Match.finishTaps`, turned on by `host/match-driver.ts`). Tests: `finish/pick-up.test.ts`.
* **The phone and the keys.** `CourtState.rim` tells the phone when Shoot is a finish. There the meter stays off and the status shows "Hold layup, Tap tap dunk" (`phone/components/Controller.tsx`, `styles/pad-status.css`). The keyboard card has an "At the rim" group and its meter follows the same flag (`keyboard/`). A clanged or short dunk flashes "Off the iron" or "Too far out" on the dunker's phone.
* **The stick picks the layup** (`finish/steer-layup.ts`), read against the line to the rim as Shoot is held:
  * at the rim, within 20 degrees: straight on (finger roll, off the glass from the wing, a power layup when slow),
  * 20 to 60 degrees off: a euro step that way,
  * 60 to 115 degrees, across the line: a step through under the rim to that side,
  * past 115 degrees, pulled back: a hop step,
  * from the wing or the baseline, past the rim toward the far baseline: a reverse under the backboard on that side,
  * stick let go with a man in front: a juke (pump fake, he bites, jab step past him). With nobody there the game picks as it does for a bot.
  Tests: `finish/steer-layup.test.ts`.
* **Three new layup presets**, each with its own footwork (`finish/footwork.ts`), ball path (`finish/tracks.ts`), spec (`finish/layups.ts`), gather keys (`render/anim/finish/gather.ts`) and air shape (`render/anim/finish/layup-tops.ts`): `stepThrough` (a plant, one long stride across in front of the rim to the far side, `throughSpot` in `finish/spots.ts`), `hop` (a hop onto both feet with the ball at the chin, the hop height from `gatherLift`), `juke` (stop, pump fake, the shoulders sold the other way, a jab step out past him; a computer man close by bites as on the up and under). Bots use them now and then.
* **Dunk odds** (`finish/dunk-odds.ts`, read off the court in `finish/dunk-read.ts`). Rolled before the gather so the fail is its own preset. Inputs: distance (past 3.4 m he comes up short, certain by 4.6 m), speed (a standstill out from the rim clangs), heading (running across or away clangs), balance (just landed, a hard plant, a missed lunge), the dunk rating (spring, strength and reach headroom; Dunker 10, Big Man about 9, guards about 6.5) and the man nearest the rim (a bigger, longer man waiting stuffs it; one the dunker overpowers is posterized). A good dunk lands about 97 percent of the time. Tests: `finish/dunk-odds.test.ts`.
* **Fail presets** (`finish/dunk-fail.ts`, poses in `render/anim/finish/dunk-fails.ts`):
  * `stuff`: the stopper walks to the spot under the slam and jumps with a block plan timed so his hand meets the ball at the slam (`finish/stopper.ts`); the ball is swatted or spiked out, the dunker is thrown back, arms snapped over his head, and lands heavy.
  * `clang`: up there but off the iron (back iron or rattled out); the body jolts back off the rim.
  * `short`: took off well out and gets the ball only to the front of the ring from under it; he comes down still reaching.
  A failed dunk holds its preset 0.36 s on the floor after landing for the heavy landing and getting up (`FAIL_SETTLE` in `drive.ts`).
* **The computer reads the odds**: a bot whose dunk goes down less than 45 percent of the time lays it up instead (`BOT_DUNK_SENSE` in `drive.ts`). In 24 hard bot games about one dunk in eight fails.
* **Lab scenes**: `/showcase/nba-3v3?lab=layup-stepThrough|layup-hop|layup-juke|dunkfail-stuff|dunkfail-clang|dunkfail-short&step=1`. Tests in `showcase/lab-presets.test.ts` (each plays its preset; the stuff is a block by the stopper; no fail scores).
* The bot game stat tests (`sim/scoring.test.ts`, `game-stats.test.ts`) were passing by luck of the seeds: adding one extra random roll per dunk to main alone moved the jumper and layup rates past their bands. They now play more games or allow the swing that was measured, with comments.

* **Checked in the browser.** Lab scenes for the juke, the stuff and the short dunk, stepped frame by frame. A real game with the Keyboard player as the Dunker against bots: a double tap from too far out came up short ("Too far out"), a double tap close in went down ("Slam!"), a hold laid it in ("+2"). The phone panel showed the rim hint as he got close. Phone fit passes, with a new snapshot of the pad at the rim.

Known gaps from step 1:

* The stuff's block is the existing block hand (`render/block-reach.ts`) with a plan; the defender's whole body is not yet an authored preset. Step 2 replaces it.
* The press at the rim waits up to 0.3 s before the finish starts (the player runs on meanwhile). If that feels slow, `FINISH_TAPS.double` can come down to about 0.25.
* The rim flag on the phone comes from the last state sent, so on the edge of the zone the phone may run a meter for a press the host reads as a finish, or the other way. Both sides cope: the host uses its own hold time.
* Bots never steer a layup with the stick; their choice stays the selection rules.

## Step 2: pre animated blocks

Done:

* **Why blocks looked like a raw collision.** Every block touched the ball on the very frame it left the shooter's hand: the plan took the first moment in reach, and at release the ball is already there. The hand had no time to strike; the ball just popped off the shooter's fingers. Seen in a probe of the old lab scenes (plan, shot and block all on one step) and in the browser.
* **The touch now lands a beat later** (`engine/blocks/meet.ts`). Whether the hand gets there is still the first moment in reach, anywhere on the path, so the block rate is unchanged. The touch is then slid on while the ball stays in reach and clean (not over the ring, not off the iron or the glass) up to 0.1 s after the plan. The hook (`blocks/hook.ts`) plays it on the planned frame only. Regression test in `blocks/blocks.test.ts`.
* **Eight presets picked by the block math** (`engine/blocks/presets.ts`, tests in `presets.test.ts`): `rejection` (two hands at the rim), `swat` (one hand into the stands), `chase` (from behind), `help` (weak side), `pin` (glass), `tip` (fingertips on a jumper), `miss` (the contest that just misses) and `closeout` (a running leap at a three). Order: the leap the body is in (chase, closeout), then the place (glass, rim), then strength. At the rim a strong man stuffs it with both hands three times in five, anyone else about one in three. The fingertip is judged where the path runs deepest into the reach, not at the later contact. Labs fix a play with `m.forcedPreset` (which replaced `forcedHit`).
* **Ball exits** (`engine/blocks/exits.ts`, tests in `hit.test.ts`): `reject` drives it down into the lane and out toward the top of the key; `stands` sends it rising over the nearest sideline; `swat` slaps it on the way the arm travels (ahead of a chase down, across from the help side); `pin`; `tip`; `deflect` knocks a closeout back up over the shooter. After that only the physics moves it. The old `spike` is gone.
* **The closeout leap** (`blocks/style.ts`, `blocks/closeout.ts`): running out at a man shooting from past 5.4 m. As the feet leave the floor he keeps only 60 percent of his run and the run is turned to pass the shooter at 0.75 m, so he flies by his shoulder. Tests in `closeout.test.ts`.
* **Whole body, authored** (render):
  * `render/anim/blocks/leaps.ts`: the leap per jump style, from the plant step to the touchdown. On the run the plant leg sweeps back by the ground covered so the foot does not slide. Coming down the arms come in tucked, not across the shooter.
  * `render/anim/blocks/strikes.ts`: per preset a windup, contact and follow through for the torso, head, legs and both arms, keyed on the planned contact (`plan.at`), mirrored for the left hand (`plan.hand`). It eases in from the moment the plan was made (`plan.made`), so a plan decided at release does not snap the body.
  * `render/block-paths.ts` and `render/block-reach.ts`: the hand path per preset (windup, bend, contact) in the strike's own frame, warped onto the real ball in the last 0.05 s so the palm is on its near face at the touch; two palms either side of the ball for the rejection and the help. Over a shot still in the shooter's hands the contest hand hovers cocked above the ball; a late plan swings from there over the time left. After the touch the hand carries on the way the ball went; a miss comes back to him.
  * `render/anim/blocks/landings.ts`: a landing per preset (flex, eyes after the swat, stumble on, turn back to the rim), the thighs left to the run underneath.
* **Dunks.** The planned stuff from step 1 and a dunk blocked at the rim now play the rejection (or the chase or help from those leaps), with the `reject` exit.
* **Lab scenes** (`showcase/lab-blocks.ts`): `/showcase/nba-3v3?lab=block-rejection|block-swat|block-chase|block-help|block-pin|block-tip|block-miss|block-closeout&step=1`. The old `block-stand|run|layup|spike` names are gone. `lab-blocks.test.ts` checks each plays its preset.
* **Balance.** Over 300 hard bot games blocks are 9.1 percent of shots against 9.4 before, with the same points (5622 against 5626). Over 120 easy games points are the same within noise. The preset mix over 120 hard games: tip 74, chase 55, rejection 40, closeout 35, swat 5, help 3, pin 2.
* **Checked in the browser.** Contact sheets of all eight lab scenes and the stuffed dunk, and every frame of the swat through windup, strike and contact (no pop at the plan, the palm on the ball at the touch, the ball off into the seats). A real game with the Keyboard player as the Big Man on defence (Guard held, Block on the shot): jumps fired, two blocks in the game played the tip preset, no page errors.

Known gaps from step 2:

* A jumper is usually decided at release, so the strike has only about three frames; the hover over the rising shot is what sells it. A pre plan from the shooter's set point could give it a longer swing.
* The one hand swat into the stands is rare in bot games (5 in 120), because most bot blocks on jumpers graze (tip) and three point blocks are closeouts. Tune `pickPreset` if it should show more.
* Bots never pick a closeout leap on purpose; they get one when their run at a deep shooter happens to be fast enough.
* Sounds and the phone still do not tell the presets apart.

## Step 3: polish, odds and media

Done:

* **A dunk called under the ring read as too far out.** A double tap is read a beat after the first press while the player keeps running, so a dunk tapped at 1.6 m at a sprint is read about 0.6 m from the rim. The odds then used the approach's distance gate (`ap.canDunk`, false inside 0.7 m), played the short preset ("Too far out") nine times in ten, and the short plan even stepped him back out to 0.95 m to do it. Found with a scripted probe of people's dunks against hard bots (`finish/dunk-read.ts`, `plan.ts`). Now the body's reach decides whether he can dunk, so standing under the ring goes straight up, and a late call at a sprint under the ring is jammed off the back iron up to a third of the time (`deep` in `dunk-odds.ts`). A short dunk never steps back out. Tests: `finish/dunk-read.test.ts`, `dunk-odds.test.ts`.
* **The probe after the fix**, 14 drives each against hard bots: the Dunker tapping in stride from 2.4 to 3 m lands 25 of 27 (the other two lost the ball first); tapped late at 1.6 m, 4 down, 5 off the iron and 1 stuffed of 12; standing under the ring 11 of 14; tapped from 4.8 m (read at about 3.9 m) 4 of 14 short. Guards get stuffed by the Big Man or the Lockdown in the lane (the Shooter 9 of 14 standing under the rim in traffic).
* **Open layups by guards missed a third of the time.** The strength edge at the rim came from the closest defender wherever he was, so a Shooter alone at the rim lost about 0.18 off his layup to a Big Man four metres away. It now fades out between 1.2 and 2.6 m (`contest.ts`). Against standing bots the Shooter and Playmaker went from about 70 to 95 percent. Test in `contest.test.ts`.
* **A slam that misses no longer plays a made dunk.** A dunk judged to go down could still miss at the slam: a hand put it off line (the shot model's contest), a foul, or a block. The body went on into the made dunk's hang over a ball rimming out, the raw look the owner dislikes. Now `slam` says whether it went down and the drive takes the clang (or the stuff, after a block) from the slam on, lets go of the rim and holds the heavy landing (`failFromSlam` in `finish/dunk-fail.ts`). A knock off line also tells the phone Off the iron. Folding that miss into the odds before the gather was tried and dropped: the hands at the gather do not predict the hands at the slam (correlation 0.0 over 115 bot dunks). Test: `finish/slam-fail.test.ts`.
* **Pops found by a frame to frame probe of 30 bot games:**
  * A man posterized at the top of his block jump went into his stumble 0.36 m up and stood on air until his next jump. Bodies in an action that does not carry them through the air now fall under gravity (`body/settle.ts`, test `settle.test.ts`).
  * A dunker landing on the man under the rim was pushed out of him in one frame, both jumping up to 0.45 m. The push apart is now at most 8 cm a step (`MAX_PUSH` in `body/contact.ts`).
  * After both, the only jumps left are the free throw line up (a camera cut) and the engine ball changing hands, which the renderer eases.
* **Balance.** Over 250 hard bot games on fresh seeds, 1.23 points a trip against 1.26 at the end of step 2, inside the noise. Open layups 88 percent against 78. Bot dunks the same (65 percent).
* **Lab scenes for the two new paths**: `/showcase/nba-3v3?lab=slam-knocked` (a rim hang knocked off line at the slam: he lets go and comes down in the clang) and `?lab=slam-posterAir` (the Lockdown leaves his feet as the Dunker takes off and is posterized in the air: he falls back to the floor). Tests in `showcase/lab-presets.test.ts`.
* **Checked in the browser.** Frame sheets of both new lab scenes. Two real games with the Keyboard player as the Dunker and a Playwright phone as the Big Man on the other team (holding Guard, jumping now and then): drives with a double tap, a hold, a hold steering left, right and back, a tap, a late tap and a tap from far out. A double tap from the edge of the paint came up "Too far out", holds went up as layups, rebounds and steals came through, no page errors on the big screen. On this shared machine the software renderer runs a few frames a second, so the live game is only good for flow; the frame by frame checks are the lab scenes.
* **Controls.** The keys card says to tap for a dunk "a step or two out", and the README's At the rim section has the timing rules (when to tap, what fails and why) and the open layup rule.
* **Media filmed again** (`tools/media/capture.mjs nba-3v3 --seconds 12.13 --max-mb 3.9`). The block presets changed the trailer's stepback three (the Lockdown now flies past the Shooter's shoulder in a closeout leap, the All Rounder goes straight up) and the icon (the Lockdown's contest: one long arm over the ball, the other cocked). Both are committed. The poster frame came out the same, so the old one is kept. Both clips are 364 frames with none held (mpdecimate), the WebM 3.5 MB at crf 44 and the MP4 3.4 MB at crf 38. The README picture of the chase down block (`media/readme/chase-block.jpg`) is from before the presets; it still shows a chase down from behind, so it was left.
* **Phone fit** passes for every Basketball page.
* `match.test.ts` plays four more seeds: the rarer endings (off the glass and out) came up by luck of the seeds.

Known gaps from step 3:

* A stuff takes over the stopper's body for the walk in and the jump, even when a person plays him (`finish/stopper.ts`, from step 1). It reads as the preset, but a person on defence may feel his man taken for half a second.
* Fixed in review: the rim hint showed "Tap tap dunk" in the floater band too, where a double tap only comes up short. The court state now carries `dunk` (`dunkInReach` in `finish/zone.ts`: the body can dunk, and the distance after the usual read of a double tap is within a step of the dunk's reach), and the phone shows "Tap tap dunk" only then.
* The knock off line at the slam is still rolled at the slam (the shot model's contest), not before the gather. It now plays the clang preset from the slam, so it looks like a planned clang.
* Bots still never steer a layup with the stick, and `BOT_DUNK_SENSE` stays at 0.45: bot dunks land about two in three on Hard, much as before.

## Review of steps 1 to 3

Checked against the task point by point, in lab scenes stepped frame by frame (the step through, hop, juke, stuff, slam knocked off line, swat and closeout) and in a live game with the Keyboard player as the Dunker and a Playwright phone as the Big Man (a double tap went down "Slam!", holds went in, a double tap from the floater band came up "Too far out", no page errors). Fixed:

* **A stuff whose stopper never got there** played the thrown back stuff pose over a ball off the iron, and the phone heard nothing (no block event came). Now the slam takes the clang in that case and tells the phone Off the iron (`failSlam` in `finish/dunk-fail.ts`, test in `slam-fail.test.ts`).
* **The rim hint offered the dunk where it can only come up short.** See the step 3 gaps above: the phone now shows Tap tap dunk only within reach.
* **The icon cut off the contest hand.** The block presets raised the Lockdown's hand above the top of the frame. The icon camera now looks a touch higher and wider (`ICON_CAMERA`), and the icon was filmed again. The trailer and the poster were not touched.

## Notes for later steps

* Step 2 (blocks) is done above. A new block preset needs a name in `BLOCK_PRESETS`, a rule in `pickPreset`, a hit in `hitFor`, a strike in `strikes.ts`, a hand path in `block-paths.ts`, a landing in `landings.ts` and a lab row in `lab-blocks.ts`.
* Step 3 is done above.
