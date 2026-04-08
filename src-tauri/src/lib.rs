use std::thread;
use rdev::{listen, Event, EventType, Key};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || {
                let listener_handle = handle.clone();
                if let Err(error) = listen(move |event: Event| {
                    match event.event_type {
                        EventType::KeyPress(Key::F8) => {
                            let _ = listener_handle.emit("key-press", "f8");
                        }
                        EventType::KeyRelease(Key::F8) => {
                            let _ = listener_handle.emit("key-release", "f8");
                        }
                        _ => {}
                    }
                }) {
                    let error_message = format!("{error:?}");
                    eprintln!("global key listener unavailable: {error_message}");
                    let _ = handle.emit("global-shortcut-error", error_message);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
