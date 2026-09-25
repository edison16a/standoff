// Draws animation frames five times a second instead of sixty. The fit
// check only looks at layout, and a test browser draws 3D in software,
// so a page with several spinning models would otherwise keep its main
// thread too busy to answer. Add it with context.addInitScript.
(() => {
  const EVERY_MS = 200;
  const native = window.requestAnimationFrame.bind(window);
  const cancelled = new Set();
  let next = 1;
  window.requestAnimationFrame = (callback) => {
    const id = next++;
    setTimeout(() => native((now) => !cancelled.delete(id) && callback(now)), EVERY_MS);
    return id;
  };
  window.cancelAnimationFrame = (id) => cancelled.add(id);
})();
