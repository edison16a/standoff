// The aim kit's hold to calibrate pages, driven like a real player: past
// the grip page, point the fake phone at each target the page asks for and
// hold still until it is taken and the next one comes up by itself. No
// buttons are pressed on the target pages.

/** Where a player sitting square to the screen points for each target: compass heading and elevation, degrees. */
const AIM = {
  middle: [0, 0],
  "Top left": [-14, 8],
  "Top right": [14, 8],
  "Bottom right": [14, -8],
  "Bottom left": [-14, -8],
};
/** The page title once every target is taken. */
const TEST_TITLE = "Your aim follows";

const whereOf = (title) => Object.keys(AIM).find((place) => title.includes(place));

/**
 * Points at every target in turn until the test view shows. Takes a
 * screenshot of the first target. Returns how many targets were taken.
 */
export async function holdTargets(ctx) {
  const { phone } = ctx;
  // First the grip page, with Next once the sensors are live.
  await phone.locator(".kit-cal .hold-art").waitFor({ timeout: 60000 });
  await ctx.snap("aim-hold");
  await ctx.until("Next");
  await ctx.tap("Next");
  await phone.locator(".kit-target").waitFor({ timeout: 60000 });
  await ctx.snap("aim-target");
  let taken = 0;
  for (let guard = 0; guard < 12; guard++) {
    const title = (await phone.locator(".kit-steps__title").textContent()) ?? "";
    if (title.startsWith(TEST_TITLE)) return taken;
    const place = whereOf(title);
    if (!place) throw new Error(`No target in the title "${title}"`);
    const [heading, up] = AIM[place];
    const aim = ([a, b]) => Object.assign(window.__sensors, { alpha: -a, beta: b, gamma: 0 });
    // A hand swings over to the target: the first one waits for the phone to move from how the page found it.
    await phone.evaluate(aim, [heading + 6, up + 4]);
    await phone.waitForTimeout(700);
    await phone.evaluate(aim, [heading, up]);
    const count = await phone.locator(".kit-target__count").textContent();
    // Taken: the ring closes and the dot pops, then the next target or the test view replaces it.
    taken++;
    await phone.waitForFunction(
      ([before, test]) => document.querySelector(".kit-target__count")?.textContent !== before || document.querySelector(".kit-steps__title")?.textContent?.startsWith(test),
      [count, TEST_TITLE],
      { timeout: 60000 },
    );
  }
  throw new Error("The calibration never reached the test view");
}
