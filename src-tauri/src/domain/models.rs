use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    #[serde(default = "default_timeout")]
    pub timeout: Option<Duration>,
    #[serde(default = "default_follow_redirects")]
    pub follow_redirects: bool,
}

fn default_timeout() -> Option<Duration> {
    Some(Duration::from_secs(30))
}

fn default_follow_redirects() -> bool {
    true
}

impl Default for HttpRequest {
    fn default() -> Self {
        Self {
            method: "GET".to_string(),
            url: String::new(),
            headers: HashMap::new(),
            body: None,
            timeout: default_timeout(),
            follow_redirects: true,
        }
    }
}

impl HttpRequest {
    pub fn new(method: impl Into<String>, url: impl Into<String>) -> Self {
        Self {
            method: method.into(),
            url: url.into(),
            ..Default::default()
        }
    }
}

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

    pub fn formatted_size(&self) -> String {
        match self.size {
            s if s < 1024 => format!("{} B", s),
            s if s < 1024 * 1024 => format!("{:.2} KB", s as f64 / 1024.0),
            s => format!("{:.2} MB", s as f64 / (1024.0 * 1024.0)),
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
