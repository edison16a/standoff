// The aim kit's hold to calibrate page, driven like a real player: point
// the fake phone at each target the page asks for and hold still until it
// is taken and the next one comes up by itself. No buttons are pressed.

/** Where a player sitting square to the screen points for each target: compass heading and elevation, degrees. */
const AIM = {
  "the middle": [0, 0],
  "the top left": [-14, 8],
  "the top right": [14, 8],
  "the bottom right": [14, -8],
  "the bottom left": [-14, -8],
};

const whereOf = (title) => Object.keys(AIM).find((place) => title.includes(place));

/**
 * Points at every target in turn until the test view shows. Takes a
 * screenshot of the first target. Returns how many targets were taken.
 */
export async function holdTargets(ctx) {
  const { phone } = ctx;
  await phone.locator(".kit-hold").waitFor({ timeout: 60000 });
  await ctx.snap("aim-target");
  let taken = 0;
  for (let guard = 0; guard < 12; guard++) {
    const title = (await phone.locator(".kit-calibrate__title").textContent()) ?? "";
    if (title.startsWith("Try it")) return taken;
    const place = whereOf(title);
    if (!place) throw new Error(`No target in the title "${title}"`);
    const [heading, up] = AIM[place];
    const aim = ([a, b]) => Object.assign(window.__sensors, { alpha: -a, beta: b, gamma: 0 });
    // A hand swings over to the target: the first one waits for the phone to move from how the page found it.
    await phone.evaluate(aim, [heading + 6, up + 4]);
    await phone.waitForTimeout(700);
    await phone.evaluate(aim, [heading, up]);
    const count = await phone.locator(".kit-hold__count").textContent();
    // Taken: the ring closes and the words turn green, then the next target or the test view replaces it.
    taken++;
    await phone.waitForFunction(
      (before) => document.querySelector(".kit-hold__count")?.textContent !== before || document.querySelector(".kit-calibrate__title")?.textContent?.startsWith("Try it"),
      count,
      { timeout: 60000 },
    );
  }
  throw new Error("The calibration never reached the test view");
}
