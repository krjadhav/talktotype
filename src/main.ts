import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";

type State = "idle" | "recording" | "transcribing";

let currentState: State = "idle";
let transitionQueue: Promise<void> = Promise.resolve();
let transcriptionSession = 0;
let windowPositioned = false;

function log(level: string, message: string) {
  invoke("log_to_terminal", { level, message }).catch(() => {});
}

const overlay = () => document.getElementById("overlay")!;
const recordingIndicator = () =>
  document.getElementById("recording-indicator")!;
const transcribingIndicator = () =>
  document.getElementById("transcribing-indicator")!;

async function positionWindow() {
  if (windowPositioned) return;
  const win = getCurrentWindow();
  const monitor = await currentMonitor();
  if (monitor) {
    const screenWidth = monitor.size.width / monitor.scaleFactor;
    const windowWidth = 300;
    const x = (screenWidth - windowWidth) / 2;
    log("info", `positionWindow: positioning at (${x}, 12)`);
    await win.setPosition(new LogicalPosition(x, 12));
  }
  await win.show();
  windowPositioned = true;
  log("info", "positionWindow: window shown and positioned");
}

function enqueueTransition(state: State) {
  transitionQueue = transitionQueue
    .then(() => applyTransition(state))
    .catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `Transition to "${state}" failed: ${msg}`);
      currentState = "idle";
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.add("hidden");
      overlay().classList.add("hidden");
    });
}

async function applyTransition(state: State) {
  log("info", `State: ${currentState} -> ${state}`);
  currentState = state;

  switch (state) {
    case "idle":
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.add("hidden");
      overlay().classList.add("hidden");
      break;

    case "recording":
      await positionWindow();
      overlay().classList.remove("hidden");
      recordingIndicator().classList.remove("hidden");
      transcribingIndicator().classList.add("hidden");
      break;

    case "transcribing": {
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.remove("hidden");
      // TODO: replace with real transcription-complete event from backend
      const session = ++transcriptionSession;
      setTimeout(() => {
        if (currentState === "transcribing" && session === transcriptionSession) {
          log("info", "Transcription timeout fired, transitioning to idle");
          enqueueTransition("idle");
        }
      }, 2000);
      break;
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  log("info", "App initialized");

  await listen<string>("global-shortcut-error", ({ payload }) => {
    log("error", `Global key listener unavailable: ${payload}`);
    alert(
      "TalkToType needs macOS Accessibility / Input Monitoring permission to capture the global hotkey. " +
        "Grant it in System Settings > Privacy & Security > Input Monitoring, then relaunch the app."
    );
  });

  await listen("key-press", () => {
    log("info", `key-press received, currentState=${currentState}`);
    if (currentState === "idle") {
      enqueueTransition("recording");
    }
  });

  await listen("key-release", () => {
    log("info", `key-release received, currentState=${currentState}`);
    if (currentState === "recording") {
      enqueueTransition("transcribing");
    }
  });

  await listen("transcription-complete", () => {
    log("info", `transcription-complete received, currentState=${currentState}`);
    if (currentState === "transcribing") {
      enqueueTransition("idle");
    }
  });
});
