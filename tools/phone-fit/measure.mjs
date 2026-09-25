// What the phone fit check looks for on a page: the page itself never
// scrolls, no box inside it scrolls, and nothing a player can tap sits
// even partly outside the screen or shrinks too small to tap.

/** Runs in the page. Returns a list of problems, empty when it all fits. */
export function measure() {
  const problems = [];
  const w = innerWidth;
  const h = innerHeight;
  const root = document.scrollingElement ?? document.documentElement;
  if (root.scrollHeight > h + 1) problems.push(`page scrolls down by ${root.scrollHeight - h}px`);
  if (root.scrollWidth > w + 1) problems.push(`page scrolls sideways by ${root.scrollWidth - w}px`);

  const name = (el) => {
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24);
    const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
  };
  const shown = (el) => {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };

  // A box that scrolls on its own is still scrolling, just hidden better.
  for (const el of document.querySelectorAll("body *")) {
    const style = getComputedStyle(el);
    const scrolls = /(auto|scroll)/.test(style.overflowY + style.overflowX);
    if (!shown(el)) continue;
    if (scrolls) {
      const over = Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth);
      if (over > 1) problems.push(`${name(el)} scrolls by ${over}px`);
    } else if (style.overflowY === "visible" && /^kit-steps__(body|footer)$/.test(el.classList[0] ?? "")) {
      // A squeezed step spills over whatever comes next, which no scroll check sees.
      const spill = el.scrollHeight - el.clientHeight;
      if (spill > 2) problems.push(`${name(el)} spills out by ${spill}px`);
    }
  }

  // Anything tappable must sit fully on screen, and not be clipped by a parent.
  const tappable = "button, a[href], input, select, textarea, [role=button], [role=slider]";
  for (const el of document.querySelectorAll(tappable)) {
    if (!shown(el)) continue;
    const box = el.getBoundingClientRect();
    // A squeezed control is as bad as a hidden one. 40px is the site's smallest button; the bar keeps its own sizes.
    if (!el.closest(".phone__bar") && (box.width < 39.5 || box.height < 39.5)) problems.push(`${name(el)} is too small to tap at ${Math.round(box.width)} by ${Math.round(box.height)}`);
    const out = box.left < -1 || box.top < -1 || box.right > w + 1 || box.bottom > h + 1;
    if (out) {
      problems.push(`${name(el)} is cut off at ${Math.round(box.left)},${Math.round(box.top)} to ${Math.round(box.right)},${Math.round(box.bottom)}`);
      continue;
    }
    // Something laid over the middle of a live control, like a box that grew into the footer.
    if (!el.disabled) {
      const top = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      // A card laid on top on purpose is positioned; a box that spilled over is not.
      let layered = false;
      for (let p = top; p && !p.contains(el); p = p.parentElement) {
        if (/absolute|fixed/.test(getComputedStyle(p).position)) layered = true;
      }
      if (top && !layered && !el.contains(top) && !top.contains(el) && getComputedStyle(top).pointerEvents !== "none") {
        problems.push(`${name(el)} is covered by ${name(top)}`);
        continue;
      }
    }
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const style = getComputedStyle(p);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const clip = p.getBoundingClientRect();
      if (box.top < clip.top - 1 || box.bottom > clip.bottom + 1 || box.left < clip.left - 1 || box.right > clip.right + 1) {
        problems.push(`${name(el)} is clipped by ${name(p)}`);
        break;
      }
    }
  }
  return problems;
}
