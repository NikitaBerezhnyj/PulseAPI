use crate::core::runner::execute;
use crate::core::test::{run_load_test, LoadTestConfig};
use crate::formats::cli::{from_cli, RunCmd};
use crate::formats::file::HttpFile;
use clap::{Parser, Subcommand};
use indicatif::{ProgressBar, ProgressStyle};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "pulse-api")]
#[command(about = "HTTP API client", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    #[arg(short = 'X', global = true)]
    method: Option<String>,

    #[arg(global = true)]
    url: Option<String>,

    #[arg(short = 'H', global = true)]
    headers: Vec<String>,

    #[arg(short = 'd', global = true)]
    body: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    Run {
        #[arg(short, long)]
        file: PathBuf,
        #[arg(short, long)]
        request: Option<String>,
        #[arg(short, long)]
        body_only: bool,
        #[arg(short, long)]
        pretty: bool,
    },
    List {
        #[arg(short, long)]
        file: PathBuf,
    },
    // НОВА КОМАНДА
    LoadTest {
        #[arg(short, long)]
        file: Option<PathBuf>, // стало опційним
        #[arg(short, long)]
        request: Option<String>,
        #[arg(short = 'n', long, default_value = "10")]
        requests: usize,
        #[arg(short = 't', long)]
        duration: Option<u64>,
        #[arg(short = 'c', long, default_value = "1")]
        concurrent: usize,
    },
}

pub fn try_run_cli() -> bool {
    if std::env::args().len() <= 1 {
        return false;
    }

    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Run {
            file,
            request,
            body_only,
            pretty,
        }) => {
            run_from_file(file, request, body_only, pretty);
        }
        Some(Commands::List { file }) => {
            list_requests(file);
        }
        Some(Commands::LoadTest {
            file,
            request,
            requests,
            duration,
            concurrent,
        }) => {
            run_load_test_cmd(file, request, requests, duration, concurrent);
        }
        None => {
            if let (Some(method), Some(url)) = (cli.method, cli.url) {
                let cmd = RunCmd {
                    method,
                    url,
                    headers: cli.headers,
                    body: cli.body,
                };
                let request = from_cli(cmd);

                match execute(request) {
                    Ok(res) => {
                        println!("Status: {}", res.status);
                        println!("Time: {}", res.formatted_duration());
                        println!("Size: {}", res.formatted_size());
                        println!("\nBody:\n{}", res.body);
                    }
                    Err(e) => {
                        eprintln!("Error: {}", e);
                        std::process::exit(1);
                    }
                }
            } else {
                eprintln!("Error: Missing arguments. Use --help for usage info.");
                std::process::exit(1);
            }
        }
    }

    true
}

fn run_from_file(
    file_path: PathBuf,
    request_filter: Option<String>,
    body_only: bool,
    pretty: bool,
) {
    let content = match fs::read_to_string(&file_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error reading file: {}", e);
            std::process::exit(1);
        }
    };

    let http_file = HttpFile::parse(&content);

    let all_requests: Vec<_> = http_file.groups.iter().flat_map(|g| &g.requests).collect();

    if all_requests.is_empty() {
        eprintln!("No requests found in file");
        std::process::exit(1);
    }

    let selected = if let Some(filter) = request_filter {
        if let Ok(idx) = filter.parse::<usize>() {
            all_requests.get(idx).copied()
        } else {
            all_requests.iter().find(|r| r.name == filter).copied()
        }
    } else {
        all_requests.first().copied()
    };

    let selected = match selected {
        Some(r) => r,
        None => {
            eprintln!("Request not found");
            std::process::exit(1);
        }
    };

    let request = http_file.apply_variables(selected.request.clone());

    if !body_only {
        println!("→ {}: {} {}", selected.name, request.method, request.url);
        println!();
    }

    match execute(request) {
        Ok(res) => {
            if body_only {
                if pretty && is_json(&res.body) {
                    println!("{}", pretty_json(&res.body));
                } else {
                    println!("{}", res.body);
                }
            } else {
                println!("Status: {} {}", res.status, status_text(res.status));
                println!("Time: {}", res.formatted_duration());
                println!("Size: {}", res.formatted_size());

                if !res.headers.is_empty() {
                    println!("\nHeaders:");
                    for (k, v) in &res.headers {
                        println!("  {}: {}", k, v);
                    }
                }

                println!("\nBody:");
                if pretty && is_json(&res.body) {
                    println!("{}", pretty_json(&res.body));
                } else {
                    println!("{}", res.body);
                }
            }
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}

fn list_requests(file_path: PathBuf) {
    let content = match fs::read_to_string(&file_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error reading file: {}", e);
            std::process::exit(1);
        }
    };

    let http_file = HttpFile::parse(&content);

    if !http_file.variables.is_empty() {
        println!("Variables:");
        for (k, v) in &http_file.variables {
            println!("  @{} = \"{}\"", k, v);
        }
        println!();
    }

    let mut index = 0;

    for group in &http_file.groups {
        if let Some(ref name) = group.name {
            println!("Group: {}", name);
        } else {
            println!("Ungrouped:");
        }

        for req in &group.requests {
            println!(
                "  [{}] {} - {} {}",
                index, req.name, req.request.method, req.request.url
            );
            index += 1;
        }

        println!();
    }

    println!("Total: {} requests", index);
}

