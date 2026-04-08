use std::sync::mpsc;
use std::thread;
use rdev::{listen, Event, EventType, Key};
use tauri::Emitter;

#[derive(Debug)]
enum KeyEvent {
    Press,
    Release,
}

#[tauri::command]
fn log_to_terminal(level: String, message: String) {
    let prefix = match level.as_str() {
        "error" => "[ERROR]",
        "warn" => "[WARN]",
        _ => "[INFO]",
    };
    eprintln!("{prefix} [webview] {message}");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![log_to_terminal])
        .setup(|app| {
            let handle = app.handle().clone();
            let (tx, rx) = mpsc::channel::<KeyEvent>();

            // Thread 1: lightweight rdev callback sends events through channel
            thread::spawn(move || {
                eprintln!("[INFO] [rust] Global key listener starting...");
                if let Err(error) = listen(move |event: Event| {
                    match event.event_type {
                        EventType::KeyPress(Key::Alt) => {
                            let _ = tx.send(KeyEvent::Press);
                        }
                        EventType::KeyRelease(Key::Alt) => {
                            let _ = tx.send(KeyEvent::Release);
                        }
                        _ => {}
                    }
                }) {
                    eprintln!("[ERROR] [rust] global key listener unavailable: {error:?}");
                }
                eprintln!("[WARN] [rust] Global key listener thread exited");
            });

            // Thread 2: receives key events and emits to webview
            thread::spawn(move || {
                eprintln!("[INFO] [rust] Key event emitter thread started");
                for event in rx {
                    match event {
                        KeyEvent::Press => {
                            eprintln!("[INFO] [rust] Key::Alt pressed");
                            let _ = handle.emit("key-press", "alt");
                        }
                        KeyEvent::Release => {
                            eprintln!("[INFO] [rust] Key::Alt released");
                            let _ = handle.emit("key-release", "alt");
                        }
                    }
                }
                eprintln!("[WARN] [rust] Key event emitter thread exited");
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
