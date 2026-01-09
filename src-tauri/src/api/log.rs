use tauri::command;

#[derive(Debug)]
pub enum LogLevel {
    Info,
    Error,
    Debug,
}

impl LogLevel {
    pub fn from_str(level: &str) -> Self {
        match level.to_lowercase().as_str() {
            "error" => LogLevel::Error,
            "debug" => LogLevel::Debug,
            _ => LogLevel::Info,
        }
    }
}

#[command]
pub fn log(message: String, level: Option<String>) {
    let level = level
        .map(|l| LogLevel::from_str(&l))
        .unwrap_or(LogLevel::Info);

    match level {
        LogLevel::Info => println!("[INFO] {}", message),
        LogLevel::Error => eprintln!("[ERROR] {}", message),
        LogLevel::Debug => println!("[DEBUG] {}", message),
    }
}
