# Keyboard player

A way to play any game on the host computer alone, for testing. It is in the hidden admin panel: three quick taps on the settings gear, then **Keyboard player** under Platform. It shows whenever a room is open, lobby included.

## What the platform does

* **A real seat.** Turning it on opens a small phone page inside the host tab (`/keyboard/<code>`). It joins the room through the relay as a phone called "Keyboard" ("Keyboard 2" if a player has that name), so the relay counts the seat, the host hears the usual joined, profile and players, and real phones joining at the same time take the other seats. Turning it off closes that phone's connection and the seat leaves. A reload that resumes the room seats it again, and a remade lobby takes it along.
* **The phone panel.** That page shows the game's own phone screen in a floating panel at an iPhone's size, scaled down, so lobby picks, builds and Ready are clicked with the mouse. Drag it by its title bar. **Rotate** holds it sideways, **Hide** folds it, the cross turns the keyboard player off. The panel's phone has no motion sensors (`room.motion` is `"unavailable"`), so every game shows its buttons or drag pad.
* **Keys and mouse.** Keys pressed on the host page, or while the panel has focus, go to the game's binding. The platform uses `event.code`, so keyboard layouts do not matter. It ignores keys typed into text fields and leaves shortcuts with Ctrl, Cmd or Alt, Tab, Escape and the function keys to the browser. A held key reaches the binding once however long the browser repeats it. When the window loses focus every held key gets its key up and the binding's `release` runs.
* **The controls card.** A small card top left lists the binding's controls with "Keyboard player: seat N. Esc hides this card." Escape hides it and brings it back. A game with no binding yet says to use the phone panel with the mouse.

## Adding keyboard play to a game

Give the game module a `keyboard` (a `KeyboardBinding`, see `types.ts`), in its own file such as `src/games/<id>/keyboard.ts`, and add it to the module in `index.tsx`. Import only from `@/platform/keyboard`.

A binding has these parts:

* `controls`: groups of rows for the card. Each row is an action and the keys that do it. A key entry is one cap (`"Space"`) or caps pressed as one (`["W", "A", "S", "D"]`). Several entries are shown with "or" between them. Name keys the way they are printed: `"W"`, `"Space"`, `"Shift"`, `"Up"`, `"Left click"`.
* `replaces`: message kinds the keyboard sends in place of the phone screen. The panel's own messages of those kinds are dropped, so its resting on screen stick or wheel never fights the keys. List the stream kinds (`"pad"`, `"input"`, `"aim"`); leave the menu kinds (`"pick"`, `"ready"`) to the panel.
* `foot` (optional): the card's last line, on where the menus are. Unset, it says to click the phone panel. A camera game, whose menus are on the big screen, says so here.
* `create(ctx)`: makes the seat's controller when the seat is known. `ctx.seat` is the seat, `ctx.send(payload)` and `ctx.sendLossy(payload)` send exactly as that phone would, and `ctx.last("state")` is the newest message of that kind the host sent the phone (or of any kind with no argument), so the binding can tell lobby from match.

The controller can have `key(code, down)` (return true when the key was used, which stops the browser's own action such as scrolling), `pointer(event)` for the mouse over the big screen, `tick()` which runs about 30 times a second for streams, `release()` and `dispose()`.

Send the payloads the game's phone sends today, with the same kinds and fields, so the host needs no change. Keep the keys normal: W A S D and the arrows to move, Space for the main action, Shift for sprint or a second action, E or F for use, Q for a swap, Enter or R for ready or restart, the mouse to aim and left click to shoot.

### Helpers

* `StickKeys`: W A S D and the arrow keys as a thumb stick. `vector()` is `{ x, y }`, x right and y up, from -1 to 1, with a diagonal scaled to length 1 and opposite keys cancelling. `new StickKeys("wasd")` leaves the arrows free for something else.
* `ButtonKeys`: keys as buttons, several keys per button. `press(button)` runs on the first key down, `release(button, heldMs)` on the last key up, so a tap button only needs `press` and a hold or charge button uses both. `held()` lists the buttons down now.
* `MouseAim`: the mouse as a phone pointed at the screen, in the aim kit's space (-1 to 1, y up). `aim(point)` streams at the phone's rate, `button(button, down, point)` gives clicks, and `point` is always the latest. Call its `tick()` from the binding's tick while the game wants the aim: it also repeats a still point now and then, since the aim kit forgets a seat that goes quiet.

### Example

Magic Kart's phone streams `{ kind: "input", steer, drive, brake }` and sends `{ kind: "use" }` for its power up:

```ts
import { ButtonKeys, StickKeys, type KeyboardBinding } from "@/platform/keyboard";

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Race",
      rows: [
        { action: "Steer", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Drive", keys: ["W", "Up"] },
        { action: "Brake", keys: ["S", "Down"] },
        { action: "Use item", keys: ["Space", "E"] },
      ],
    },
  ],
  replaces: ["input"],
  create(ctx) {
    const stick = new StickKeys();
    const items = new ButtonKeys({ use: ["Space", "KeyE"] }, { press: () => ctx.send({ kind: "use" }) });
    return {
      key: (code, down) => stick.key(code, down) || items.key(code, down),
      tick() {
        const { x, y } = stick.vector();
        ctx.sendLossy({ kind: "input", steer: Math.sign(x), drive: y > 0, brake: y < 0 });
      },
      release() {
        stick.release();
        items.release();
      },
    };
  },
};
```

Then in `index.tsx`: `export const game: GameModule = { createHost, createPhone, Showcase, keyboard };`.

For a gamepad kit game, stream `{ kind: "pad", x, y, held }` from the tick (with `replaces: ["pad"]`) and send `{ kind: "pad-press", button, down, x, y }` from the `ButtonKeys` handlers. For an aim kit game, send `{ kind: "aim", x, y }` from `MouseAim`'s `aim` and `{ kind: "aim-fire", x, y }` on a left click, with `replaces: ["aim"]`.

### Checking it

Open a room for the game, turn on the keyboard player, get through the lobby in the panel, and play with the keys shown on the card. Unit test the binding by calling `create` with a fake `ctx` that records what it sends.
