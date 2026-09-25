#!/usr/bin/env node
// Checks that every phone page of every game fits an iPhone 16 screen with
// no scrolling, upright and sideways, with and without Safari's bars. For
// each game it opens a room, joins as a phone, walks every phone step and
// at each one measures the page at all four sizes and saves a screenshot.
// Needs the dev server.
//
//   node tools/phone-fit.mjs [--url http://localhost:3000] [--out shots/]
//     [--games magic-kart,fencing] [--theme light|dark] [--chromium /path/to/chrome]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { FLOWS } from "./phone-fit/flows.mjs";
import { buttonReady, pressButton, pressElement } from "./phone-fit/buttons.mjs";
import { measure } from "./phone-fit/measure.mjs";
import { enterName, hostRoom, joinPhone, VIEWPORTS } from "./phone-fit/room.mjs";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: "phone-fit-shots" },
    games: { type: "string", default: Object.keys(FLOWS).join(",") },
    theme: { type: "string", default: "light" },
    chromium: { type: "string" },
  },
});
const games = values.games.split(",").filter(Boolean);
const unknown = games.filter((game) => !FLOWS[game]);
if (unknown.length) throw new Error(`No phone flow for ${unknown.join(", ")}. Known: ${Object.keys(FLOWS).join(", ")}`);
mkdirSync(values.out, { recursive: true });

const browser = await chromium.launch({ executablePath: values.chromium ?? process.env.CHROMIUM_PATH });
const failures = [];

for (const game of games) {
  console.log(`\n${game}`);
  const entry = typeof FLOWS[game] === "function" ? { game, flow: FLOWS[game] } : FLOWS[game];
  const { host, code } = await hostRoom(browser, values.url, entry.game, values.theme);
  const sensors = entry.sensors ?? true;
  const phone = await joinPhone(browser, values.url, code, "P1", { theme: values.theme, sensors });
  let home = VIEWPORTS[0];
  let count = 0;

  const ctx = {
    game, host, phone, url: values.url, code, browser, theme: values.theme, sensors,
    /** Measures the page at every size, then puts the phone back how the flow held it. */
    async snap(step) {
      const index = String(++count).padStart(2, "0");
      for (const view of VIEWPORTS) {
        await phone.setViewportSize({ width: view.width, height: view.height });
        await phone.waitForTimeout(300);
        const problems = await phone.evaluate(measure);
        // Software 3D can hold a frame back a long while, so a slow screenshot is only noted.
        await phone
          .screenshot({ path: join(values.out, `${game}-${index}-${step}-${view.name}.png`), timeout: 60000 })
          .catch(() => console.log(`  no screenshot of ${step} ${view.name}`));
        const tag = `${step} ${view.name} ${view.width}x${view.height}`;
        if (problems.length) failures.push({ game, tag, problems });
        console.log(`  ${problems.length ? "FAIL" : "ok  "} ${tag}${problems.map((p) => `\n         ${p}`).join("")}`);
      }
      await phone.setViewportSize({ width: home.width, height: home.height });
      await phone.waitForTimeout(200);
    },
    /** Holds the phone upright or sideways for the steps that follow. */
    async hold(name) {
      home = VIEWPORTS.find((view) => view.name === name) ?? home;
      await phone.setViewportSize({ width: home.width, height: home.height });
      await phone.waitForTimeout(300);
    },
    /** Taps the first button with this text, or matching this pattern. */
    async tap(text) {
      await pressButton(phone, text);
      await phone.waitForTimeout(400);
    },
    /** Taps the first element matching a CSS selector, like a card in a picker. */
    async press(selector) {
      await pressElement(phone, selector);
      await phone.waitForTimeout(400);
    },
    /** Waits until a button is there and enabled. */
    until: (text) => buttonReady(phone, text),
    /** Holds back the host's own messages and hands the phone the last one of a kind, changed. */
    async fake(kind, patch) {
      // A patch is fields to change, or a function from the last message to the new one.
      const change = typeof patch === "function" ? patch.toString() : `(last) => ({ ...last, ...${JSON.stringify(patch)} })`;
      await phone.evaluate(`(() => {
        window.__wire.hold = true;
        const last = window.__wire.last[${JSON.stringify(kind)}];
        if (!last) throw new Error("The host never sent a ${kind} message");
        window.__wire.inject((${change})(structuredClone(last)));
      })()`);
      await phone.waitForTimeout(400);
    },
    /** Lets the host's messages through again. */
    async release() {
      await phone.evaluate(() => (window.__wire.hold = false));
    },
  };

  try {
    await phone.locator(".name-field__input").waitFor();
    await ctx.snap("name");
    await enterName(phone, "P1");
    await entry.flow(ctx);
  } catch (error) {
    failures.push({ game, tag: "flow", problems: [error.message.split("\n")[0]] });
    console.log(`  FAIL flow: ${error.message.split("\n").slice(0, 12).join("\n    ")}`);
    await phone.screenshot({ path: join(values.out, `${game}-flow-error.png`) }).catch(() => undefined);
  }
  await host.context().close().catch(() => undefined);
  await phone.context().close().catch(() => undefined);
}

await browser.close();
console.log(failures.length ? `\n${failures.length} checks failed.` : "\nEvery phone page fits.");
process.exit(failures.length ? 1 : 0);
