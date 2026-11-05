import "@fontsource-variable/roboto-mono";

import { Data } from "./data";
import { Scroll } from "./scroll";
import { Renderer } from "./renderer";
import { Cursor } from "./cursor";
import { Selection } from "./selection";

const container = document.querySelector("div.container") as HTMLDivElement;
const controls = document.querySelector("div.controls") as HTMLDivElement;

const fileInput = document.querySelector("input#file") as HTMLInputElement;
const frameInput = document.querySelector("input#frame") as HTMLInputElement;
const channelInput = document.querySelector(
  "input#channel",
) as HTMLInputElement;
const interpolationInput = document.querySelector(
  "input#interpolation",
) as HTMLInputElement;

const infoP = document.querySelector("p.info") as HTMLParagraphElement;

let file: File | undefined;
let data = new Data();
let renderer = new Renderer(data);

const scroll = new Scroll(renderer);
const selection = new Selection(renderer);
new Cursor(renderer);

// Error if no mouse is available (touch devices are not supported)
if (window.matchMedia("(any-hover: none)").matches) {
  document.body.innerHTML =
    '<p class="error">Touch devices are not supported</p>';
  throw new Error("touch device");
}

const load = async (channel?: number, frame?: number) => {
  if (!file) {
    controls.classList.add("hide");
    container.hidden = true;
    return;
  }

  await data.loadFromFile(file, channel, frame);
  renderer.render();
  scroll.reset();
  selection.reset();

  container.hidden = false;
  controls.classList.remove("hide");

  if (channel === undefined) {
    channelInput.value = data.channel.toString();
  }

  if (frame === undefined) {
    frameInput.value = data.frame.toString();
  }

  if (data.isEvoked) {
    frameInput.max = (data.frameCount - 1).toString();
    frameInput.labels![0].hidden = false;
    frameInput.hidden = false;
    interpolationInput.hidden = true;
    interpolationInput.labels![0].hidden = true;
  } else {
    frameInput.labels![0].hidden = true;
    frameInput.hidden = true;
    interpolationInput.hidden = false;
    interpolationInput.labels![0].hidden = false;
  }

  const duration =
    data.duration > 1000
      ? `${(data.duration / 1000).toFixed(1)}s`
      : `${data.duration.toFixed(1)}ms`;

  infoP.innerHTML = `<span>${file.name}</span> : ${data.samplingRate}Hz, ${duration}, [${data.min.toFixed(3)}V, ${data.max.toFixed(3)}V]`;
};

fileInput.addEventListener("change", async (event) => {
  file = (event.target as HTMLInputElement).files?.[0];
  frameInput.value = "0";
  interpolationInput.value = "4";
  data.interpolationDegree = interpolationInput.valueAsNumber;
  await load();
});

interpolationInput.addEventListener("input", () => {
  data.interpolationDegree = interpolationInput.valueAsNumber;
  renderer.render();
  scroll.reset();
  selection.reset();
});

frameInput.addEventListener("input", async () => {
  await load(channelInput.valueAsNumber, frameInput.valueAsNumber);
});

channelInput.addEventListener("input", async () => {
  await load(channelInput.valueAsNumber, frameInput.valueAsNumber);
});
