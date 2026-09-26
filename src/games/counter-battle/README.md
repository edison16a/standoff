# Counter Battle

Status: playable from the home screen. Its own home screen media comes next; until then it shows the drawn cover.

A team shooter for up to four players on phones, one or two a side, on a paintball style field. Players never steer. A movement brain runs each fighter from cover to cover, and the player aims with their phone and shoots. Every human gets their own view over their fighter's shoulder.

## The engine

`engine/` is pure TypeScript with no drawing and no timers. `Battle` steps at 60 steps a second from a seed, so the same seed and inputs always play out the same way. It holds the field and its cover graph, the fighters, their guns, the movement brain, the computer players' aim and the round and match clock. What happens comes out as `BattleEvent`s: shots with every bullet's trace, hits, kills, reloads and the round and match results.

## The world

`render/` draws a `Battle` with three.js. It only reads the battle, so a replayed match looks the same.

* `arena/`: the turf with its lines and worn patches, the bunkers built to the engine's own shapes (so a bullet stops where the eye sees the bunker), the nets on posts, the stands with fans who cheer on kills, the pit tents, the sky, hills and trees, and the late afternoon sun with shadows.
* `models/`: the four characters on one rig. The Paintball Pro wears a padded jersey and a mask with a mirrored lens. The Operator has a plate carrier, a helmet with a headset and a balaclava. The Street Runner has a hoodie, a bandana and a cap on backwards. The Heavy Gunner wears plates, shoulder guards, a bandolier and a visored helmet. Team colours tint the kit and the player's own colour marks each one: the Pro's chest band, the Operator's shoulder patch and strobe, the Runner's bandana, cap peak and soles, the Heavy's helmet stripe and arm band. `models/guns/` has the rifle, the pump shotgun, the SMG and the sniper, each with the points the hands hold and moving magazines, pumps and bolts.
* `anim/`: the animations, all worked out from the fighter's state each frame. The legs stand, run in any direction while the body faces the fight, and kneel behind cover, reaching their feet by IK. The body turns side on to aim, leans out round tall cover, flinches from hits, falls when shot down and celebrates a round won in each character's own way. The gun sits in the shoulder when aiming and is carried low otherwise, kicks with each shot, and the hands work it: a magazine change for the rifle and SMG, shell by shell for the shotgun, bolt and magazine for the sniper, the pump after each shotgun blast and the bolt after each sniper shot. Tests check that the standing and kneeling heads match the engine's hit boxes, that every helmet hides under the lowest bunker, and that both hands hold every gun.
* `effects/`: muzzle flashes, tracers (widened for each view so a far one still shows), paint splats on the bunkers and turf in the shooter's team colour, puffs, spent cases, and a burst of paint when a fighter goes down.
* `hud/pane-hud.ts`: each player's crosshair in their colour, opening with the spread and following the kick, hit markers (bigger for a head shot, red for a kill), and a red vignette when hurt that stays faint at low health and greys the view once down.
* `camera/`: the over the shoulder camera, which follows the way the fighter faces, rises when they kneel so the player still sees over low cover, moves to the left shoulder when cover close on the right would fill the view, pulls in when a bunker is behind, opens wider in a tall narrow view, narrows like a scope when a sniper looks out, shows the kick, and after a fall rises and swings back over the body. `aim-ray.ts` turns a point in a player's view into what they are pointing at, for `Battle.aimAt`. The television camera fills a spare quarter.
* `layout.ts`: the split screen. Two players sit side by side. Three or four take quarters, pink down the left and cyan down the right, and a spare quarter shows the television camera. The rects are the shape the kit's `SplitMap` takes.
* `battle-renderer.ts`: one scene and one WebGL renderer for every view, each a scissored viewport. Name tags show teammates always and enemies only while in sight, so a tag never gives away someone behind cover.

## Playing

The lobby on the big screen shows both teams, pink and cyan, with each player's name in their own colour, their gun and whether they are ready. The host picks 1 v 1 or 2 v 2 and how good the computer players are (Easy, Normal or Hard). New players land on the smaller team; clicking a player sends them to the other side. With both teams full a player waits on the bench, and 2 v 2 lets them in. Computer players fill every empty place, so one player alone still gets a fight. Anyone not ready when the match starts sits it out.

