import { read } from "mat-for-js";

type FileData = {
  ch_number: number[];
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
  /** The voltage values of the signal. */
  public data: number[] = [];
  /** The sampling rate of the signal in Hz. */
  public samplingRate: number = 0;
  /** Whether the data is evoked or not. */
  public isEvoked: boolean = false;
  /** The channel number of the data. */
  public channel: number = 0;
  /** The number of frames in the data. Only used for evoked data. */
  public frameCount = 0;

  /** The number of points to average for interpolation. Only used for non-evoked data. */
  public interpolationDegree = 4;

  /**
   * @param frame The frame number to read (0-based). Only used for evoked data.
   */
  constructor(public frame = 0) {}

  /**
   * @param file The .anz file to read the data from.
   */
  public async loadFromFile(file: File, channel?: number, frame = 0) {
    const buf = await file.arrayBuffer();
    const matData = read<FileData>(buf);
    console.log(matData);

    const chNumber = channel || matData.data.ch_number[0];
    const isEvoked = matData.data.evoked_flag[0] === 1;
    const samplingRate = matData.data.sampling_rate[0];
    const recordValues = matData.data.record_values[chNumber];
    const evokedValues: number[] = [];

    if (isEvoked) {
      this.frameCount = (recordValues as number[][])[0].length;

      for (let j = 0; j < recordValues.length; j++) {
        evokedValues.push((recordValues as number[][])[j][frame]);
      }
    }

    this.data = isEvoked ? evokedValues : (recordValues as number[]);
    this.samplingRate = samplingRate;
    this.isEvoked = isEvoked;
    this.channel = chNumber;
  }

  /** The duration of the signal in ms. */
  public get duration() {
    return (this.data.length / this.samplingRate) * 1000;
  }

  public get min() {
    return Math.min(...this.data);
  }

  public get max() {
    return Math.max(...this.data);
  }

  public get absMax() {
    return Math.max(Math.abs(this.min), Math.abs(this.max));
  }

  /** Get the interpolated data, which is the average of every `interpolationDegree` points. */
  public get interpolated() {
    if (this.isEvoked) return this.data;
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

  /** Get x and y coordinates of the signal for plotting. */
  public points(interpolated = true) {
    if (this.isEvoked) {
      interpolated = false;
    }

    const points: Point[] = [];
    const data = interpolated ? this.interpolated : this.data;

    for (let i = 0; i < data.length; i++) {
      const x = interpolated ? i * this.interpolationDegree : i;
      const y = -data[i];
      points.push({ x, y });
    }

    return points;
  }

  public getLocalExtrema(start: number, end: number) {
    const points = this.points(true);
    const interpolation = this.isEvoked ? 1 : this.interpolationDegree;

    const pointsInRange = points.slice(
      start / interpolation,
      end / interpolation,
    );

    const min: Point[] = [];
    const max: Point[] = [];

    for (let i = 1; i < pointsInRange.length - 1; i++) {
      const prev = pointsInRange[i - 1];
      const curr = pointsInRange[i];
      const next = pointsInRange[i + 1];

      if (curr.y <= prev.y && curr.y < next.y) {
        min.push(curr);
      } else if (curr.y >= prev.y && curr.y > next.y) {
        max.push(curr);
      }
    }

    return { all: [...min, ...max], min, max };
  }

  /**
   * Calculate the mean frequency of the signal in the given range.
   * @param points The points of the signal to calculate the frequency from.
   * @returns The mean frequency of the signal in Hz.
   */
  public getFrequency(points: Point[]) {
    if (points.length < 2) return 0;

    let timeDiffSum = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const timeDiff = (curr.x - prev.x) / this.samplingRate;
      timeDiffSum += timeDiff;
    }

    const meanTimeDiff = timeDiffSum / (points.length - 1);

    return 1 / meanTimeDiff;
  }
}
