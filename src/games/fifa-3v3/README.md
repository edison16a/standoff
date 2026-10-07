# Soccer 3v3

Status: ready.

Three on three football on a big floodlit pitch (48 by 30 metres, with a big 8.1 by 2.9 metre goal) for up to six phones. A computer goalkeeper stands in each goal, and computer players fill any empty places. Turn them off to play one on one, two on two or uneven sides, still with both keepers. Each player picks one of six builds, a way to play with its own ratings, and plays under their own name. The winners lift a World Cup style trophy on the pitch.

## How to play

1. Host Soccer 3v3 from the home screen. Computer players kick about behind the lobby while everyone joins.
2. On each phone: type a name, pick a build (a turning 3D preview with your name on the shirt, its ten ratings and how it plays; builds someone else has are marked), then tap Ready.
3. On the big screen the host puts each player on Red or Blue with the mouse, and gives each a role: striker (ST), left wing (LW) or right wing (RW). Taking a role someone on that side already has swaps them. Empty places are filled by computer players, three a side. The Computer difficulty row sets how sharp they are: Easy (the default), Medium, Hard, or Training, where they stand still so you can practise. Set Computer players to Off and the sides are just the people, so two friends can play one on one, and one side may have more players than the other. With them off, each side needs a player. Press Kick off.
4. First to five goals, or the most goals after four minutes. Level at the end means golden goal: the next goal wins.
5. At full time the winners lift the trophy (see The trophy ceremony), then the stats show everyone's goals, shots, passes, tackles and saves. For an outfield player saves are the shots they blocked; each keeper has a line of their own. Play again keeps the same teams; Change teams goes back to the lobby.

### The controller

Hold the phone sideways.

* **Thumb stick (left):** run, relative to the screen. With the ball you dribble on your own.
* **Shoot/Pass (big red button):**
  * **Tap to pass.** The pass goes to the nearest team mate in the direction the stick points, leading them if they are running. Short passes with a clear lane go along the ground; long ones, or ones with a defender in the way, are lofted over. With nobody that way, the ball is played into space in that direction. With the stick centred it finds the best pass.
  * **Hold to shoot.** After a fifth of a second a charge bar pops up on the phone, and a small one over your player on the big screen. It fills from left to right through green, yellow and red. Let go to shoot. The bar sets the power and the height: green is placed low, yellow is driven at mid height, and red goes for the top corner. Below red a shot never sails over the bar; deep in the red it can fly over or wide. The bar stops at full; hold on a little longer and the shot goes by itself at full power.
  * **The shot aims itself.** With the stick centred it picks a corner like a striker would: from one side it goes across to the far post, unless the keeper has already shaded over there, then it goes near post. Straight on it goes away from the keeper. Pointing the stick overrides it: toward goal aims at that part of the goal, and up or down the screen picks the far or the near side.
  * **Curl comes by itself.** From a wide angle a far post shot is a curler, bent round the keeper and back in, more for better finishers. Straight on and near post shots are driven with only a little swerve.
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

* **Guard (hold):** your player shadows the opponent you mark (the one in the same place in the line up), goal side of him at a marking distance, a little slower than you can run. It only takes over within 7 metres of him; the phone shows his name as the big screen tags him, how far he is, and Too far, In range or Guarding. A dribbler leaves Guard trailing, and a skill move leaves it well behind, so push the stick to take over and catch up. Any push on the stick is manual control.
* **Jump:** up to block a shot or a pass. The ball comes off the body with real physics rather than stopping dead. Jumping into a dribbler can be a foul.
* Steal and Slide work as always.

The phone buzzes for kicks, passes, tackles, fouls and goals. Its middle shows only your team, your role and what is going on. The score and the clock stay on the big screen, so the buttons on the right take that room: they size themselves to the space the phone has, with Shoot/Pass (or Guard) the biggest. The buttons rest during kick offs and goals, when the host is not reading them. During a replay the phone shows one big Skip button and how many players want to skip.

### Keyboard play

For testing on one computer, turn on the admin panel's **Keyboard player** (three quick taps on the settings gear). Pick a build and tap Ready on its phone panel with the mouse, then play with the keys (`keyboard.ts`). They send exactly what the phone's stick and buttons send.

| Key | Does |
| --- | --- |
| W A S D or the arrows | Run, as the stick |
| Space or J | Shoot/Pass: tap to pass, hold to shoot. Defending, it holds Guard. At a set piece it sets each stage and kicks. In a replay it votes to skip |
| E or K | Slide, or Skill with the ball |
| F or L | Steal |
| Shift | Guard, held, while defending |
| Q | Jump, while defending |

