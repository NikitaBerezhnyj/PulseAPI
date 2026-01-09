use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "pulse-api")]
#[command(about = "HTTP API client", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,

    #[arg(short = 'X', global = true)]
    pub method: Option<String>,

    #[arg(global = true)]
    pub url: Option<String>,

    #[arg(short = 'H', global = true)]
    pub headers: Vec<String>,

    #[arg(short = 'd', global = true)]
    pub body: Option<String>,
}

#[derive(Subcommand)]
pub enum Commands {
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
    LoadTest {
        #[arg(short, long)]
        file: Option<PathBuf>,

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
