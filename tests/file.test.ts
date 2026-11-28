import { describe, test, expect } from "bun:test";
import { Data } from "../src/data";

describe("loading files", () => {
  test.each([
    ["evoked1.anz", 10000, 0, true],
    ["evoked2.anz", 10000, 0, true],
    ["respiration1.anz", 100, 1, false],
    ["respiration2.anz", 100, 1, false],
    ["smoothmuscle1.anz", 100, 0, false],
    ["smoothmuscle2.anz", 100, 2, false],
  ])(
    "loads %s correctly",
    async (fileName, expectedSamplingRate, expectedLocatorsLength, expectedIsEvoked) => {
      const data = new Data();
      const file = Bun.file(new URL(`../testfiles/${fileName}`, import.meta.url));
      await data.loadFromFile(new File([file], fileName));

      expect(data.samplingRate).toBe(expectedSamplingRate);
      expect(data.locators).toHaveLength(expectedLocatorsLength);
      expect(data.isEvoked).toBe(expectedIsEvoked);
    },
  );

  test("rejects an empty file", async () => {
    const data = new Data();
    const file = Bun.file(new URL("../testfiles/corrupted1.anz", import.meta.url));
    expect(data.loadFromFile(new File([file], "corrupted1.anz"))).rejects.toThrow();
  });

  test("rejects a corrupted file", async () => {
    const data = new Data();
    const file = Bun.file(new URL("../testfiles/corrupted2.anz", import.meta.url));
    expect(data.loadFromFile(new File([file], "corrupted2.anz"))).rejects.toThrow();
  });

  test("reusing a data object clears the previous recording's event markers", async () => {
    const data = new Data();
    const respiration = Bun.file(new URL("../testfiles/respiration1.anz", import.meta.url));
    await data.loadFromFile(new File([respiration], "respiration1.anz"));

    expect(data.locators).toHaveLength(1);

    const evoked = Bun.file(new URL("../testfiles/evoked1.anz", import.meta.url));
    await data.loadFromFile(new File([evoked], "evoked1.anz"));

    expect(data.locators).toHaveLength(0);
  });

  test("interpolated points are calculated correctly", async () => {
    const data = new Data();
    data.data = [1, 2, 3, 4, 5, 6, 7, 8];

    data.interpolationDegree = 2;
    const interpolatedPoints = data.points(true);

    expect(interpolatedPoints).toHaveLength(4);
    expect(interpolatedPoints).toEqual([
      { x: 0, y: 1.5 },
      { x: 2, y: 3.5 },
      { x: 4, y: 5.5 },
      { x: 6, y: 7.5 },
    ]);
  });
});
