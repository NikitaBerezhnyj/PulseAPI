# PulseAPI

<p align="center">
  <img src="./assets/icon.png" alt="App logo" width="200"/>
</p>

**PulseAPI** is an API testing tool that works with HTTP files, allowing you to store requests directly in Git and reuse them across your team.

The main idea is simple: **API tests should live alongside your code**.

## Features

- Execute HTTP requests (GET, POST, PUT, PATCH, DELETE, etc.)
- HTTP file support (Git-friendly workflow)
- Load testing
- CLI in a `curl`-like style
- Desktop UI (React + Tauri)
- Variables support
- Request grouping

## Technologies

- React + TypeScript — UI
- Tauri — desktop shell
- Rust — backend / core logic

## Running the App

### UI (Desktop)

1. Install dependencies:

```bash
npm install
```

2. Run in development:

```bash
npm run tauri dev
```

3. Build the app:

```bash
npm run tauri build
```

### CLI

PulseAPI supports two syntaxes — native and curl-like.

**Native syntax:**

```bash
pulseapi GET https://httpbin.org/get
pulseapi POST https://httpbin.org/post -H "Content-Type: application/json" -d '{"key":"value"}' -p
```

**curl-like syntax:**

```bash
pulseapi https://httpbin.org/get
pulseapi https://httpbin.org/post -X POST -d '{"key":"value"}'
```

**Load test:**

```bash
pulseapi load-test GET https://httpbin.org/get -n 500 -c 20 -t 30
```

**Request options:**

| Option                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `-H, --header`          | Request header (can be used multiple times) |
| `-d, --data`            | Request body                                |
| `-b, --body-only`       | Output response body only                   |
| `-p, --pretty`          | Pretty-print JSON response                  |
| `-i, --include-headers` | Include response headers in output          |
| `--timeout <sec>`       | Request timeout (default: 30)               |
| `--no-redirects`        | Disable following redirects                 |

**Load test options:**

| Option                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `-n, --requests <N>`   | Number of requests (default: 100)         |
| `-c, --concurrent <N>` | Number of concurrent workers (default: 1) |
| `-t, --duration <sec>` | Maximum test duration                     |

## How it works

Instead of storing requests in a UI (like Postman), you store them in `.http` files:

```http
### Get users
GET https://api.example.com/users

### Create new user
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "Nikita"
}
```

These files can be:

- committed to Git
- shared across a team
- used in CI/CD pipelines

### License & Community Guidelines

- [GNU GPL v3 License](LICENSE) — project license
- [Code of Conduct](CODE_OF_CONDUCT.md) — expected behavior
- [Contributing Guide](CONTRIBUTING.md) — how to contribute
- [Security Policy](SECURITY.md) — reporting vulnerabilities
