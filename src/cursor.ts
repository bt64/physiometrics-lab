import { type Renderer } from "./renderer";

export class Cursor {
  cursor: HTMLDivElement;

  constructor(renderer: Renderer) {
    this.cursor = document.createElement("div");
    this.cursor.classList.add("cursor");
    renderer.container.appendChild(this.cursor);

    addEventListener("mousemove", (e) => {
      const screenX = e.clientX;
      const screenY = e.clientY;

      const svgPoint = renderer.screenToSvg(screenX, screenY);

      this.cursor.style.left = screenX + "px";
      this.cursor.style.top = screenY + "px";

      let x = svgPoint.x;
      let y = svgPoint.y;

      if (
        x < 0 ||
        x > renderer.baseW ||
        y < -renderer.svg.viewBox.baseVal.height / 2 ||
        y > renderer.svg.viewBox.baseVal.height / 2
      ) {
        this.cursor.textContent = "";
        return;
      }

      const dataPoint = renderer.screenToData(screenX, screenY);

      this.cursor.textContent = `${dataPoint.x}, ${dataPoint.y}`;
    });
  }
}
