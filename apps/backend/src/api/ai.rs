use axum::{http::StatusCode, Json};
use std::env;

use crate::api::auth::UserClaims;
use crate::models::{AIGenerateRequest, AIGenerateResponse, AIPhaseSuggestion, AITaskSuggestion};

// POST /api/ai/suggest-phases
pub async fn suggest_phases(
    _claims: UserClaims, // 🛡️ AUTH GUARD: Prevents API abuse
    Json(payload): Json<AIGenerateRequest>,
) -> Result<Json<AIGenerateResponse>, (StatusCode, String)> {
    
    let gemini_api_key = env::var("GEMINI_API_KEY").unwrap_or_default();
    let openai_api_key = env::var("OPENAI_API_KEY").unwrap_or_default();

    // Determine which provider to use.
    // If a Google key is put in the OPENAI_API_KEY environment variable (e.g. starting with "AIzaSy"),
    // treat it as the Gemini API key.
    let (use_gemini, active_key) = if !gemini_api_key.is_empty() && gemini_api_key != "mock" {
        (true, gemini_api_key)
    } else if openai_api_key.starts_with("AIzaSy") {
        (true, openai_api_key)
    } else if !openai_api_key.is_empty() && openai_api_key != "mock" {
        (false, openai_api_key)
    } else {
        (false, String::new())
    };

    // 🚀 THE MVP MOCK FALLBACK
    // If no active key is provided, we return a hardcoded response so frontend devs aren't blocked!
    if active_key.is_empty() {
        tracing::info!("No API key found. Returning Mock AI Response.");
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

    let client = reqwest::Client::new();
    let prompt = format!(
        "You are an NGO project manager. Suggest phases and tasks for this project. \
        Project: {}\nDescription: {}\n\
        You must return ONLY valid JSON matching this schema: {{ \"phases\": [ {{ \"name\": \"Phase 1...\", \"tasks\": [ {{ \"name\": \"Task 1\", \"estimated_days\": 5 }} ] }} ] }}",
        payload.project_name, payload.description
    );

    let content_str = if use_gemini {
        tracing::info!("Using Gemini API for suggestion generation.");
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
            active_key
        );

        let response = client
            .post(&url)
            .json(&serde_json::json!({
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }))
            .send()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Gemini Request Failed: {}", e)))?;

        let json_body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid JSON from Gemini: {}", e)))?;

        let text = json_body["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Unexpected Gemini response structure".to_string()))?;
        
        text.to_string()
    } else {
        tracing::info!("Using OpenAI API for suggestion generation.");
        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(active_key)
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

        let text = json_body["choices"][0]["message"]["content"]
            .as_str()
            .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Unexpected OpenAI response structure".to_string()))?;

        text.to_string()
    };

    // Clean up response string if it was markdown-wrapped (e.g. ```json ... ```)
    let mut clean_content = content_str.trim();
    if clean_content.starts_with("```") {
        if let Some(start_idx) = clean_content.find('{') {
            if let Some(end_idx) = clean_content.rfind('}') {
                if start_idx < end_idx {
                    clean_content = &clean_content[start_idx..=end_idx];
                }
            }
        }
    }

    // Parse the string into our strict Rust struct!
    let parsed_response: AIGenerateResponse = serde_json::from_str(clean_content)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse AI structure: {}. Original text: {}", e, clean_content)))?;

    Ok(Json(parsed_response))
}
