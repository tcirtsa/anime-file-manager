use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use tauri::State;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: LogLevel,
    pub message: String,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    INFO,
    WARN,
    ERROR,
    DEBUG,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::INFO => write!(f, "INFO"),
            LogLevel::WARN => write!(f, "WARN"),
            LogLevel::ERROR => write!(f, "ERROR"),
            LogLevel::DEBUG => write!(f, "DEBUG"),
        }
    }
}

pub type LogStore = Arc<Mutex<VecDeque<LogEntry>>>;

const MAX_LOGS: usize = 1000;

pub fn create_log_store() -> LogStore {
    Arc::new(Mutex::new(VecDeque::new()))
}

pub fn add_log_entry(store: &LogStore, level: LogLevel, message: String, source: Option<String>) {
    let mut logs = store.lock().unwrap();
    
    // 如果日志数量超过限制，移除最旧的日志
    if logs.len() >= MAX_LOGS {
        logs.pop_front();
    }
    
    let entry = LogEntry {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string(),
        level,
        message,
        source,
    };
    
    logs.push_back(entry);
}

#[tauri::command]
pub fn get_logs(log_store: State<LogStore>) -> Result<Vec<LogEntry>, String> {
    let logs = log_store.lock().map_err(|e| format!("获取日志失败: {}", e))?;
    Ok(logs.iter().cloned().collect())
}

#[tauri::command]
pub fn clear_logs(log_store: State<LogStore>) -> Result<(), String> {
    let mut logs = log_store.lock().map_err(|e| format!("清除日志失败: {}", e))?;
    logs.clear();
    Ok(())
}

#[tauri::command]
pub fn add_log(
    log_store: State<LogStore>,
    level: String,
    message: String,
    source: Option<String>,
) -> Result<(), String> {
    let log_level = match level.to_uppercase().as_str() {
        "INFO" => LogLevel::INFO,
        "WARN" => LogLevel::WARN,
        "ERROR" => LogLevel::ERROR,
        "DEBUG" => LogLevel::DEBUG,
        _ => LogLevel::INFO,
    };
    
    add_log_entry(&log_store, log_level, message, source);
    Ok(())
}

// 便捷的日志记录宏
#[macro_export]
macro_rules! log_info {
    ($store:expr, $msg:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::INFO, $msg.to_string(), None);
    };
    ($store:expr, $msg:expr, $source:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::INFO, $msg.to_string(), Some($source.to_string()));
    };
}

#[macro_export]
macro_rules! log_warn {
    ($store:expr, $msg:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::WARN, $msg.to_string(), None);
    };
    ($store:expr, $msg:expr, $source:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::WARN, $msg.to_string(), Some($source.to_string()));
    };
}

#[macro_export]
macro_rules! log_error {
    ($store:expr, $msg:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::ERROR, $msg.to_string(), None);
    };
    ($store:expr, $msg:expr, $source:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::ERROR, $msg.to_string(), Some($source.to_string()));
    };
}

#[macro_export]
macro_rules! log_debug {
    ($store:expr, $msg:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::DEBUG, $msg.to_string(), None);
    };
    ($store:expr, $msg:expr, $source:expr) => {
        crate::commands::logs::add_log_entry($store, crate::commands::logs::LogLevel::DEBUG, $msg.to_string(), Some($source.to_string()));
    };
}