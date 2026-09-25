// Fencing's phone: calibrate the sword, practise, pick a fencer, ready,
// then the pad. It runs twice, with motion sensors and with the buttons a
// phone without them fences with.

async function calibrate(ctx, sensors) {
  await ctx.phone.locator(".setup-page").waitFor();
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("hold");
  if (!sensors) {
    await ctx.tap("My phone has no motion sensors");
    await ctx.snap("buttons");
    await ctx.tap("Next");
    return;
  }
  await ctx.until("Next");
  await ctx.tap("Next");
  await ctx.snap("level");
  // The level takes the guard by itself once the phone holds still, or offers to take it as it is.
  await ctx.phone.waitForFunction(
    () => {
      if (document.querySelector(".kit-steps__title")?.textContent === "Your sword follows") return true;
      const anyway = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Use the pose I have now"));
      anyway?.click();
      return false;
    },
    null,
    { polling: 500, timeout: 60000 },
  );
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("follow");
  await ctx.tap("Next");
}

async function fence(ctx, sensors) {
  await calibrate(ctx, sensors);
  await ctx.phone.waitForTimeout(600);
  await ctx.snap("practice");
  await ctx.tap(sensors ? "Skip practice" : "Next");
  await ctx.press(".picker__card");
  await ctx.phone.waitForTimeout(1000);
  await ctx.snap("fencer");
  await ctx.until("Next");
  await ctx.tap("Next");
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
  const match = { scores: [1, 0], connected: [true, true], countdown: null, call: null, winner: null };
  await ctx.fake("state", { ...match, phase: "enGarde", countdown: 3 });
  await ctx.snap("en-garde");
  await ctx.fake("state", { ...match, phase: "live" });
  await ctx.snap("live");
  await ctx.fake("state", { ...match, phase: "matchOver", scores: [2, 1], winner: 1 });
  await ctx.snap("match-over");
}

export const fencing = (ctx) => fence(ctx, true);
export const fencingButtons = (ctx) => fence(ctx, false);
