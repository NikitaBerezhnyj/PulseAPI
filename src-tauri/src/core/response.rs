use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,

    pub duration: Duration,
    pub size: usize,
}

impl HttpResponse {
    pub fn new(
        status: u16,
        headers: HashMap<String, String>,
        body: String,
        duration: Duration,
    ) -> Self {
        let size = body.len();
        Self {
            status,
            headers,
            body,
            duration,
            size,
        }
    }

    pub fn is_success(&self) -> bool {
        self.status >= 200 && self.status < 300
    }

    pub fn is_client_error(&self) -> bool {
        self.status >= 400 && self.status < 500
    }

    pub fn is_server_error(&self) -> bool {
        self.status >= 500 && self.status < 600
    }

    pub fn content_type(&self) -> Option<&str> {
        self.headers
            .get("content-type")
            .or_else(|| self.headers.get("Content-Type"))
            .map(|s| s.as_str())
    }

    pub fn formatted_size(&self) -> String {
        if self.size < 1024 {
            format!("{} B", self.size)
        } else if self.size < 1024 * 1024 {
            format!("{:.2} KB", self.size as f64 / 1024.0)
        } else {
            format!("{:.2} MB", self.size as f64 / (1024.0 * 1024.0))
        }
    }

    pub fn formatted_duration(&self) -> String {
        let ms = self.duration.as_millis();
        if ms < 1000 {
            format!("{} ms", ms)
        } else {
            format!("{:.2} s", self.duration.as_secs_f64())
        }
    }
}
