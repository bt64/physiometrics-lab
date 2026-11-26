import type { Point } from "./data";

export abstract class DataHelpers {
  /**
   * Clamps a number between a minimum and maximum value.
   */
  public static clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max);
  }

  /**
   * Calculates the mean of an array of numbers or points.
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
   * Calculates the standard deviation of an array of numbers or points.
   */
  public static std(values: Point[] | number[]) {
    if (values.length === 0) return 0;

    const mean = DataHelpers.mean(values);
    let sum = 0;

    for (const value of values) {
      const yValue = typeof value === "number" ? value : value.y;
      sum += Math.pow(yValue - mean, 2);
    }

    return Math.sqrt(sum / values.length);
  }

  /**
   * Calculates the range (min, max, and range) of an array of points or numbers.
   */
  public static range(values: Point[] | number[]) {
    if (values.length === 0) return { min: 0, max: 0, range: 0 };

    const first = typeof values[0] === "number" ? values[0] : values[0].y;
    let min = first;
    let max = first;

    for (const value of values) {
      const number = typeof value === "number" ? value : value.y;
      if (number < min) min = number;
      if (number > max) max = number;
    }

    return { min, max, range: max - min };
  }

  /**
   * Get the local extrema (minima and maxima combined) of the signal in the given range.
   * Uses `radius` as the neighborhood size for finding extrema.
   */
  public static localExtrema(points: Point[], radius: number) {
    if (radius < 1) throw new Error("Radius must be greater than 0.");

    const min: Point[] = [];
    const max: Point[] = [];

    for (let i = radius; i < points.length - radius; i++) {
      const curr = points[i];
      let isMin = true;
      let isMax = true;

      for (let j = 1; j <= radius; j++) {
        if (curr.y >= points[i - j].y || curr.y > points[i + j].y) {
          isMin = false;
        }
        if (curr.y <= points[i - j].y || curr.y < points[i + j].y) {
          isMax = false;
        }
      }

      if (isMin) min.push(curr);
      if (isMax) max.push(curr);
    }

    return [...min, ...max].sort((a, b) => a.x - b.x);
  }

  /**
   * Calculates the amplitudes of the signal based on the differences between consecutive points.
   */
  public static amplitudes(points: Point[]) {
    if (points.length === 0) return [];

    const amplitudes: number[] = [];

    for (let i = 1; i < points.length; i++) {
      amplitudes.push(Math.abs(points[i - 1].y - points[i].y));
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

    const sorted = points.toSorted((a, b) => a.x - b.x);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const timeDiff = (curr.x - prev.x) / samplingRate;
      timeDiffSum += timeDiff;
    }

    const meanTimeDiff = timeDiffSum / (sorted.length - 1);

    return 1 / meanTimeDiff;
  }

  /**
   * Calculates the mean amplitude of the signal based on the differences between consecutive points.
   */
  public static meanAmplitude(points: Point[]) {
    return DataHelpers.mean(DataHelpers.amplitudes(points));
  }

  /**
   * Finds the closest point on the x axis to a target point from an array of points.
   */
  public static findClosestPoint(points: Point[], target: Point) {
    if (points.length === 0) return null;

    let closestPoint = points[0];
    let closestDistance = Math.abs(points[0].x - target.x);

    for (const point of points) {
      const distance = Math.abs(point.x - target.x);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    }

    return closestPoint;
  }
}
