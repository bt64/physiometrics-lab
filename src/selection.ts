import { SVG_PADDING, type Renderer } from "./renderer";
import { Statistics } from "./statistics";

export class Selection {
  start: number = 0;
  end: number = 0;

  selecting = false;
  blocked = false;
  statDiv = document.querySelector("div.stat") as HTMLDivElement;
  copyButton = this.statDiv.querySelector("button") as HTMLButtonElement;
  clearButton: HTMLButtonElement;

  stat = {
    "frequency (Hz)": 0,
    mean: 0,
    range: 0,
    "mean amplitude": 0,
  };

  constructor(private r: Renderer) {
    this.updateStatDiv();
    this.clearButton = this.r.container.querySelector(
      "button#clear",
    ) as HTMLButtonElement;

    this.reset();
    this.clearButton.addEventListener("click", () => {
      this.reset();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.reset();
      }
    });

    this.r.container.addEventListener("pointerdown", (e) => {
      if (this.blocked) return;

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
      this.clearButton.hidden = false;

      // delay blocking to allow click event to be processed first
      setTimeout(() => {
        this.blocked = true;
      }, 0);

      this.calculateSelection();
    });

    this.r.container.addEventListener("click", (e) => {
      if (!this.blocked) return;
      if (e.target !== this.r.container) return;
      if (e.clientY < SVG_PADDING.top) return;

      let x = Math.round(this.r.screenToSvg(e.clientX, 0).x);
      let y = this.r.data.getPointAtTime(x);

      if (y === null) return;
      y = -y;

      if (this.r.markers.some((marker) => marker.x === x && marker.y === y)) {
        return;
      }

      this.r.markers.push({ x, y });
      this.r.drawMarkers();
      this.calculateStats();
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
      this.reset();
      return;
    }

    const points = this.r.data.pointsInRange(this.start, this.end);
    this.r.drawSelection(this.start, this.end);
    this.r.drawLocalExtrema(points);

    this.calculateStats();
  }

  calculateStats() {
    const points = this.r.data.pointsInRange(this.start, this.end);
    const frequency =
      Statistics.frequency(this.r.markers, this.r.data.samplingRate) / 2;
    const mean = Statistics.mean(points);
    const { range } = Statistics.range(points);
    const meanAmplitude = Statistics.meanAmplitude(this.r.markers);

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
    this.blocked = false;
    this.clearButton.hidden = true;
    this.stat = {
      "frequency (Hz)": 0,
      mean: 0,
      range: 0,
      "mean amplitude": 0,
    };
    this.updateStatDiv();
    this.r.drawLocalExtrema([]);
    this.r.drawSelection(0, 0);
  }
}
