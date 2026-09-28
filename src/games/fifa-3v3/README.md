# Soccer 3v3

Status: ready.

Three on three football on a big floodlit pitch (48 by 30 metres, with a 5.8 metre goal) for up to six phones. A computer goalkeeper stands in each goal, and computer players fill any empty places. Turn them off to play one on one, two on two or uneven sides, still with both keepers. Six stars to choose from, each with their own look, stats and goal celebration.

## How to play

1. Host Soccer 3v3 from the home screen. Computer players kick about behind the lobby while everyone joins.
2. On each phone: type a name, pick a star (a turning 3D preview with their stats; stars someone else has are marked), then tap Ready.
3. On the big screen the host puts each player on Red or Blue with the mouse, and gives each a role: striker (ST), left wing (LW) or right wing (RW). Taking a role someone on that side already has swaps them. Empty places are filled by computer players, three a side. The Computer difficulty row sets how sharp they are: Easy (the default), Medium, Hard, or Training, where they stand still so you can practise. Set Computer players to Off and the sides are just the people, so two friends can play one on one, and one side may have more players than the other. With them off, each side needs a player. Press Kick off.
4. First to five goals, or the most goals after four minutes. Level at the end means golden goal: the next goal wins.
5. At full time the results show everyone's goals, shots, passes and tackles. Play again keeps the same teams; Change teams goes back to the lobby.

### The controller

Hold the phone sideways.

* **Thumb stick (left):** run, relative to the screen. With the ball you dribble on your own.
* **Shoot/Pass (big red button):**
  * **Tap to pass.** Pointing roughly at a team mate passes to them, leading them if they are running. Short passes with a clear lane go along the ground; long ones, or ones with a defender in the way, are lofted over. Pointing anywhere else plays the ball into space that way. With the stick centred it finds the best pass.
  * **Hold to shoot.** After a fifth of a second a charge bar pops up on the phone, and a small one over your player on the big screen. It fills from left to right through green, yellow and red. Let go to shoot: green is a placed shot, yellow a strong one, red full power. More power means less accuracy, and a red shot can fly wide or balloon over the bar. The bar stops at full; hold on a little longer and the shot goes by itself at full power.
  * The shot goes where the stick points. Toward goal it aims at that part of the goal; up or down the screen picks the far or the near side; centred leaves it to the game.
  * Pressed and let go just before the ball reaches you, the pass or shot is played first time.
  * Without the ball, Shoot/Pass calls for it from a computer team mate.
* **Slide (orange button):** a slide tackle in the stick's direction. Strength, timing and the angle decide who wins; from behind is hardest. A miss leaves you on the floor for a moment.
* **Skill (the same button, purple, while you have the ball):** a skill move picked by the stick against the goal you attack.
  * Forward: a rainbow flick, the ball rolled up the back of the leg and over the defender's head.
  * Left or right: a crossover to that side, or an elastico for the best dribblers.
  * Back: a drag back under the sole, turning away.
  * Centred: a 360 roulette, spinning away from the nearest defender.
  * Done at a close defender it can leave them wrong footed for a moment. Moves have a short cooldown, and spamming them, or running one straight into a man or a sliding boot, can give the ball away. Computer players use them too.

* **Steal (small blue button):** a quick poke at the dribbler's ball. Won, the ball is yours. Missed, you are off balance for a moment, and a poke through the back of a man can be a foul.

On defence (the other side has the ball) the big button becomes **Guard**, with **Jump** beside it:

* **Guard (hold):** your player shadows the opponent you mark (the one in the same place in the line up), goal side of him at a marking distance, a little slower than you can run. It only takes over within 7 metres of him; the phone shows his name, how far he is, and Too far, In range or Guarding. A dribbler leaves Guard trailing, and a skill move leaves it well behind, so push the stick to take over and catch up. Any push on the stick is manual control.
* **Jump:** up to block a shot or a pass. The ball comes off the body with real physics rather than stopping dead. Jumping into a dribbler can be a foul.
* Steal and Slide work as always.

