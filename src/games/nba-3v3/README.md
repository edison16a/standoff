# NBA 3v3

Status: ready. Three on three half court basketball for 1 to 6 players, with computer players filling every empty spot. First to 11.

## How to play

1. Open NBA 3v3 on the computer. Everyone scans the code with their phone.
2. On the phone, after the name:
   * **Star.** Pick one of ten stars, shown dribbling in 3D with their speed, shooting and strength. A star another phone has is marked taken.
   * **Ready.** Tap Ready.
3. On the computer, the lobby shows two team columns, Sky and Fire, three spots each. New players land on the smaller team. Click a player to send them to the other side, or drag them across. Shuffle deals everyone out at random. Computer players fill the empty spots. Click Start game.
4. Turn the phone sideways. It is a controller:
   * **Thumb stick** (left half): always on screen, so it is clear how to move. Put your thumb anywhere on that side and it jumps there. It moves your player the way the big screen shows it. Up runs at the hoop. Players move with momentum: they take about half a second to reach top speed, slow down over a step or two, and plant a foot to cut. They are a little slower with the ball. With the ball you dribble on your own, keeping it away from your defender and crossing it over when they switch sides.
   * **Shoot** (big orange button): hold it and a meter fills, on the phone and over your player on the big screen. Let go in the green band to green it. Driving at the rim close in turns Shoot into a layup, or a dunk for strong players (anyone dunks when nobody is near).
   * **Pass**: to the teammate most in the direction of the stick, or the most open one. Without the ball it becomes **Call**, which asks a teammate for it.
   * **Block**: jump with your arms up, to contest a jumper or stop a layup or dunk, or to grab a rebound higher. There is a short crouch before you leave the floor, and a block counts most at the top of the jump, so time it. Right next to the player with the ball on defence it becomes **Steal**, a swipe that knocks the ball loose if it lands. Reaching in from the ball side works best.
   * **Dribble**: with the ball the same button makes a move, picked by the stick against the way to the basket. Pull back for a stepback, which makes room for a jumper (press Shoot as you land). Push left or right for a quick crossover to that side. Push up for a spin round your defender. Leave the stick alone for a hesitation, or a behind the back when your defender sits on the ball hand. A move that beats your defender leaves them a step behind, or stumbling. Each move has a short breather after it, and spamming them, or making one into a defender right on top of you, can lose the ball.
5. The phone buzzes and flashes a word for everything that happens to you: Green!, Stolen, Blocked it!, Rebound!, Ankles!, +3.
6. Baskets put no text on the big screen. The scoreboard ticks over and the announcer calls it.
7. First to 11 wins, with confetti and fireworks. The results show the MVP and both box scores. Play again keeps the teams; Change teams goes back to the lobby.

A phone that joins during a game picks a star and joins the next one. A player whose phone drops keeps their spot, with the computer playing for them until they are back.

## The rules

* Half court. Two points inside the arc, three outside it.
* After a basket or a turnover there is a check up. The scorer celebrates, a player from the other team picks the ball up and gets it to the checker, and everyone walks to their spot. At the top of the key the checker bounces it to their defender, who bounces it back, and play is live. The shot clock is stopped from the basket until then, and the stick and buttons do nothing. The scoreboard dims the clock and says Check ball; the phone says Check up. It takes about four seconds in all. A ball lost in the stands is thrown back in from courtside.
* After a defensive rebound or a steal, the ball must be taken back past the arc before it can score. The big screen and the phone say so.
* A 12 second shot clock with a horn. It resets when the ball hits the rim or changes hands. The clock also shows on the shot clock box above the backboard.
* The ball going out of bounds goes to the other team.

## Fouls and free throws

* Reaching in too often is a foul. The game counts every steal attempt by one defender on one ball handler through a possession. The first two are free. The third is a foul one time in five, the fourth two times in five, and every one after that three times in five. The count starts again when the other team gets the ball.
* A foul blows the whistle and stops the clock. The announcer calls it and the big screen says FOUL. The fouled player walks to the line and everyone else lines up along the lane, the defence nearest the basket.
* The fouled player shoots two free throws with the shot meter on their phone. The phone says which shot it is, lights the meter up, and only Shoot works. The green band is a quarter wider at the line. Computer players shoot their own. A phone that waits eight seconds has its shot taken for it.
* Each free throw that goes in is worth one point. The first comes back to the shooter either way. Play is live again as the second leaves the hand: a miss is anyone's rebound, and a make is checked up by the other team like any basket.
* Computer defenders reach in twice freely, a third time only now and then, and never a fourth.

