# NBA 3v3

Status: ready. Three on three half court basketball for 1 to 6 players, with computer players filling every empty spot. First to 11.

## How to play

1. Open NBA 3v3 on the computer. Everyone scans the code with their phone.
2. On the phone, after the name:
   * **Star.** Pick one of ten stars, shown dribbling in 3D with their speed, shooting and strength. A star another phone has is marked taken.
   * **Ready.** Tap Ready.
3. On the computer, the lobby shows two team columns, Sky and Fire, three spots each. New players land on the smaller team. Click a player to send them to the other side, or drag them across. Shuffle deals everyone out at random. Computer players fill the empty spots. Click Start game.
4. Turn the phone sideways. It is a controller:
   * **Thumb stick** (left half): moves your player the way the big screen shows it. Up runs at the hoop. With the ball you dribble on your own.
   * **Shoot** (big orange button): hold it and a meter fills, on the phone and over your player on the big screen. Let go in the green band to green it. Driving at the rim close in turns Shoot into a layup, or a dunk for strong players (anyone dunks when nobody is near).
   * **Pass**: to the teammate most in the direction of the stick, or the most open one. Without the ball it becomes **Call**, which asks a teammate for it.
   * **Block**: jump with your arms up, to contest a jumper or stop a layup or dunk, or to grab a rebound higher. Next to the player with the ball on defence it becomes **Steal**, a swipe that knocks the ball loose if it lands.
5. The phone buzzes and flashes a word for everything that happens to you: Green!, Stolen, Blocked it!, Rebound!, +3.
6. First to 11 wins, with confetti and fireworks. The results show the MVP and both box scores. Play again keeps the teams; Change teams goes back to the lobby.

A phone that joins during a game picks a star and joins the next one. A player whose phone drops keeps their spot, with the computer playing for them until they are back.

## The rules

* Half court. Two points inside the arc, three outside it.
* After a basket, the other team checks the ball at the top of the key.
* After a defensive rebound or a steal, the ball must be taken back past the arc before it can score. The big screen and the phone say so.
* A 12 second shot clock with a horn. It resets when the ball hits the rim or changes hands. The clock also shows on the shot clock box above the backboard.
* The ball going out of bounds goes to the other team. No fouls.

## Shooting

* The meter fills in 0.82 seconds. The green band sits near the top; its width grows with the shooting stat (Curry's is widest) and by half again for a player on fire.
* The chance to score comes from the release (green, good, early or late), the distance, the shooting stat, and the nearest defender's contest. A defender in front contests a little; one who jumped with Block contests fully and may block the shot, more likely with long arms.
* Green releases go in almost every time unless heavily contested. The phone measures how long Shoot was held, so network lag never costs a green.
* Once decided, the kind of make or miss is drawn from weights: swishes, bank shots off the glass (mostly from the wings), rolls round the rim and in, friendly bounces, rim outs, in and outs, off the glass and out, and airballs on bad misses. The ball flies a planned arc for that outcome, touching the iron and the glass exactly where it should, and then real physics takes over for rebounds.
* Three makes in a row: heating up. Four: on fire, with a flaming ball, a wider green and a little more speed, until you miss or the other team scores.

## Strength, dunks and layups

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

Everything is synthesised through the room's audio buses: the ball on the hardwood, sneaker squeaks, the net, the clank of the rim, the thud of the glass, passes, blocks, the shot clock horn and the final buzzer. The crowd murmurs, goes "ooh" as a ball rattles round the rim, groans at misses, roars and whistles at dunks and chants "de-fense" late in the clock. An arena organ plays now and then, hip hop in the lobby and a fanfare for the winners. The announcer ("Dunk!", "From downtown!", "Blocked!") uses the computer's speech synthesis.

## Code

* `roster.ts`: the ten stars and the two teams.
* `engine/`: the game as pure code. The court, the shot model and meter, planned ball flights, loose ball physics, the rules, passing, defence, dunks and layups, and the computer players in `bot/`. Unit tested, including whole computer games played to 11.
* `render/`: three.js. `arena/` has the floor, the stands with an instanced crowd that bounces in the shader, the LED boards, the hoop with its shot clock box and a spring driven net. `models/` builds each athlete on a simple skeleton; `anim/` poses them (running, dribbling, guarding, shooting, passes, blocks, steals, the ten dunks and the celebrations). `effects/` has the particles and the confetti. `tv-camera.ts` is the broadcast camera.
* `host/`: the session on the computer (lobby and teams, the match driver, what the phones see, the calls and buzzes) and its React screens.
* `phone/`: the controller session and the phone screens. The stick and buttons use the gamepad kit in `src/games/kit/pad`.
* `audio/`: effects, the crowd, the music and the announcer.
* `protocol/`: the zod schemas for the messages between the phones and the host.
* `showcase/`: the scripted highlight filmed for the home screen: Giannis's hammer dunk and Luka's step back three.
