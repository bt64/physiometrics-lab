import { SVG_PADDING, type Renderer } from "./renderer";
import { Statistics } from "./statistics";

export class Selection {
  start: number = 0;
  end: number = 0;

  selecting = false;
  statDiv = document.querySelector("div.stat") as HTMLDivElement;
  copyButton = this.statDiv.querySelector("button") as HTMLButtonElement;

  stat = {
    "frequency (Hz)": 0,
    mean: 0,
    range: 0,
    "mean amplitude": 0,
  };

  constructor(private r: Renderer) {
    this.updateStatDiv();
    this.r.container.addEventListener("pointerdown", (e) => {
      if (e.target === this.r.copyButton) return;
      if (e.clientY < SVG_PADDING.top) return;
      if (e.button !== 0) return;
      this.start = r.screenToSvg(e.clientX, 0).x;
      this.selecting = true;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.selecting) return;

      this.end = this.r.screenToSvg(e.clientX, 0).x;
      this.r.drawSelection(this.start, this.end);
    });

    window.addEventListener("pointerup", (e) => {
      if (!this.selecting) return;

      this.end = this.r.screenToSvg(e.clientX, 0).x;
      this.selecting = false;

      this.calculateSelection();
    });

    this.copyButton.addEventListener("click", () => {
      this.copyToClipboard();
    });
  }

  private calculateSelection() {
    if (this.start > this.end) {
      [this.start, this.end] = [this.end, this.start];
    }

    if (this.start < 0) this.start = 0;
    if (this.end > this.r.baseW) this.end = this.r.baseW;

    if (this.end - this.start < this.r.baseW * 0.001) {
      this.start = 0;
      this.end = 0;
    }

    const points = this.r.data.pointsInRange(this.start, this.end);
    this.r.drawSelection(this.start, this.end);
    this.r.drawLocalExtrema(points);

    const { min, max, all } = Statistics.localExtrema(points);
    const mean = Statistics.mean(points);
    const { range } = Statistics.range(points);
    const meanAmplitude = Statistics.meanAmplitude(min, max);
    const frequency = Statistics.frequency(all, this.r.data.samplingRate) / 2;

    this.stat = {
      "frequency (Hz)": frequency,
      mean: mean,
      range: range,
      "mean amplitude": meanAmplitude,
    };
    this.updateStatDiv();
  }

  private updateStatDiv() {
    this.statDiv.querySelectorAll("div")!.forEach((div) => div.remove());
    for (const [key, value] of Object.entries(this.stat)) {
      const div = document.createElement("div");
      const p1 = document.createElement("p");
      const p2 = document.createElement("p");
      p1.textContent = key;
      p2.textContent = value === 0 ? "-" : value.toFixed(3);
      div.append(p1, p2);
      this.statDiv.append(div);
    }

    this.copyButton.disabled = Object.values(this.stat).every((v) => v === 0);
  }

  private copyToClipboard() {
    const text = Object.entries(this.stat)
      .map(([key, value]) => `${key}\t${value}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  public reset() {
    this.start = 0;
    this.end = 0;
    this.selecting = false;
    this.stat = {
      "frequency (Hz)": 0,
      mean: 0,
      range: 0,
      "mean amplitude": 0,
    };
    this.updateStatDiv();
  }
}