On the phone, after the name: **Aim** (calibrate inside your own view), **Gun** (Assault Rifle, Shotgun, SMG or Sniper), **Ready**. Then the phone is the gun: point it at your view, **Shoot** (hold it for the rifle and SMG, tap it for the shotgun and sniper), **Reload**, and **Centre aim** if the aim drifts. Phones without motion sensors aim by dragging round the trigger. It buzzes for hits, head shots, kills, taking a hit and going down.

During the match each player's view has their name at the top, health at the bottom left and the magazine with a reload bar at the bottom right. The score, the round and the kit's split map sit at the top middle, the kill feed in the top right, and the round banners in the middle: Round 3 (or Match point), Fight, who took the round, and the winner. The results have confetti in the winners' colour, every fighter's kills, deaths, head shots and damage, and Play again or Menu.

## Aiming in your own view

Each player calibrates inside their own view, not the whole screen. The host gives the aim kit a zone per seat (`HostAim.setZone`), the lobby's split screen as it stands, so the calibration targets show inside that player's view, outlined in their colour, and the phone's -1 to 1 point spans the view. Each frame the host turns that point into a ray through the player's shoulder camera (`aimTarget`) and hands what it hits to `Battle.aimAt`, so the crosshair lands where the phone points. If the split changes after someone calibrated, say a third player joins and halves become quarters, the kit maps their points into the new view, so they still aim where they really point.

## The host

`host/` runs a room. `CounterHost` is the session: the lobby (`lobby.ts`), the match (`match-driver.ts`, which steps the battle at its fixed rate and passes on the aim, trigger and reload), the demo fight behind the lobby, and the line to the phones (`publish.ts`, `phone-link.ts`). `lineup.ts` deals the characters so no two fighters share one, and gives each computer player a gun its side lacks, a call sign and a free seat colour. `moments.ts` turns events into buzzes, the kill feed, banners and the announcer's calls. A phone that drops has the computer shoot for it until it comes back; its fighter moves as ever.

## Sound

`audio/` is all synthesised and goes through the room's buses. The lobby plays "Kit Up", a laid back groove; the match plays "Standoff", a tense D minor theme that moves up and speeds up for a match point, with a sting for each round and a fanfare for the winner. Every gun has its own voice, with the shotgun's pump and the sniper's bolt after each shot, and reloads are timed to the animations. Bullets thwap off the inflatables, knock on wood and ping off the drums. The player who lands a hit hears a tick, a ding for the head and a crunch for a kill; the one hit hears a thud. Footsteps are heard close by. A crowd and a breeze fill the field, the crowd swelling with the fighting and roaring for kills and rounds, and an announcer calls the rounds and the winner through the browser's speech. With one pair of speakers for everyone, each sound is as loud as it is to the nearest player and leans toward their view.

## Testing in a browser

In development the host exposes `window.__cb` (the session) and `window.__cbRenderer`, and each phone `window.__cbPhone`. `__cb.turbo = 2` runs the match twice as fast and `__cb.roundsToWin = 2` plays a short match. `node tools/phone-fit.mjs --games counter-battle,counter-battle-touch` checks every phone page.

## Looking around in development

`showcase/` is the game playing itself. `/showcase/counter-battle` plays a seeded 2v2 of computer players from the television camera. `?panes=4` (or 2, or 1) splits the screen with a camera behind each fighter, `?seed=` plays another fight, `?at=seconds` holds a still at that moment, `?cam=x,y,z,tx,ty,tz` pins the television camera, and `?lite=1` draws without shadows at a lower resolution, which a software renderer on a busy machine can manage. `?lab=1` swaps the fight for the animation lab: the four characters in a row, each with a different gun, standing, running forward, sideways and back, kneeling, standing up to fire, reloading, taking two hits, falling and celebrating, on a 24 second loop. On a still, `window.__cbFilm(seconds)` steps on and draws, so a script can take a frame sequence at any rate.
