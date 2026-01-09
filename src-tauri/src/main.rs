#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod cli;
mod domain;
mod parser;

use api::state::AppState;

fn main() {
    if cli::try_run_cli() {
        return;
    }

    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            api::handlers::load_http_file,
            api::handlers::save_http_file,
            api::handlers::create_new_file,
            api::handlers::get_file_structure,
            api::handlers::execute_request,
            api::handlers::get_request_preview,
            api::handlers::create_group,
            api::handlers::rename_group,
            api::handlers::delete_group,
            api::handlers::create_request,
            api::handlers::update_request,
            api::handlers::rename_request,
            api::handlers::delete_request,
            api::handlers::duplicate_request,
            api::handlers::move_request,
            api::handlers::add_variable,
            api::handlers::update_variable,
            api::handlers::delete_variable,
            api::handlers::get_all_variables,
            api::handlers::execute_load_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
