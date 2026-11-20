import type { Renderer } from "./renderer";

export class Cursor {
  private cursor: HTMLDivElement;

  constructor(renderer: Renderer) {
    this.cursor = document.createElement("div");
    this.cursor.classList.add("cursor");
    renderer.container.appendChild(this.cursor);

    window.addEventListener("mousemove", (e) => {
      const screenX = e.clientX;
      const screenY = e.clientY;

      const svgPoint = renderer.screenToSvg(screenX, screenY);

      this.cursor.style.left = screenX + "px";

      const x = svgPoint.x;
      const y = svgPoint.y;

      if (
        x < 0 ||
        x > renderer.baseW ||
        y < -renderer.svg.viewBox.baseVal.height / 2 ||
        y > renderer.svg.viewBox.baseVal.height / 2
      ) {
        this.cursor.textContent = "";
        return;
      }

      const formatted = renderer.data.formatPoint({
        x,
        y: renderer.data.getPointAtTime(x) || 0,
      });

      this.cursor.textContent = `${formatted.x}, ${formatted.y}`;
    });
  }
}