A key only works where the phone shows that button, and a held key lets go when the buttons change, as a thumb would.

## Shots, blocks and the keeper

The goal is 8.1 metres wide and 2.9 high, about 1.75 times the face of the old 5.8 by 2.3 metre one, with a deeper net. The keeper is the same size and just as quick, so his full dive and stretch no longer cover it all.

No dice decide a shot. The striker picks a spot on the goal and the kick is solved to fly there with its pace and curl. Then the boot's error goes in: a degree or two for a clean strike, more for a weaker finisher, with a man on him, at a sprint, first time or on the volley, and a lot more deep in the red. Now and then a ball is scuffed or sliced and can go anywhere. From there it is all the flight (see The physics).

Defenders near the ball's real path see it after their reaction time and lunge a step and a leg into it if they can get there in time. Anyone standing in the way is hit whether he meant it or not. The ball comes off the shins or the body with physics: it keeps a share of its pace, glances off the curve of him and spins away.

The keeper moves after his own reaction time, and he reads the line a little wrong: more for a fast ball, a curler or a knuckler, and more again for one he saw late through bodies. He dives as far as a dive can get in the time left, and his hands follow the ball in the last moment. Whether a glove meets the ball is up to the flight. Taken in the palms he holds it, unless it comes in too fast for his hands, and one past his hands into his forearms and chest is smothered a little less surely. At full stretch or off the fingertips it is pushed away, and the bounce off the gloves is real. A keeper who dives and does not end up holding the ball lies on the turf for a second, then pushes himself up. That is the moment for a follow up.

With computer players on both sides about a third of open play shots go in, about half of free kicks and more than four in five penalties. Of the shots keepers stop, they hold about a third and push the rest away.

## Goals, celebrations and replays

No banners pop up over the picture. A goal is shown on the score bug, with the scorer's name under the new score, and in the 3D scene: the net bulges, the boards flash and the camera cuts to the scorer.

The scorer runs off and celebrates. Three of the builds do the SUI: a run away from the cameras, a leap with a half turn in the air, and a landing facing them with the feet planted wide and both arms thrust down. The other three go down on their knees at full pace and slide across the grass, arms wide, until the turf stops them, then pump their fists. The team mates run in behind. As the celebration lands, the replay starts.

The replay is cut like a television replay, each stage at its own speed and from its own camera:

1. **The run**, at full speed, close on the kicker, with his top speed in miles an hour.
2. **The strike** in deep slow motion: the wind up and the kick, still close on the kicker, with a glowing target in the goal where it was aimed and the aim named, like "Top right corner".
3. **The flight**, from just behind the keeper inside the goal, tracking the ball in, with the ball's speed in miles an hour and its spin in turns a minute (curl, topspin or knuckle).
4. **The dive**, slowing right down again as the keeper leaves the ground.
5. **The net**, nearly at full speed.

A goal from a free kick or a penalty is replayed from the taker's run up, not from the lining up before it.

Any button on any phone votes to skip, but the replay only ends early when every player in the match has pressed. Only the phones show the vote: each phone shows the count. The big screen shows nothing about skipping, so the replay stays clear. A player who leaves stops counting.

## Fouls, free kicks and penalties

A slide through the back of a man is nearly always a foul. Taking the man before the ball often is, and so is a clumsy steal or a jump into a dribbler. The referee blows a pea whistle (a sharp pip and a long blast), play stops, and the fouled player goes down. The referee, who trails play on the far side all match, sprints to the spot, faces the offender and holds the yellow card up, filmed side on to the two of them. The cards are for show: nobody is sent off. The score bug shows the foul and who was booked. Then the scene cuts to the set piece, filmed from high behind the ball with no name tags in the way. The taker waits a few steps back and off to the side of his kicking foot, so the ball and the line stay in view, and the run up comes in at an angle.

Outside the box it is a free kick. Three defenders form a wall ten yards (9.15 metres) from the ball, covering the near post, the keeper shades the far side, and the wall jumps as the ball is struck. A low kick can go under a jumping wall. The taker lines it up in stages on the phone:

