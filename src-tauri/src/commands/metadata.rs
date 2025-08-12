use serde::{Deserialize, Serialize};
use tauri::command;
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimeInfo {
    pub title: String,
    pub title_romaji: Option<String>,
    pub title_english: Option<String>,
    pub episode: Option<u32>,
    pub season: Option<u32>,
    pub year: Option<u32>,
    pub format: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedFilename {
    pub anime_title: String,
    pub episode_number: Option<u32>,
    pub season: Option<u32>,
    pub group: Option<String>,
    pub resolution: Option<String>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AniListResponse {
    pub id: u32,
    pub title: AniListTitle,
    pub format: Option<String>,
    pub episodes: Option<u32>,
    #[serde(rename = "seasonYear")]
    pub season_year: Option<u32>,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<AniListCoverImage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AniListTitle {
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AniListCoverImage {
    pub large: Option<String>,
    pub medium: Option<String>,
}

#[command]
pub async fn parse_anime_filename(filename: String) -> Result<ParsedFilename, String> {
    use anitomy::{Anitomy, ElementCategory};
    
    let mut anitomy = Anitomy::new();
    let elements = anitomy.parse(&filename).map_err(|e| format!("Anitomy解析失败: {:?}", e))?;
    
    let mut parsed = ParsedFilename {
        anime_title: String::new(),
        episode_number: None,
        season: None,
        group: None,
        resolution: None,
        video_codec: None,
        audio_codec: None,
    };
    
    // 正确使用Elements API获取各个元素
    if let Some(title) = elements.get(ElementCategory::AnimeTitle) {
        parsed.anime_title = title.to_string();
    }
    
    if let Some(ep_str) = elements.get(ElementCategory::EpisodeNumber) {
        if let Ok(ep) = ep_str.parse::<u32>() {
            parsed.episode_number = Some(ep);
        }
    }
    
    if let Some(season_str) = elements.get(ElementCategory::AnimeSeason) {
        if let Ok(season) = season_str.parse::<u32>() {
            parsed.season = Some(season);
        }
    }
    
    if let Some(group) = elements.get(ElementCategory::ReleaseGroup) {
        parsed.group = Some(group.to_string());
    }
    
    if let Some(resolution) = elements.get(ElementCategory::VideoResolution) {
        parsed.resolution = Some(resolution.to_string());
    }
    
    // 处理视频编码
    if let Some(video_term) = elements.get(ElementCategory::VideoTerm) {
        let value = video_term.to_lowercase();
        if value.contains("h264") || value.contains("x264") || value.contains("avc") {
            parsed.video_codec = Some("H.264".to_string());
        } else if value.contains("h265") || value.contains("x265") || value.contains("hevc") {
            parsed.video_codec = Some("H.265".to_string());
        }
    }
    
    // 处理音频编码
    if let Some(audio_term) = elements.get(ElementCategory::AudioTerm) {
        parsed.audio_codec = Some(audio_term.to_uppercase());
    }
    
    // 如果Anitomy没有解析出标题，使用备用方法
    if parsed.anime_title.is_empty() {
        parsed.anime_title = extract_anime_title(&filename);
    }
    
    Ok(parsed)
}

#[command]
pub async fn search_anilist(query: String) -> Result<Vec<AniListResponse>, String> {
    let client = reqwest::Client::new();
    
    let graphql_query = r#"
    query ($search: String) {
        Page(page: 1, perPage: 10) {
            media(search: $search, type: ANIME) {
                id
                title {
                    romaji
                    english
                    native
                }
                format
                episodes
                seasonYear
                coverImage {
                    large
                    medium
                }
            }
        }
    }
    "#;
    
    let variables = serde_json::json!({
        "search": query
    });
    
    let request_body = serde_json::json!({
        "query": graphql_query,
        "variables": variables
    });
    
    let response = client
        .post("https://graphql.anilist.co")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("AniList API请求失败: {}", e))?;
    
    let response_text = response.text().await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    
    // 解析GraphQL响应
    let json_response: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析JSON失败: {}", e))?;
    
    let media_list = json_response["data"]["Page"]["media"]
        .as_array()
        .ok_or("无效的响应格式")?;
    
    let mut results = Vec::new();
    for media in media_list {
        if let Ok(anime) = serde_json::from_value::<AniListResponse>(media.clone()) {
            results.push(anime);
        }
    }
    
    Ok(results)
}

#[command]
pub async fn generate_filename(
    anime_info: AnimeInfo,
    episode: u32,
    template: String,
) -> Result<String, String> {
    let mut filename = template;
    
    // 替换模板变量
    filename = filename.replace("{title}", &anime_info.title);
    filename = filename.replace("{title_romaji}", 
        &anime_info.title_romaji.unwrap_or_else(|| anime_info.title.clone()));
    filename = filename.replace("{episode}", &format!("{:02}", episode));
    
    if let Some(season) = anime_info.season {
        filename = filename.replace("{season}", &format!("S{:02}", season));
    }
    
    if let Some(year) = anime_info.year {
        filename = filename.replace("{year}", &year.to_string());
    }
    
    Ok(filename)
}

// 辅助函数用于基础文件名解析
fn extract_anime_title(filename: &str) -> String {
    // 简单的标题提取逻辑，后续将被anitomy-rs替代
    filename.split('[').next()
        .unwrap_or(filename)
        .trim()
        .to_string()
}

// 这些函数已被anitomy-rs库替代，不再需要
