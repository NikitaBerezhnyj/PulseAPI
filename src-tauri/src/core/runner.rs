use crate::core::{request::HttpRequest, response::HttpResponse};
use std::time::Instant;

#[derive(Debug)]
pub enum ExecuteError {
    InvalidMethod(String),
    InvalidUrl(String),
    NetworkError(String),
    Timeout,
    Unknown(String),
}

impl std::fmt::Display for ExecuteError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidMethod(m) => write!(f, "Invalid HTTP method: {}", m),
            Self::InvalidUrl(u) => write!(f, "Invalid URL: {}", u),
            Self::NetworkError(e) => write!(f, "Network error: {}", e),
            Self::Timeout => write!(f, "Request timeout"),
            Self::Unknown(e) => write!(f, "Unknown error: {}", e),
        }
    }
}

impl From<ExecuteError> for String {
    fn from(err: ExecuteError) -> Self {
        err.to_string()
    }
}

pub fn execute(req: HttpRequest) -> Result<HttpResponse, ExecuteError> {
    let start = Instant::now();

    let client = reqwest::blocking::Client::builder()
        .redirect(if req.follow_redirects {
            reqwest::redirect::Policy::limited(10)
        } else {
            reqwest::redirect::Policy::none()
        })
        .build()
        .map_err(|e| ExecuteError::NetworkError(e.to_string()))?;

    let method = req
        .method
        .parse::<reqwest::Method>()
        .map_err(|_| ExecuteError::InvalidMethod(req.method.clone()))?;

    let mut request = client.request(method, &req.url);

    for (key, value) in req.headers {
        request = request.header(key, value);
    }

    if let Some(body) = req.body {
        request = request.body(body);
    }

    if let Some(timeout) = req.timeout {
        request = request.timeout(timeout);
    }

    let response = request.send().map_err(|e| {
        if e.is_timeout() {
            ExecuteError::Timeout
        } else if e.is_connect() {
            ExecuteError::NetworkError(format!("Connection failed: {}", e))
        } else if e.is_request() {
            ExecuteError::InvalidUrl(req.url.clone())
        } else {
            ExecuteError::Unknown(e.to_string())
        }
    })?;

    let status = response.status().as_u16();

    let headers = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let body = response.text().unwrap_or_default();

    let duration = start.elapsed();

    Ok(HttpResponse::new(status, headers, body, duration))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_invalid_method() {
        let req = HttpRequest::new("INVALID", "https://httpbin.org/get");
        let result = execute(req);
        assert!(matches!(result, Err(ExecuteError::InvalidMethod(_))));
    }

    #[test]
    fn test_timeout() {
        let req = HttpRequest::new("GET", "https://httpbin.org/delay/10")
            .with_timeout(Duration::from_millis(100));
        let result = execute(req);
        assert!(matches!(result, Err(ExecuteError::Timeout)));
    }
}
