use crate::parser::http_file::HttpFile;
use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub current_file: Mutex<Option<HttpFile>>,
}
