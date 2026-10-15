# Football 3v3: playtest changes, handoff

A running note between the three steps of the Football 3v3 playtest work. The owner's notes are in `docs/handoff/next-week/owner-requests.md` (last section). He wants NBA 2K and Madden quality: authored, pre animated presets chosen by game logic, never raw physics collisions or ragdoll flops.

## Step 1: play calls and passing (done)

### The playbook

* **Flow** (`engine/phases.ts` `callFor` and `huddleAction`, `engine/playbook/huddle.ts`). A person's QB who taps Throw or Run (or Go for 2) gets `Match.huddle`: a page of six plays. He picks one by its place (`match.playbook(id, index)`), deals six new ones (`"redeal"`, the clock keeps running) or goes back to Throw, Run and Kick (`"back"`, with a fresh call clock). The page has its own clock, `HUDDLE.seconds` (12); when it runs out, or the QB's phone drops, the first play is called. A computer QB deals a page and picks one at random at once, so bot games run the same plays. The filmed showcase game (`filmed: true`) has no playbook and draws routes exactly as before, so the trailer test still passes.
* **Runners** (`engine/playbook/runners.ts`). Four a play: the two runners, the deep threat and one wing, the wing from the side with fewer runners. They are numbered 1 to 4 left to right as the QB looks downfield from his throw formation, and each number has a colour (`playbook/colours.ts`: cyan, lime, orange, violet; none is a team colour or the magenta target ring).
* **Plays** (`engine/playbook/deal.ts`, routes in `shapes.ts`, carries in `carry.ts`). A pass play gives every runner a different route with one or two going deep; the deep threat always goes deep, a wing gets a wing route (flat, drag, curl, seam, wheel, zig zag, out). A run play gives the back a carry (sweep, stretch, dive, counter), the wide runner a clear out, and the deep threat and the wing a block. A page never repeats a play or a name, and a fresh page avoids the old one. Names are the deep route and the most eye catching short one, like Post Zig zag.
* **Running it** (`applyDesign` in `huddle.ts`, called from `bots/plan.ts`). Every runner on the card gets the route as `bot.route`, so only computer runners (and a person whose phone dropped) run it. A wing with a route is a receiver while the QB can throw (`playbook/on-route.ts`): no blocks (`support/clinch.ts`), in the throw stick's candidates with no penalty, hands for any ball (`catch/eligible.ts`), backers drop on him (`bots/support-defense.ts`) and a man defender is assigned to him after the runners (`bots/plan.ts`).
* **Phone** (`phone/components/PlaybookPad.tsx`, `PlayDiagram.tsx`, `styles/playbook.css`). Pad `playbook`, state `book` (`protocol/playbook.ts`, built by `engine/playbook/card.ts` and clamped by `host/phone-book.ts`): six SVG cards in a three by two grid, each a small field with the line, the QB and every runner's route in his colour and number, an arrow head, a dot for a route that settles, a bar for a block, dashed for a person's runner (free to go anywhere). Back, New plays and the clock on top. Message `{ kind: "play", action }`.
* **Big screen** (`engine/playbook/view.ts` into `MatchView.playbook`, drawn by `render/figures/play-marks.ts`, `play-badge.ts`, `route-arrow.ts`). Only for a person's QB. While he picks: a ring in each runner's colour and his number over the helmet. Lined up: plus a flat arrow on the turf along the first seven metres of the route. Live: the rings alone, quieter, until the ball is thrown, pitched or run. Hidden in replays.
* **Keyboard**: 1 to 6 or Space pick a play, R deals new ones, B goes back (`keyboard/controller.ts`, card in `binding.ts`).

### Passing that is clean and fair

* **Only hands that read the ball** (`catch/touch.ts` `readIt`). A clean pass is caught or picked only by the man it was thrown to, the defender who broke on it, or someone whose catch move (`catch/plan.ts`) is under way. A knocked ball is a scramble only for hands within 0.6 of their reach. This removes catches and picks by players who never looked at the ball.
* **One go each** (`catch/lane-odds.ts`). A lane defender who let a ball by no longer gets a second roll at jarring it loose from the receiver.
* **Contested catches** (`catch/plan.ts` `rival`, `CatchPlan.contest`, in the view as `catching.contest`). The receiver and a defender in the lane within 1.6 m of the catch spot name each other, so step 2 can play a two man contested catch preset. Nothing draws it yet.

