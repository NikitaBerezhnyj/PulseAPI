use crate::domain::models::HttpRequest;
use regex::Regex;
use serde::Serialize;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct HttpFile {
    pub variables: HashMap<String, String>,
    pub groups: Vec<RequestGroup>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RequestGroup {
    pub id: Uuid,
    pub name: Option<String>,
    pub requests: Vec<NamedRequest>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NamedRequest {
    pub id: Uuid,
    pub name: String,
    pub request: HttpRequest,
}

impl HttpFile {
    pub fn parse(content: &str) -> Self {
        let mut variables = HashMap::new();
        let mut groups = Vec::new();
        let mut current_group: Option<RequestGroup> = None;

        let lines: Vec<&str> = content.lines().collect();
        let mut i = 0;

        while i < lines.len() {
            let line = lines[i].trim();

            if line.starts_with('@') && line.contains('=') {
                let parts: Vec<&str> = line[1..].splitn(2, '=').collect();
                if parts.len() == 2 {
                    let key = parts[0].trim().to_string();
                    let value = parts[1].trim().trim_matches('"').to_string();
                    variables.insert(key, value);
                }
                i += 1;
                continue;
            }

            if !line.is_empty() && !line.starts_with('@') {
                break;
            }

            i += 1;
        }

        while i < lines.len() {
            let line = lines[i].trim();

            if line.is_empty() {
                i += 1;
                continue;
            }

            if line.starts_with("###") && line.contains("====") {
                if let Some(group) = current_group.take() {
                    groups.push(group);
                }

                i += 1;

                let mut group_name = None;
                while i < lines.len() {
                    let next_line = lines[i].trim();

                    if next_line.starts_with("###") && next_line.contains("=") {
                        let name = next_line
                            .trim_start_matches('#')
                            .replace("=", "")
                            .trim()
                            .to_string();

                        if !name.is_empty() {
                            group_name = Some(name);
                        }
                        i += 1;
                    } else if next_line.starts_with("###") {
                        break;
                    } else if next_line.is_empty() {
                        i += 1;
                    } else {
                        break;
                    }
                }

                current_group = Some(RequestGroup {
                    id: Uuid::new_v4(),
                    name: group_name,
                    requests: Vec::new(),
                });

                continue;
            }

            if line.starts_with("###") && !line.contains("====") {
                let request_name = line.trim_start_matches('#').trim().to_string();
                i += 1;

                if let Some(request) = Self::parse_single_request(&lines, &mut i) {
                    let named = NamedRequest {
                        id: Uuid::new_v4(),
                        name: request_name,
                        request,
                    };

                    if let Some(ref mut group) = current_group {
                        group.requests.push(named);
                    } else {
                        current_group = Some(RequestGroup {
                            id: Uuid::new_v4(),
                            name: None,
                            requests: vec![named],
                        });
                    }
                }
                continue;
            }

            i += 1;
        }

        if let Some(group) = current_group {
            groups.push(group);
        }

        HttpFile { variables, groups }
    }

    fn parse_single_request(lines: &[&str], i: &mut usize) -> Option<HttpRequest> {
        if *i >= lines.len() {
            return None;
        }

        let method: String;
        let url: String;
        let mut headers = HashMap::new();
        let mut body_lines = Vec::new();
        let mut in_body = false;

        let first_line = lines[*i].trim();
        let parts: Vec<&str> = first_line.split_whitespace().collect();

        if parts.len() >= 2 {
            method = parts[0].to_string();
            url = parts[1].to_string();
        } else {
            return None;
        }

        *i += 1;

        while *i < lines.len() {
            let line = lines[*i];

            if line.trim().starts_with("###") {
                break;
            }

            if line.trim().is_empty() {
                if !in_body && !headers.is_empty() {
                    in_body = true;
                }
                *i += 1;
                continue;
            }

            if in_body {
                body_lines.push(line);
            } else if line.contains(':') {
                let parts: Vec<&str> = line.splitn(2, ':').collect();
                if parts.len() == 2 {
                    headers.insert(parts[0].trim().to_string(), parts[1].trim().to_string());
                }
            } else {
                in_body = true;
                body_lines.push(line);
            }

            *i += 1;
        }

        let body = if body_lines.is_empty() {
            None
        } else {
            Some(body_lines.join("\n").trim().to_string())
        };

        Some(HttpRequest {
            method,
            url,
            headers,
            body,
            ..Default::default()
        })
    }

    pub fn replace_variables(&self, text: &str) -> String {
        let re = Regex::new(r"\{\{(\w+)\}\}").unwrap();

        re.replace_all(text, |caps: &regex::Captures| {
            let var_name = &caps[1];

            self.variables
                .get(var_name)
                .cloned()
                .unwrap_or_else(|| caps[0].to_string())
        })
        .to_string()
    }

    pub fn apply_variables(&self, mut request: HttpRequest) -> HttpRequest {
        request.url = self.replace_variables(&request.url);

        for (_, value) in request.headers.iter_mut() {
            *value = self.replace_variables(value);
        }

        if let Some(ref body) = request.body {
            request.body = Some(self.replace_variables(body));
        }

        request
    }

    pub fn to_http_string(&self) -> String {
        let mut result = String::new();

        for (key, value) in &self.variables {
            result.push_str(&format!("@{} = \"{}\"\n", key, value));
        }

        if !self.variables.is_empty() {
            result.push('\n');
        }

        for group in &self.groups {
            if let Some(ref name) = group.name {
                result.push_str(&format!("### ==================================\n"));
                result.push_str(&format!(
                    "### ============= {} =============\n",
                    name.to_uppercase()
                ));
                result.push_str(&format!("### ==================================\n"));
            }

            for named_req in &group.requests {
                result.push_str(&format!("### {}\n", named_req.name));
                result.push_str(&format!(
                    "{} {}\n",
                    named_req.request.method, named_req.request.url
                ));

                for (key, value) in &named_req.request.headers {
                    result.push_str(&format!("{}: {}\n", key, value));
                }

                if let Some(ref body) = named_req.request.body {
                    result.push('\n');
                    result.push_str(body);
                    result.push('\n');
                }

                result.push('\n');
            }
        }

        result
    }
}
