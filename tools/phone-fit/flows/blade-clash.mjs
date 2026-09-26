// Blade Clash's phone: calibrate the sword against five targets and a
// guard, pick a fighter, ready, then the controller. It runs twice, with
// motion sensors and with the drag pad a phone without them swings with.

async function calibrate(ctx, sensors) {
  await ctx.phone.locator(".setup-page").waitFor();
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("hold");
  if (!sensors) {
    await ctx.tap("My phone has no motion sensors");
    await ctx.snap("drag");
    await ctx.tap("Next");
    return;
  }
  await ctx.until("Next");
  await ctx.tap("Next");
  await ctx.phone.locator(".target-capture").waitFor();
  await ctx.snap("target");
  // The fake phone holds still, so each target is taken by itself. A slow machine can take the offered shortcut.
  await ctx.phone.waitForFunction(
    () => {
      if (document.querySelector(".kit-steps__title")?.textContent === "Your sword follows") return true;
      const anyway = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Use where I point now"));
      anyway?.click();
      return false;
    },
    null,
    { polling: 500, timeout: 240000 },
  );
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("follow");
  await ctx.tap("Next");
}

async function fight(ctx, sensors) {
  await calibrate(ctx, sensors);
  await ctx.press(".picker__card");
  await ctx.phone.waitForTimeout(600);
  await ctx.snap("fighter");
  await ctx.until("Next");
  await ctx.tap("Next");
  await ctx.phone.waitForTimeout(600);
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
  const match = { health: [4, 2], connected: [true, true], countdown: null, winner: null };
  await ctx.fake("state", { ...match, phase: "countdown", countdown: 3 });
  await ctx.snap("countdown");
  await ctx.fake("state", { ...match, phase: "live" });
  await ctx.snap("live");
  await ctx.fake("state", { ...match, phase: "matchOver", health: [3, 0], winner: 1 });
  await ctx.snap("match-over");
}

export const bladeClash = (ctx) => fight(ctx, true);
export const bladeClashTouch = (ctx) => fight(ctx, false);
