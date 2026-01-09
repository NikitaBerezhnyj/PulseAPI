#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod adapters;
mod core;
mod formats;

use adapters::tauri::AppState;

fn main() {
    if adapters::cli::try_run_cli() {
        return;
    }

    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            adapters::tauri::load_http_file,
            adapters::tauri::save_http_file,
            adapters::tauri::create_new_file,
            adapters::tauri::get_file_structure,
            adapters::tauri::execute_request,
            adapters::tauri::get_request_preview,
            adapters::tauri::create_group,
            adapters::tauri::rename_group,
            adapters::tauri::delete_group,
            adapters::tauri::create_request,
            adapters::tauri::update_request,
            adapters::tauri::rename_request,
            adapters::tauri::delete_request,
            adapters::tauri::duplicate_request,
            adapters::tauri::move_request,
            adapters::tauri::add_variable,
            adapters::tauri::update_variable,
            adapters::tauri::delete_variable,
            adapters::tauri::get_all_variables,
            adapters::tauri::execute_load_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
