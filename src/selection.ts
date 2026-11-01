import { SVG_PADDING, type Renderer } from "./renderer";

export class Selection {
  start: number = 0;
  end: number = 0;

  selecting = false;

  constructor(renderer: Renderer) {
    renderer.container.addEventListener("pointerdown", (e) => {
      if (e.clientY < SVG_PADDING.top) return;
      this.start = renderer.screenToSvg(e.clientX, 0).x;
      this.selecting = true;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.selecting) return;

      this.end = renderer.screenToSvg(e.clientX, 0).x;
      renderer.drawSelection(this.start, this.end);
    });

    window.addEventListener("pointerup", (e) => {
      if (!this.selecting) return;

      this.end = renderer.screenToSvg(e.clientX, 0).x;
      this.selecting = false;

      if (this.start > this.end) {
        [this.start, this.end] = [this.end, this.start];
      }

      if (this.start < 0) this.start = 0;
      if (this.end > renderer.baseW) this.end = renderer.baseW;

      if (this.end - this.start < renderer.baseW * 0.001) {
        this.start = 0;
        this.end = 0;
      }

      renderer.drawSelection(this.start, this.end);
      renderer.drawLocalExtrema(this.start, this.end);
      const { min, max } = renderer.data.getLocalExtrema(this.start, this.end);
      console.log(
        renderer.data.getFrequency(min),
        renderer.data.getFrequency(max),
      );
    });
  }
}
