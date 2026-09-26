# Counter Battle

A team shooter for up to four players on phones, one or two a side, on a paintball field. Your phone is the gun. Your fighter runs from bunker to bunker by itself, and you aim and shoot. The first team to win five rounds takes the match.

Status: ready, on the home screen with its own icon, poster and clip.

## How to play

### Before the match

Pick Counter Battle on the home screen and host a game. Everyone scans the code with their phone and types a name.

The big screen shows both teams, pink and cyan, with each player's name in their own colour, their gun and whether they are ready. The host picks 1 v 1 or 2 v 2 and how good the computer players are: Easy, Normal or Hard. New players land on the smaller team. Click a player to send them to the other side. With both teams full a player waits on the bench, and 2 v 2 lets them in. Computer players fill every empty place, so one player alone still gets a fight. Anyone not ready when the match starts sits it out.

Each phone takes three steps:

1. **Aim.** Hold the phone like a remote and point it at your own view on the big screen. Your targets show inside your view, outlined in your colour. Point at the middle one and press Set middle, then the top left and the bottom right. Sweep round to check the dot follows you and press Looks good. A phone without motion sensors aims by dragging instead, so it only checks the drag here.
2. **Gun.** Pick one of the four and take it.
3. **Ready.** The match starts when the host says so.

### The guns

| Gun | Shoots | Magazine | Best at |
| --- | --- | --- | --- |
| Assault Rifle | 20 a bullet, about 8 a second, hold to fire | 30 | Long lanes. Steady and accurate. |
| Shotgun | 9 pellets of 13, tap to fire | 6, loaded shell by shell | Close in. It ends fights at a few paces. |
| SMG | 14 a bullet, 13 a second, hold to fire | 32 | Mid range. Its fighter runs the fastest. |
| Sniper | 90 a bullet, tap to fire | 5 | Far away. One shot to the head ends it. |

Every fighter has 100 health. Head shots hit harder. Damage drops off past each gun's range, most of all for the shotgun. Every gun kicks up and sideways as it fires, and a gun fired on the run spreads wider. Crouched, it is tighter.

### In the match

You never steer. Your fighter runs cover to cover, kneels behind low bunkers, and stands up or steps out to peek. That is your moment. Point the phone at your view and press **Shoot**: hold it for the rifle and the SMG, tap it for the shotgun and the sniper. Keep shooting and your fighter holds the peek open longer. Press **Reload** when the magazine runs low. If the aim drifts, point at the middle of your view and press **Centre aim**. Phones without motion sensors aim by dragging round the Shoot button. The phone buzzes for hits, head shots, kills, taking a hit and going down.

Each player gets their own view over their fighter's shoulder. Two players share the screen side by side. Three or four take quarters, pink down the left and cyan down the right. Your name sits at the top of your view, your health at the bottom left and your magazine with a reload bar at the bottom right. The score, the round and a small map of the split sit at the top middle, and the kill feed at the top right.

A round ends when one side is all down. Round banners call Round 3 (or Match point), Fight, and who took it. Sides swap every round. First to five rounds wins. The results show confetti in the winners' colour and every fighter's kills, deaths, head shots and damage. Then Play again with the same teams, or Menu to go back to the lobby and change teams, guns or the match. The Standoff logo at the top left goes home to pick another game.

## Technical notes

### The engine

`engine/` is pure TypeScript with no drawing and no timers. `Battle` steps at 60 steps a second from a seed, so the same seed and inputs always play out the same way. It holds the field and its cover graph, the fighters, their guns, the movement brain, the computer players' aim and the round and match clock. What happens comes out as `BattleEvent`s: shots with every bullet's trace, hits, kills, reloads and the round and match results.

The movement brain (`brain.ts`, `plan.ts`, `tactics.ts`) runs every fighter the same way, human or computer. Spots are scored on the range the gun likes, cover, a line to peek along, flanking, the run there, spacing from teammates and restlessness, and pressure over the round makes everyone close in. Computer players (`bot-aim.ts`) have a reaction time, an aim error that settles, a turn speed, a head shot chance and recoil control for each level. They never shoot at what they cannot see.

### The world

`render/` draws a `Battle` with three.js. It only reads the battle, so a replayed match looks the same.