1. **Aim:** the stick swings a white line left or right. The line shows the ball's path through the air and its shadow on the pitch, and a glowing target on the goal shows the spot it ends at.
2. **Curve:** the stick bends the line, from a straight strike to a wide curve either way. The curve never moves the aim: the kick still ends on the target, only its path bends. A wide curve sets off outside the wall and bends back in. The bend is about the same share of the distance from close in or far out.
3. **Power:** hold Kick and let go. The line is drawn at a middle power that dips under the bar. More is faster and higher, but all of yellow still comes in under the bar from any range; deep in the red it flies over. Less is slower and lower: into the wall from close in, a looping ball from far out.

Inside the box it is a penalty: the keeper on his line, everyone else outside the box, and the taker aims at a spot on the goal with the stick (across and up), shown by a glowing target in the goal mouth, then sets the power. The keeper has to guess a side as it is struck. When he goes he picks the right side about six times in ten.

The ball then flies with the match's own physics. The keeper saves what he can reach in time, better the closer and softer it is. With the big goal the free kick keeper shades further over and reads a kick he can reach a little better, so free kicks still go in about half the time and penalties about four times in five. A computer taker goes through the same stages on screen. A taker who leaves a stage alone for fifteen seconds has it done for them.

The host's hidden admin panel (three quick taps on the settings gear) has Foul, Free kick, Penalty and Win now while a match runs, to try each without playing for it. Win now blows full time with the tester's side a goal up, straight into the trophy ceremony.

## The physics

Everything the ball does comes from one simulation (`engine/physics/`), stepped the same way every time, so a seed always plays the same match. This is what was not real before, and what it is now.

* **The ball in the air.** Before, it took one step a frame with a simple drag and a made up swerve. Now it is a 22 centimetre, 430 gram ball stepped 480 times a second. The air's drag drops sharply above about 12 m/s, as it does for a real ball, so a driven shot holds its pace and then dies. Spin bends it by the Magnus effect, which grows with the spin, and the spin itself slowly fades. A ball struck hard with almost no spin swims from side to side: the knuckleball.
* **Bounces and rolls.** Before, a bounce kept a fixed share of the ball's pace and its spin was faked. Now each bounce is an impulse with grip where the ball meets the turf. A hard landing gives back less than a soft one, topspin kicks the ball on, backspin checks it, and a skidding ball grips and turns into a clean roll. Rolling, the grass slows it more the faster it goes. Passes are read from this same roll, so a pass still arrives at the pace it was meant to.
* **The goal.** Before, the posts were flat and the net was a bulge drawn after the fact. Now the posts and the bar are round, so where the ball meets them decides whether it goes in, comes back out or goes wide. Each net is four sprung sheets that catch the ball, stretch most of a metre out for a hard shot and drop it dead; tied to the frame, they hold a ball driven into a corner. The net on screen is drawn from those sheets, and the frame rings when the ball hits it.
* **Shots and saves.** Before, the outcome was rolled when the ball was struck and the flight was faked to match. Now it is the boot's error and the flight, the keeper's hands and body, the posts and the net (see Shots, blocks and the keeper).
* **The dribble.** Before, the ball was glued to the feet. Now it is real touches: on the lead boot's swing the ball is knocked on to where he will be by his next touch, every stride walking and every few at a sprint. Between touches it rolls free, and a defender who is clearly first to it takes it. With a man close the touches are tighter and on the far side of the body.
* **The first touch.** A firm pass is killed dead. A hard one to a poor touch runs away from him, and a really heavy one bounces off the boot. Nobody can take a pass off the boot the instant it is struck: a player needs his reaction time, quicker with sharp reflexes, and a pass can hit his shins first.
* **In the air.** A dropping ball is brought down on the chest. One at head height is headed: at goal near it, cleared long near his own goal, on to a team mate anywhere else. A ball over his head makes him leap and meet it at the top of the jump. A shot pressed as the ball drops is struck on the volley, which is hard to keep down.
* **Bodies.** Before, players reached full speed at once and turned on the spot. Now they push off and build up speed, carry their momentum, need room to stop and turn in a curve, and turn more slowly with the ball. Shoulder to shoulder, bodies meet with their real masses, and a strong player braced on his feet gives less ground.
* **Tackles.** A slide is a boot travelling along the turf. Meeting the ball first knocks it away with physics; meeting the man first takes him down. A dribbler who sees it coming can hop the ball over the boot.

The physics has its own tests: a ball dropped on the turf bounces to the height a real one does, a rolling ball loses energy and never gains it, spin bends a shot the right way, round posts send a ball in or out by where it meets them, the net catches and holds, and hundreds of wild kicks run for a long time with no ball passing through anything and no broken numbers.

