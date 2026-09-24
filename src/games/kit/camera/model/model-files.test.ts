import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CACHE_NAME, runtimeFiles, TASKS_VISION_VERSION } from "./model-files";

const packageDir = fileURLToPath(new URL("../../../../../node_modules/@mediapipe/tasks-vision/", import.meta.url));

describe("the pose model's files", () => {
  it("pins the runtime to the installed @mediapipe/tasks-vision", () => {
    const installed = JSON.parse(readFileSync(`${packageDir}package.json`, "utf8")) as { version: string };
    expect(TASKS_VISION_VERSION).toBe(installed.version);
    expect(CACHE_NAME).toContain(installed.version);
  });

  it("knows the size of each runtime file, for the progress bar", () => {
    for (const simd of [true, false]) {
      const { loader, binary } = runtimeFiles(simd);
      for (const file of [loader, binary]) {
        const name = file.url.split("/").pop()!;
        expect(statSync(`${packageDir}wasm/${name}`).size).toBe(file.bytes);
        expect(file.url).toContain(`@${TASKS_VISION_VERSION}/wasm/`);
      }
    }
  });
});
