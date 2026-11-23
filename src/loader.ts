import { Data } from "./data";
import { DataHelpers } from "./data-helpers";
import { ErrorDialog } from "./error-dialog";
import { History } from "./history";
import { Renderer } from "./renderer";

export class Loader {
  private container = document.querySelector("div.container") as HTMLDivElement;
  private controls = document.querySelector("div.controls") as HTMLDivElement;

  private fileInput = document.querySelector("input#file") as HTMLInputElement;
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
      this.interpolationInput.value = "4";
      this.locExtRadiusInput.value = "12";
      this.data.interpolationDegree = this.interpolationInput.valueAsNumber;
      this.renderer.selection.statistics.localExtremaRadius = this.locExtRadiusInput.valueAsNumber;

      if (!this.file) return;

      await this.load(this.file);
    });

    this.interpolationInput.addEventListener("input", () => {
      let value = this.interpolationInput.valueAsNumber;
      if (Number.isNaN(value)) value = 1;
      value = DataHelpers.clamp(value, 1, 10);
      this.data.interpolationDegree = value;
      this.interpolationInput.value = value.toString();
      this.renderer.render();
    });

    this.locExtRadiusInput.addEventListener("input", () => {
      let value = this.locExtRadiusInput.valueAsNumber;
      if (Number.isNaN(value)) value = 1;
      value = DataHelpers.clamp(value, 1, 32);
      this.renderer.selection.statistics.localExtremaRadius = value;
      this.locExtRadiusInput.value = value.toString();
    });
  }

  /**
   * Displays the information about the currently loaded file
   */
  private displayInfo() {
    const name =
      this.file!.name.length > 20 ? this.file!.name.slice(0, 20) + "..." : this.file!.name;

    const duration =
      this.data.duration > 1000
        ? `${(this.data.duration / 1000).toFixed(1)}s`
        : `${this.data.duration.toFixed(1)}ms`;

    const samplingRate = this.data.samplingRate.toFixed(0);
    const min = this.data.min.toFixed(3);
    const max = this.data.max.toFixed(3);

    this.infoP.replaceChildren();

    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;

    this.infoP.textContent = ` : ${samplingRate}Hz, ${duration}, [${min}V, ${max}V]`;
    this.infoP.prepend(nameSpan);
  }

  /**
   * Loads a file into the application, processes its data, and updates the UI accordingly.
   */
  public async load(file: File) {
    this.file = file;

    try {
      await this.data.loadFromFile(this.file);
    } catch (e) {
      ErrorDialog.show(
        `Failed to load file "${this.file.name}".\nIt may be corrupted or not a valid .anz file.`,
      );
      this.history.removeFile(this.file);
      return;
    }

    await this.history.addFile(this.file);

    this.renderer.render();

    this.container.hidden = false;
    this.controls.classList.remove("hide");

    if (this.data.isEvoked) {
      this.interpolationInput.hidden = true;
      this.interpolationInput.labels![0].hidden = true;
    } else {
      this.interpolationInput.hidden = false;
      this.interpolationInput.labels![0].hidden = false;
    }

    this.displayInfo();
  }
}
