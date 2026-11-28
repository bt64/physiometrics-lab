import { read } from "mat-for-js";
import { DataHelpers } from "./data-helpers";

type FileData = {
  ch_number: number[]; // 1 is the data, 2 is the locators
  evoked_flag: number[];
  record_points: number[];
  record_values: number[][] | number[][][];
  sampling_rate: number[];
};

export type Point = {
  x: number;
  y: number;
};

export class Data {
  /** The name of the file that the data was loaded from. */
  public fileName: string = "";
  /** The voltage values of the signal. */
  public data: number[] = [];
  /** The sampling rate of the signal in Hz. */
  public samplingRate: number = 0;
  /** Whether the data is evoked or not. */
  public isEvoked: boolean = false;
  /** The number of points to average for interpolation. Only used for non-evoked data. */
  public interpolationDegree = 4;
  /** The time values of locators in the data. */
  public locators: number[] = [];

  public min: number = 0;
  public max: number = 0;

  /** The maximum absolute value of the signal. */
  public absMax: number = 0;

  /**
   * @param file The .anz file to read the data from.
   */
  public async loadFromFile(file: File) {
    const buf = await file.arrayBuffer();
    const matData = read<FileData>(buf);

    const isEvoked = matData.data.evoked_flag[0] === 1;
    const samplingRate = matData.data.sampling_rate[0];
    const recordValues = matData.data.record_values[1];
    const evokedValues: number[] = [];

    if (isEvoked) {
      // using frame 0 by default

      for (let j = 0; j < recordValues.length; j++) {
        evokedValues.push((recordValues as number[][])[j][0]);
      }
    }

    this.fileName = file.name;
    this.data = isEvoked ? evokedValues : (recordValues as number[]);
    this.samplingRate = samplingRate;
    this.isEvoked = isEvoked;

    ({ min: this.min, max: this.max } = DataHelpers.range(this.data));
    this.absMax = Math.max(Math.abs(this.min), Math.abs(this.max));

    this.locators = [];

    if (isEvoked) return;

    // Get the locators from the file data
    for (let i = 0; i < matData.data.record_values[2].length; i++) {
      if (matData.data.record_values[2][i] !== 0) {
        this.locators.push(i);
      }
    }
  }

  /** The duration of the signal in ms. */
  public get duration() {
    return (this.data.length / this.samplingRate) * 1000;
  }

  /** Get the interpolated data, which is the average of every `interpolationDegree` points. */
  public get interpolated() {
    const interpolated: number[] = [];

    let a = 0;
    let n = 0;

    for (const point of this.data) {
      a += point;
      n++;
      if (n === this.interpolationDegree) {
        interpolated.push(a / n);

        a = 0;
        n = 0;
      }
    }

    return interpolated;
  }

  /** Get x and y coordinates of the signal */
  public points(interpolated = true) {
    const points: Point[] = [];
    const data = interpolated ? this.interpolated : this.data;

    for (let i = 0; i < data.length; i++) {
      const x = interpolated ? i * this.interpolationDegree : i;
      const y = data[i];
      points.push({ x, y });
    }

    return points;
  }

  /**
   * Get the points in the signal between the given start and end times in ms.
   * Takes into account the interpolation degree for non-evoked data.
   */
  public pointsInRange(start: number, end: number) {
    const points = this.points(true);
    const interpolation = this.isEvoked ? 1 : this.interpolationDegree;

    return points.slice(start / interpolation, end / interpolation);
  }

  /**
   * Get the point in the signal at the given time in ms.
   * Takes into account the interpolation degree for non-evoked data.
   */
  public getPointAtTime(time: number) {
    const interpolation = this.isEvoked ? 1 : this.interpolationDegree;
    const index = Math.round(time / interpolation);
    if (index < 0 || index >= this.points(true).length) return null;

    return this.points(true)[Math.round(time / interpolation)].y;
  }

  public formatPoint(point: Point) {
    let x = point.x / this.samplingRate;
    if (this.isEvoked) x *= 1000;
    return {
      x: this.isEvoked ? x.toFixed(3) : x.toFixed(1),
      y: point.y.toFixed(2),
    };
  }
}
