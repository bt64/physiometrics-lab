import { clamp } from "./clamp";
import type { Renderer } from "./renderer";

const border = {
  left: 49.5,
  right: 16,
};

const minWidth = 10;

export class Scroll {
  private readonly scrollh = document.querySelector(
    "div.scroll.h",
  ) as HTMLDivElement;
  private width = window.innerWidth - border.left - border.right;
  private mouseDown = false;
  private scrollResize: "left" | "right" | null = null;
  private scrollDrag = false;
  private scrollDragStart = 0;
  private scrollDragStartLeft = 0;
  private scrollDragStartRight = 0;
  private scrollLeft = border.left;
  private scrollRight = border.right;

  constructor(private renderer: Renderer) {
    window.addEventListener("resize", () => this.reset());

    this.scrollh.addEventListener("pointermove", (e) => {
      if (e.offsetX < 12 || e.offsetX > this.scrollh.clientWidth - 12) {
        this.scrollh.style.cursor = "ew-resize";
      } else {
        this.scrollh.style.cursor = "default";
      }
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.mouseDown) return;
      document.body.style.cursor = "ew-resize";

      if (this.scrollResize === "left") {
        this.scrollLeft = clamp(
          e.x,
          border.left,
          this.width + border.right - this.scrollRight - minWidth,
        );
        this.scrollh.style.left = this.scrollLeft + "px";
      }

      if (this.scrollResize === "right") {
        this.scrollRight = clamp(
          this.width + border.right + border.left - e.x,
          border.right,
          this.width + border.right - this.scrollLeft - minWidth,
        );
        this.scrollh.style.right = this.scrollRight + "px";
      }

      if (this.scrollDrag) {
        let delta = e.x - this.scrollDragStart;

        if (this.scrollDragStartLeft + delta < border.left) {
          delta = border.left - this.scrollDragStartLeft;
        } else if (this.scrollDragStartRight - delta < border.right) {
          delta = this.scrollDragStartRight - border.right;
        }

        this.scrollLeft = this.scrollDragStartLeft + delta;
        this.scrollRight = this.scrollDragStartRight - delta;

        this.scrollh.style.left = this.scrollLeft + "px";
        this.scrollh.style.right = this.scrollRight + "px";
      }

      this.setScale();
    });

    this.scrollh.addEventListener("pointerdown", (e) => {
      this.mouseDown = true;
      if (e.offsetX < 16 || e.offsetX > this.scrollh.clientWidth - 16) {
        const l = e.offsetX;
        const r = this.scrollh.clientWidth - e.offsetX;
        this.scrollResize = l < r ? "left" : "right";
        return;
      }

      this.scrollDrag = true;
      this.scrollDragStart = e.x;
      this.scrollDragStartLeft = this.scrollLeft;
      this.scrollDragStartRight = this.scrollRight;
    });

    window.addEventListener("pointerup", () => {
      this.mouseDown = false;
      this.scrollResize = null;
      this.scrollDrag = false;
      document.body.style.cursor = "default";
    });

    window.addEventListener("wheel", (e) => {
      let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      delta *= this.width / (window.innerWidth * 5);

      if (this.scrollLeft + delta < border.left) {
        delta = border.left - this.scrollLeft;
      } else if (this.scrollRight - delta < border.right) {
        delta = this.scrollRight - border.right;
      }

      this.scrollLeft += delta;
      this.scrollRight -= delta;

      this.scrollh.style.left = this.scrollLeft + "px";
      this.scrollh.style.right = this.scrollRight + "px";

      this.setScale();
    });
  }

  reset() {
    this.width = window.innerWidth - border.left - border.right;
    this.scrollLeft = border.left;
    this.scrollRight = border.right;
    this.scrollh.style.left = this.scrollLeft + "px";
    this.scrollh.style.right = this.scrollRight + "px";
    this.setScale();
  }

  private setScale() {
    this.renderer.setScale(
      (this.width +
        border.left +
        border.right -
        this.scrollLeft -
        this.scrollRight) /
        this.width,
      (this.scrollLeft - border.left) / this.width,
    );
  }
}
