use std::thread;
use rdev::{listen, Event, EventType, Key};
use tauri::Emitter;

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
            thread::spawn(move || {
                let listener_handle = handle.clone();
                eprintln!("[INFO] [rust] Global key listener starting...");
                if let Err(error) = listen(move |event: Event| {
                    match event.event_type {
                        EventType::KeyPress(Key::Alt) => {
                            eprintln!("[INFO] [rust] Key::Alt pressed");
                            let _ = listener_handle.emit("key-press", "alt");
                        }
                        EventType::KeyRelease(Key::Alt) => {
                            eprintln!("[INFO] [rust] Key::Alt released");
                            let _ = listener_handle.emit("key-release", "alt");
                        }
                        _ => {}
                    }
                }) {
                    let error_message = format!("{error:?}");
                    eprintln!("[ERROR] [rust] global key listener unavailable: {error_message}");
                    let _ = handle.emit("global-shortcut-error", error_message);
                }
                eprintln!("[WARN] [rust] Global key listener thread exited");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