A ball over the end boards is a goal kick: the keeper rolls it out to a team mate up the pitch. Only a shot that misses is called over the bar or wide.

## How the players look and move

Before, a player was a jointed doll: about fifteen separate pieces (spheres, cylinders and boxes) per player, hinged at the joints, with seams at every elbow and knee, mitten hands, a printed shirt on a barrel and a face of painted balls. Now each player is one continuous skinned body (`render/body/`).

* **Bodies.** A skeleton of sixteen bones, cut to the build's height and build. The trunk, arms and legs are smooth skins lofted over keyed cross sections: chest and lats tapering to the waist, biceps in front and the point of the elbow behind, quads, kneecaps and calves. Each vertex is weighted across the joint it sits by, so an elbow or a knee bends like one. The rib cage has its own bone, which breathes.
* **Kit.** The shirt, sleeves, shorts and socks are printed from one texture per player (`kit-print.ts`): the name across the shoulders and the big number on the back, a crest, a maker's mark and the sponsor on the chest, side panels and a ribbed collar in the trim, a league patch on each sleeve, a stripe down each leg of the shorts with the number on the front, and socks with their bands. The socks are pulled up over shin pads, a flat plate down the front. The cloth has a fine knitted mesh up close and a sheen in its own colour at grazing angles. The shorts' legs and the shirt's hem follow each thigh as the skin under them does, and the crotch of the shorts is shared between both legs, so a kicking or trailing leg never pushes through the cloth. A test holds every piece of the kit to no more than two and a half times its size through goal celebrations, a sprinting knee, a drawn back kick and a twisted trunk (`body/deform.test.ts`).
* **Faces and hair.** The head is a sculpted skull (`body/head/`): brow ridge, deep set eyes with lids and lashes, cheekbones, a nose with nostrils, lips and ears, and a jaw that is squarer on a powerful build. The skin is warmer on the cheeks and nose and darker in the eye sockets and under the jaw, and light soaks a little way under it, so a lit cheek fades into shadow through a warm band. Hair grows off the same scalp as a shell cut to each style (a fade, a quiff, a parting, a bun, twists with lighter tips, curls, an afro), thinning to nothing at its edge, and the strands are drawn pixel by pixel. Stubble is painted into the skin, and a full beard is a short shell.
* **Boots and gloves.** Low cut boots with a knitted collar, laces, a sweeping stripe, a soleplate and six studs, which show on every slide and kick. Hands have fingers and a thumb. Keepers wear long padded sleeves and big gloves with pale latex palms and a wrist strap, and so does the Sweeper Keeper.
* **Movement.** The gait blends from a walk (upright, loose arms, riding high over each step) through a jog to a sprint (a deep lean, the knees driving and the arms pumping from hip to chin) with speed (`anim/gait-style.ts`). The pelvis turns with each stride and drops on the side that is off the ground, the chest turns against it, each arm swings against its own leg and bends further coming forward, and the head holds still and watches the ball (`anim/gait-upper.ts`). Planted feet are pinned to the turf and the legs are solved exactly through every lean and turn of the pelvis (`anim/leg-ik.ts`), so they never skate. A player speeding up leans into the run, one braking hard sits back with the arms out front, and one cutting banks into the turn over planted feet (`figures/body-dynamics.ts`). Running hard leaves him blowing, his chest heaving faster and deeper for a while. Players rock when they run into each other, the lighter one more, when they are tackled or fouled, and when the ball smacks into them (`figures/contacts.ts`, `figures/jolt.ts`). Kicks, passes, headers and chest control all follow through.

