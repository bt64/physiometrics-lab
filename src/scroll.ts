import { clamp } from "./clamp";
import type { Renderer } from "./renderer";

const scrollh = document.querySelector("div.scroll.h") as HTMLDivElement;

const border = {
  left: 49.5,
  right: 16,
};

const minWidth = 24;

let width = window.innerWidth - border.left - border.right;

let mouseDown = false;
let scrollResize: "left" | "right" | null = null;
let scrollDrag = false;
let scrollDragStart = 0;
let scrollDragStartLeft = 0;
let scrollDragStartRight = 0;
let scrollLeft = border.left;
let scrollRight = border.right;
let renderer: Renderer;

export const init = (r: Renderer) => {
  renderer = r;
};

export const reset = () => {
  width = window.innerWidth - border.left - border.right;
  scrollLeft = border.left;
  scrollRight = border.right;
  scrollh.style.left = scrollLeft + "px";
  scrollh.style.right = scrollRight + "px";

  renderer.setScale(
    (width + border.left + border.right - scrollLeft - scrollRight) / width,
    (scrollLeft - border.left) / width,
  );
};

window.addEventListener("resize", reset);

scrollh.addEventListener("pointermove", (e) => {
  if (e.offsetX < 12 || e.offsetX > scrollh.clientWidth - 12) {
    scrollh.style.cursor = "ew-resize";
  } else {
    scrollh.style.cursor = "crosshair";
  }
});

window.addEventListener("pointermove", (e) => {
  if (!mouseDown) return;
  document.body.style.cursor = "ew-resize";

  if (scrollResize === "left") {
    scrollLeft = clamp(
      e.x,
      border.left,
      width + border.right - scrollRight - minWidth,
    );
    scrollh.style.left = scrollLeft + "px";
  }

  if (scrollResize === "right") {
    scrollRight = clamp(
      width + border.right + border.left - e.x,
      border.right,
      width + border.right - scrollLeft - minWidth,
    );
    scrollh.style.right = scrollRight + "px";
  }

  if (scrollDrag) {
    let delta = e.x - scrollDragStart;

    if (scrollDragStartLeft + delta < border.left) {
      delta = border.left - scrollDragStartLeft;
    } else if (scrollDragStartRight - delta < border.right) {
      delta = scrollDragStartRight - border.right;
    }

    scrollLeft = scrollDragStartLeft + delta;
    scrollRight = scrollDragStartRight - delta;

    scrollh.style.left = scrollLeft + "px";
    scrollh.style.right = scrollRight + "px";
  }

  renderer.setScale(
    (width + border.left + border.right - scrollLeft - scrollRight) / width,
    (scrollLeft - border.left) / width,
  );
});

scrollh.addEventListener("pointerdown", (e) => {
  mouseDown = true;
  if (e.offsetX < 16 || e.offsetX > scrollh.clientWidth - 16) {
    const l = e.offsetX;
    const r = scrollh.clientWidth - e.offsetX;
    scrollResize = l < r ? "left" : "right";
    return;
  }

  scrollDrag = true;
  scrollDragStart = e.x;
  scrollDragStartLeft = scrollLeft;
  scrollDragStartRight = scrollRight;
});

window.addEventListener("pointerup", () => {
  mouseDown = false;
  scrollResize = null;
  scrollDrag = false;
  document.body.style.cursor = "crosshair";
});

window.addEventListener("wheel", (e) => {
  let delta = 0;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    delta = e.deltaX;
  } else {
    delta = e.deltaY;
  }

  delta *= width / (window.innerWidth * 5);

  if (scrollLeft + delta < border.left) {
    delta = border.left - scrollLeft;
  } else if (scrollRight - delta < border.right) {
    delta = scrollRight - border.right;
  }

  scrollLeft = scrollLeft + delta;
  scrollRight = scrollRight - delta;

  scrollh.style.left = scrollLeft + "px";
  scrollh.style.right = scrollRight + "px";

  renderer.setScale(
    (width + border.left + border.right - scrollLeft - scrollRight) / width,
    (scrollLeft - border.left) / width,
  );
});
