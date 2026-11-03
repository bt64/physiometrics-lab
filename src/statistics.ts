import type { Point } from "./data";

export abstract class Statistics {
  /**
   * Calculates the mean of an array of numbers or points.
   * @param values An array of numbers or points.
   * @returns The mean of the values.
   */
  public static mean(values: Point[] | number[]) {
    if (values.length === 0) return 0;

    let sum = 0;
    for (const value of values) {
      if (typeof value === "number") {
        sum += value;
      } else {
        sum += value.y;
      }
    }

    return sum / values.length;
  }

  /**
   * Calculates the range (min, max, and range) of an array of points.
   * @param points An array of points.
   * @returns An object containing the min, max, and range of the points.
   */
  public static range(points: Point[]) {
    if (points.length === 0) return { min: 0, max: 0, range: 0 };
    let min = points[0].y;
    let max = points[0].y;

    for (const point of points) {
      if (point.y < min) min = point.y;
      if (point.y > max) max = point.y;
    }
    return { min, max, range: max - min };
  }

  /**
   * Get the local extrema (minima and maxima) of the signal in the given range.
   * @param start The start index of the range (inclusive).
   * @param end The end index of the range (exclusive).
   * @returns An object containing the local minima and maxima points in the given range.
   */
  public static localExtrema(points: Point[]) {
    const min: Point[] = [];
    const max: Point[] = [];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      if (curr.y <= prev.y && curr.y < next.y) {
        min.push(curr);
      } else if (curr.y >= prev.y && curr.y > next.y) {
        max.push(curr);
      }
    }

    return { all: [...min, ...max], min, max };
  }

  /**
   * Calculates the amplitudes of the signal based on the local minima and maxima.
   * @param minima An array of local minima points.
   * @param maxima An array of local maxima points.
   * @returns An array of amplitudes calculated from the minima and maxima.
   */
  public static amplitudes(minima: Point[], maxima: Point[]) {
    if (minima.length === 0 || maxima.length === 0) return [];

    const amplitudes: number[] = [];

    for (let i = 0; i < Math.min(minima.length, maxima.length); i++) {
      const min = minima[i];
      const max = maxima[i];

      amplitudes.push(Math.abs(max.y - min.y));
    }

    return amplitudes;
  }

  /**
   * Calculates the mean frequency of the points in the given range.
   * @param points The points of the signal to calculate the frequency from.
   * @param samplingRate The sampling rate of the signal in Hz.
   * @returns The mean frequency of the signal in Hz.
   */
  public static frequency(points: Point[], samplingRate: number) {
    if (points.length < 2) return 0;

    let timeDiffSum = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const timeDiff = (curr.x - prev.x) / samplingRate;
      timeDiffSum += timeDiff;
    }

    const meanTimeDiff = timeDiffSum / (points.length - 1);

    return 1 / meanTimeDiff;
  }

  /**
   * Calculates the mean amplitude of the signal based on the local minima and maxima.
   * @param minima An array of local minima points.
   * @param maxima An array of local maxima points.
   * @returns The mean amplitude calculated from the minima and maxima.
   */
  public static meanAmplitude(minima: Point[], maxima: Point[]) {
    return Statistics.mean(Statistics.amplitudes(minima, maxima));
  }
}
