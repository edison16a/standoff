import { describe, expect, it } from "vitest";
import { roomCodeFrom } from "./join-code";

describe("roomCodeFrom", () => {
  it("takes a typed code in any case", () => {
    expect(roomCodeFrom("abcd")).toBe("ABCD");
    expect(roomCodeFrom("  WXYZ ")).toBe("WXYZ");
  });

  it("takes the code from a join link", () => {
    expect(roomCodeFrom("https://standoff.example/join/ABCD")).toBe("ABCD");
    expect(roomCodeFrom("https://192.168.1.20:3443/join/qrst/")).toBe("QRST");
  });

  it("refuses anything that is not a room", () => {
    expect(roomCodeFrom("")).toBeNull();
    expect(roomCodeFrom("ABC")).toBeNull();
    // I and O are left out of codes, since they read like 1 and 0.
    expect(roomCodeFrom("ABCI")).toBeNull();
    expect(roomCodeFrom("https://example.com/")).toBeNull();
    expect(roomCodeFrom("https://example.com/join/ABCD/extra")).toBeNull();
    expect(roomCodeFrom("not a url")).toBeNull();
  });
});
