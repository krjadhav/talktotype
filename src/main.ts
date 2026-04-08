type State = "idle" | "recording" | "transcribing";

let currentState: State = "idle";

const overlay = () => document.getElementById("overlay")!;
const recordingIndicator = () => document.getElementById("recording-indicator")!;
const transcribingIndicator = () => document.getElementById("transcribing-indicator")!;

function transitionTo(state: State) {
  console.log(`State: ${currentState} -> ${state}`);
  currentState = state;

  switch (state) {
    case "idle":
      overlay().classList.add("hidden");
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.add("hidden");
      break;

    case "recording":
      overlay().classList.remove("hidden");
      recordingIndicator().classList.remove("hidden");
      transcribingIndicator().classList.add("hidden");
      break;

    case "transcribing":
      overlay().classList.remove("hidden");
      recordingIndicator().classList.add("hidden");
      transcribingIndicator().classList.remove("hidden");
      // Simulate transcription delay, then return to idle
      setTimeout(() => {
        if (currentState === "transcribing") {
          transitionTo("idle");
        }
      }, 2000);
      break;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // Option (Alt) key press starts recording
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Alt" && currentState === "idle") {
      e.preventDefault();
      transitionTo("recording");
    }
  });

  // Option (Alt) key release stops recording -> transcribing
  document.addEventListener("keyup", (e: KeyboardEvent) => {
    if (e.key === "Alt" && currentState === "recording") {
      e.preventDefault();
      transitionTo("transcribing");
    }
  });
});
