use super::executor::execute;
use super::models::HttpRequest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadTestConfig {
    pub total_requests: usize,
    pub duration_secs: Option<u64>,
    pub concurrent: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadTestResult {
    pub total_requests: usize,
    pub successful: usize,
    pub failed: usize,
    pub total_duration: Duration,
    pub avg_response_time: Duration,
    pub min_response_time: Duration,
    pub max_response_time: Duration,
    pub requests_per_second: f64,
    pub errors: Vec<String>,
    pub status_codes: HashMap<u16, usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadTestProgress {
    pub completed: usize,
    pub successful: usize,
    pub failed: usize,
    pub elapsed_ms: u128,
}

pub fn run_load_test<F>(
    request: HttpRequest,
    config: LoadTestConfig,
    mut on_progress: Option<F>,
) -> LoadTestResult
where
    F: FnMut(LoadTestProgress),
{
    let start = Instant::now();
    let mut results = Vec::new();
    let mut errors = Vec::new();
    let mut status_codes = HashMap::new();

    for i in 0..config.total_requests {
        let req_start = Instant::now();
        match execute(request.clone()) {
            Ok(response) => {
                let duration = req_start.elapsed();
                results.push(duration);
                *status_codes.entry(response.status).or_insert(0) += 1;
            }
            Err(e) => {
                errors.push(format!("Request {}: {}", i + 1, e));
            }
        }

        if let Some(ref mut cb) = on_progress {
            cb(LoadTestProgress {
                completed: i + 1,
                successful: results.len(),
                failed: errors.len(),
                elapsed_ms: start.elapsed().as_millis(),
            });
        }

        if let Some(max_duration) = config.duration_secs {
            if start.elapsed().as_secs() >= max_duration {
                break;
            }
        }
    }

    let total_duration = start.elapsed();
    let successful = results.len();
    let failed = errors.len();

    let (avg, min, max) = if !results.is_empty() {
        let sum: Duration = results.iter().sum();
        let avg = sum / results.len() as u32;
        let min = *results.iter().min().unwrap();
        let max = *results.iter().max().unwrap();
        (avg, min, max)
    } else {
        (Duration::ZERO, Duration::ZERO, Duration::ZERO)
    };

    let rps = if total_duration.as_secs_f64() > 0.0 {
        successful as f64 / total_duration.as_secs_f64()
    } else {
        0.0
    };

    LoadTestResult {
        total_requests: successful + failed,
        successful,
        failed,
        total_duration,
        avg_response_time: avg,
        min_response_time: min,
        max_response_time: max,
        requests_per_second: rps,
        errors,
        status_codes,
    }
}
