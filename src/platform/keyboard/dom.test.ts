// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { receive, type PanelMessage } from "./bridge";
import { isTypingTarget } from "./key-state";

describe("isTypingTarget", () => {
  it("is true in text fields and false on buttons and the page", () => {
    const text = document.createElement("input");
    const box = document.createElement("input");
    box.type = "checkbox";
    expect(isTypingTarget(text)).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(box)).toBe(false);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });
});

describe("receive", () => {
  const panel = {} as Window;
  const message = (data: unknown, source: unknown = panel, origin = location.origin) =>
    ({ data, source, origin }) as unknown as MessageEvent;

  it("takes a tagged message from the panel it expects", () => {
    const got = receive<PanelMessage>(message({ tag: "standoff-keyboard", type: "blur" }), panel);
    expect(got?.type).toBe("blur");
  });

  it("ignores other origins, other frames and untagged data", () => {
    expect(receive(message({ tag: "standoff-keyboard", type: "blur" }, panel, "https://evil.example"), panel)).toBeNull();
    expect(receive(message({ tag: "standoff-keyboard", type: "blur" }, {}), panel)).toBeNull();
    expect(receive(message({ type: "blur" }), panel)).toBeNull();
    expect(receive(message({ tag: "standoff-keyboard", type: "blur" }), null)).toBeNull();
  });
});
