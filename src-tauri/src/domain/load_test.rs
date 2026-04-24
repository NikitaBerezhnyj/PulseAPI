use super::executor::execute;
use super::models::HttpRequest;
use serde::{Deserialize, Serialize, Serializer};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
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
    #[serde(serialize_with = "serialize_duration")]
    pub total_duration: Duration,
    #[serde(serialize_with = "serialize_duration")]
    pub avg_response_time: Duration,
    #[serde(serialize_with = "serialize_duration")]
    pub min_response_time: Duration,
    #[serde(serialize_with = "serialize_duration")]
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
    pub total_requests: u128,
}

fn serialize_duration<S>(duration: &Duration, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    #[derive(Serialize)]
    struct DurationMs {
        secs: u64,
        nanos: u32,
    }
    let d = DurationMs {
        secs: duration.as_secs(),
        nanos: duration.subsec_nanos(),
    };
    d.serialize(serializer)
}

pub fn run_load_test<F>(
    request: HttpRequest,
    config: LoadTestConfig,
    on_progress: Option<F>,
) -> LoadTestResult
where
    F: Fn(LoadTestProgress) + Send + Sync + 'static,
{
    let start = Instant::now();

    let results = Arc::new(Mutex::new(Vec::new()));
    let errors = Arc::new(Mutex::new(Vec::new()));
    let status_codes = Arc::new(Mutex::new(HashMap::new()));
    let completed_count = Arc::new(Mutex::new(0usize));

    let progress_callback = on_progress.map(|cb| Arc::new(cb));

    let requests_per_worker = config.total_requests / config.concurrent;
    let extra_requests = config.total_requests % config.concurrent;

    let mut handles = vec![];

    for worker_id in 0..config.concurrent {
        let request = request.clone();
        let results = Arc::clone(&results);
        let errors = Arc::clone(&errors);
        let status_codes = Arc::clone(&status_codes);
        let completed_count = Arc::clone(&completed_count);
        let progress_callback = progress_callback.as_ref().map(Arc::clone);
        let start_time = start;
        let max_duration = config.duration_secs;
        let total_requests = config.total_requests;

        let worker_requests = if worker_id < extra_requests {
            requests_per_worker + 1
        } else {
            requests_per_worker
        };

        let handle = thread::spawn(move || {
            for _ in 0..worker_requests {
                if let Some(max_dur) = max_duration {
                    if start_time.elapsed().as_secs() >= max_dur {
                        break;
                    }
                }

                let req_start = Instant::now();
                match execute(request.clone()) {
                    Ok(response) => {
                        let duration = req_start.elapsed();
                        results.lock().unwrap().push(duration);
                        *status_codes
                            .lock()
                            .unwrap()
                            .entry(response.status)
                            .or_insert(0) += 1;
                    }
                    Err(e) => {
                        errors.lock().unwrap().push(e.to_string());
                    }
                }

                let completed = {
                    let mut count = completed_count.lock().unwrap();
                    *count += 1;
                    *count
                };

                if let Some(ref callback) = progress_callback {
                    let successful = results.lock().unwrap().len();
                    let failed = errors.lock().unwrap().len();
                    callback(LoadTestProgress {
                        completed,
                        successful,
                        failed,
                        elapsed_ms: start_time.elapsed().as_millis(),
                        total_requests: total_requests as u128,
                    });
                }
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let total_duration = start.elapsed();

    let results = Arc::try_unwrap(results).unwrap().into_inner().unwrap();
    let errors = Arc::try_unwrap(errors).unwrap().into_inner().unwrap();
    let status_codes = Arc::try_unwrap(status_codes).unwrap().into_inner().unwrap();

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
