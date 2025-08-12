import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  source?: string;
}

export default function LogsPage() {
  const [logLevel, setLogLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 日志级别对应的样式
  const logLevelStyles: Record<string, string> = {
    INFO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    WARN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    ERROR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    DEBUG: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };
  
  // 获取日志
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const logData = await invoke<LogEntry[]>("get_logs");
      setLogs(logData || []);
      setIsLoading(false);
    } catch (error) {
      console.error("获取日志失败:", error);
      toast.error("获取日志失败");
      setLogs([]);
      setIsLoading(false);
    }
  };
  
  // 清除日志
  const clearLogs = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // 使用Tauri的对话框API而不是浏览器原生confirm
      const { ask } = await import("@tauri-apps/plugin-dialog");
      const confirmed = await ask("确定要清除所有日志记录吗？", {
        title: "确认清除",
        kind: "warning"
      });
      
      console.log("用户确认结果:", confirmed);
      
      if (confirmed) {
        console.log("开始清除日志...");
        await invoke("clear_logs");
        console.log("日志清除成功");
        toast.success("日志已清除");
        await fetchLogs();
      } else {
        console.log("用户取消了清除操作");
      }
    } catch (error) {
      console.error("清除日志失败:", error);
      toast.error("清除日志失败");
    }
  };
  
  // 导出日志
  const exportLogs = async () => {
    try {
      // 格式化日志为文本
      const logText = logs.map(log => 
        `[${log.timestamp}] [${log.level}] ${log.message}${log.source ? ` (${log.source})` : ''}`
      ).join('\n');
      
      // 选择保存位置
      const filePath = await save({
        filters: [{
          name: '日志文件',
          extensions: ['log', 'txt']
        }],
        defaultPath: `anime-file-manager-logs-${new Date().toISOString().slice(0, 10)}.log`
      });
      
      if (filePath) {
        // 写入文件
        await writeTextFile(filePath, logText);
        toast.success("日志已导出");
      }
    } catch (error) {
      console.error("导出日志失败:", error);
      toast.error("导出日志失败");
    }
  };
  
  // 添加测试日志
  const addTestLog = async () => {
    try {
      await invoke("add_log", {
        level: "INFO",
        message: "这是一条测试日志消息",
        source: "日志页面"
      });
      toast.success("测试日志已添加");
      fetchLogs();
    } catch (error) {
      console.error("添加测试日志失败:", error);
      toast.error("添加测试日志失败");
    }
  };
  
  // 过滤日志
  useEffect(() => {
    const filtered = logs.filter(log => {
      // 按级别过滤
      if (logLevel !== "all" && log.level !== logLevel) {
        return false;
      }
      
      // 按搜索词过滤
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    setFilteredLogs(filtered);
  }, [logs, logLevel, searchQuery]);
  
  // 初始加载
  useEffect(() => {
    fetchLogs();
    
    // 设置定时刷新日志
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000); // 每5秒刷新一次
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">系统日志</h1>
      <p className="text-muted-foreground mb-6">
        查看应用程序运行日志和错误信息
      </p>
      
      {/* 过滤控件 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索日志..."
            className="w-full p-2 border rounded bg-background"
          />
        </div>
        <div>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="w-full md:w-auto p-2 border rounded bg-background"
          >
            <option value="all">所有级别</option>
            <option value="INFO">信息</option>
            <option value="WARN">警告</option>
            <option value="ERROR">错误</option>
            <option value="DEBUG">调试</option>
          </select>
        </div>
        <div>
          <Button 
            variant="secondary"
            onClick={fetchLogs}
          >
            刷新
          </Button>
        </div>
      </div>
      
      {/* 日志列表 */}
      <div className="border rounded-lg">
        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
          <h2 className="font-semibold">日志记录 ({filteredLogs.length})</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={addTestLog}
            >
              添加测试日志
            </Button>
            <Button 
              variant="link" 
              onClick={exportLogs}
              disabled={logs.length === 0}
            >
              导出日志
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">加载日志中...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-muted/10">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${logLevelStyles[log.level] || logLevelStyles.INFO}`}>
                    {log.level}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{log.message}</div>
                {log.source && (
                  <div className="text-xs text-muted-foreground mt-1">
                    来源: {log.source}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            {searchQuery || logLevel !== "all" 
              ? "没有符合条件的日志记录" 
              : "暂无日志记录"}
          </div>
        )}
      </div>
      
      {/* 控制按钮 */}
      <div className="mt-6 flex gap-3">
        <Button 
          variant="destructive" 
          onClick={clearLogs}
          disabled={logs.length === 0}
        >
          清除日志
        </Button>
      </div>
    </div>
  );
}