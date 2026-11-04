import { type Data, type Point } from "./data";
import { Statistics } from "./statistics";
import { toPng } from "html-to-image";

export const SVG_PADDING = { top: 32, right: 16, bottom: 32, left: 48 };

export class Renderer {
  svg = document.querySelector("svg")!;
  container = document.querySelector("div.container") as HTMLDivElement;
  copyButton = this.container.querySelector("button") as HTMLButtonElement;
  baseW = 0;

  constructor(public data: Data) {
    this.svg.style.padding = `${SVG_PADDING.top}px ${SVG_PADDING.right}px ${SVG_PADDING.bottom}px ${SVG_PADDING.left}px`;
    this.copyButton.addEventListener("click", async () => {
      await this.copyPngToClipboard();
    });
  }

  svgToScreen(x: number, y: number) {
    const svgPoint = this.svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;
    return svgPoint.matrixTransform(this.svg.getScreenCTM()!);
  }

  screenToSvg(x: number, y: number) {
    const screenPoint = this.svg.createSVGPoint();
    screenPoint.x = x;
    screenPoint.y = y;
    return screenPoint.matrixTransform(this.svg.getScreenCTM()?.inverse());
  }

  screenToData(x: number, y: number, format?: true): { x: string; y: string };
  screenToData(x: number, y: number, format?: false): { x: number; y: number };
  screenToData(
    x: number,
    y: number,
    format = true,
  ): { x: number | string; y: number | string } {
    const svgPoint = this.screenToSvg(x, y);
    x = svgPoint.x / this.data.samplingRate;
    if (this.data.isEvoked) x *= 1000;
    y = -svgPoint.y;
    if (Math.abs(y) < 1e-6) y = 0;

    if (format) {
      return {
        x: this.data.isEvoked ? x.toFixed(3) : x.toFixed(1),
        y: y.toFixed(2),
      };
    }
    return { x, y };
  }

  setScale(width: number, x: number) {
    this.svg.style.height = this.container.clientHeight + "px";

    const viewBox = this.svg.viewBox.baseVal;

    viewBox.width = this.baseW * width;
    viewBox.x = this.baseW * x;
    this.drawAxisLabels();
  }

  private drawZeroLine() {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", this.baseW.toString());
    line.setAttribute("y2", "0");
    line.setAttribute("stroke", "#bbb");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("vector-effect", "non-scaling-stroke");

    this.svg.appendChild(line);
  }

  private drawSignalPlot() {
    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );

    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "red");
    polyline.setAttribute("stroke-width", "1.2");
    polyline.setAttribute("stroke-linejoin", "round");
    polyline.setAttribute("vector-effect", "non-scaling-stroke");

    for (const p of this.data.points()) {
      const point = this.svg.createSVGPoint();
      point.x = p.x;
      point.y = p.y;

      polyline.points.appendItem(point);
    }

    this.svg.appendChild(polyline);
  }

  private drawAxisLabels(force = false) {
    const axisX = document.querySelector("div.axis.x")!;
    const axisY = document.querySelector("div.axis.y")!;

    let xLabelCount = Math.floor(this.container.clientWidth / 120);
    let yLabelCount = Math.floor(this.container.clientHeight / 60);
    if (yLabelCount % 2 === 0) yLabelCount++;

    if (
      axisX.childElementCount === xLabelCount + 1 &&
      axisY.childElementCount === yLabelCount + 1 &&
      !force
    ) {
      this.updateAxisLabels();
      return;
    }

    axisX.replaceChildren();
    axisY.replaceChildren();

    const v = document.createElement("p");
    v.textContent = "[V]";

    const ms = document.createElement("p");
    ms.textContent = this.data.isEvoked ? "[ms]" : "[s]";

    axisY.append(v);
    axisX.append(ms);

    const p = document.createElement("p");
    p.textContent = "\u00A0";

    // create the labels
    for (let i = 0; i < xLabelCount; i++) {
      axisX.append(p.cloneNode(true));
    }
    for (let i = 0; i < yLabelCount; i++) {
      axisY.append(p.cloneNode(true));
    }
    p.remove();

    this.updateAxisLabels();
  }

  private updateAxisLabels() {
    const axisX = document.querySelector("div.axis.x")!;
    const axisY = document.querySelector("div.axis.y")!;

    for (let i = 1; i < axisX.childElementCount; i++) {
      const p = axisX.children[i] as HTMLParagraphElement;

      const x = p.offsetLeft + p.clientWidth / 2;
      let t = this.screenToData(x, 0).x;

      p.textContent = t;
    }

    for (let i = 1; i < axisY.childElementCount; i++) {
      const p = axisY.children[i] as HTMLParagraphElement;

      const y = p.offsetTop + p.clientHeight / 2;
      let v = this.screenToData(0, y).y;
      if (Math.abs(Number(v)) < 1e-6) v = "0.00";

      p.textContent = v;
    }
  }

  drawSelection(start: number, end: number) {
    let rect = this.svg.querySelector("rect");
    if (!rect)
      rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    if (start > end) [start, end] = [end, start];

    rect.setAttribute("x", start.toString());
    rect.setAttribute("y", (-this.data.absMax * 1.1).toString());
    rect.setAttribute("width", (end - start).toString());
    rect.setAttribute("height", (this.data.absMax * 2 * 1.1).toString());
    rect.setAttribute("fill", "#0002");
    rect.setAttribute("vector-effect", "non-scaling-stroke");

    this.svg.appendChild(rect);
  }

  drawLocalExtrema(points: Point[]) {
    let g = this.svg.querySelector("g");
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.svg.appendChild(g);
    }
    g.replaceChildren();

    for (const p of Statistics.localExtrema(points).all) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );

      path.setAttribute("d", `M ${p.x} ${p.y} l 0.001 0`);
      path.setAttribute("stroke", "#222");
      path.setAttribute("stroke-width", "5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("vector-effect", "non-scaling-stroke");

      g.appendChild(path);
    }
  }

  render() {
    this.svg.replaceChildren();

    let { absMax } = this.data;
    const points = this.data.points();
    // add a little padding to the top and bottom
    absMax *= 1.1;

    // set sizes
    this.baseW = points.at(-1)?.x || 0;

    this.svg.viewBox.baseVal.x = 0;
    this.svg.viewBox.baseVal.y = -absMax;
    this.svg.viewBox.baseVal.width = this.baseW;
    this.svg.viewBox.baseVal.height = absMax * 2;

    // need to wait for the next tick to get the correct container size
    Promise.resolve().then(() => {
      this.drawAxisLabels(true);
      this.drawZeroLine();
      this.drawSignalPlot();
      this.setScale(1, 0);
    });
  }

  async copyPngToClipboard() {
    const toHide = ["div.cursor", "div.scroll", "rect", "button"];

    for (const str of toHide) {
      const el = this.container.querySelector(str) as HTMLElement;
      if (el) el.style.display = "none";
    }

    const png = await toPng(this.container);

    const link = document.createElement("a");
    link.download = this.data.fileName.replace(/\.[^/.]+$/, "") + ".png";
    link.href = png;
    link.click();

    for (const str of toHide) {
      const el = this.container.querySelector(str) as HTMLElement;
      if (el) el.style.display = "";
    }
  }
}
