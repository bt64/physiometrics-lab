import { SVG_PADDING, type Renderer } from "./renderer";
import { Statistics } from "./statistics";

export class Selection {
  start: number = 0;
  end: number = 0;

  selecting = false;

  constructor(r: Renderer) {
    r.container.addEventListener("pointerdown", (e) => {
      if (e.clientY < SVG_PADDING.top) return;
      if (e.button !== 0) return;
      this.start = r.screenToSvg(e.clientX, 0).x;
      this.selecting = true;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.selecting) return;

      this.end = r.screenToSvg(e.clientX, 0).x;
      r.drawSelection(this.start, this.end);
    });

    window.addEventListener("pointerup", (e) => {
      if (!this.selecting) return;

      this.end = r.screenToSvg(e.clientX, 0).x;
      this.selecting = false;

      if (this.start > this.end) {
        [this.start, this.end] = [this.end, this.start];
      }

      if (this.start < 0) this.start = 0;
      if (this.end > r.baseW) this.end = r.baseW;

      if (this.end - this.start < r.baseW * 0.001) {
        this.start = 0;
        this.end = 0;
      }

      const points = r.data.pointsInRange(this.start, this.end);
      r.drawSelection(this.start, this.end);
      r.drawLocalExtrema(points);

      const { min, max, all } = Statistics.localExtrema(points);
      const mean = Statistics.mean(points);
      const { range } = Statistics.range(points);
      const meanAmplitude = Statistics.meanAmplitude(min, max);
      const frequency = Statistics.frequency(all, r.data.samplingRate) / 2;

      console.log("frequency:", frequency);
      console.log("mean:", mean);
      console.log("range:", range);
      console.log("mean amplitude:", meanAmplitude);
    });
  }
}
