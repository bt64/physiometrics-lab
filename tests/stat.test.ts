import { describe, expect, test } from "bun:test";
import { Data } from "../src/data";
import { DataHelpers } from "../src/data-helpers";

const points = (voltages: number[]) => {
  return voltages.map((y, x) => ({ x, y }));
};

describe("statistics", () => {
  test.each([-2, 0, 2])("keeps a mean of %d V in measurement coordinates", (offset) => {
    const measurement = new Data();
    measurement.data = [offset - 1, offset + 1];
    measurement.interpolationDegree = 1;

    expect(DataHelpers.mean(measurement.pointsInRange(0, 2))).toBe(offset);
    expect(measurement.getPointAtTime(0)).toBe(offset - 1);
  });

  test("computes std and range from the marked voltages", () => {
    const markers = points([1, 3, 1, 3]);

    expect(DataHelpers.std(markers)).toBe(1);
    expect(DataHelpers.range(markers)).toEqual({ min: 1, max: 3, range: 2 });
  });

  test("measures consecutive amplitudes in time order", () => {
    const [first, second, third, fourth] = points([1, 3, 2, 6]);
    const manuallyEdited = [first, third, fourth, second];

    expect(DataHelpers.amplitudes(manuallyEdited)).toEqual([2, 1, 4]);
    expect(DataHelpers.meanAmplitude(manuallyEdited)).toBe(7 / 3);
  });

  test("computes the frequency of a 1/2 Hz triangle wave", () => {
    const markers = points([1, 3, 1, 3, 1]);
    expect(DataHelpers.frequency(markers, 1)).toBe(0.5);
  });

  test("returns zero frequency when fewer than two markers are available", () => {
    expect(DataHelpers.frequency([], 80)).toBe(0);
    expect(DataHelpers.frequency(points([3]), 80)).toBe(0);
  });
});

describe("local extrema", () => {
  test("finds local maxima and minima", () => {
    expect(DataHelpers.localExtrema(points([0, 0, 1, 0, 0, -1, 0, 0]), 2)).toEqual([
      { x: 2, y: 1 },
      { x: 5, y: -1 },
    ]);
  });

  test("marks a flat-topped peak only once", () => {
    expect(DataHelpers.localExtrema(points([1, 3, 3, 1]), 1)).toEqual([{ x: 1, y: 3 }]);
  });

  test("finds no peaks in constant signals or selections too short for the radius", () => {
    expect(DataHelpers.localExtrema(points([2, 2, 2, 2, 2]), 1)).toEqual([]);
    expect(DataHelpers.localExtrema(points([1, 3, 1]), 2)).toEqual([]);
  });

  test("ignores endpoints and rejects a zero search radius", () => {
    const signal = points([3, 2, 1, 2, 3]);
    expect(DataHelpers.localExtrema(signal, 1)).toEqual([{ x: 2, y: 1 }]);
    expect(() => DataHelpers.localExtrema(signal, 0)).toThrow();
  });
});
