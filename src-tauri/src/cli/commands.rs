use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "pulse-api")]
#[command(disable_help_flag = true)]
pub struct NativeCli {
    pub method: String,

    pub url: String,

    #[arg(short = 'H', long = "header")]
    pub headers: Vec<String>,

    #[arg(short = 'd', long = "data")]
    pub body: Option<String>,

    #[arg(short = 'b', long = "body-only")]
    pub body_only: bool,

    #[arg(short = 'p', long = "pretty")]
    pub pretty: bool,

    #[arg(short = 'i', long = "include-headers")]
    pub include_headers: bool,

    #[arg(long = "timeout", default_value = "30")]
    pub timeout: u64,

    #[arg(long = "no-redirects")]
    pub no_redirects: bool,
}

#[derive(Parser, Debug)]
#[command(name = "pulse-api")]
#[command(disable_help_flag = true)]
pub struct CurlCli {
    pub url: String,

    #[arg(short = 'X', long = "request", default_value = "GET")]
    pub method: String,

    #[arg(short = 'H', long = "header")]
    pub headers: Vec<String>,

    #[arg(short = 'd', long = "data")]
    pub body: Option<String>,

    #[arg(short = 'b', long = "body-only")]
    pub body_only: bool,

    #[arg(short = 'p', long = "pretty")]
    pub pretty: bool,

    #[arg(short = 'i', long = "include-headers")]
    pub include_headers: bool,

    #[arg(long = "timeout", default_value = "30")]
    pub timeout: u64,

    #[arg(long = "no-redirects")]
    pub no_redirects: bool,
}

#[derive(Parser, Debug)]
#[command(name = "pulse-api load-test")]
pub struct LoadTestCli {
    pub method: String,

    pub url: String,

    #[arg(short = 'H', long = "header")]
    pub headers: Vec<String>,

    #[arg(short = 'd', long = "data")]
    pub body: Option<String>,

    #[arg(short = 'n', long = "requests", default_value = "100")]
    pub requests: usize,

    #[arg(short = 't', long = "duration")]
    pub duration: Option<u64>,

    #[arg(short = 'c', long = "concurrent", default_value = "1")]
    pub concurrent: usize,

    #[arg(long = "timeout", default_value = "30")]
    pub timeout: u64,

    #[arg(long = "no-redirects")]
    pub no_redirects: bool,
}

pub struct RequestArgs {
    pub method: String,
    pub url: String,
    pub headers: Vec<String>,
    pub body: Option<String>,
    pub body_only: bool,
    pub pretty: bool,
    pub include_headers: bool,
    pub timeout: u64,
    pub follow_redirects: bool,
}

const HTTP_METHODS: &[&str] = &[
    "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE",
];

pub enum CliMode {
    Request(RequestArgs),
    LoadTest(LoadTestCli),
    Help,
}

pub fn detect_and_parse(args: Vec<String>) -> CliMode {
    if args.is_empty() {
        return CliMode::Help;
    }

    if args.iter().any(|a| a == "--help" || a == "-h") {
        return CliMode::Help;
    }

    if args[0] == "load-test" {
        let mut argv = vec!["pulse-api load-test".to_string()];
        argv.extend_from_slice(&args[1..]);
        match LoadTestCli::try_parse_from(&argv) {
            Ok(cli) => return CliMode::LoadTest(cli),
            Err(e) => {
                eprintln!("{}", e);
                std::process::exit(1);
            }
        }
    }

    let first_upper = args[0].to_uppercase();
    if HTTP_METHODS.contains(&first_upper.as_str()) {
        let mut argv = vec!["pulse-api".to_string()];

        argv.push(first_upper);
        argv.extend_from_slice(&args[1..]);
        match NativeCli::try_parse_from(&argv) {
            Ok(cli) => {
                return CliMode::Request(RequestArgs {
                    method: cli.method,
                    url: cli.url,
                    headers: cli.headers,
                    body: cli.body,
                    body_only: cli.body_only,
                    pretty: cli.pretty,
                    include_headers: cli.include_headers,
                    timeout: cli.timeout,
                    follow_redirects: !cli.no_redirects,
                })
            }
            Err(e) => {
                eprintln!("{}", e);
                std::process::exit(1);
            }
        }
    }

    let mut argv = vec!["pulse-api".to_string()];
    argv.extend_from_slice(&args);
    match CurlCli::try_parse_from(&argv) {
        Ok(cli) => CliMode::Request(RequestArgs {
            method: cli.method.to_uppercase(),
            url: cli.url,
            headers: cli.headers,
            body: cli.body,
            body_only: cli.body_only,
            pretty: cli.pretty,
            include_headers: cli.include_headers,
            timeout: cli.timeout,
            follow_redirects: !cli.no_redirects,
        }),
        Err(e) => {
            eprintln!("{}", e);
            std::process::exit(1);
        }
    }
}
