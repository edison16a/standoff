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
* **Effect**: a person's QB standing still is brought down after about 4.6 s on average (it was 7.2). Bot games score about 1.8, 2.5 and 2.8 points a drive on Easy, Medium and Hard over 16 seeds each (main: 1.7, 2.2, 2.8); the scoring test still passes.

### Tests

`engine/playbook/playbook.test.ts` (deal rules, refresh, the flow, the clock, bots, filmed, only computer runners follow it, every route in bounds and every card line inside its card at five ball spots for both teams, the card clip), `engine/pocket.test.ts`, `engine/rush-shed.test.ts`. Old tests that called a play now go through `callPlay` in `test-helpers.ts` (picks the first play off the page). Tests that need a long route to develop set the defenders' `rushCd` to 99 so nobody breaks free.

### For step 2 and step 3

* The burst's pose is authored but simple; step 2 can give the beaten blocker a stronger reaction (he only gets the existing shed stumble).
* `catching.contest` is ready for contested catch presets.
* The playbook view is null in the filmed showcase game, so the trailer is unchanged; a new trailer could show the play marks by playing a person's QB.
* Replays hide the play marks (`MatchRenderer` passes `traceAt === null`).
