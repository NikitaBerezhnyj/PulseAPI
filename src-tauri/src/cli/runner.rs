use crate::cli::commands::{detect_and_parse, CliMode, RequestArgs};
use crate::domain::executor::execute;
use crate::domain::load_test::{run_load_test, LoadTestConfig, LoadTestProgress};
use crate::domain::models::HttpRequest;
use indicatif::{ProgressBar, ProgressStyle};
use std::collections::HashMap;
use std::time::Duration;

pub fn try_run_cli() -> bool {
    if std::env::args().len() <= 1 {
        return false;
    }

    let args: Vec<String> = std::env::args().skip(1).collect();

    match detect_and_parse(args) {
        CliMode::Request(req_args) => {
            let request = build_request(&req_args);
            run_request(
                request,
                req_args.body_only,
                req_args.pretty,
                req_args.include_headers,
            );
        }
        CliMode::LoadTest(lt) => {
            let req_args = RequestArgs {
                method: lt.method,
                url: lt.url,
                headers: lt.headers,
                body: lt.body,
                timeout: lt.timeout,
                follow_redirects: !lt.no_redirects,
                body_only: false,
                pretty: false,
                include_headers: false,
            };
            let request = build_request(&req_args);
            run_load_test_cmd(request, lt.requests, lt.duration, lt.concurrent);
        }
        CliMode::Help => {
            print_help();
        }
    }

    true
}

fn build_request(args: &RequestArgs) -> HttpRequest {
    let mut headers = HashMap::new();
    for h in &args.headers {
        match h.split_once(':') {
            Some((k, v)) => {
                headers.insert(k.trim().to_string(), v.trim().to_string());
            }
            None => {
                eprintln!("Warning: skipping malformed header: {}", h);
            }
        }
    }
    HttpRequest {
        method: args.method.clone(),
        url: args.url.clone(),
        headers,
        body: args.body.clone(),
        timeout: Some(Duration::from_secs(args.timeout)),
        follow_redirects: args.follow_redirects,
    }
}

fn run_request(request: HttpRequest, body_only: bool, pretty: bool, include_headers: bool) {
    if !body_only {
        println!("→ {} {}\n", request.method, request.url);
    }

    match execute(request) {
        Ok(res) => {
            if body_only {
                println!("{}", format_body(&res.body, pretty));
                return;
            }

            println!(
                "  {}   {}   {}",
                status_colored(res.status),
                res.formatted_duration(),
                res.formatted_size()
            );

            if include_headers && !res.headers.is_empty() {
                println!("\nHeaders:");
                let mut sorted: Vec<_> = res.headers.iter().collect();
                sorted.sort_by_key(|(k, _)| k.to_lowercase());
                for (k, v) in sorted {
                    println!("  {}: {}", k, v);
                }
            }

            println!("\n{}", format_body(&res.body, pretty));
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}

fn run_load_test_cmd(
    request: HttpRequest,
    total_requests: usize,
    duration_secs: Option<u64>,
    concurrent: usize,
) {
    println!("→ {} {}\n", request.method, request.url);
    println!("  Requests : {}", total_requests);
    if let Some(d) = duration_secs {
        println!("  Duration : {}s max", d);
    }
    println!("  Workers  : {}\n", concurrent);

    let config = LoadTestConfig {
        total_requests,
        duration_secs,
        concurrent,
    };

    let pb = ProgressBar::new(total_requests as u64);
    pb.set_style(
        ProgressStyle::with_template(
            "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({per_sec})",
        )
        .unwrap(),
    );

    let pb_clone = pb.clone();
    let result = run_load_test(
        request,
        config,
        Some(move |p: LoadTestProgress| {
            pb_clone.set_position(p.completed as u64);
        }),
    );
    pb.finish_and_clear();

    let success_rate = if result.total_requests > 0 {
        result.successful as f64 / result.total_requests as f64 * 100.0
    } else {
        0.0
    };

    println!("Results");
    println!("  ─────────────────────────────");
    println!("  Total        {}", result.total_requests);
    println!(
        "  Successful   {} ({:.1}%)",
        result.successful, success_rate
    );
    println!("  Failed       {}", result.failed);
    println!("  ─────────────────────────────");
    println!("  Total time   {:.2}s", result.total_duration.as_secs_f64());
    println!("  Req/sec      {:.2}", result.requests_per_second);
    println!("  ─────────────────────────────");
    println!("  Avg          {} ms", result.avg_response_time.as_millis());
    println!("  Min          {} ms", result.min_response_time.as_millis());
    println!("  Max          {} ms", result.max_response_time.as_millis());

    if !result.status_codes.is_empty() {
        println!("\nStatus codes");
        let mut codes: Vec<_> = result.status_codes.iter().collect();
        codes.sort_by_key(|(c, _)| *c);
        for (code, count) in codes {
            println!("  {} → {}", code, count);
        }
    }

    if !result.errors.is_empty() {
        println!("\nErrors (first 5)");
        for (i, err) in result.errors.iter().take(5).enumerate() {
            println!("  {}. {}", i + 1, err);
        }
        if result.errors.len() > 5 {
            println!("  ... and {} more", result.errors.len() - 5);
        }
    }
}

fn print_help() {
    println!(
        r#"pulseapi — fast HTTP client

USAGE:
  Native syntax:
    pulseapi <METHOD> <URL> [OPTIONS]

  curl-like syntax:
    pulseapi <URL> [-X METHOD] [OPTIONS]

  Load test:
    pulseapi load-test <METHOD> <URL> [OPTIONS]

OPTIONS:
  -H, --header <KEY: VALUE>   Add request header (repeatable)
  -d, --data <BODY>           Request body
  -b, --body-only             Print only response body
  -p, --pretty                Pretty-print JSON
  -i, --include-headers       Show response headers
      --timeout <SECS>        Timeout in seconds (default: 30)
      --no-redirects          Disable redirect following
  -h, --help                  Show this help

LOAD TEST OPTIONS:
  -n, --requests <N>          Total requests (default: 100)
  -t, --duration <SECS>       Max duration in seconds
  -c, --concurrent <N>        Concurrent workers (default: 1)

EXAMPLES:
  pulseapi GET https://httpbin.org/get
  pulseapi https://httpbin.org/get
  pulseapi POST https://httpbin.org/post -H "Content-Type: application/json" -d '{{"key":"value"}}' -p
  pulseapi https://httpbin.org/post -X POST -d '{{"key":"value"}}'
  pulseapi load-test GET https://httpbin.org/get -n 500 -c 20 -t 30
"#
    );
}

fn format_body(body: &str, pretty: bool) -> String {
    if pretty && is_json(body) {
        pretty_json(body)
    } else {
        body.to_string()
    }
}

fn is_json(text: &str) -> bool {
    let t = text.trim_start();
    t.starts_with('{') || t.starts_with('[')
}

fn pretty_json(text: &str) -> String {
    match serde_json::from_str::<serde_json::Value>(text) {
        Ok(v) => serde_json::to_string_pretty(&v).unwrap_or_else(|_| text.to_string()),
        Err(_) => text.to_string(),
    }
}

fn status_colored(status: u16) -> String {
    match status {
        200..=299 => format!("\x1b[32m{} {}\x1b[0m", status, status_text(status)),
        300..=399 => format!("\x1b[33m{} {}\x1b[0m", status, status_text(status)),
        400..=599 => format!("\x1b[31m{} {}\x1b[0m", status, status_text(status)),
        _ => format!("{} {}", status, status_text(status)),
    }
}

fn status_text(status: u16) -> &'static str {
    match status {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        409 => "Conflict",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "",
    }
}
