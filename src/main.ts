import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";

type State = "idle" | "recording" | "transcribing";

let currentState: State = "idle";
let transitionQueue: Promise<void> = Promise.resolve();
let transcriptionSession = 0;

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

function enqueueTransition(state: State) {
  transitionQueue = transitionQueue.then(() => applyTransition(state));
}

async function applyTransition(state: State) {
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

    case "transcribing": {
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.remove("hidden");
      // TODO: replace with real transcription-complete event from backend
      const session = ++transcriptionSession;
      setTimeout(() => {
        if (currentState === "transcribing" && session === transcriptionSession) {
          enqueueTransition("idle");
        }
      }, 2000);
      break;
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await listen<string>("global-shortcut-error", ({ payload }) => {
    console.error("Global key listener unavailable:", payload);
    alert(
      "TalkToType needs macOS Accessibility / Input Monitoring permission to capture the global hotkey. " +
        "Grant it in System Settings > Privacy & Security > Input Monitoring, then relaunch the app."
    );
  });

  await listen("key-press", () => {
    if (currentState === "idle") {
      enqueueTransition("recording");
    }
  });

  await listen("key-release", () => {
    if (currentState === "recording") {
      enqueueTransition("transcribing");
    }
  });

  await listen("transcription-complete", () => {
    if (currentState === "transcribing") {
      enqueueTransition("idle");
    }
  });
});
