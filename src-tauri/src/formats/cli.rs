use crate::core::request::HttpRequest;
use clap::Parser;
use std::collections::HashMap;

#[derive(Parser)]
pub struct RunCmd {
    #[arg(short = 'X', default_value = "GET")]
    pub method: String,

    pub url: String,

    #[arg(short = 'H')]
    pub headers: Vec<String>,

    #[arg(short = 'd')]
    pub body: Option<String>,
}

pub fn from_cli(cmd: RunCmd) -> HttpRequest {
    let mut headers = HashMap::new();

    for h in cmd.headers {
        let parts: Vec<&str> = h.splitn(2, ":").collect();
        headers.insert(parts[0].trim().into(), parts[1].trim().into());
    }

    HttpRequest {
        method: cmd.method,
        url: cmd.url,
        headers,
        body: cmd.body,
        timeout: Some(std::time::Duration::from_secs(30)),
        follow_redirects: true,
    }
}
