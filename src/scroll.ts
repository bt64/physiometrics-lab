import type { Renderer } from "./renderer";
import { DataHelpers } from "./data-helpers";

const border = {
  left: 49.5,
  right: 16,
};

const minWidth = 10;

export class Scroll {
  private readonly div = document.querySelector("div.scroll") as HTMLDivElement;
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
    this.div.addEventListener("pointerdown", (e) => this.pointerDownHandler(e));
    this.div.addEventListener("pointermove", (e) => this.updateCursor(e));

    window.addEventListener("pointermove", (e) => this.pointerMoveHandler(e));
    window.addEventListener("pointerup", () => this.pointerUpHandler());
    window.addEventListener("wheel", (e) => this.wheelHandler(e));

    window.addEventListener("resize", () => this.reset());
  }

  private pointerDownHandler = (e: PointerEvent) => {
    this.mouseDown = true;
    if (e.offsetX < 16 || e.offsetX > this.div.clientWidth - 16) {
      const l = e.offsetX;
      const r = this.div.clientWidth - e.offsetX;
      this.scrollResize = l < r ? "left" : "right";
      return;
    }

    this.scrollDrag = true;
    this.scrollDragStart = e.clientX;
    this.scrollDragStartLeft = this.scrollLeft;
    this.scrollDragStartRight = this.scrollRight;
  };

  private pointerUpHandler = () => {
    this.mouseDown = false;
    this.scrollResize = null;
    this.scrollDrag = false;
    document.body.style.cursor = "default";
  };

  private pointerMoveHandler = (e: PointerEvent) => {
    if (!this.mouseDown) return;
    document.body.style.cursor = "ew-resize";

    if (this.scrollResize === "left") {
      this.scrollLeft = DataHelpers.clamp(
        e.clientX,
        border.left,
        this.width + border.right - this.scrollRight - minWidth,
      );
      this.div.style.left = this.scrollLeft + "px";
    }

    if (this.scrollResize === "right") {
      this.scrollRight = DataHelpers.clamp(
        this.width + border.right + border.left - e.clientX,
        border.right,
        this.width + border.right - this.scrollLeft - minWidth,
      );
      this.div.style.right = this.scrollRight + "px";
    }

    if (this.scrollDrag) {
      let delta = e.clientX - this.scrollDragStart;

      if (this.scrollDragStartLeft + delta < border.left) {
        delta = border.left - this.scrollDragStartLeft;
      } else if (this.scrollDragStartRight - delta < border.right) {
        delta = this.scrollDragStartRight - border.right;
      }

      this.scrollLeft = this.scrollDragStartLeft + delta;
      this.scrollRight = this.scrollDragStartRight - delta;

      this.div.style.left = this.scrollLeft + "px";
      this.div.style.right = this.scrollRight + "px";
    }

    this.setScale();
  };

  private wheelHandler = (e: WheelEvent) => {
    if (document.querySelector(":popover-open")) return;
    let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    delta *= this.width / (window.innerWidth * 5);

    if (this.scrollLeft + delta < border.left) {
      delta = border.left - this.scrollLeft;
    } else if (this.scrollRight - delta < border.right) {
      delta = this.scrollRight - border.right;
    }

    this.scrollLeft += delta;
    this.scrollRight -= delta;

    this.div.style.left = this.scrollLeft + "px";
    this.div.style.right = this.scrollRight + "px";

    this.setScale();
  };

  private updateCursor(e: PointerEvent) {
    if (e.offsetX < 12 || e.offsetX > this.div.clientWidth - 12) {
      this.div.style.cursor = "ew-resize";
    } else {
      this.div.style.cursor = "default";
    }
  }

  private setScale() {
    this.renderer.setScale(
      (this.width + border.left + border.right - this.scrollLeft - this.scrollRight) / this.width,
      (this.scrollLeft - border.left) / this.width,
    );
  }

  public reset() {
    this.width = window.innerWidth - border.left - border.right;
    this.scrollLeft = border.left;
    this.scrollRight = border.right;
    this.div.style.left = this.scrollLeft + "px";
    this.div.style.right = this.scrollRight + "px";
    this.setScale();
  }
}