* `arena/`: the turf with its lines and worn patches, the bunkers built to the engine's own shapes (so a bullet stops where the eye sees the bunker), the nets on posts, the stands with fans who cheer on kills, the pit tents, the sky, hills and trees, and the late afternoon sun with shadows.
* `models/`: the four characters on one rig. The Paintball Pro wears a padded jersey and a mask with a mirrored lens. The Operator has a plate carrier, a helmet with a headset and a balaclava. The Street Runner has a hoodie, a bandana and a cap on backwards. The Heavy Gunner wears plates, shoulder guards, a bandolier and a visored helmet. Team colours tint the kit and the player's own colour marks each one. `models/guns/` has the rifle, the pump shotgun, the SMG and the sniper, each with the points the hands hold and moving magazines, pumps and bolts.
* `anim/`: the animations, all worked out from the fighter's state each frame. The legs stand, run in any direction while the body faces the fight, and kneel behind cover, reaching their feet by IK. The body turns side on to aim, leans out round tall cover, flinches from hits, falls when shot down and celebrates a round won in each character's own way. The hands work each gun: a magazine change for the rifle and SMG, shell by shell for the shotgun, bolt and magazine for the sniper, the pump after each shotgun blast and the bolt after each sniper shot. Tests check that the heads match the engine's hit boxes, that every helmet hides under the lowest bunker, and that both hands hold every gun.
* `effects/`: muzzle flashes, tracers (widened for each view so a far one still shows), paint splats on the bunkers and turf in the shooter's team colour, puffs, spent cases, and a burst of paint when a fighter goes down.
* `hud/pane-hud.ts`: each player's crosshair in their colour, opening with the spread and following the kick, hit markers (bigger for a head shot, red for a kill), and a red vignette when hurt that greys the view once down.
* `camera/`: the over the shoulder camera, which follows the way the fighter faces, rises when they kneel so the player still sees over low cover, moves to the other shoulder when cover close by would fill the view, pulls in when a bunker is behind, narrows like a scope when a sniper looks out, shows the kick, and after a fall rises and swings back over the body. `aim-ray.ts` turns a point in a player's view into what they are pointing at, for `Battle.aimAt`. The television camera fills a spare quarter.
* `layout.ts`: the split screen, in the shape the kit's `SplitMap` takes.
* `battle-renderer.ts`: one scene and one WebGL renderer for every view, each a scissored viewport. Name tags show teammates always and enemies only while in sight, so a tag never gives away someone behind cover.

### Aiming in your own view

The host gives the aim kit a zone per seat (`HostAim.setZone`), the lobby's split screen as it stands, so the calibration targets show inside that player's view and the phone's point from -1 to 1 spans the view. Each frame the host turns that point into a ray through the player's shoulder camera (`aimTarget`) and hands what it hits to `Battle.aimAt`, so the crosshair lands where the phone points. If the split changes after someone calibrated, say a third player joins and halves become quarters, the kit maps their points into the new view.

### The host

`host/` runs a room. `CounterHost` is the session: the lobby (`lobby.ts`), the match (`match-driver.ts`, which steps the battle at its fixed rate and passes on the aim, trigger and reload), the demo fight behind the lobby, and the line to the phones (`publish.ts`, `phone-link.ts`). `lineup.ts` deals the characters so no two fighters share one, and gives each computer player a gun its side lacks, a call sign and a free seat colour. `moments.ts` turns events into buzzes, the kill feed, banners and the announcer's calls. A phone that drops has the computer shoot for it until it comes back; its fighter moves as ever.

### Sound

`audio/` is all synthesised and goes through the room's buses. The lobby plays "Kit Up", a laid back groove. The match plays "Standoff", a tense D minor theme that moves up and speeds up for a match point, with a sting for each round and a fanfare for the winner. Every gun has its own voice, with the shotgun's pump and the sniper's bolt after each shot, and reloads are timed to the animations. Bullets thwap off the inflatables, knock on wood and ping off the drums. The player who lands a hit hears a tick, a ding for the head and a crunch for a kill; the one hit hears a thud. A crowd and a breeze fill the field, and an announcer calls the rounds and the winner through the browser's speech. With one pair of speakers for everyone, each sound is as loud as it is to the nearest player and leans toward their view.

### The showcase and the home screen media

`showcase/` is the game playing itself, a seeded 2v2 of hard computer players, for the home screen's media. `script.ts` names the moments; `script.test.ts` fails if an engine change moves them, as a reminder to film again.

* The loop is eight seconds of round five, cut over three shoulders. Blaze runs at Vex and drops him with the shotgun. Kite waits behind the wall at the back, steps out and snipes Blaze. Nova answers with a burst, ducks, peeks again and puts Kite down with the rifle. Each fighter is cut to only once, so every shoulder camera starts in place.
* The poster holds Blaze's shotgun going off into Vex, side on, with the stands behind.
* The icon is the same moment from further back, square, under the Counter Battle logo.

To film them again, with the dev server running:

```bash
node tools/media/capture.mjs counter-battle --url http://localhost:3000 --ffmpeg /path/to/ffmpeg
```

### Testing in a browser

In development the host exposes `window.__cb` (the session) and `window.__cbRenderer`, and each phone `window.__cbPhone`. `__cb.turbo = 2` runs the match twice as fast and `__cb.roundsToWin = 2` plays a short match. `node tools/phone-fit.mjs --games counter-battle,counter-battle-touch` checks every phone page.

### Looking around in development

`/showcase/counter-battle` plays the loop. `?view=poster` and `?view=icon` show the stills. `?panes=4` (or 2, or 1) splits the screen with a camera behind each fighter, `?seed=` plays another fight, `?at=seconds` holds a still at that moment, `?cam=x,y,z,tx,ty,tz` pins the television camera, and `?lite=1` draws without shadows at a lower resolution, which a software renderer on a busy machine can manage. `?lab=1` swaps the fight for the animation lab: the four characters in a row, each with a different gun, standing, running forward, sideways and back, kneeling, standing up to fire, reloading, taking two hits, falling and celebrating, on a 24 second loop. On a still, `window.__cbFilm(seconds)` steps on and draws, so a script can take a frame sequence at any rate.
