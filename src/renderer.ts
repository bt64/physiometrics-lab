import type { Data } from "./data";
import { Selection } from "./selection";
import { Scroll } from "./scroll";
import { Cursor } from "./cursor";
import { toPng } from "html-to-image";
import { ErrorDialog } from "./error-dialog";

export const SVG_PADDING = { top: 32, right: 16, bottom: 32, left: 48 };

export class Renderer {
  public readonly svg = document.querySelector("svg")!;
  public readonly container = document.querySelector("div.container") as HTMLDivElement;
  public readonly copyButton = this.container.querySelector("button#copy") as HTMLButtonElement;
  public baseW = 0;

  private cachedSVGMatrix: DOMMatrix | null = null;

  public readonly selection: Selection;
  private readonly scroll: Scroll;

  constructor(public data: Data) {
    this.svg.style.padding = `${SVG_PADDING.top}px ${SVG_PADDING.right}px ${SVG_PADDING.bottom}px ${SVG_PADDING.left}px`;
    this.copyButton.addEventListener("click", async () => {
      try {
        await this.downloadPng();
      } catch (error) {
        ErrorDialog.show("Failed to export the plot.");
      }
    });

    this.selection = new Selection(this);
    this.scroll = new Scroll(this);
    new Cursor(this);

    // has to be called after the selection is created, because it uses the selection to reset the markers
    this.selection.reset();
  }

  public svgToScreen(x: number, y: number) {
    const m = this.cachedSVGMatrix || this.svg.getScreenCTM()!;
    const svgPoint = this.svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;
    return svgPoint.matrixTransform(m);
  }

  public screenToSvg(x: number, y: number) {
    const m = this.cachedSVGMatrix || this.svg.getScreenCTM()!;
    const screenPoint = this.svg.createSVGPoint();
    screenPoint.x = x;
    screenPoint.y = y;
    return screenPoint.matrixTransform(m.inverse());
  }

  private screenToData(x: number, y: number, format?: true): { x: string; y: string };
  private screenToData(x: number, y: number, format?: false): { x: number; y: number };
  private screenToData(
    x: number,
    y: number,
    format = true,
  ): { x: number | string; y: number | string } {
    const svgPoint = this.screenToSvg(x, y);
    x = svgPoint.x / this.data.samplingRate;
    if (this.data.isEvoked) x *= 1000;
    y = -svgPoint.y;

    if (format) {
      return {
        x: this.data.isEvoked ? x.toFixed(3) : x.toFixed(1),
        y: y.toFixed(2),
      };
    }
    return { x, y };
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

  /**
   * Draws markers and sets up their event listeners (rendered in HTML instead of SVG to avoid scaling issues).
   * Must be called in `setScale()` to ensure correct positioning after scaling.
   */
  public drawMarkers() {
    const size = 5;
    const color = "#000";

    const markers = this.selection.statistics.markers;
    const markersContainer = this.container.querySelector("div.markers") as HTMLDivElement;

    if (markersContainer.childElementCount !== markers.length) {
      markersContainer.replaceChildren();

      for (const _ of markers) {
        const circle = document.createElement("div");
        markersContainer.append(circle);

        circle.style.width = size + "px";
        circle.style.height = size + "px";
        circle.style.position = "absolute";
        circle.style.transform = "translate(-50%, -50%)";

        circle.style.borderRadius = "50%";
        circle.style.background = color;
      }
    }

    const circles = markersContainer.querySelectorAll("div");

    this.cachedSVGMatrix = this.svg.getScreenCTM();
    const containerRect = this.container.getBoundingClientRect();

    for (const [i, marker] of markers.entries()) {
      const circle = circles[i];
      const point = this.svgToScreen(marker.x, marker.y);

      circle.style.left = `${point.x - containerRect.left}px`;
      circle.style.top = `${point.y - containerRect.top}px`;

      circle.onclick = () => this.selection.statistics.removeMarker(marker);
    }

    this.cachedSVGMatrix = null;
  }

  private drawSignalPlot() {
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");

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

    // if the number of labels hasn't changed, just update the labels
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

    // create the labels
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

  /**
   * Updates the text content of the axis labels based on the current scale and position of the SVG viewBox.
   * Must be called in `setScale()` to ensure correct values.
   */
  private updateAxisLabels() {
    const axisX = document.querySelector("div.axis.x")!;
    const axisY = document.querySelector("div.axis.y")!;

    this.cachedSVGMatrix = this.svg.getScreenCTM();

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
      if (i === axisY.childElementCount / 2) v = "0.00";

      p.textContent = v;
    }

    this.cachedSVGMatrix = null;
  }

  public drawSelection(start: number, end: number) {
    let rect = this.svg.querySelector("rect");
    if (!rect) rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    if (start > end) [start, end] = [end, start];

    rect.setAttribute("x", start.toString());
    rect.setAttribute("y", (-this.data.absMax * 1.1).toString());
    rect.setAttribute("width", (end - start).toString());
    rect.setAttribute("height", (this.data.absMax * 2 * 1.1).toString());
    rect.setAttribute("fill", "#0002");
    rect.setAttribute("vector-effect", "non-scaling-stroke");
    rect.classList.add("selection");

    this.svg.prepend(rect);
  }

  public drawLocators() {
    for (const locator of this.data.locators) {
      const x = this.data.isEvoked ? locator * 1000 : locator;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

      rect.setAttribute("x", x.toString());
      rect.setAttribute("y", (-this.data.absMax * 1.1).toString());
      rect.setAttribute("width", "0.1");
      rect.setAttribute("height", (this.data.absMax * 2 * 1.1).toString());
      rect.setAttribute("vector-effect", "non-scaling-stroke");
      rect.setAttribute("stroke", "#0002");
      rect.setAttribute("stroke-width", "1.2");

      this.svg.appendChild(rect);
    }
  }

  /**
   * Sets the scale of the SVG viewBox based on the provided width and x offset.
   */
  public setScale(width: number, x: number) {
    this.svg.style.height = this.container.clientHeight + "px";

    const viewBox = this.svg.viewBox.baseVal;

    viewBox.width = this.baseW * width;
    viewBox.x = this.baseW * x;
    this.drawAxisLabels();
    this.drawMarkers();
  }

  public render() {
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

    this.scroll.reset();
    this.selection.reset();

    // need to wait for the next tick to get the correct container size
    Promise.resolve().then(() => {
      this.drawAxisLabels(true);
      this.drawZeroLine();
      this.drawSignalPlot();
      this.drawLocators();
      this.setScale(1, 0);
    });
  }

  private async downloadPng() {
    const exclude = ["div.cursor", "div.scroll", "button"];
    const selection = this.container.querySelector("rect.selection") as SVGRectElement;

    const filter = (el: HTMLElement) => {
      return !exclude.some((str) => el instanceof Element && el.matches(str));
    };

    selection.style.display = "none";
    const png = await toPng(this.container, { filter, pixelRatio: 4 });
    selection.style.display = "";

    const link = document.createElement("a");
    link.download = this.data.fileName.replace(/\.[^/.]+$/, "") + ".png";
    link.href = png;
    link.click();
  }
}
