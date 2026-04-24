use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const RECENT_FILE_NAME: &str = "recent.json";

#[derive(Serialize, Deserialize, Default)]
struct RecentData {
    last_path: Option<String>,
}

fn get_recent_file_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    app_handle
        .path_resolver()
        .app_data_dir()
        .map(|dir| dir.join(RECENT_FILE_NAME))
}

pub fn save_recent_path(app_handle: &tauri::AppHandle, path: &str) {
    if let Some(file_path) = get_recent_file_path(app_handle) {
        if let Some(parent) = file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let data = RecentData {
            last_path: Some(path.to_string()),
        };
        if let Ok(json) = serde_json::to_string(&data) {
            let _ = fs::write(file_path, json);
        }
    }
}

pub fn load_recent_path(app_handle: &tauri::AppHandle) -> Option<String> {
    let file_path = get_recent_file_path(app_handle)?;
    let content = fs::read_to_string(file_path).ok()?;
    let data: RecentData = serde_json::from_str(&content).ok()?;
    data.last_path
}

pub fn clear_recent_path(app_handle: &tauri::AppHandle) {
    if let Some(file_path) = get_recent_file_path(app_handle) {
        let data = RecentData { last_path: None };
        if let Ok(json) = serde_json::to_string(&data) {
            let _ = fs::write(file_path, json);
        }
    }
}
