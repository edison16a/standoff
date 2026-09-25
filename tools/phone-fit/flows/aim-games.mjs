// The three games that aim by pointing the phone at the screen. They share
// the kit's calibration page, then each has its own pick, ready and play.
// Each also runs without motion sensors, where a drag pad does the aiming.

/** The kit's calibration: the middle, both corners, then the test view. */
async function calibrateAim(ctx) {
  // A phone with no sensors goes straight to the drag pad.
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
  await ctx.snap("aim-bottom-right");
  await ctx.tap("Set bottom right");
  await ctx.snap("aim-test");
  await ctx.tap("Looks good");
}

export async function zombieSurvival(ctx) {
  await calibrateAim(ctx);
  await ctx.snap("weapon");
  await ctx.tap(/^Take the/);
  await ctx.snap("ready");
  await ctx.tap("I am ready");
  await ctx.snap("ready-on");
  // One player ready starts the run.
  await ctx.phone.locator(".zs-play").waitFor({ timeout: 30000 });
  await ctx.phone.waitForTimeout(1000);
  await ctx.snap("play");
  await ctx.fake("state", { phase: "cutscene" });
  await ctx.fake("score", { kills: 12, accuracy: 0.62, headshots: 4, weakHits: 3 });
  await ctx.snap("cutscene");
  await ctx.fake("state", { phase: "down" });
  await ctx.snap("down");
  await ctx.fake("state", { phase: "escaped" });
  await ctx.snap("escaped");
}

export async function fruitNinja(ctx) {
  await calibrateAim(ctx);
  await ctx.snap("blade");
  await ctx.tap("Next");
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
  await ctx.fake("state", { phase: "playing", inRound: true, secondsLeft: 42, score: 120, rank: 1, players: 1 });
  await ctx.snap("play");
  const standings = [1, 2, 3, 4].map((seat) => ({ seat, name: `Player ${seat}`, score: 400 - seat * 60 }));
  await ctx.fake("state", { phase: "over", inRound: true, score: 340, rank: 1, standings, winners: [1] });
  await ctx.snap("over");
}

export async function shootingGallery(ctx) {
  await calibrateAim(ctx);
  await ctx.snap("gun");
  await ctx.tap("Next");
  await ctx.snap("ready");
  await ctx.press(".sg-ready");
  await ctx.phone.waitForTimeout(400);
  await ctx.snap("ready-on");
  await ctx.fake("state", (last) => ({ ...last, phase: "playing", timeLeft: 42, players: last.players.map((p) => ({ ...p, inRound: true, score: 90, shots: 12, hits: 7, place: 1 })) }));
  await ctx.snap("play");
  await ctx.fake("state", (last) => {
    const me = last.players[0];
    const others = [2, 3, 4].map((seat) => ({ ...me, seat, name: `Player ${seat}`, score: 300 - seat * 50, place: seat, best: null }));
    return { ...last, phase: "results", winners: [1], players: [{ ...me, inRound: true, score: 320, place: 1, best: 2 }, ...others] };
  });
  await ctx.snap("results");
}
