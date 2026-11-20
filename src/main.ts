import "@fontsource-variable/roboto-mono";
import { Loader } from "./loader";

// Error if no mouse is available (touch devices are not supported)
if (window.matchMedia("(any-hover: none)").matches) {
  document.body.innerHTML = '<p class="error">Touch devices are not supported</p>';
  throw new Error("touch device");
}

// Loader's constructor will initialize the application and set up event listeners
new Loader();
