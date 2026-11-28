import { SVG_PADDING, type Renderer } from "./renderer";
import { Statistics } from "./statistics";

export class Selection {
  private start: number = 0;
  private end: number = 0;

  private selecting = false;
  private blocked = false;
  private clearButton: HTMLButtonElement;

  public statistics: Statistics;

  constructor(private renderer: Renderer) {
    this.statistics = new Statistics(renderer);

    this.clearButton = this.renderer.container.querySelector("button#clear") as HTMLButtonElement;
    this.clearButton.addEventListener("click", () => this.reset());

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.reset();
    });

    this.renderer.container.addEventListener("pointerdown", (e) => {
      if (this.blocked) return;
      if (e.target === this.renderer.copyButton) return;
      if (e.clientY < SVG_PADDING.top) return;
      if (e.button !== 0) return;

      this.start = this.renderer.screenToSvg(e.clientX, 0).x;
      this.selecting = true;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.selecting) return;

      this.end = this.renderer.screenToSvg(e.clientX, 0).x;
      this.renderer.drawSelection(this.start, this.end);
    });

    window.addEventListener("pointerup", (e) => {
      if (!this.selecting) return;

      this.end = this.renderer.screenToSvg(e.clientX, 0).x;
      this.selecting = false;
      this.clearButton.hidden = false;

      this.setSelection();
    });

    this.renderer.container.addEventListener("click", (e) => {
      if (!this.blocked) return;
      if (e.target !== this.renderer.container) return;
      if (e.clientY < SVG_PADDING.top) return;

      const x = Math.round(this.renderer.screenToSvg(e.clientX, 0).x);
      const y = this.renderer.data.getPointAtTime(x);

      if (y === null) return;

      // Check if a marker already exists at this point
      if (this.statistics.markers.some((m) => m.x === x && m.y === y)) {
        return;
      }

      this.statistics.addMarker({ x, y });
    });
  }

  private setSelection() {
    if (this.start > this.end) {
      [this.start, this.end] = [this.end, this.start];
    }

    if (this.start < 0) this.start = 0;
    if (this.end > this.renderer.baseW) this.end = this.renderer.baseW;

    if (this.end - this.start < this.renderer.baseW * 0.001) {
      this.start = 0;
      this.end = 0;
      this.reset();
      return;
    }

    // delay blocking to allow click event to be processed first
    setTimeout(() => {
      this.blocked = true;
    }, 0);

    this.renderer.drawSelection(this.start, this.end);
    this.statistics.initRange(this.start, this.end);
  }

  public reset() {
    this.start = 0;
    this.end = 0;
    this.selecting = false;
    this.blocked = false;
    this.clearButton.hidden = true;

    this.renderer.drawSelection(0, 0);

    this.statistics.reset();
  }
}