### Pressure and sacks

* **Pressure** (`engine/pocket.ts`). Every free defender within 4.6 m of the QB adds pressure, fully inside 1.1 m, capped at 1. A throw under pressure leaves the hand turned off the aimed line (spread 0.12 rad at full pressure) and a little long or short (`throw-error.ts`, the match's `playRng`). The QB's phone shows an Aim bar (`PhoneState.aim`, `PadInfo.tsx`) in place of Legs while he can throw: 100 percent clean, about a third at full pressure.
* **Breaking free** (`engine/rush-shed.ts`, `engine/burst.ts`). Rush pressed while held (in a block out in space or in contact with a lineman) rolls `shedOdds`: 8 percent off the snap for an average man, plus 4 points per power point over 5 and 16 per second since the snap up to 50, capped at 75; a computer rusher gets 45 to 100 percent of that by its level. A win removes the block (the blocker stumbles, as a shed), and gives `Athlete.burst`: 0.42 s of club, swim and rip at 0.75 pace, then 1.3 times his top speed fading over the last third of 1.9 s. Linemen's hands and blocks ignore him meanwhile. Drawn by `render/anim/burst.ts` (club, swim, rip, launch, then a lean into the stride). A loss is the plain rush. The QB can still juke or run.
* **Lab**: `?lab=breakfree` (`showcase/lab-pass-scenes.ts`) holds the Blaze QB at the line beside the middle pair and breaks him free 0.9 s after the ball reaches the QB. Good camera: `cam=4,2.2,-3&look=0,0.9,-1`.
* **Effect**: a person's QB standing still is brought down after about 4.6 s on average (it was 7.2). Bot games score about 1.8, 2.5 and 2.8 points a drive on Easy, Medium and Hard over 16 seeds each (main: 1.7, 2.2, 2.8); the scoring test still passes.

### Tests

`engine/playbook/playbook.test.ts` (deal rules, refresh, the flow, the clock, bots, filmed, only computer runners follow it, every route in bounds and every card line inside its card at five ball spots for both teams, the card clip), `engine/pocket.test.ts`, `engine/rush-shed.test.ts`. Old tests that called a play now go through `callPlay` in `test-helpers.ts` (picks the first play off the page). Tests that need a long route to develop set the defenders' `rushCd` to 99 so nobody breaks free.

### For step 2 and step 3

* The burst's pose is authored but simple; step 2 can give the beaten blocker a stronger reaction (he only gets the existing shed stumble).
* `catching.contest` is ready for contested catch presets.
* The playbook view is null in the filmed showcase game, so the trailer is unchanged; a new trailer could show the play marks by playing a person's QB.
* Replays hide the play marks (`MatchRenderer` passes `traceAt === null`).

## Step 2: pre animated contact and catches (done)

Everything here is an authored preset the game logic picks; the engine holds the bodies to the preset's clock so they never drift apart or sink into each other. Every preset has a lab stage (`/showcase/football-3v3?lab=<name>`, add `labstep`, `cam=x,y,z` and `look=x,y,z` for close looks).

### Tackles and sacks

* **Picking** (`engine/tackle-preset.ts`). `approachFor` at the press: head on a smaller man goes for the ankles, close in a drive, at 4.5 m/s or more a **slam**, slower a wrap; from the side a strong hitter (power 6 or more) at speed slams, others wrap or go low; from behind a shoestring or a wrap. `finishFor(approach, contact)` at contact: help close by makes a gang; a pocket QB is sacked (`blindside` from behind, a slam for a big hit off a slam approach, otherwise the bear hug `spin`); a drive that blew him back 2.5 m/s or more with a big hit becomes a slam, one that did not drive him back a wrap.
* **New moves** (`engine/tackle-moves.ts`, poses in `render/anim/tackle/slam.ts` and `sacks.ts`). Slam: carrier lifted and thrown back about two metres onto his back, the hitter flies through, lands on him and is up first. Drive now walks him back two strides before he goes over. Spin: the QB is swung round off his feet and thrown on his side. Blindside: whiplash, ball arm out, face first. The slam lunge is its own pose (shoulder first launch, `lunges.ts`). Slam, drive and blindside play along the hit's line (`tackle-bind.ts`).
* **Mix in bot games** (Easy, 16 games): wrap 236, shoestring 214, gang 164, slam 120, ankle 103, drive 58, blindside 18, spin rare. Labs: `slam`, `spin`, `blindside`, plus the old `wrap`, `drive`, `ankle`, `shoestring`, `gang`.

### Breaking tackles only head on

* `engine/break-tackle.ts`. The momentum hit (`hit.ts`) still moves the bodies and decides how big it was, but staying up is now its own rule: only a hit at least as square as -0.45 along his run, at 4.5 m/s or more, can be broken, with odds 0.12 plus 0.05 a power point over the tackler, 0.06 a m/s over 4.5 and 0.006 a kilogram heavier, capped at 0.5. From the side or behind he always goes down. A big back (6 kg heavier or power 8) **trucks**, anyone else **stiff arms**; he keeps 70 or 85 percent of his run. `Athlete.breaking` drives the carrier's overlay (`render/anim/break-tackle.ts`), the tackler goes down `trucked` or `stiffarmed` (`render/anim/tackle/misses.ts`). Labs: `truck`, `stiffarm`.
* The filmed showcase game keeps the old rule (any grip too weak breaks) and no slam blocks, so the trailer test and media are unchanged.

### Blocking

* **The pop** (`render/anim/block/index.ts`, `keys.ts`): every block starts by firing out of the stance, striking, rocking back off the pads and striking again before the hand fight. Render only.
* **Slam in space** (`engine/support/clinch-pick.ts` `slamsHim`, `clinch-break.ts` `putDown`): a support blocker closing at 3 m/s or more may blow his man up (odds 0.25 plus 0.06 a power point over him, capped 0.7), about one block in space in seven. The defender is thrown back onto his back (`pancaked`), the blocker drives through and stands over him (`BlockKind` `slam`). Lab: `blowup`. Pancakes, hand fight, drive, anchor and the rip were already there.

### Catches

* **Picking** (`engine/catch-preset.ts`, now fed `sideline` and `pace`): onehand for a high ball (1.5 m or more) he is 0.05 to 0.8 m short of, or over the shoulder at 5.5 m/s or more and 1.7 m high; toetap within 1.1 m of the sideline; stumble when crowded or hot; **whip** when settled (under 3.5 m/s) and facing the throw. A late lay out of a high ball becomes a one hand grab (`catch/plan.ts`).
* **Engine** (`engine/catch/settle.ts`): a whip stops him and turns him upfield at the catch, storing the swing in `CatchPlan.turn` for the drawing; a one hand catch puts him down where he lands (the play ends like a diving catch) and has a longer reach while it is coming (`catch/reach.ts`, `HANDS.one`); a toe tap keeps his feet 0.15 m inside the sideline until the ball is his.
* **Poses** (`render/anim/catch/moves.ts`, `shapes.ts`, `index.ts`): whip (knees give, hop round over 0.26 s), one hand (arm up and out, topple onto the hip, up again), toe tap (pointed toes, lean out over the line, mirrored to the sideline). Labs: `whip`, `whipslam` (a hitter waits for the catch and slams him), `onehand`, `toetap`. `chest` now runs across so it stays a chest catch.

### Whistle

`audio/whistle-call.ts`: only touchdowns, safeties and good field goals are whistled; the end of a quarter keeps its own. Phones still buzz on every whistle event.

### Tests

`engine/tackle-preset.test.ts`, `engine/break-tackle.test.ts`, `engine/catch-preset.test.ts`, `engine/catch/settle.test.ts`, `engine/support/support.test.ts` (slamsHim), `render/anim/contact-presets.test.ts`, `render/anim/tackle/tackle.test.ts`, `render/anim/block/block.test.ts`, `render/anim/catch/catch.test.ts`, `audio/whistle-call.test.ts`. Two old tests changed set up: the QB pace test uses training bots and the run in touchdown test sends the support defenders away, since a tackle from behind now always holds.

### For step 3

* From the broadcast camera the presets are small. A replay angle (or a push in on a slam) is where they will read best; `tackle` events carry the carrier and tackler ids, and the bind's `kind` is in the view (`AthleteView.tackle`).
* The spin sack is rare in bot games because most sacks come from behind; the blindside is the common one.
* `catching.contest` is still not drawn as a two man contested catch.

