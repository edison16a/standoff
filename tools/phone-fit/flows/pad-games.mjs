// The games played on an on screen pad: Magic Kart's wheel, the sports
// games' sticks and buttons, and Brawl Battle's pad.

/** Tries a few ways of holding the phone until the game takes one as held upright. */
async function holdUpright(ctx, button) {
  const holds = [
    { alpha: 0, beta: 0, gamma: -90 },
    { alpha: 0, beta: 0, gamma: 90 },
    { alpha: 0, beta: 90, gamma: 0 },
    { alpha: 0, beta: 80, gamma: -10 },
  ];
  for (const hold of holds) {
    await ctx.phone.evaluate((h) => Object.assign(window.__sensors, h), hold);
    await ctx.phone.waitForTimeout(500);
    if (await button.isEnabled()) return true;
  }
  return false;
}

export async function magicKart(ctx) {
  await ctx.phone.locator(".mk-setup").waitFor();
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("calibrate");
  // Calibrating needs the phone sideways and upright, like a wheel.
  await ctx.hold("landscape");
  const calibrate = ctx.phone.getByRole("button", { name: "Calibrate", exact: true });
  if (!(await holdUpright(ctx, calibrate))) throw new Error("No way of holding the phone let it calibrate");
  await ctx.snap("calibrate-live");
  await calibrate.evaluate((el) => el.click());
  await ctx.phone.waitForTimeout(400);
  await ctx.snap("calibrated");
  await ctx.tap("Next");
  await ctx.hold("portrait");
  await race(ctx);
}

/** A phone with no tilt sensor steers with arrow buttons instead. */
export async function magicKartButtons(ctx) {
  await ctx.phone.locator(".mk-setup").waitFor();
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("calibrate");
  await ctx.tap("Steer with buttons");
  await ctx.snap("buttons");
  await ctx.tap("Next");
  await race(ctx);
}

/** The driver, ready, and the race itself, shared by both ways of steering. */
async function race(ctx) {
  await ctx.press(".mk-pick__card");
  await ctx.phone.waitForTimeout(1200);
  await ctx.snap("kart");
  await ctx.tap("Next");
  await ctx.phone.waitForTimeout(800);
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
  const race = { racing: true, place: 2, karts: 4, lap: 2, laps: 3, item: "nitro", rolling: false, surge: 0.5 };
  await ctx.fake("state", { ...race, phase: "countdown", countdown: 3 });
  await ctx.snap("countdown");
  await ctx.fake("state", { ...race, phase: "racing", countdown: null, wrongWay: true });
  await ctx.snap("drive");
  await ctx.fake("state", { ...race, phase: "results", countdown: null, place: 1, finished: true });
  await ctx.snap("result");
}

/** A star pick and a ready page, shared by the two sports games. */
async function pickStar(ctx, card) {
  await ctx.phone.waitForSelector(card);
  await ctx.phone.waitForTimeout(800);
  // The host confirms the pick, so a tap made before the line is up is tried again.
  for (let i = 0; i < 10; i++) {
    await ctx.press(`${card}:nth-child(2)`);
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

export async function nba3v3(ctx) {
  await pickStar(ctx, ".nba-pick__card");
  const court = {
    team: 0, score: [12, 9], shotClock: 14, hasBall: true, attacking: true, holder: "P1", mustClear: false,
    canSteal: false, meter: { fullMs: 900, greenMs: 620, halfMs: 60 }, onFire: false, countdown: null,
  };
  await ctx.fake("state", { phase: "countdown", team: 0, playing: true, court: { ...court, countdown: 3 } });
  await ctx.snap("countdown");
  await ctx.fake("state", { phase: "live", team: 0, playing: true, court });
  await ctx.snap("pad");
  await ctx.fake("state", { phase: "over", team: 0, playing: true, court, result: { won: true, points: 14, rebounds: 5, assists: 3 } });
  await ctx.snap("result");
}

export async function fifa3v3(ctx) {
  await pickStar(ctx, ".fifa-pick__card");
  const match = { team: 0, playing: true, score: [2, 1], clock: 95, golden: false, goals: 1 };
  await ctx.fake("state", { ...match, phase: "play", hasBall: true, banner: null });
  await ctx.snap("pad");
  await ctx.fake("state", { ...match, phase: "goal", hasBall: false, banner: "Goal" });
  await ctx.snap("goal");
  await ctx.fake("state", { ...match, phase: "fulltime", hasBall: false, result: "win", banner: null });
  await ctx.snap("result");
}

export async function brawlBattle(ctx) {
  await ctx.phone.waitForSelector(".bb-pick__card");
  await ctx.phone.waitForTimeout(600);
  await ctx.snap("fighter-none");
  await ctx.press(".bb-pick__card:nth-child(2)");
  await ctx.until("Next");
  await ctx.snap("fighter");
  await ctx.tap("Next");
  await ctx.snap("ready");
  await ctx.tap("Ready");
  await ctx.snap("ready-on");
  const fight = { playing: true, percent: 64, stocks: 2, ult: 1, out: false, kos: 1, place: null };
  await ctx.fake("state", { ...fight, phase: "countdown", banner: "3" });
  await ctx.snap("countdown");
  await ctx.fake("state", { ...fight, phase: "fight", banner: null });
  await ctx.snap("pad");
  await ctx.fake("state", { ...fight, phase: "results", place: 1, kos: 3, banner: null });
  await ctx.snap("result");
}
