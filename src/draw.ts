import type { Data, Point } from "./data";

const svg = document.querySelector("svg")!;
const container = document.querySelector("div.container")!;
let baseW = 0;

export const setScale = (width: number, x: number) => {
  svg.style.width = container.clientWidth + "px";
  svg.style.height = container.clientHeight + "px";

  const viewBox = svg.viewBox.baseVal;

  viewBox.width = baseW * width;
  viewBox.x = baseW * x;
  drawAxisLabels();
};

const drawZeroLine = (w: number) => {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  line.setAttribute("x1", "0");
  line.setAttribute("y1", "0");
  line.setAttribute("x2", w.toString());
  line.setAttribute("y2", "0");
  line.setAttribute("stroke", "#bbb");
  line.setAttribute("stroke-width", "1.5");
  line.setAttribute("vector-effect", "non-scaling-stroke");

  svg.appendChild(line);
};

const drawSignalGraph = (points: Point[]) => {
  const polyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );

  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "red");
  polyline.setAttribute("stroke-width", "1.2");
  polyline.setAttribute("stroke-linejoin", "round");
  polyline.setAttribute("vector-effect", "non-scaling-stroke");

  for (const p of points) {
    const point = svg.createSVGPoint();
    point.x = p.x;
    point.y = p.y;

    polyline.points.appendItem(point);
  }

  svg.appendChild(polyline);
};

const drawAxisLabels = () => {
  const axisX = document.querySelector("div.axis.x")!;
  const axisY = document.querySelector("div.axis.y")!;

  axisX.replaceChildren();
  axisY.replaceChildren();

  const v = document.createElement("p");
  v.textContent = "[V]";
  const ms = document.createElement("p");
  ms.textContent = "[ms]";

  axisX.append(ms);
  axisY.append(v);

  const xLabelCount = Math.floor(container.clientWidth / 120);
  const yLabelCount = Math.floor(container.clientHeight / 100);

  const p = document.createElement("p");
  p.textContent = "0.00";

  for (let i = 0; i < xLabelCount; i++) {
    axisX.append(p.cloneNode(true));
  }

  for (let i = 0; i < yLabelCount; i++) {
    axisY.append(p.cloneNode(true));
  }

  p.remove();
};

export const draw = (data: Data) => {
  svg.replaceChildren();

  let { absMax } = data;
  const points = data.points();
  // add a little padding to the top and bottom
  absMax *= 1.1;

  // set sizes
  baseW = points.at(-1)?.x || 0;

  svg.viewBox.baseVal.x = 0;
  svg.viewBox.baseVal.y = -absMax;
  svg.viewBox.baseVal.width = baseW;
  svg.viewBox.baseVal.height = absMax * 2;

  // need to wait for the next tick to get the correct container size
  Promise.resolve().then(() => {
    drawAxisLabels();
    drawZeroLine(baseW);
    drawSignalGraph(points);
    setScale(1, 0);
  });
};