## Shooting

* The meter fills in 0.82 seconds. The green band sits near the top; its width grows with the shooting stat (Curry's is widest) and by half again for a player on fire.
* The chance to score comes from the release (green, good, early or late), the distance, the shooting stat, and the nearest defender's contest. A defender in front contests a little; one who jumped with Block contests fully and may block the shot, more likely with long arms.
* Green releases go in almost every time unless heavily contested. The phone measures how long Shoot was held, so network lag never costs a green.
* Once decided, the kind of make or miss is drawn from weights: swishes, bank shots off the glass (mostly from the wings), rolls round the rim and in, friendly bounces, rim outs, in and outs, off the glass and out, and airballs on bad misses. The ball flies a planned arc for that outcome, touching the iron and the glass exactly where it should, and then real physics takes over for rebounds.
* Computer players weigh every jumper by the points it is worth on average: their own meter timing, the distance and the defence. Shooters like Curry look for their shot, drivers like Giannis attack open lanes, and the ball goes to whoever is most dangerous.
* Three makes in a row: heating up. Four: on fire, with a flaming ball, a wider green and a little more speed, until you miss or the other team scores.

## Strength, dunks and layups

* Each dunk has an approach, a gather, the takeoff, time in the air, the slam, and either a hang on the rim or letting go straight away, then the landing. Players land with slow legs for a moment.
* Stars mostly throw their signature dunk, but not always: along the baseline it is often a reverse, in traffic a power dunk, and players with the legs for it throw the odd windmill or three sixty. Power dunks sometimes grab the rim.
* Each star has one signature dunk: Curry's scoop, LeBron's tomahawk, Durant's reverse, Giannis's two hand hammer, Jokic hanging on the rim, Luka's one hand flush, Shai's cock back, Tatum's double clutch, Ant's three sixty and Wemby's windmill.
* Driving into a weaker defender (two or more strength points less) sends them sprawling. A much stronger defender in the way turns a dunk into a layup. Strength also decides who gets pushed off a spot.
* A big dunk shakes the rim and the camera, slows time for a moment and the camera swoops in.

## The roster

All ten, with their stats, looks and dunks, live in `roster.ts`, so they are easy to edit. Stats run 1 to 10.

| Star | Speed | Shooting | Strength |
| --- | --- | --- | --- |
| Stephen Curry | 8 | 10 | 4 |
| LeBron James | 8 | 7 | 10 |
| Kevin Durant | 7 | 9 | 6 |
| Giannis Antetokounmpo | 9 | 4 | 10 |
| Nikola Jokic | 4 | 8 | 9 |
| Luka Doncic | 5 | 9 | 8 |
| Shai Gilgeous-Alexander | 9 | 9 | 5 |
| Jayson Tatum | 7 | 8 | 7 |
| Anthony Edwards | 9 | 7 | 8 |
| Victor Wembanyama | 6 | 7 | 6, with the longest reach |

The players are stylised athletes, recognisable by build, skin tone, hair, beard, jersey number and details like LeBron's headband, Curry's mouthguard and Durant's arm sleeve.

## Sound

Everything is synthesised through the room's audio buses. Effects have a sharp hit, a body and a tail into a synthetic arena reverb, and each one is pitched slightly differently every time: the ball on the hardwood, sneaker squeaks, the net, the clank of the rim, the thud of the glass, passes, blocks, the shot clock beeps, its horn and the final buzzer.

Music: "Blacktop" plays in the lobby and on the results, a lo-fi boom bap loop in G minor at 90 with a vibraphone hook. "Tip Off" plays under the game, a bouncier F minor groove at 100 with claps and a soft synth flute, mixed lower so the crowd leads. Both run eight bars with an A and a B section, through a warm low pass. The music ducks under dunks, threes, the announcer and the winners' brass fanfare. The arena organ plays its charge riff on dead balls.

The crowd murmurs, goes "ooh" as a ball rattles round the rim, groans at misses, roars and whistles at dunks, chants "de-fense" late in the clock and "let's go" for a player on fire or a winner. The announcer uses the computer's speech synthesis at the player's effects volume. It calls every basket by name, with its own words for dunks (naming the star's dunk), threes, layups and the way the ball went in (swish, off the glass, a roll, a friendly bounce). It adds an assist, a player heating up or on fire, a team on a run, a tie or a new lead, and game point. Each kind of call works through its lines in turn so they do not repeat soon. It also calls blocks, steals and the winner. On screen, banners are kept for the tip, blocks, steals, turnovers, game point and the win.

## Code

* `roster.ts`: the ten stars and the two teams.
* `engine/`: the game as pure code. The court, the shot model and meter, planned ball flights, loose ball physics, the rules, the check up (`check-up.ts`, `check-plan.ts`, `check-toss.ts`), running with momentum (`steer.ts`), the dribble and crossovers, the rhythm of the dribble (`dribble-ball.ts`: one bounce every two steps on the run, a low pound standing still, the pocket after a catch), the dribble moves (`moves.ts`, `move-pick.ts`), passing, steals (`steal.ts`), the foul count (`fouls.ts`) and free throws (`free-throw.ts`, `free-throw-plan.ts`), the block jump (`block.ts`), dunks and layups (`drive.ts`, `dunk-style.ts`), and the computer players in `bot/`. Unit tested, including whole computer games played to 11.
* `render/`: three.js. `arena/` has the floor, the stands with an instanced crowd that bounces in the shader, the LED boards, the hoop with its shot clock box and a spring driven net. `models/` builds each athlete on a simple skeleton; `anim/` poses them (running, dribbling with either hand, guarding, shooting, passes, catches, the check, blocks, steals, the ten dunks and the celebrations). Every change of state eases into the next. The stride follows the ground covered, and on the floor the hips settle so the lower foot stands on the court, so the feet stay planted. The drawn dribble runs from the palm to the floor and back up under the palm, in step with the feet, and the ball stays in the hands through the pocket, a spin, a shot and a dunk. Bursts, stops and cuts lean the body and plant a foot (`balance.ts`), the dribble moves have their own footwork (`moves.ts`), and the free throw routine has its bounces, a set shot and the lane stances (`line.ts`). `effects/` has the particles and the confetti. `tv-camera.ts` is the broadcast camera.
* `host/`: the session on the computer (lobby and teams, the match driver, what the phones see, the banners in `callouts.ts`, the announcer's words in `commentary.ts`, and the buzzes) and its React screens.
* `phone/`: the controller session and the phone screens. The stick and buttons use the gamepad kit in `src/games/kit/pad`.
* `audio/`: effects, the crowd, the music and the announcer.
* `protocol/`: the zod schemas for the messages between the phones and the host.
* `showcase/`: the scripted highlight filmed for the home screen: Giannis's hammer dunk and Luka's step back three. It skips the check up to keep the clip short. For looking at the animation in development, `/showcase/nba-3v3?bots=3` films a whole computer game instead, and `&at=12` holds the frame twelve seconds in. `?lab=moves` (or `run`, `dunk&style=windmill`, `block`, `free`) plays a short scene that shows one thing, `&step=1` lets a script step it one filmed frame at a time through `window.__nbaStep`, and `&follow=id,angle,dist` keeps a close camera on one player.

## Home screen media

The icon, the poster and the looping clip are filmed from the showcase with `node tools/media/capture.mjs nba-3v3 --url http://localhost:3000 --ffmpeg ffmpeg`. The poster and the icon are one frame of Giannis at the top of his hammer, the ball cocked behind his head: the poster from the wing, the icon from low under him. The film is run ahead to that moment without drawing and held, so they take seconds to shoot. The loop is eight seconds of the broadcast camera: the drive and the dunk in slow motion from the close camera, then Luka's three from the top. The first three seconds the tool lets run are stepped without drawing, and the loop draws once per filmed frame.

The tool's fake clock keeps running in real time, so on a computer that renders in software a slow frame used to race the film ahead. The showcase counts any long gap as one filmed frame. The tool now pauses the clock itself. The clip is filmed at 1280 by 720 with `--size 1280x720`, so each file stays under 4 MB.

## Slow computers

A computer that draws WebGL in software (no graphics card, or a blocked driver) gets a lighter picture: fewer pixels, no antialiasing and no shadows. The phone preview draws one pixel per point there too. Browser tests on such machines can set `__nba.turbo` in development builds to run the game clock two or three times faster.
