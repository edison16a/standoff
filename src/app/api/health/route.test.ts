import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("health route", () => {
  it("says where rooms live and never caches", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ store: expect.stringMatching(/^(redis|memory)$/), shared: expect.any(Boolean) });
    expect(JSON.stringify(body)).not.toMatch(/redis:\/\//);
  });
});
