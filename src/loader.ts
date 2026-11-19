import { clamp } from "./clamp";
import { Data } from "./data";
import { ErrorDialog } from "./error-dialog";
import { History } from "./history";
import { Renderer } from "./renderer";
import { Statistics } from "./statistics";

export class Loader {
  private container = document.querySelector("div.container") as HTMLDivElement;
  private controls = document.querySelector("div.controls") as HTMLDivElement;

  private fileInput = document.querySelector("input#file") as HTMLInputElement;
  private frameInput = document.querySelector("input#frame") as HTMLInputElement;
  private interpolationInput = document.querySelector("input#interpolation") as HTMLInputElement;
  private locExtRadiusInput = document.querySelector("input#locextradius") as HTMLInputElement;

  private infoP = document.querySelector("p.info") as HTMLParagraphElement;

  private file: File | undefined;

  private data: Data;
  private renderer: Renderer;
  private history: History;

  constructor() {
    this.data = new Data();
    this.renderer = new Renderer(this.data);
    this.history = new History(this);

    this.fileInput.addEventListener("change", async (event) => {
      this.file = (event.target as HTMLInputElement).files?.[0];
      this.frameInput.value = "0";
      this.interpolationInput.value = "4";
      this.data.interpolationDegree = this.interpolationInput.valueAsNumber;
      await this.loadCurrentFile();
    });

    this.interpolationInput.addEventListener("input", () => {
      let value = this.interpolationInput.valueAsNumber;
      if (isNaN(value)) value = 1;
      value = clamp(value, 1, 10);
      this.data.interpolationDegree = value;
      this.interpolationInput.value = value.toString();
      this.renderer.render();
    });

    this.locExtRadiusInput.addEventListener("input", () => {
      let value = this.locExtRadiusInput.valueAsNumber;
      if (isNaN(value)) value = 1;
      value = clamp(value, 1, 32);
      this.locExtRadiusInput.value = value.toString();
      Statistics.localExtremaRadius = value;
    });

    this.frameInput.addEventListener("input", async () => {
      await this.loadCurrentFile(this.frameInput.valueAsNumber);
    });
  }

  private async loadCurrentFile(frame?: number) {
    if (!this.file) {
      this.controls.classList.add("hide");
      this.container.hidden = true;

      return;
    }

    await this.load(this.file, frame);
  }

  private displayInfo(file: File) {
    const name = file.name.length > 20 ? file.name.slice(0, 20) + "..." : file.name;

    const duration =
      this.data.duration > 1000
        ? `${(this.data.duration / 1000).toFixed(1)}s`
        : `${this.data.duration.toFixed(1)}ms`;

    const samplingRate = this.data.samplingRate.toFixed(0);
    const min = this.data.min.toFixed(3);
    const max = this.data.max.toFixed(3);

    this.infoP.innerHTML = `<span>${name}</span> : ${samplingRate}Hz, ${duration}, [${min}V, ${max}V]`;
  }

  public async load(file: File, frame?: number) {
    this.file = file;
    try {
      await this.data.loadFromFile(file, frame);
    } catch (e) {
      ErrorDialog.show(
        `Failed to load file "${file.name}".\nIt may be corrupted or not a valid .anz file.`,
      );
      this.history.removeFile(file);
      return;
    }

    await this.history.addFile(file);

    this.renderer.render();

    this.container.hidden = false;
    this.controls.classList.remove("hide");

    if (frame === undefined) {
      this.frameInput.value = this.data.frame.toString();
    }

    if (this.data.isEvoked) {
      this.frameInput.max = (this.data.frameCount - 1).toString();
      this.frameInput.labels![0].hidden = false;
      this.frameInput.hidden = false;
      this.interpolationInput.hidden = true;
      this.interpolationInput.labels![0].hidden = true;
    } else {
      this.frameInput.labels![0].hidden = true;
      this.frameInput.hidden = true;
      this.interpolationInput.hidden = false;
      this.interpolationInput.labels![0].hidden = false;
    }

    this.displayInfo(file);
  }
}