The phone buzzes for kicks, passes, tackles, fouls and goals, and shows your team, the score and the clock. The buttons rest during kick offs, goals and replays, when the host is not reading them.

## Fouls, free kicks and penalties

A slide through the back of a man is nearly always a foul. Taking the man before the ball often is, and so is a clumsy steal or a jump into a dribbler. The referee blows a pea whistle (a sharp pip and a long blast), play stops, and the fouled player goes down. The referee, who trails play on the far side all match, sprints to the spot, faces the offender and holds the yellow card up. The cards are for show: nobody is sent off. The score bug shows the foul and who was booked. Then the scene cuts to the set piece, filmed from behind the ball.

Outside the box it is a free kick. Three defenders form a wall ten yards (9.15 metres) from the ball, covering the near post, the keeper shades the far side, and the wall jumps as the ball is struck. A low kick can go under a jumping wall. The taker lines it up in stages on the phone:

1. **Aim:** the stick swings a white line left or right. The line shows the ball's path through the air and its shadow on the pitch.
2. **Curve:** the stick bends the line. Aim outside the far post and curl it back in.
3. **Power:** hold Kick and let go. The line is drawn at a middle power that dips under the bar; more sends it higher and faster, and deep in the red it flies over. Less keeps it low, into the wall.

Inside the box it is a penalty: the keeper on his line, everyone else outside the box, and the taker aims at a spot on the goal with the stick (across and up), then sets the power. The keeper has to guess a side as it is struck.

The ball then flies with the match's own physics. The keeper saves what he can reach in time, better the closer and softer it is. A computer taker goes through the same stages on screen. A taker who leaves a stage alone for fifteen seconds has it done for them.

The host's hidden admin panel (three quick taps on the settings gear) has Foul, Free kick and Penalty while a match runs, to try each without playing for it.

## The shot model

Every shot's outcome is decided when it is struck, from the distance, the angle, the shooter's shooting stat, pressure from defenders, where the keeper stands, which side you aimed at and the power from the charge bar. A placed green shot hits the post or the bar about one time in twenty and flies over about as often; a red one sprays wide or over far more, but is harder to save when it is on target. Then the ball is flown with real physics (spin, drag, bounces), aimed so it does exactly what was decided: into the corner, into the keeper's gloves, parried back into play, off the woodwork, or over. The net bulges and the post rings.

A ball over the end boards is a goal kick: the keeper rolls it out to a team mate up the pitch. Only a shot that misses is called over the bar or wide.

## The roster

`roster.ts` holds the six stars: name, number, stylised look (build, height, skin, hair, beard, boots, kit), the four stats (speed, shooting, strength, dribbling) and the goal celebration. Edit it there and everything follows.

## Sound

Everything is synthesised through the room's audio buses.

Music: two songs, each sixteen bars with an A and a B section, written as text a bar a row and played through a warm low pass (`audio/music.ts`, `audio/score.ts`).

* "Sunday League" plays in the lobby and on the results (`audio/lobby-song.ts`, `audio/lounge.ts`). A slow sunny bossa in G major at 90, the warm up before kick off. A sunset pad swells under every bar and hands each chord to the next, an alto flute sings the A section and a hummed "oo" answers in the B section, over a softly brushed nylon guitar, a round bass, a shaker and a quiet clave.
* "Golden Goal" plays under the match (`audio/match-song.ts`, `audio/fiesta.ts`). An uplifting stadium anthem with a Latin groove in B flat major at 116. Bright trumpets blow the hook over the A section, then the terrace choir sings "oh" over the B section while the trumpets punch the chords. A salsa piano montuno, a tumbao bass, surdo, congas, cowbell, claps and a timbale roll into each turn, over a warm held chord. It is mixed low so the ball and the whistle lead.
* A brass sting and timpani mark every goal and a fanfare the full time whistle, and the loop steps aside for them.

