// Football 3v3's phone pages: the star and ready steps, then every
// controller layout, reached by handing the phone made up host states:
// the play call, the page of plays, the QB before and after the snap
// and on a run call, the QB after he pressed Run, a runner, the receiver
// a QB took over after his pass, the defence (also while the other side calls its play), the
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
  switched: false,
  choose: null, book: null, aim: null, hikeLeft: null, meter: null, withBall: false, canThrow: false, throws: [], runPlay: false, canPitch: false, backSlot: null, canRun: false, jukeReady: true, jukeCool: 0, stamina: 0.65, rushReady: true, guarding: false,
  grounded: false, banner: null, skip: null, result: null, stats: { passYards: 42, rushYards: 8, recYards: 0, touchdowns: 1, tackles: 0, interceptions: 0 },
};

/** A page of plays as the engine deals it for a full side, to draw the play cards: two to a page. */
const BOOK = {"call":"throw","left":12,"los":0.27,"qb":[0.5,0.1],"plays":[{"name":"Fade Dig","runners":[{"n":1,"path":[[0.23,0.23],[0.23,0.56],[0.53,0.58]],"end":"arrow","word":"Dig","free":true,"carry":false},{"n":2,"path":[[0.37,0.22],[0.37,0.49],[0.1,0.5]],"end":"arrow","word":"Out","free":false,"carry":false},{"n":3,"path":[[0.67,0.23],[0.7,0.36],[0.75,0.76],[0.76,1]],"end":"arrow","word":"Fade","free":false,"carry":false},{"n":4,"path":[[0.77,0.23],[0.77,0.3],[0.65,0.53],[0.48,1]],"end":"arrow","word":"Slant","free":false,"carry":false}]},{"name":"Corner Zig zag","runners":[{"n":1,"path":[[0.23,0.23],[0.23,0.6],[0.26,0.53]],"end":"stop","word":"Curl","free":true,"carry":false},{"n":2,"path":[[0.37,0.22],[0.37,0.39],[0.44,0.49],[0.31,0.59],[0.29,1]],"end":"arrow","word":"Zig zag","free":false,"carry":false},{"n":3,"path":[[0.67,0.23],[0.67,0.6],[0.81,1]],"end":"arrow","word":"Corner","free":false,"carry":false},{"n":4,"path":[[0.77,0.23],[0.77,0.7],[0.82,0.6]],"end":"stop","word":"Comeback","free":false,"carry":false}]},{"name":"Post Zig zag","runners":[{"n":1,"path":[[0.23,0.23],[0.23,0.4],[0.31,0.5],[0.18,0.6],[0.15,1]],"end":"arrow","word":"Zig zag","free":true,"carry":false},{"n":2,"path":[[0.37,0.22],[0.37,0.59],[0.4,0.52]],"end":"stop","word":"Curl","free":false,"carry":false},{"n":3,"path":[[0.67,0.23],[0.67,0.6],[0.54,1]],"end":"arrow","word":"Post","free":false,"carry":false},{"n":4,"path":[[0.77,0.23],[0.77,0.56],[0.47,0.58]],"end":"arrow","word":"Dig","free":false,"carry":false}]},{"name":"Go Zig zag","runners":[{"n":1,"path":[[0.23,0.23],[0.22,0.4],[0.21,1]],"end":"arrow","word":"Go","free":true,"carry":false},{"n":2,"path":[[0.37,0.22],[0.37,0.39],[0.44,0.49],[0.31,0.59],[0.29,1]],"end":"arrow","word":"Zig zag","free":false,"carry":false},{"n":3,"path":[[0.67,0.23],[0.67,0.6],[0.54,1]],"end":"arrow","word":"Post","free":false,"carry":false},{"n":4,"path":[[0.77,0.23],[0.77,0.7],[0.82,0.6]],"end":"stop","word":"Comeback","free":false,"carry":false}]},{"name":"Wheel Wheel","runners":[{"n":1,"path":[[0.23,0.23],[0.23,0.56],[0.53,0.58]],"end":"arrow","word":"Dig","free":true,"carry":false},{"n":2,"path":[[0.37,0.22],[0.29,0.25],[0.24,0.39],[0.23,1]],"end":"arrow","word":"Wheel","free":false,"carry":false},{"n":3,"path":[[0.67,0.23],[0.67,0.43],[0.68,1]],"end":"arrow","word":"Seam","free":false,"carry":false},{"n":4,"path":[[0.77,0.23],[0.77,0.5],[0.97,0.51]],"end":"arrow","word":"Out","free":false,"carry":false}]},{"name":"Go Comeback","runners":[{"n":1,"path":[[0.23,0.23],[0.23,0.7],[0.18,0.6]],"end":"stop","word":"Comeback","free":true,"carry":false},{"n":2,"path":[[0.37,0.22],[0.37,0.49],[0.1,0.5]],"end":"arrow","word":"Out","free":false,"carry":false},{"n":3,"path":[[0.67,0.23],[0.68,0.4],[0.7,1]],"end":"arrow","word":"Go","free":false,"carry":false},{"n":4,"path":[[0.77,0.23],[0.77,0.6],[0.64,1]],"end":"arrow","word":"Post","free":false,"carry":false}]}]};
BOOK.plays = BOOK.plays.slice(0, 2);

export async function football3v3(ctx) {
  await pickStar(ctx);
  await ctx.fake("state", { ...GAME, phase: "choose", pad: "choose", choose: { options: ["throw", "run", "kick"], left: 8 } });
  await ctx.phone.locator(".fb-choose").waitFor({ state: "attached", timeout: 5000 });
  await ctx.snap("call");
  await ctx.fake("state", { ...GAME, phase: "choose", pad: "playbook", book: BOOK });
  await ctx.phone.locator(".fb-book").waitFor({ state: "attached", timeout: 5000 });
  await ctx.snap("playbook");
  await ctx.fake("state", { ...GAME, phase: "convert", pad: "choose", choose: { options: ["kick", "two"], left: 9 } });
  await ctx.snap("call-try");
  await ctx.fake("state", { ...GAME, phase: "presnap", pad: "qb", hikeLeft: 4, throws: [false, false, false, false] });
  await ctx.snap("hike");
  await ctx.fake("state", { ...GAME, phase: "live", pad: "qb", withBall: true, canThrow: true, throws: [true, true, false, true], canRun: true, aim: 0.55 });
  await ctx.snap("qb");
  await ctx.fake("state", { ...GAME, phase: "live", pad: "qb", withBall: true, canThrow: true, throws: [true, true, true, true], runPlay: true, canPitch: true, backSlot: 1, canRun: true });
  await ctx.snap("qb-run");
  await ctx.fake("state", { ...GAME, phase: "live", pad: "runner", withBall: true });
  await ctx.snap("qb-ran");
  await ctx.fake("state", { ...GAME, phase: "live", role: "runner", pad: "runner", withBall: true });
  await ctx.snap("runner");
  await ctx.fake("state", { ...GAME, phase: "live", role: "runner", pad: "runner", switched: true });
  await ctx.snap("switched");
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
