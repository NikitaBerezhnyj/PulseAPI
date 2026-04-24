use crate::api::recent;
use crate::api::state::AppState;
use crate::domain::executor::execute;
use crate::domain::load_test::LoadTestProgress;
use crate::domain::load_test::{run_load_test, LoadTestConfig, LoadTestResult};
use crate::domain::models::HttpRequest;
use crate::domain::models::HttpResponse;
use crate::parser::http_file::{HttpFile, NamedRequest, RequestGroup};
use std::collections::HashMap;
use std::fs;
use std::sync::mpsc;
use std::thread;
use tauri::{Manager, State};
use uuid::Uuid;

fn auto_save(state: &State<AppState>) -> Result<(), String> {
    let path = state.current_path.lock().unwrap();
    let file = state.current_file.lock().unwrap();

    if let (Some(path), Some(file)) = (path.as_ref(), file.as_ref()) {
        let content = file.to_http_string();
        fs::write(path, content).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_http_file(
    path: String,
    app_handle: tauri::AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let http_file = HttpFile::parse(&content);
    *state.current_file.lock().unwrap() = Some(http_file);
    *state.current_path.lock().unwrap() = Some(path.clone());

    recent::save_recent_path(&app_handle, &path);

    Ok(())
}

#[tauri::command]
pub fn restore_recent_file(app_handle: tauri::AppHandle, state: State<AppState>) -> Option<String> {
    let path = recent::load_recent_path(&app_handle)?;

    let content = fs::read_to_string(&path).ok()?;
    let http_file = HttpFile::parse(&content);

    *state.current_file.lock().unwrap() = Some(http_file);
    *state.current_path.lock().unwrap() = Some(path.clone());

    Some(path)
}

#[tauri::command]
pub fn clear_recent_file(app_handle: tauri::AppHandle) {
    recent::clear_recent_path(&app_handle);
}

#[tauri::command]
pub fn save_http_file(path: String, state: State<AppState>) -> Result<(), String> {
    let file = state.current_file.lock().unwrap();
    let content = file.as_ref().ok_or("No file loaded")?.to_http_string();

    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_request(request_id: Uuid, state: State<AppState>) -> Result<HttpResponse, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    let named_req = http_file
        .groups
        .iter()
        .flat_map(|g| g.requests.iter())
        .find(|r| r.id == request_id)
        .ok_or("Request not found")?;

    let request = http_file.apply_variables(named_req.request.clone());

    execute(request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_group(name: Option<String>, state: State<AppState>) -> Result<Uuid, String> {
    let id = Uuid::new_v4();
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let group = RequestGroup {
            id: id,
            name,
            requests: Vec::new(),
        };

        http_file.groups.push(group);
    }

    auto_save(&state)?;
    Ok(id)
}

#[tauri::command]
pub fn rename_group(
    group_id: Uuid,
    new_name: String,
    state: State<AppState>,
) -> Result<(), String> {
    {
        println!("Renaming group {:?} to {:?}", group_id, new_name);
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let group = http_file
            .groups
            .iter_mut()
            .find(|g| g.id == group_id)
            .ok_or("Group not found")?;

        group.name = if new_name.is_empty() {
            None
        } else {
            Some(new_name)
        };
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn delete_group(group_id: Uuid, state: State<AppState>) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let group_index = http_file
            .groups
            .iter()
            .position(|g| g.id == group_id)
            .ok_or("Group not found")?;

        http_file.groups.remove(group_index);
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn get_all_requests(state: State<AppState>) -> Result<Vec<RequestGroup>, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    Ok(http_file.groups.clone())
}

#[tauri::command]
pub fn create_request(
    group_id: Option<Uuid>,
    name: String,
    method: String,
    url: String,
    state: State<AppState>,
) -> Result<Uuid, String> {
    let request_id = Uuid::new_v4();

    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let group = match group_id {
            Some(id) => http_file
                .groups
                .iter_mut()
                .find(|g| g.id == id)
                .ok_or("Group not found")?,
            None => http_file
                .groups
                .iter_mut()
                .find(|g| g.name.is_none())
                .ok_or("Ungrouped group not found")?,
        };

        let request = HttpRequest::new(method, url);

        group.requests.push(NamedRequest {
            id: request_id,
            name,
            request,
        });
    }

    auto_save(&state)?;
    Ok(request_id)
}

#[tauri::command]
pub fn rename_request(
    request_id: Uuid,
    new_name: String,
    state: State<AppState>,
) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let named_req = http_file
            .groups
            .iter_mut()
            .flat_map(|g| g.requests.iter_mut())
            .find(|r| r.id == request_id)
            .ok_or("Request not found")?;

        named_req.name = new_name;
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn update_request(
    request_id: Uuid,
    request: HttpRequest,
    state: State<AppState>,
) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let mut found = false;
        for group in &mut http_file.groups {
            if let Some(named_req) = group.requests.iter_mut().find(|r| r.id == request_id) {
                named_req.request = request;
                found = true;
                break;
            }
        }

        if !found {
            return Err("Request not found".to_string());
        }
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn move_request(
    from_group_id: Option<Uuid>,
    request_id: Uuid,
    to_group_id: Option<Uuid>,
    state: State<AppState>,
) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let request = {
            let source_group = match from_group_id {
                Some(id) => http_file.groups.iter_mut().find(|g| g.id == id),
                None => http_file.groups.iter_mut().find(|g| g.name.is_none()),
            }
            .ok_or("Source group not found")?;

            let pos = source_group
                .requests
                .iter()
                .position(|r| r.id == request_id)
                .ok_or("Request not found")?;

            source_group.requests.remove(pos)
        };

        let target_group = http_file
            .groups
            .iter_mut()
            .find(|g| match to_group_id {
                Some(id) => g.id == id,
                None => g.name.is_none(),
            })
            .ok_or("Target group not found")?;

        target_group.requests.push(request);
        target_group
            .requests
            .sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn delete_request(request_id: Uuid, state: State<AppState>) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        let mut found = false;
        for group in &mut http_file.groups {
            if let Some(pos) = group.requests.iter().position(|r| r.id == request_id) {
                group.requests.remove(pos);
                found = true;
                break;
            }
        }

        if !found {
            return Err("Request not found".to_string());
        }
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn get_all_variables(state: State<AppState>) -> Result<HashMap<String, String>, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    Ok(http_file.variables.clone())
}

#[tauri::command]
pub fn add_variable(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;
        http_file.variables.insert(key, value);
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn update_variable(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        http_file.variables.insert(key, value);
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub fn delete_variable(key: String, state: State<AppState>) -> Result<(), String> {
    {
        let mut file = state.current_file.lock().unwrap();
        let http_file = file.as_mut().ok_or("No file loaded")?;

        http_file
            .variables
            .remove(&key)
            .ok_or("Variable not found")?;
    }

    auto_save(&state)?;
    Ok(())
}

#[tauri::command]
pub async fn execute_load_test(
    app_handle: tauri::AppHandle,
    request_id: Uuid,
    total_requests: usize,
    duration_secs: Option<u64>,
    concurrent: usize,
    state: State<'_, AppState>,
) -> Result<LoadTestResult, String> {
    let request = {
        let file = state.current_file.lock().unwrap();
        let http_file = file.as_ref().ok_or("No file loaded")?;
        let named_req = http_file
            .groups
            .iter()
            .flat_map(|g| g.requests.iter())
            .find(|r| r.id == request_id)
            .ok_or("Request not found")?;
        http_file.apply_variables(named_req.request.clone())
    };

    let config = LoadTestConfig {
        total_requests,
        duration_secs,
        concurrent,
    };

    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let window = app_handle.get_window("main");

        let result = run_load_test(
            request,
            config,
            Some(move |p: LoadTestProgress| {
                if let Some(ref w) = window {
                    let _ = w.emit("load-test-progress", &p);
                    thread::sleep(std::time::Duration::from_millis(10));
                }
            }),
        );

        if let Some(ref w) = app_handle.get_window("main") {
            let _ = w.emit(
                "load-test-progress",
                &LoadTestProgress {
                    completed: result.total_requests,
                    successful: result.successful,
                    failed: result.failed,
                    elapsed_ms: result.total_duration.as_millis(),
                    total_requests: result.total_requests as u128,
                },
            );
            thread::sleep(std::time::Duration::from_millis(50));
        }

        let _ = tx.send(result);
    });

    let result = tokio::task::spawn_blocking(move || rx.recv().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

    Ok(result)
}
