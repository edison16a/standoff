// Opens a room on a host page and seats phones in it, the way a player
// does: pick the game on the home screen, Host Game, then each phone opens
// the join link and types a name.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const SENSORS = read("../testing/fake-sensors.js");
const WIRE_TAP = read("./wire-tap.js");
const SLOW_FRAMES = read("./slow-frames.js");

/** Portrait and landscape on an iPhone 16, full screen and with Safari's bars showing. */
export const VIEWPORTS = [
  { name: "portrait", width: 393, height: 852 },
  { name: "portrait-bars", width: 393, height: 659 },
  { name: "landscape", width: 852, height: 393 },
  { name: "landscape-bars", width: 852, height: 340 },
];

/** A host page on the home screen, with the game's room open. Returns the room code. */
export async function hostRoom(browser, url, game, theme) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: theme });
  // The big screen draws 3D too, and only has to keep the room going here.
  await context.addInitScript(SLOW_FRAMES);
  const host = await context.newPage();
  await host.goto(url, { waitUntil: "domcontentloaded" });
  const tile = host.locator(`[data-tile="${game}"]`);
  await tile.waitFor();
  if ((await tile.getAttribute("aria-pressed")) !== "true") await tile.click();
  const start = host.locator(".home__host");
  await start.waitFor();
  await host.waitForFunction(() => !document.querySelector(".home__host")?.hasAttribute("disabled"), null, { timeout: 30000 });
  await start.click();
  const code = (await host.locator(".join__code").textContent({ timeout: 60000 }))?.trim();
  if (!code) throw new Error(`No room code for ${game}`);
  return { host, code };
}

/** A phone like an iPhone 16 with motion sensors a test can move. */
export async function joinPhone(browser, url, code, name, { theme, sensors = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    colorScheme: theme,
  });
  if (sensors) await context.addInitScript(SENSORS);
  await context.addInitScript(WIRE_TAP);
  await context.addInitScript(SLOW_FRAMES);
  const phone = await context.newPage();
  phone.on("pageerror", (error) => console.log(`  [${name}] page error: ${error.message.split("\n")[0]}`));
  await phone.goto(`${url}/join/${code}`, { waitUntil: "domcontentloaded" });
  return phone;
}

/** The platform's name screen: type a name and join. */
export async function enterName(phone, name) {
  await phone.locator(".name-field__input").fill(name);
  await phone.getByRole("button", { name: "Join", exact: true }).click();
}
