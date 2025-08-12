use serde::{Deserialize, Serialize};
use tauri::command;
use anyhow::Result;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub output_directory: String,
    pub naming_template: String,
    pub subtitle_template: Option<String>,
    pub folder_template: String,
    pub season_folder_template: String,
    pub organize_by_season: bool,
    pub create_anime_folders: bool,
    pub use_romaji_names: bool,
    pub create_season_folders: bool,
    pub anilist_enabled: bool,
    pub tmdb_enabled: bool,
    pub concurrent_limit: usize,
    pub log_level: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            output_directory: dirs::video_dir()
                .unwrap_or_else(|| dirs::home_dir().unwrap_or_default())
                .join("AnimeLibrary")
                .to_string_lossy()
                .to_string(),
            naming_template: "{title_romaji} - S{season}E{episode:02}".to_string(),
            subtitle_template: Some("{title_romaji} - S{season}E{episode:02}.chs".to_string()),
            folder_template: "{title_romaji} ({year})".to_string(),
            season_folder_template: "Season {season}".to_string(),
            organize_by_season: true,
            create_anime_folders: true,
            use_romaji_names: true,
            create_season_folders: true,
            anilist_enabled: true,
            tmdb_enabled: false,
            concurrent_limit: 4,
            log_level: "info".to_string(),
        }
    }
}

#[command]
pub async fn load_config() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;
    
    if config_path.exists() {
        let config_content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("读取配置文件失败: {}", e))?;
        
        // 尝试解析配置文件，如果失败则使用默认配置进行合并
        match serde_json::from_str::<AppConfig>(&config_content) {
            Ok(config) => Ok(config),
            Err(_) => {
                // 如果解析失败，尝试解析为通用的 JSON 值
                match serde_json::from_str::<serde_json::Value>(&config_content) {
                    Ok(json_value) => {
                        // 创建默认配置
                        let mut default_config = AppConfig::default();
                        
                        // 从现有配置中提取可用的字段
                        if let Some(obj) = json_value.as_object() {
                            if let Some(output_dir) = obj.get("output_directory").and_then(|v| v.as_str()) {
                                default_config.output_directory = output_dir.to_string();
                            }
                            if let Some(naming_template) = obj.get("naming_template").and_then(|v| v.as_str()) {
                                default_config.naming_template = naming_template.to_string();
                            }
                            if let Some(subtitle_template) = obj.get("subtitle_template").and_then(|v| v.as_str()) {
                                default_config.subtitle_template = Some(subtitle_template.to_string());
                            }
                            if let Some(folder_template) = obj.get("folder_template").and_then(|v| v.as_str()) {
                                default_config.folder_template = folder_template.to_string();
                            }
                            if let Some(organize_by_season) = obj.get("organize_by_season").and_then(|v| v.as_bool()) {
                                default_config.organize_by_season = organize_by_season;
                            }
                            if let Some(create_anime_folders) = obj.get("create_anime_folders").and_then(|v| v.as_bool()) {
                                default_config.create_anime_folders = create_anime_folders;
                            }
                            if let Some(use_romaji_names) = obj.get("use_romaji_names").and_then(|v| v.as_bool()) {
                                default_config.use_romaji_names = use_romaji_names;
                            }
                            if let Some(create_season_folders) = obj.get("create_season_folders").and_then(|v| v.as_bool()) {
                                default_config.create_season_folders = create_season_folders;
                            }
                            if let Some(anilist_enabled) = obj.get("anilist_enabled").and_then(|v| v.as_bool()) {
                                default_config.anilist_enabled = anilist_enabled;
                            }
                            if let Some(tmdb_enabled) = obj.get("tmdb_enabled").and_then(|v| v.as_bool()) {
                                default_config.tmdb_enabled = tmdb_enabled;
                            }
                            if let Some(concurrent_limit) = obj.get("concurrent_limit").and_then(|v| v.as_u64()) {
                                default_config.concurrent_limit = concurrent_limit as usize;
                            }
                            if let Some(log_level) = obj.get("log_level").and_then(|v| v.as_str()) {
                                default_config.log_level = log_level.to_string();
                            }
                        }
                        
                        // 保存更新后的配置
                        save_config(default_config.clone()).await?;
                        Ok(default_config)
                    }
                    Err(e) => {
                        // 如果完全无法解析，使用默认配置
                        let default_config = AppConfig::default();
                        save_config(default_config.clone()).await?;
                        Err(format!("配置文件格式错误，已重置为默认配置: {}", e))
                    }
                }
            }
        }
    } else {
        // 如果配置文件不存在，返回默认配置并保存
        let default_config = AppConfig::default();
        save_config(default_config.clone()).await?;
        Ok(default_config)
    }
}

#[command]
pub async fn save_config(config: AppConfig) -> Result<bool, String> {
    let config_path = get_config_path()?;
    
    // 确保配置目录存在
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    
    let config_json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    std::fs::write(&config_path, config_json)
        .map_err(|e| format!("保存配置文件失败: {}", e))?;
    
    Ok(true)
}

#[command]
pub async fn reset_config() -> Result<AppConfig, String> {
    let default_config = AppConfig::default();
    save_config(default_config.clone()).await?;
    Ok(default_config)
}

#[command]
pub async fn validate_output_directory(path: String) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);
    
    // 检查路径是否存在
    if !path_buf.exists() {
        // 尝试创建目录
        std::fs::create_dir_all(&path_buf)
            .map_err(|e| format!("无法创建输出目录: {}", e))?;
    }
    
    // 检查是否有写权限
    let test_file = path_buf.join(".write_test");
    match std::fs::write(&test_file, "test") {
        Ok(_) => {
            let _ = std::fs::remove_file(&test_file);
            Ok(true)
        }
        Err(e) => Err(format!("输出目录无写权限: {}", e)),
    }
}

#[command]
pub async fn get_default_directories() -> Result<Vec<String>, String> {
    let mut directories = Vec::new();
    
    if let Some(videos_dir) = dirs::video_dir() {
        directories.push(videos_dir.to_string_lossy().to_string());
    }
    
    if let Some(downloads_dir) = dirs::download_dir() {
        directories.push(downloads_dir.to_string_lossy().to_string());
    }
    
    if let Some(desktop_dir) = dirs::desktop_dir() {
        directories.push(desktop_dir.to_string_lossy().to_string());
    }
    
    if let Some(home_dir) = dirs::home_dir() {
        directories.push(home_dir.to_string_lossy().to_string());
    }
    
    Ok(directories)
}

fn get_config_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("无法获取配置目录")?
        .join("anime-file-manager");
    
    Ok(config_dir.join("config.json"))
}

#[command]
pub async fn preview_naming(
    template: String,
    anime_title: String,
    episode: u32,
    group: Option<String>,
    year: Option<u32>,
) -> Result<String, String> {
    let mut result = template;
    
    result = result.replace("{title}", &anime_title);
    result = result.replace("{title_romaji}", &anime_title);
    result = result.replace("{episode}", &format!("{:02}", episode));
    result = result.replace("{episode:02}", &format!("{:02}", episode));
    result = result.replace("{episode:03}", &format!("{:03}", episode));
    
    if let Some(group_name) = group {
        result = result.replace("{group}", &group_name);
    } else {
        result = result.replace("{group}", "Unknown");
    }
    
    if let Some(year_val) = year {
        result = result.replace("{year}", &year_val.to_string());
    } else {
        result = result.replace("{year}", "Unknown");
    }
    
    result = result.replace("{ext}", "mkv");
    
    Ok(result)
}