// Counter Battle's phone: calibrate inside your own view, pick a gun, get
// ready, then the phone is the gun until the result. Runs with motion
// sensors and without, where a drag pad does the aiming.

async function calibrate(ctx) {
  if (!ctx.sensors) {
    await ctx.until("Looks good");
    await ctx.snap("aim-drag");
    await ctx.tap("Looks good");
    return;
  }
  await ctx.until("Set middle");
  await ctx.snap("aim-middle");
  await ctx.tap("Set middle");
  await ctx.snap("aim-top-left");
  await ctx.tap("Set top left");
  await ctx.tap("Set bottom right");
  await ctx.snap("aim-test");
  await ctx.tap("Looks good");
}

export async function counterBattle(ctx) {
  await calibrate(ctx);
  await ctx.snap("gun");
  await ctx.press(".cb-gun:nth-child(4)");
  await ctx.tap(/^Take the/);
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
  // The big screen starts the match; the phone becomes the gun.
  await ctx.host.waitForFunction(() => !document.querySelector(".cb-lobby__start")?.hasAttribute("disabled"), null, { timeout: 60000 });
  await ctx.host.evaluate(() => document.querySelector(".cb-lobby__start").click());
  await ctx.phone.locator(".cb-play").waitFor({ timeout: 60000 });
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("play");
  await ctx.fake("state", { banner: "Round 3", round: 3, score: [2, 1], health: 24, ammo: 0, reloading: true, reloadLeft: 1.2 });
  await ctx.snap("reloading");
  await ctx.fake("state", { alive: false, health: 0, armed: false, banner: null });
  await ctx.snap("down");
  await ctx.fake("state", { phase: "results", won: true, score: [5, 3], kills: 7, deaths: 3, alive: true });
  await ctx.snap("result");
  await ctx.release();
}
