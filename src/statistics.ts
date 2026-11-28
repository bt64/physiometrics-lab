import type { Point } from "./data";
import { DataHelpers } from "./data-helpers";
import { ErrorDialog } from "./error-dialog";
import type { Renderer } from "./renderer";

export class Statistics {
  public localExtremaRadius = 12;
  public markers: Point[] = [];

  private statDiv = document.querySelector("div.stat") as HTMLDivElement;
  private copyButton = this.statDiv.querySelector("button") as HTMLButtonElement;

  private stat = {
    cycles: 0,
    "frequency (Hz)": 0,
    tone: 0,
    std: 0,
    mean: 0,
    range: 0,
  };

  constructor(private renderer: Renderer) {
    this.copyButton.addEventListener("click", () => {
      try {
        this.copyToClipboard();
      } catch (error) {
        ErrorDialog.show("Failed to export the table.");
      }
    });
  }

  private updateStatDiv() {
    this.statDiv.querySelectorAll("div")!.forEach((div) => div.remove());
    for (const [key, value] of Object.entries(this.stat)) {
      const div = document.createElement("div");
      const p1 = document.createElement("p");
      const p2 = document.createElement("p");
      p1.textContent = key;
      p2.textContent = value === 0 ? "-" : (Math.round(value * 1000) / 1000).toString();
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

  public calculateStats() {
    this.stat = {
      cycles: this.markers.length / 2,
      "frequency (Hz)": DataHelpers.frequency(this.markers, this.renderer.data.samplingRate),
      tone: DataHelpers.meanAmplitude(this.markers),
      std: DataHelpers.std(this.markers),
      mean: DataHelpers.mean(this.markers),
      range: DataHelpers.range(this.markers).range,
    };

    this.updateStatDiv();
  }

  public initRange(start: number, end: number) {
    const points = this.renderer.data.pointsInRange(start, end);
    this.markers = DataHelpers.localExtrema(points, this.localExtremaRadius);
    this.renderer.drawMarkers();

    this.calculateStats();
  }

  public addMarker(point: Point) {
    this.markers.push(point);
    this.renderer.drawMarkers();
    this.calculateStats();
  }

  public removeMarker(marker: Point) {
    const idx = this.markers.indexOf(marker);

    this.markers.splice(idx, 1);
    this.renderer.drawMarkers();
    this.calculateStats();
  }

  public reset() {
    this.stat = {
      cycles: 0,
      "frequency (Hz)": 0,
      tone: 0,
      std: 0,
      mean: 0,
      range: 0,
    };

    this.markers = [];
    this.updateStatDiv();

    this.renderer.drawMarkers();
  }
}
