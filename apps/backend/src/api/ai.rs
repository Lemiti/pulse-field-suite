use axum::{http::StatusCode, Json};
use std::env;

use crate::api::auth::UserClaims;
use crate::models::{AIGenerateRequest, AIGenerateResponse, AIPhaseSuggestion, AITaskSuggestion};

// POST /api/ai/suggest-phases
pub async fn suggest_phases(
    _claims: UserClaims, // 🛡️ AUTH GUARD: Prevents API abuse
    Json(payload): Json<AIGenerateRequest>,
) -> Result<Json<AIGenerateResponse>, (StatusCode, String)> {
    
    // Check if we have an OpenAI API Key
    let api_key = env::var("OPENAI_API_KEY").unwrap_or_default();

    // 🚀 THE MVP MOCK FALLBACK
    // If no key is provided, we return a hardcoded response so frontend devs aren't blocked!
    if api_key.is_empty() || api_key == "mock" {
        tracing::info!("No OpenAI key found. Returning Mock AI Response.");
        let mock_response = AIGenerateResponse {
            phases: vec![
                AIPhaseSuggestion {
                    name: "Phase 1: Mobilization and Recruitment".to_string(),
                    tasks: vec![
                        AITaskSuggestion { name: format!("Survey sites for {}", payload.project_name), estimated_days: 7 },
                        AITaskSuggestion { name: "Recruit local volunteer instructors".to_string(), estimated_days: 10 },
                    ],
                },
                AIPhaseSuggestion {
                    name: "Phase 2: Supply Distribution".to_string(),
                    tasks: vec![
                        AITaskSuggestion { name: "Procure learning materials".to_string(), estimated_days: 5 },
                        AITaskSuggestion { name: "Distribute books to classrooms".to_string(), estimated_days: 4 },
                    ],
                },
            ],
        };
        return Ok(Json(mock_response));
    }

    // 🧠 REAL OPENAI INTEGRATION (For later in the sprint)
    let client = reqwest::Client::new();
    let prompt = format!(
        "You are an NGO project manager. Suggest phases and tasks for this project. \
        Project: {}\nDescription: {}\n\
        You must return ONLY valid JSON matching this schema: {{ \"phases\": [ {{ \"name\": \"Phase 1...\", \"tasks\": [ {{ \"name\": \"Task 1\", \"estimated_days\": 5 }} ] }} ] }}",
        payload.project_name, payload.description
    );

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": "gpt-3.5-turbo",
            "response_format": { "type": "json_object" },
            "messages": [
                { "role": "system", "content": "Output strictly in JSON format." },
                { "role": "user", "content": prompt }
            ]
        }))
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("AI Request Failed: {}", e)))?;

    let json_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid JSON from OpenAI: {}", e)))?;

    // Extract the stringified JSON from OpenAI's response format
    let content_str = json_body["choices"][0]["message"]["content"]
        .as_str()
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Unexpected OpenAI response structure".to_string()))?;

    // Parse the string into our strict Rust struct!
    let parsed_response: AIGenerateResponse = serde_json::from_str(content_str)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse AI structure: {}", e)))?;

    Ok(Json(parsed_response))
}