The frame budget. Each body comes in two cuts on the same bones: a fine one for close ups and replays, and a lighter one for the broadcast view, picked by how tall the player is on screen. The light cut always casts the shadow, so the shadow pass never pays for the fine cut. Everything one material draws for a player is one mesh, so a player costs three draws. At 1920 by 1080 a broadcast frame with all nine bodies costs about 140 draws and 420 thousand triangles with shadows (the old jointed bodies alone took about 270 draws), and a close up about 800 thousand. Kit textures take about 25 MB. If frames keep missing sixty (or the player's own lower cap in the settings) for a few seconds, the picture steps down: close ups keep the light cut, then it draws at a lower resolution (`render/auto-quality.ts`). It never steps back up mid match. The low picture for software graphics uses the light cut, plain materials and smaller prints.

Two development views help check all this: `/showcase/fifa-3v3?view=poster&lab=1` stands every build in a row under the match lights, and `&lab=run` has them walk, jog, run, sprint and stop and go round their own circles (`&t=3` freezes a moment, `&cam=` pins the camera). `window.__fifaStats()` reads the last frame's draws and triangles on the host page in development.

## The ground, the lights and the camera

Before, the pitch was a flat green texture under a few plain lights, the stands were boxes of fans with no roof, and the picture went straight to the screen. Now the match looks like a night game on television.

* **The pitch.** The turf is drawn in its shader (`render/arena/turf-material.ts`): sixteen mown stripes whose shine turns with the view, slow patches of colour, wear in the goal mouths, and blades from a grass tile that hold up down at a boot. The lines are drawn from their exact shapes, so they stay crisp and smooth at any distance.
* **The goals.** Round posts and bar, a slim frame behind, and knotted nets drawn from the simulation's own sheets. They bulge where the ball pushed them and stir in a night breeze, and a fine catch net hangs behind each goal.
* **Around the pitch.** Glowing ad boards on every side, two dugouts with seats in each team's colour under clear shells, and a roofed bowl of stands with aisles, stairs and strip lights under the roofs. The fans wear coats, hair and club colours, sit in the shade under the roof, and jump on a goal, each on their own beat. There is still no crowd noise.
* **Floodlights and sky.** Four lattice towers stand in the corners. Their lamps burn far above white, so they bloom, and each throws a lens glare with rays and a streak that swells as the camera comes into its beam. Above is a night sky with cloud lit from below by the city, a moon, stars and a skyline with lit windows.
* **Light.** The key light is the nearest floodlight bank. It casts one soft shadow from every player and the ball. The banks across the ground rim the shoulders, a sky and ground light gives a cool fill from above and a green bounce from the turf, and a reflection map of the lit stadium makes the ball, the posts and the boots catch the lights. Soft contact shadows under each body and each planted foot, shrinking as the foot lifts, keep players sitting on the grass (`render/figures/contact-shadows.ts`, one draw for all of them).
* **The finish.** The scene is drawn in linear light into a multisampled half float target, bloomed, and graded to the screen through the ACES filmic curve and sRGB (`render/post/`). The grade has a white balance, a little saturation and a gentle S curve, with a light vignette and a breath of noise so the sky never bands. Depth of field is only for the replay and the ceremony, which also have their own warmer grades (`post/look.ts`).
* **The camera.** The broadcast camera rides a smooth spring toward where the play is heading, leads the ball, and zooms in gently on a close tussle and out when play opens up (`render/camera/broadcast.ts`). The replay angles, the lobby and the ceremony use the same lights and finish.

The frame budget. Everything heavy is merged or instanced: each stand is two draws, the crowd one, the masts one and the lamps another, the dugouts two, and the contact shadows one. The stadium's reflection map is drawn once at the start. At 1920 by 1080 a broadcast frame costs about 120 draws and 490 thousand triangles, a replay close up about 135 draws and 750 thousand, and the ceremony about 150 draws. If frames keep missing sixty, the picture steps down by itself: lighter player cuts, then a lower resolution with lighter antialiasing, then no glow round the lights (`render/auto-quality.ts`). The low picture for software graphics drops the shadows, the finish and the crowd, at about 75 draws and 130 thousand triangles.

`/showcase/fifa-3v3?view=poster&lab=tv&t=20` draws the live picture of the seeded match at second 20, as the host page does. `&shot=closeup`, `replay-kicker`, `replay-keeper` or `lobby` picks another camera, `&film=ceremony` plays the trophy lift, and `&q=low` shows the low picture.

## Builds

A pick is a build, not a person. Your own name is who you are: it is on your tag, on the back of your shirt, on the score bug when you score, in the replay, on the trophy ceremony and in the stats. Computer players are called CPU and their build, like CPU Winger. The tag over a phone's player also names their build in smaller type, or says Away while a computer plays for them. There is no separate row of names along the bottom of the big screen, since every name already floats over its player. Each build can be taken by one player, so the six on the pitch always differ.

| Build | Number | Made around | How it plays |
| --- | --- | --- | --- |
| Striker | 9 | Finishing, shot power | The best finisher, with the hardest shot. |
| Playmaker | 10 | Passing, vision | Passes land on a boot and lead a runner into his stride. |
| Winger | 7 | Pace, dribbling | The quickest, and close control that beats a man. |
| Defender | 4 | Tackling, strength | Wins the ball back, fouls least, and is hard to knock off it. |
| Sweeper Keeper | 1 | Reach, reflexes | Keeper's gloves out on the pitch: blocks shots and cuts out passes. |
| All Rounder | 8 | Everything | Good at everything, best at nothing, no weak spot. |

A computer player also plays its build's way. When the other side has the ball a striker stays up for the break, a winger a little behind him, and a defender and above all a sweeper keeper drop deep behind the rest.

Every build has ten ratings from 0 to 99, shown as bars on the phone, with its own two highlighted. The totals are close, so no build is simply better. What each rating does in a match (`engine/build-effects.ts` and where it is used):

* **Finishing:** how close to the chosen spot a shot flies, how rarely it is scuffed, and how much a far post shot curls.
* **Shot power:** how fast a shot leaves the boot, which gives the keeper less time and is harder to hold.
* **Passing:** how close a pass lands to its target, and how firmly it arrives.
* **Vision:** how well a pass leads a running team mate, how far away a mate can be picked out, and how often a computer player looks up for a pass.
* **Pace:** top running speed and slide speed.
* **Dribbling:** close control (how true each touch goes, and how far ahead it runs at pace), turning with the ball, skill moves (the elastico needs 90) and a clean first touch.
* **Tackling:** winning slides, steals and standing challenges, and giving away fewer fouls.
* **Strength:** holding players off, winning shoulder to shoulder (a strong man braces with more of his mass), and how hard a tackle knocks the ball away.
* **Reach:** how far a steal pokes, how wide a body blocks a shot, and how far a loose ball can be taken.
* **Reflexes:** how quickly a player reacts to a ball just struck, how often a body gets in a shot's way, a clean first touch on a hard ball, and a quicker next steal or jump.

`builds.ts` holds the six: name, number, stylised look (height, build, skin, hair, beard, boots, picker kit, and gloves for the Sweeper Keeper), ratings and goal celebration. `attributes.ts` names the ratings. Edit them there and everything follows.

## The trophy ceremony

At the final whistle the winners celebrate where they stand for a few seconds. Then the picture cuts to the whole winning side on the centre spot, their keeper with them. The captain, their top scorer (a phone's player before a computer on a tie), holds a World Cup style trophy from the victory kit in front of him, low enough that his face shows over it.

1. **The cup:** a low shot in front of the side drifts round and pushes in. The team mates clap, the captain looks down at the cup and gives it a kiss. Spotlights fade up over them.
2. **The lift:** he dips at the knees and drives it up over his head with both hands. The cup is held between his hands every frame, so it rises with the lift. The camera sinks and tilts up with it.
3. **The roar:** the picture cuts wide as it goes up. Confetti cannons fire from behind and beside the side, in the winners' colours with gold foil, and it rains confetti from then on. The team mates crowd in and jump with their fists up, the spotlights flare, a timpani roll swells into a brass chord and fireworks go off. The winners' own names drop in big across the top, with the score under them. A crane rises and swings across the front, then a slow orbit takes over.
4. **The stats:** about ten seconds after the cut the stats card comes in on the right and the camera moves the side to the left of the picture. The Stats button in the corner brings it in sooner.

The beaten side stands back with their hands on their hips. The camera is tested to keep the raised cup under the names in every shot (`render/camera/ceremony-cam.test.ts`).

## Sound

Everything is synthesised through the room's audio buses.

Music: two songs, each sixteen bars with an A and a B section, written as text a bar a row and played through a warm low pass (`audio/music.ts`, `audio/score.ts`).

* "Sunday League" plays in the lobby and on the results (`audio/lobby-song.ts`, `audio/lounge.ts`). A slow sunny bossa in G major at 90, the warm up before kick off. A sunset pad swells under every bar and hands each chord to the next, an alto flute sings the A section and a hummed "oo" answers in the B section, over a softly brushed nylon guitar, a round bass, a shaker and a quiet clave.
* "Golden Goal" plays under the match (`audio/match-song.ts`, `audio/fiesta.ts`). An uplifting stadium anthem with a Latin groove in B flat major at 116. Bright trumpets blow the hook over the A section, then the terrace choir sings "oh" over the B section while the trumpets punch the chords. A salsa piano montuno, a tumbao bass, surdo, congas, cowbell, claps and a timbale roll into each turn, over a warm held chord. It is mixed low so the ball and the whistle lead.
* A brass sting and timpani mark every goal and a fanfare the full time whistle, and the loop steps aside for them. The music then rests until the cup goes up, to a timpani roll and a held brass chord, and the beach tune comes back for the stats.

Effects have a sharp hit, a body and a tail into a synthetic stadium reverb, each pitched a little differently every time: strikes, passes, tackles, slides, saves, the post and the bar, the net, the boards, the referee's pea whistle (a tone near 2.8 kHz that the spinning pea flutters 25 to 35 times a second, with breath hiss, in `audio/whistle.ts`), the goal horn and fireworks. There is no crowd noise and no spoken commentary.

## Code map

* `engine/`: the pure match with tests. `play.ts` runs a step, `buttons.ts` turns the two buttons into passes, shots, slides and skill moves, `charge.ts` is the charge bar shared with the phone, `assist.ts` reads the stick for a pass or a shot, `kick.ts` and `passing.ts` strike the ball, `strike.ts` a shot, `shot-aim.ts` solves the kick to a spot, `shot-error.ts` is the boot's error, `shot-plan.ts` picks the corner, the curl and the height by itself, `shot-block.ts` has defenders charge shots down, `keeper*.ts` the goalkeepers (`keeper-read.ts` reads a shot and plans the dive, `keeper-body.ts` is his hands and body as the ball meets them), `loose-ball.ts` flies the ball and settles what it hit, `locomotion.ts` and `contact.ts` move bodies with momentum and mass, `dribble.ts`, `control.ts` and `reach.ts` the touches and who can reach the ball, `aerial.ts` and `head-ball.ts` the chest, headers and volleys, `slide.ts` and `tackle.ts` slides and challenges, `skills.ts` and `skill-moves.ts` the skill moves, `bots.ts`, `bot-shape.ts`, `lanes.ts` and `bot-skill.ts` the computer players and where a side of one, two or three lines up, `rules.ts` kickoffs, restarts and full time, `celebrate.ts` the goal and the win, and `celebrate-moves.ts` the SUI and the knee slide. Defending: `guard.ts` (Guard and who marks whom), `defend.ts` (steal and jump) and `blockers.ts` (the ball off a body). Stoppages: `foul.ts`, `referee.ts`, `set-piece.ts` (the scene), `wall.ts`, `set-piece-step.ts` (the taker's stages), `free-kick.ts` (the aimed spot and a curve that bends to it), `set-piece-aim.ts` (the kick's numbers), `set-piece-kick.ts` (penalties, the strike and the white line), `set-piece-save.ts` (the keeper), `set-piece-bot.ts` (a computer taker) and `admin.ts` (the admin panel's shortcuts). `difficulty.ts` maps the lobby's Computer difficulty onto the bots. `build-effects.ts` turns the builds' ratings into what they do in a match, and `ceremony.ts` stages the trophy ceremony: its timing, the captain, and where everyone stands. After a goal the team mates stand one on each side of the scorer and a step back, so the close up shows all three.
* `engine/physics/`: the ball itself. `aero.ts` the drag, the drag crisis, the Magnus bend and the knuckle, `turf.ts` bounces and rolling, `impulse.ts` and `capsule.ts` contact with grip, `woodwork.ts` the round posts and bar, `net.ts` and `net-panels.ts` the sprung nets, `walls.ts` the boards, `roll-table.ts` how far a ground ball rolls, and `constants.ts` the numbers and where they come from (the FIFA ball limits, wind tunnel studies and the FIFA turf tests).
* `render/`: three.js. The arena (pitch, boards, goals with nets drawn from the simulation's sheets, stands, crowd, floodlights), the players built from their builds with their names on their shirts, animations, effects (grass spray, confetti, fireworks) and the broadcast camera. The trophy ceremony: `ceremony/` (the kit's trophy in the captain's hands, spotlights and confetti), `anim/trophy-poses.ts` (the lift and the team mates) and `camera/ceremony-cam.ts` (its shots).
  * Players are built in `body/` (see How the players look and move): `rig.ts` the bones, `torso.ts`, `arms.ts`, `legs.ts`, `shorts.ts`, `boots.ts` and `hands.ts` the pieces, `kit-print.ts` the printed kit, `head/` the face and hair, `materials.ts` and `shader-patches.ts` the skin, cloth and hair, and `athlete-body.ts` puts them on a player's bones in two cuts.
  * Players are animated by where their feet go. `engine/stride.ts` sets the running rhythm, and both the simulation and the drawing use it. The dribble touch lands on the lead boot's swing. `anim/gait.ts` pins each foot to the turf for its stance. `anim/leg-ik.ts` solves the legs to reach those spots. `anim/kicks.ts` and `anim/skill-poses.ts` steer a boot onto the ball where it is drawn, so the ball stays at the feet. `figures/athlete-figure.ts` cross fades from one move to the next. In moves set by joint angles alone, like a slide, getting up, a celebration or the keepers' crouch, a leg that would reach down through the pitch is solved again to stand on the turf (`figures/turf.ts`). Name tags stack when players bunch up, so none covers another (`figures/tag-layout.ts`).
* `host/`: the room on the big screen: lobby, match driver, HUD, results, and what each phone is sent. `names.ts` says what everyone is called and tagged. `ceremony-card.ts` and `components/Champions.tsx` put the winners' names over the ceremony with the kit's overlay, then the stats. The goal replay is `replay.ts` (the recorder), `replay-script.ts` (the stages, their speeds and cameras), `replay-facts.ts` (the run speed, the ball's speed and spin, the aim), `replay-skip.ts` (everyone must agree to skip) and `replay-director.ts`, which runs it. `render/camera/replay-cam.ts` has its two angles and `render/figures/aim-marker.ts` the target on the goal.
* `phone/`: the setup steps and the controller, on the kit's gamepad.
* `audio/`: effects and music, through `room.audio` buses. There is no spoken commentary.
* `protocol/`: the zod schemas for messages both ways.
* `showcase/`: the home screen trailer and stills, cut from one seeded match of sharp computer players and the cup lift. `/showcase/fifa-3v3?t=4` holds the trailer four seconds in, and on the icon or the poster `&cam=x,y,z,lookX,lookY,lookZ,fov` tries another framing.

## Home screen media

The icon, the poster and the looping clip are filmed from the showcase with `node tools/media/capture.mjs fifa-3v3 --url http://localhost:3000 --ffmpeg ffmpeg`. A busy crowd and confetti need many bits, and the tool's own size cap makes the clip soft, so the clip is filmed big (`--only loop --seconds 8.9 --crf 22 --max-mb 80`) and both files are then encoded from that MP4 in two passes at 3.3 Mbit/s: `ffmpeg -i master.mp4 -c:v libvpx-vp9 -b:v 3300k -maxrate 4500k -pass 1` (and `-pass 2`) for the WebM, and the same with `-c:v libx264 -preset slow -bufsize 6600k -movflags +faststart -pix_fmt yuv420p` for the MP4. Both come in under 3.9 MB and sharp. All three were filmed again in the new ground, under the new lights and finish.

The loop is a wordless trailer, cut like a game advert (`showcase/trailer-plan.ts`). It is cut from one seeded match with every shot rigged to go in (`trailer-films.ts`). The Striker takes a dropping ball on his chest, the Winger slides in and he hops over the boot, filmed from down on the grass as the slide comes at the camera, in slow motion. Then his strike from the edge of the box from low behind him with the goal ahead, the ball bursting into the net seen from behind it, and his SUI in the corner, slowed through the leap and the half turn. It ends on the cup lift from low in front of the captain and a crane pulling back through the confetti. The trailer opens on the last second of that crane shot too, so the capture's cross fade from the end back to the start blends a shot into itself and the loop has no seam. The match always steps at the engine's own rate, so slow motion never changes how it plays out: the picture blends between steps with `blendViews`. The film look (`MatchRenderer.cinematic`) sinks the stands and sky in haze, takes down the soft light and shows the boards' colours without their words.

The poster is the Striker's strike an instant after the ball leaves his boot, with the keeper set in goal. Two spotlights light it like key art, warm from one side and cold from behind.

The icon is made like a game cover: the trailer's hurdle, held at the top of the hop. The Striker is in the air over the Winger's slide, the ball lifted over the boot with him, seen from down on the grass in front as the slide comes at the camera (`showcase/stills.ts`). A warm spot from the front lights his face and two cold spots from behind cut a rim along him (`iconLights`). Anyone else near him is stepped back out of the square frame. The logo sits over a dark foot.

Do not edit the game while a capture runs: the dev server's hot reload restarts the showcase mid clip. Check each clip for held frames with ffmpeg's `mpdecimate`.

Players who leave are played by a computer until they come back, and a host that reconnects sends every phone its state again.
