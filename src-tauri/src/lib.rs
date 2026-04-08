use std::sync::mpsc;
use std::thread;
use tauri::Emitter;

use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_graphics::event::{
    CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
    CallbackResult,
};

// macOS virtual key code for Option/Alt
const KEY_CODE_OPTION: u16 = 58;
const KEY_CODE_RIGHT_OPTION: u16 = 61;
// macOS event flag bit for Option/Alternate
const FLAG_OPTION: u64 = 0x80000;

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

fn is_option_key(keycode: u16) -> bool {
    keycode == KEY_CODE_OPTION || keycode == KEY_CODE_RIGHT_OPTION
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![log_to_terminal])
        .setup(|app| {
            let handle = app.handle().clone();
            let error_handle = handle.clone();
            let (tx, rx) = mpsc::channel::<KeyEvent>();

            // Thread 1: CGEventTap for global key events (no string conversion)
            thread::spawn(move || {
                eprintln!("[INFO] [rust] Global key listener starting (CGEventTap)...");

                let tap = CGEventTap::new(
                    CGEventTapLocation::Session,
                    CGEventTapPlacement::HeadInsertEventTap,
                    CGEventTapOptions::ListenOnly,
                    vec![CGEventType::FlagsChanged],
                    {
                        let tx = tx.clone();
                        move |_proxy, _event_type, event| {
                            let keycode = event.get_integer_value_field(
                                core_graphics::event::EventField::KEYBOARD_EVENT_KEYCODE,
                            ) as u16;

                            if is_option_key(keycode) {
                                let flags = event.get_flags();
                                if flags.bits() & FLAG_OPTION != 0 {
                                    let _ = tx.send(KeyEvent::Press);
                                } else {
                                    let _ = tx.send(KeyEvent::Release);
                                }
                            }

                            CallbackResult::Keep
                        }
                    },
                );

                match tap {
                    Ok(tap) => {
                        unsafe {
                            let loop_source = tap
                                .mach_port()
                                .create_runloop_source(0)
                                .expect("Failed to create runloop source");
                            let run_loop = CFRunLoop::get_current();
                            run_loop.add_source(&loop_source, kCFRunLoopCommonModes);
                            tap.enable();
                            eprintln!("[INFO] [rust] CGEventTap enabled, entering run loop");
                            CFRunLoop::run_current();
                        }
                        eprintln!("[WARN] [rust] CGEventTap run loop exited");
                    }
                    Err(()) => {
                        eprintln!("[ERROR] [rust] Failed to create CGEventTap - accessibility permission required");
                        let _ = error_handle.emit(
                            "global-shortcut-error",
                            "Failed to create event tap. Grant accessibility permission.".to_string(),
                        );
                    }
                }
            });

            // Thread 2: receives key events and emits to webview
            thread::spawn(move || {
                eprintln!("[INFO] [rust] Key event emitter thread started");
                for event in rx {
                    match event {
                        KeyEvent::Press => {
                            eprintln!("[INFO] [rust] Option key pressed");
                            let _ = handle.emit("key-press", "alt");
                        }
                        KeyEvent::Release => {
                            eprintln!("[INFO] [rust] Option key released");
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
