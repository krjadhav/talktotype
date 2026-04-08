import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";

type State = "idle" | "recording" | "transcribing";

let currentState: State = "idle";

const overlay = () => document.getElementById("overlay")!;
const recordingIndicator = () =>
  document.getElementById("recording-indicator")!;
const transcribingIndicator = () =>
  document.getElementById("transcribing-indicator")!;

async function showWindow() {
  const win = getCurrentWindow();
  const monitor = await currentMonitor();
  if (monitor) {
    const screenWidth = monitor.size.width / monitor.scaleFactor;
    const windowWidth = 300;
    const x = (screenWidth - windowWidth) / 2;
    await win.setPosition(new LogicalPosition(x, 12));
  }
  await win.show();
}

async function hideWindow() {
  await getCurrentWindow().hide();
}

async function transitionTo(state: State) {
  console.log(`State: ${currentState} -> ${state}`);
  currentState = state;

  switch (state) {
    case "idle":
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.add("hidden");
      overlay().classList.add("hidden");
      await hideWindow();
      break;

    case "recording":
      overlay().classList.remove("hidden");
      recordingIndicator().classList.remove("hidden");
      transcribingIndicator().classList.add("hidden");
      await showWindow();
      break;

    case "transcribing":
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.remove("hidden");
      setTimeout(() => {
        if (currentState === "transcribing") {
          transitionTo("idle");
        }
      }, 2000);
      break;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await listen("key-press", () => {
    if (currentState === "idle") {
      transitionTo("recording");
    }
  });

  await listen("key-release", () => {
    if (currentState === "recording") {
      transitionTo("transcribing");
    }
  });
});