fn run_load_test_cmd(
    file_path: Option<PathBuf>,
    request_filter: Option<String>,
    total_requests: usize,
    duration_secs: Option<u64>,
    concurrent: usize,
) {
    // Формуємо HttpRequest
    let request = if let Some(file) = file_path {
        // З файлу
        let content = match fs::read_to_string(&file) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Error reading file: {}", e);
                std::process::exit(1);
            }
        };

        let http_file = HttpFile::parse(&content);
        let all_requests: Vec<_> = http_file.groups.iter().flat_map(|g| &g.requests).collect();

        if all_requests.is_empty() {
            eprintln!("No requests found in file");
            std::process::exit(1);
        }

        let selected = if let Some(filter) = request_filter {
            if let Ok(idx) = filter.parse::<usize>() {
                all_requests.get(idx).copied()
            } else {
                all_requests.iter().find(|r| r.name == filter).copied()
            }
        } else {
            all_requests.first().copied()
        };

        let selected = match selected {
            Some(r) => r,
            None => {
                eprintln!("Request not found");
                std::process::exit(1);
            }
        };

        http_file.apply_variables(selected.request.clone())
    } else {
        // Без файлу — беремо з глобальних CLI параметрів
        let cli = Cli::parse(); // тут можна винести url, method, headers, body
        let method = cli
            .method
            .expect("Method (-X) required for load-test without file");
        let url = cli.url.expect("URL required for load-test without file");

        let cmd = RunCmd {
            method,
            url,
            headers: cli.headers,
            body: cli.body,
        };

        from_cli(cmd)
    };

    println!("🚀 Load testing: {} {}", request.method, request.url);
    println!("📊 Configuration:");
    println!("   - Total requests: {}", total_requests);
    if let Some(d) = duration_secs {
        println!("   - Max duration: {}s", d);
    }
    println!("   - Concurrent: {}", concurrent);
    println!();

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

    let mut progress_cb = |p: crate::core::test::LoadTestProgress| {
        pb.set_position(p.completed as u64);
    };

    let result = run_load_test(request, config, Some(&mut progress_cb));

    pb.finish_and_clear();

    println!("📈 Results:");
    println!("   ✅ Successful: {}", result.successful);
    println!("   ❌ Failed: {}", result.failed);
    println!(
        "   ⏱️  Total time: {:.2}s",
        result.total_duration.as_secs_f64()
    );
    println!(
        "   📊 Avg response: {} ms",
        result.avg_response_time.as_millis()
    );
    println!(
        "   ⚡ Min response: {} ms",
        result.min_response_time.as_millis()
    );
    println!(
        "   🐌 Max response: {} ms",
        result.max_response_time.as_millis()
    );
    println!("   🔥 Requests/sec: {:.2}", result.requests_per_second);

    if !result.status_codes.is_empty() {
        println!("\n📋 Status codes:");
        for (code, count) in &result.status_codes {
            println!("   {} → {} requests", code, count);
        }
    }

    if !result.errors.is_empty() {
        println!("\n❌ Errors:");
        for (i, err) in result.errors.iter().take(10).enumerate() {
            println!("   {}. {}", i + 1, err);
        }
        if result.errors.len() > 10 {
            println!("   ... and {} more errors", result.errors.len() - 10);
        }
    }
}

fn status_text(status: u16) -> &'static str {
    match status {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        _ => "",
    }
}

fn is_json(text: &str) -> bool {
    text.trim_start().starts_with('{') || text.trim_start().starts_with('[')
}

fn pretty_json(text: &str) -> String {
    match serde_json::from_str::<serde_json::Value>(text) {
        Ok(v) => serde_json::to_string_pretty(&v).unwrap_or_else(|_| text.to_string()),
        Err(_) => text.to_string(),
    }
}
