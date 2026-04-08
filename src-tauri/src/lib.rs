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
                listen(move |event: Event| {
                    match event.event_type {
                        EventType::KeyPress(Key::Alt) => {
                            let _ = handle.emit("key-press", "alt");
                        }
                        EventType::KeyRelease(Key::Alt) => {
                            let _ = handle.emit("key-release", "alt");
                        }
                        _ => {}
                    }
                })
                .expect("Could not listen for global key events");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