Effects have a sharp hit, a body and a tail into a synthetic stadium reverb, each pitched a little differently every time: strikes, passes, tackles, slides, saves, the post and the bar, the net, the boards, the referee's pea whistle (a tone near 2.8 kHz that the spinning pea flutters 25 to 35 times a second, with breath hiss, in `audio/whistle.ts`), the goal horn and fireworks. There is no crowd noise and no spoken commentary.

## Code map

* `engine/`: the pure match with tests. `play.ts` runs a step, `buttons.ts` turns the two buttons into passes, shots, slides and skill moves, `charge.ts` is the charge bar shared with the phone, `assist.ts` reads the stick for a pass or a shot, `kick.ts` and `passing.ts` strike the ball, `shot-odds.ts` and `shot-aim.ts` decide and aim shots, `keeper*.ts` the goalkeepers, `tackle.ts` slides and challenges, `skills.ts` and `skill-moves.ts` the skill moves, `bots.ts`, `bot-shape.ts`, `lanes.ts` and `bot-skill.ts` the computer players and where a side of one, two or three lines up, `rules.ts` kickoffs, restarts and full time, and `celebrate.ts` the goal and the win. Defending: `guard.ts` (Guard and who marks whom), `defend.ts` (steal and jump) and `blockers.ts` (the ball off a body). Stoppages: `foul.ts`, `referee.ts`, `set-piece.ts` (the scene), `wall.ts`, `set-piece-step.ts` (the taker's stages), `set-piece-kick.ts` (the kick and the white line), `set-piece-save.ts` (the keeper), `set-piece-bot.ts` (a computer taker) and `admin.ts` (the admin panel's shortcuts). `difficulty.ts` maps the lobby's Computer difficulty onto the bots. After a goal the team mates stand one on each side of the scorer and a step back, so the close up shows all three.
* `render/`: three.js. The arena (pitch, boards, goals with nets, stands, crowd, floodlights), the players built from the roster, animations, effects (grass spray, confetti, fireworks) and the broadcast camera.
  * Players are animated by where their feet go. `engine/stride.ts` sets the running rhythm, and both the simulation and the drawing use it. The dribble touch lands on the lead boot's swing. `anim/gait.ts` pins each foot to the turf for its stance. `anim/leg-ik.ts` solves the legs to reach those spots. `anim/kicks.ts` and `anim/skill-poses.ts` steer a boot onto the ball where it is drawn, so the ball stays at the feet. `figures/athlete-figure.ts` cross fades from one move to the next. In moves set by joint angles alone, like a slide, getting up, a celebration or the keepers' crouch, a leg that would reach down through the pitch is solved again to stand on the turf (`figures/turf.ts`). Name tags stack when players bunch up, so none covers another (`figures/tag-layout.ts`).
* `host/`: the room on the big screen: lobby, match driver, goal replays, HUD, results, and what each phone is sent.
* `phone/`: the setup steps and the controller, on the kit's gamepad.
* `audio/`: effects and music, through `room.audio` buses. There is no spoken commentary.
* `protocol/`: the zod schemas for messages both ways.
* `showcase/`: the game playing itself for the home screen's icon, poster and clip.

## Home screen media

The icon, the poster and the looping clip are filmed from the showcase with `node tools/media/capture.mjs fifa-3v3 --url http://localhost:3000 --ffmpeg ffmpeg --max-mb 3.9`. The showcase plays a seeded match between computer players and picks its goal by playing the match through once: a charged strike from outside the box by a player who beat his man with a skill move a moment before. The loop follows the ball with a camera lower and nearer than the broadcast one, so the skill move, the charge bar over the shooter and the big pitch's lines all read on a small tile. Then the strike, the keeper at full stretch, and the close up of the celebration. The icon is the strike leaving the boot, filmed low from the goal side. The poster looks over the shooter's shoulder as the keeper dives. Every name tag is one of the made up stars.

Players who leave are played by a computer until they come back, and a host that reconnects sends every phone its state again.
