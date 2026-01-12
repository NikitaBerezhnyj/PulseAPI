use crate::api::state::AppState;
use crate::domain::executor::execute;
use crate::domain::load_test::LoadTestProgress;
use crate::domain::load_test::{run_load_test, LoadTestConfig, LoadTestResult};
use crate::domain::models::HttpRequest;
use crate::domain::models::HttpResponse;
use crate::parser::http_file::{HttpFile, NamedRequest, RequestGroup};
use std::collections::HashMap;
use std::fs;
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
pub fn load_http_file(path: String, state: State<AppState>) -> Result<(), String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let http_file = HttpFile::parse(&content);

    *state.current_file.lock().unwrap() = Some(http_file.clone());
    *state.current_path.lock().unwrap() = Some(path);

    Ok(())
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
pub fn get_file_structure(state: State<AppState>) -> Result<String, String> {
    let file = state.current_file.lock().unwrap();
    let http_file = file.as_ref().ok_or("No file loaded")?;

    Ok(serde_json::to_string(&http_file).unwrap())
}

#[tauri::command]
pub fn create_group(name: Option<String>, state: State<AppState>) -> Result<Uuid, String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = RequestGroup {
        id: Uuid::new_v4(),
        name,
        requests: Vec::new(),
    };

    let id = group.id;
    http_file.groups.push(group);

    auto_save(&state)?;
    Ok(id)
}

#[tauri::command]
pub fn rename_group(
    group_id: Uuid,
    new_name: String,
    state: State<AppState>,
) -> Result<(), String> {
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
    group_id: Uuid,
    name: String,
    method: String,
    url: String,
    state: State<AppState>,
) -> Result<Uuid, String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let group = http_file
        .groups
        .iter_mut()
        .find(|g| g.id == group_id)
        .ok_or("Group not found")?;

    let request = HttpRequest::new(method, url);
    let request_id = Uuid::new_v4();

    group.requests.push(NamedRequest {
        id: request_id,
        name,
        request,
    });

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
pub fn move_request(
    from_group_id: Uuid,
    request_id: Uuid,
    to_group_id: Uuid,
    to_index: Option<usize>,
    state: State<AppState>,
) -> Result<(), String> {
    let mut file = state.current_file.lock().unwrap();
    let http_file = file.as_mut().ok_or("No file loaded")?;

    let request = {
        let group = http_file
            .groups
            .iter_mut()
            .find(|g| g.id == from_group_id)
            .ok_or("Source group not found")?;

        let pos = group
            .requests
            .iter()
            .position(|r| r.id == request_id)
            .ok_or("Request not found")?;

        group.requests.remove(pos)
    };

    let target_group = http_file
        .groups
        .iter_mut()
        .find(|g| g.id == to_group_id)
        .ok_or("Target group not found")?;

    let insert_pos = to_index
        .unwrap_or(target_group.requests.len())
        .min(target_group.requests.len());
    target_group.requests.insert(insert_pos, request);

    auto_save(&state)?;
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
            id: Uuid::new_v4(),
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

    let mut progress_cb = |p: LoadTestProgress| {
        let _ = window.emit("load-test-progress", &p);
    };

    let result = run_load_test(request, config, Some(&mut progress_cb));

    Ok(result)
}
