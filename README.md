# TalkToType

Push-to-talk voice input for macOS. Hold the Option key to record, release to transcribe.

## How it works

- **Hold Option** — overlay appears at top of screen with recording animation
- **Release Option** — switches to transcribing state, then returns to idle

State machine: Idle -> Recording -> Transcribing -> Idle

## Requirements

- macOS with **Input Monitoring** permission (System Settings > Privacy & Security > Input Monitoring)
- Rust, Node.js, pnpm

## Development

```
pnpm install
pnpm tauri dev
```

## Tech Stack

- Tauri v2 (Rust backend, webview frontend)
- TypeScript + Vite
- CGEventTap for global key listening
