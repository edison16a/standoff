// Finding and pressing buttons from inside the page. A phone page busy
// drawing 3D in software can hold its frames back for seconds, and
// Playwright's own taps wait on frames, so these poll on a timer instead
// and click from script.

/** Runs in the page: the first visible, enabled match, clicked when asked. */
function findButton([pattern, flags, exact, selector, click]) {
  const matcher = new RegExp(pattern, flags);
  const shown = (el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  const named = (el) => {
    const name = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
    return exact === null ? true : exact ? name === exact : matcher.test(name);
  };
  const el = [...document.querySelectorAll(selector)].find((candidate) => shown(candidate) && named(candidate));
  if (!el || el.disabled) return false;
  if (click) el.click();
  return true;
}

function args(text, selector, click) {
  if (text === null) return [".", "", null, selector, click];
  if (typeof text === "string") return [".", "", text, selector, click];
  return [text.source, text.flags, false, selector, click];
}

const OPTIONS = { polling: 250, timeout: 60000 };

/** Presses the first visible button with this text, or matching this pattern. */
export async function pressButton(page, text) {
  await page.waitForFunction(findButton, args(text, "button", true), OPTIONS);
}

/** Presses the first visible element matching a CSS selector. */
export async function pressElement(page, selector) {
  await page.waitForFunction(findButton, args(null, selector, true), OPTIONS);
}

/** Waits until a button with this text is visible and enabled. */
export async function buttonReady(page, text) {
  await page.waitForFunction(findButton, args(text, "button", false), OPTIONS);
}
