// Football 3v3's phone pages: the star and ready steps, then every
// controller layout, reached by handing the phone made up host states:
// the play call, the QB before and after the snap and on a run call, the
// QB after he pressed Run, a runner, the defence (also while the other side calls its play), the
// kick meters, a replay with Skip, and the result.

async function pickStar(ctx) {
  await ctx.phone.waitForFunction(() => document.querySelector(".fb-pick__card") !== null, null, { polling: 250, timeout: 60000 });
  await ctx.phone.waitForTimeout(800);
  // The host confirms the pick, so a tap made before the line is up is tried again.
  for (let i = 0; i < 10; i++) {
    await ctx.press(".fb-pick__card:nth-child(2)");
    const ready = await ctx.phone.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Next" && !b.disabled));
    if (ready) break;
    await ctx.phone.waitForTimeout(1000);
  }
  await ctx.until("Next");
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("star");
  await ctx.tap("Next");
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
}

const GAME = {
  team: 0, role: "qb", playing: true, score: [7, 3], quarter: 2, overtime: false, clock: 94, down: "2nd and 6", offense: true,
  choose: null, hikeLeft: null, meter: null, withBall: false, canThrow: false, runPlay: false, canPitch: false, canRun: false, jukeReady: true, rushReady: true, guarding: false,
  grounded: false, banner: null, skip: null, result: null, stats: { passYards: 42, rushYards: 8, recYards: 0, touchdowns: 1, tackles: 0, interceptions: 0 },
};

export async function football3v3(ctx) {
  await pickStar(ctx);
  await ctx.fake("state", { ...GAME, phase: "choose", pad: "choose", choose: { options: ["throw", "run", "kick"], left: 8 } });
  await ctx.phone.locator(".fb-choose").waitFor({ state: "attached", timeout: 5000 });
  await ctx.snap("call");
  await ctx.fake("state", { ...GAME, phase: "convert", pad: "choose", choose: { options: ["kick", "two"], left: 9 } });
  await ctx.snap("call-try");
  await ctx.fake("state", { ...GAME, phase: "presnap", pad: "qb", hikeLeft: 4 });
  await ctx.snap("hike");
  await ctx.fake("state", { ...GAME, phase: "live", pad: "qb", withBall: true, canThrow: true, canRun: true });
  await ctx.snap("qb");
  await ctx.fake("state", { ...GAME, phase: "live", pad: "qb", withBall: true, runPlay: true, canPitch: true, canRun: true });
  await ctx.snap("qb-run");
  await ctx.fake("state", { ...GAME, phase: "live", pad: "runner", withBall: true });
  await ctx.snap("qb-ran");
  await ctx.fake("state", { ...GAME, phase: "live", role: "runner", pad: "runner", withBall: true });
  await ctx.snap("runner");
  await ctx.fake("state", { ...GAME, phase: "live", role: "runner", offense: false, pad: "defense", guarding: true });
  await ctx.snap("defense");
  await ctx.fake("state", { ...GAME, phase: "choose", role: "runner", offense: false, pad: "defense" });
  await ctx.snap("defense-call");
  await ctx.fake("state", { ...GAME, phase: "kick", pad: "kicker", meter: { stage: "aim", fieldGoal: true } });
  await ctx.phone.locator(".fb-kick").waitFor({ state: "attached", timeout: 5000 });
  await ctx.snap("kick");
  await ctx.fake("state", { ...GAME, phase: "replay", pad: "wait", skip: { agreed: false, count: 1, total: 2 } });
  await ctx.snap("replay-skip");
  await ctx.fake("state", { ...GAME, phase: "over", pad: "wait", result: "win" });
  await ctx.snap("result");
}
