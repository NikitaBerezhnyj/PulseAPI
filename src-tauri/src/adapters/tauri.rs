use crate::core::request::HttpRequest;
use crate::core::response::HttpResponse;
use crate::core::runner::execute;
use crate::core::test::{run_load_test, LoadTestConfig, LoadTestResult};
use crate::formats::file::{HttpFile, NamedRequest, RequestGroup};
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use tauri::{Manager, State};

#[derive(Default)]
pub struct AppState {
    pub current_file: Mutex<Option<HttpFile>>,
}

#[tauri::command]
pub fn load_http_file(path: String, state: State<AppState>) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let http_file = HttpFile::parse(&content);

    *state.current_file.lock().unwrap() = Some(http_file.clone());

    Ok(serde_json::to_string(&http_file).unwrap())
}

#[tauri::command]
pub fn save_http_file(path: String, state: State<AppState>) -> Result<(), String> {
    let file = state.current_file.lock().unwrap();
    let content = file.as_ref().ok_or("No file loaded")?.to_http_string();

    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_request(
    group_index: usize,
    request_index: usize,
    state: State<AppState>,
) -> Result<HttpResponse, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    let group = http_file.groups.get(group_index).ok_or("Group not found")?;
    let named_req = group
        .requests
        .get(request_index)
        .ok_or("Request not found")?;

    let request = http_file.apply_variables(named_req.request.clone());

    execute(request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_file_structure(state: State<AppState>) -> Result<String, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    Ok(serde_json::to_string(&http_file).unwrap())
}

#[tauri::command]
pub fn add_variable(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;
    http_file.variables.insert(key, value);
    Ok(())
}

#[tauri::command]
pub fn update_request(
    group_index: usize,
    request_index: usize,
    request: HttpRequest,
    state: State<AppState>,
) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .get_mut(group_index)
        .ok_or("Group not found")?;
    let named_req = group
        .requests
        .get_mut(request_index)
        .ok_or("Request not found")?;

    named_req.request = request;
    Ok(())
}

#[tauri::command]
pub fn create_group(name: Option<String>, state: State<AppState>) -> Result<usize, String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    http_file.groups.push(RequestGroup {
        name,
        requests: Vec::new(),
    });

    Ok(http_file.groups.len() - 1)
}

#[tauri::command]
pub fn rename_group(
    group_index: usize,
    new_name: String,
    state: State<AppState>,
) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .get_mut(group_index)
        .ok_or("Group not found")?;
    group.name = if new_name.is_empty() {
        None
    } else {
        Some(new_name)
    };

    Ok(())
}

#[tauri::command]
pub fn delete_group(group_index: usize, state: State<AppState>) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    if group_index >= http_file.groups.len() {
        return Err("Group not found".to_string());
    }

    http_file.groups.remove(group_index);
    Ok(())
}

#[tauri::command]
pub fn create_request(
    group_index: usize,
    name: String,
    method: String,
    url: String,
    state: State<AppState>,
) -> Result<usize, String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .get_mut(group_index)
        .ok_or("Group not found")?;

    let request = HttpRequest::new(method, url);
    group.requests.push(NamedRequest { name, request });

    Ok(group.requests.len() - 1)
}

#[tauri::command]
pub fn delete_request(
    group_index: usize,
    request_index: usize,
    state: State<AppState>,
) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .get_mut(group_index)
        .ok_or("Group not found")?;

    if request_index >= group.requests.len() {
        return Err("Request not found".to_string());
    }

    group.requests.remove(request_index);
    Ok(())
}

#[tauri::command]
pub fn rename_request(
    group_index: usize,
    request_index: usize,
    new_name: String,
    state: State<AppState>,
) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .get_mut(group_index)
        .ok_or("Group not found")?;
    let named_req = group
        .requests
        .get_mut(request_index)
        .ok_or("Request not found")?;

    named_req.name = new_name;
    Ok(())
}

#[tauri::command]
pub fn duplicate_request(
    group_index: usize,
    request_index: usize,
    state: State<AppState>,
) -> Result<usize, String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .get_mut(group_index)
        .ok_or("Group not found")?;
    let named_req = group
        .requests
        .get(request_index)
        .ok_or("Request not found")?
        .clone();

    let mut duplicated = named_req.clone();
    duplicated.name = format!("{} (copy)", named_req.name);

    group.requests.push(duplicated);
    Ok(group.requests.len() - 1)
}

#[tauri::command]
pub fn update_variable(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    http_file.variables.insert(key, value);
    Ok(())
}

#[tauri::command]
pub fn delete_variable(key: String, state: State<AppState>) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    http_file
        .variables
        .remove(&key)
        .ok_or("Variable not found")?;
    Ok(())
}

#[tauri::command]
pub fn get_all_variables(state: State<AppState>) -> Result<HashMap<String, String>, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    Ok(http_file.variables.clone())
}

#[tauri::command]
pub fn move_request(
    from_group: usize,
    from_index: usize,
    to_group: usize,
    to_index: usize,
    state: State<AppState>,
) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let request = {
        let group = http_file
            .groups
            .get_mut(from_group)
            .ok_or("Source group not found")?;
        if from_index >= group.requests.len() {
            return Err("Request not found".to_string());
        }
        group.requests.remove(from_index)
    };

    let target_group = http_file
        .groups
        .get_mut(to_group)
        .ok_or("Target group not found")?;
    let insert_pos = to_index.min(target_group.requests.len());
    target_group.requests.insert(insert_pos, request);

    Ok(())
}

#[tauri::command]
pub fn get_request_preview(
    group_index: usize,
    request_index: usize,
    state: State<AppState>,
) -> Result<HttpRequest, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    let group = http_file.groups.get(group_index).ok_or("Group not found")?;
    let named_req = group
        .requests
        .get(request_index)
        .ok_or("Request not found")?;

    Ok(http_file.apply_variables(named_req.request.clone()))
}

#[tauri::command]
pub fn create_new_file(state: State<AppState>) -> Result<(), String> {
    *state.current_file.lock().unwrap() = Some(HttpFile {
        variables: HashMap::new(),
        groups: vec![RequestGroup {
            name: None,
            requests: Vec::new(),
        }],
    });
    Ok(())
}

// Usage in frontend:
// listen("load-test-progress", (event) => {
//   setProgress(event.payload.completed);
// });
#[tauri::command]
pub fn execute_load_test(
    app_handle: tauri::AppHandle,
    group_index: usize,
    request_index: usize,
    total_requests: usize,
    duration_secs: Option<u64>,
    concurrent: usize,
    state: State<AppState>,
) -> Result<LoadTestResult, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    let group = http_file.groups.get(group_index).ok_or("Group not found")?;
    let named_req = group
        .requests
        .get(request_index)
        .ok_or("Request not found")?;

    let request = http_file.apply_variables(named_req.request.clone());

    let config = LoadTestConfig {
        total_requests,
        duration_secs,
        concurrent,
    };

    let window = app_handle
        .get_window("main")
        .ok_or("Main window not found")?;

    // Створюємо mutable closure
    let mut progress_cb = |p: crate::core::test::LoadTestProgress| {
        let _ = window.emit("load-test-progress", &p);
    };

    let result = crate::core::test::run_load_test(request, config, Some(&mut progress_cb));

    Ok(result)
}
