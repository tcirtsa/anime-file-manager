import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

interface AppConfig {
  output_directory: string;
  naming_template: string;
  subtitle_template?: string;
  folder_template: string;
  season_folder_template: string;
  organize_by_season: boolean;
  create_anime_folders: boolean;
  use_romaji_names: boolean;
  create_season_folders: boolean;
  anilist_enabled: boolean;
  tmdb_enabled: boolean;
  concurrent_limit: number;
  log_level: string;
}

export default function SettingsPage() {
  const [outputPath, setOutputPath] = useState("");
  const [namingTemplate, setNamingTemplate] = useState("{title_romaji} - {episode:02} [{group}].{ext}");
  const [subtitleTemplate, setSubtitleTemplate] = useState("{title_romaji} - {episode:02}.chs");
  const [folderTemplate, setFolderTemplate] = useState("{title_romaji} ({year})");
  const [seasonFolderTemplate, setSeasonFolderTemplate] = useState("Season {season}");
  const [organizeBySeasons, setOrganizeBySeasons] = useState(true);
  const [createAnimeFolders, setCreateAnimeFolders] = useState(true);
  const [useRomajiNames, setUseRomajiNames] = useState(true);
  const [createSeasonFolders, setCreateSeasonFolders] = useState(true);
  const [concurrentLimit, setConcurrentLimit] = useState(4);
  const [logLevel, setLogLevel] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);
  
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const config = await invoke<AppConfig>("load_config");
      
      setOutputPath(config.output_directory || "");
      setNamingTemplate(config.naming_template || "{title_romaji} - {episode:02} [{group}].{ext}");
      setSubtitleTemplate(config.subtitle_template || "{title_romaji} - {episode:02}.chs");
      setFolderTemplate(config.folder_template || "{title_romaji} ({year})");
      setSeasonFolderTemplate(config.season_folder_template || "Season {season}");
      setOrganizeBySeasons(config.organize_by_season);
      setCreateAnimeFolders(config.create_anime_folders !== false); // 默认为true
      setUseRomajiNames(config.use_romaji_names);
      setCreateSeasonFolders(config.create_season_folders);
      setConcurrentLimit(config.concurrent_limit || 4);
      // AniList和TMDB选项已移除，使用默认值
      setLogLevel(config.log_level || "info");
      
      setIsLoading(false);
    } catch (error) {
      console.error("加载配置失败:", error);
      toast.error("加载配置失败: " + String(error));
      setIsLoading(false);
    }
  };
  
  // 保存配置
  const saveConfig = async () => {
    try {
      setIsSaving(true);
      
      const config: AppConfig = {
        output_directory: outputPath,
        naming_template: namingTemplate,
        subtitle_template: subtitleTemplate,
        folder_template: folderTemplate,
        season_folder_template: seasonFolderTemplate,
        organize_by_season: organizeBySeasons,
        create_anime_folders: createAnimeFolders,
        use_romaji_names: useRomajiNames,
        create_season_folders: createSeasonFolders,
        concurrent_limit: concurrentLimit,
        anilist_enabled: true,
        tmdb_enabled: false,
        log_level: logLevel
      };
      
      await invoke("save_config", { config });
      toast.success("设置已保存");
      setIsSaving(false);
    } catch (error) {
      console.error("保存配置失败:", error);
      toast.error("保存配置失败: " + String(error));
      setIsSaving(false);
    }
  };
  
  // 选择输出目录
  const selectOutputDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择输出目录"
      });
      
      if (selected && !Array.isArray(selected)) {
        setOutputPath(selected);
      }
    } catch (error) {
      console.error("选择目录失败:", error);
      toast.error("选择目录失败");
    }
  };
  
  // 重置为默认设置
  const resetToDefaults = async () => {
    if (confirm("确定要重置所有设置到默认值吗？")) {
      try {
        const defaultConfig = await invoke<AppConfig>("reset_config");
        setOutputPath(defaultConfig.output_directory);
        setNamingTemplate(defaultConfig.naming_template);
        setSubtitleTemplate(defaultConfig.subtitle_template || "{title_romaji} - {episode:02}.chs");
        setFolderTemplate(defaultConfig.folder_template);
        setSeasonFolderTemplate(defaultConfig.season_folder_template);
        setOrganizeBySeasons(defaultConfig.organize_by_season);
        setCreateAnimeFolders(defaultConfig.create_anime_folders);
        setUseRomajiNames(defaultConfig.use_romaji_names);
        setCreateSeasonFolders(defaultConfig.create_season_folders);
        setConcurrentLimit(defaultConfig.concurrent_limit);
        // AniList和TMDB选项已移除，使用默认值
        setLogLevel(defaultConfig.log_level);
        toast.success("已重置为默认设置");
      } catch (error) {
        console.error("重置配置失败:", error);
        toast.error("重置配置失败: " + String(error));
      }
    }
  };
  
  // 测试模板
  const testTemplate = async () => {
    try {
      const result = await invoke<string>("preview_naming", {
        template: namingTemplate,
        animeTitle: "示例动漫",
        episode: 1,
        group: "SubGroup",
        year: 2024
      });
      
      toast.info(`模板预览: ${result}`);
    } catch (error) {
      console.error("模板测试失败:", error);
      toast.error("模板测试失败: " + String(error));
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">加载设置中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">设置</h1>
      <p className="text-muted-foreground mb-6">
        配置应用程序的行为和文件处理选项
      </p>
      
      <div className="space-y-8">
        {/* 输出目录设置 */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">输出目录</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="选择输出目录..."
              className="flex-1 p-2 border rounded bg-background"
            />
            <Button 
              variant="secondary"
              onClick={selectOutputDirectory}
            >
              浏览...
            </Button>
          </div>
        </div>
        
        {/* 文件命名模板 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">文件命名模板</h2>
          <p className="text-sm text-muted-foreground">
            可用变量: {"{title}"}, {"{season}"}, {"{episode}"}, {"{group}"}, {"{resolution}"}, {"{year}"}, {"{quality}"}
          </p>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">视频文件命名模板</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={namingTemplate}
                onChange={(e) => setNamingTemplate(e.target.value)}
                className="flex-1 p-2 border rounded bg-background"
              />
              <Button 
                variant="outline" 
                onClick={testTemplate}
              >
                测试
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">字幕文件命名模板</p>
            <input
              type="text"
              value={subtitleTemplate}
              onChange={(e) => setSubtitleTemplate(e.target.value)}
              className="w-full p-2 border rounded bg-background"
            />
          </div>
        </div>
        
        {/* 文件夹结构 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">文件夹结构</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createAnimeFolders"
              checked={createAnimeFolders}
              onChange={(e) => setCreateAnimeFolders(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="createAnimeFolders">创建动漫文件夹</label>
            <span className="text-xs text-muted-foreground ml-2">（为每个动漫创建独立的文件夹）</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="organizeBySeasons"
              checked={organizeBySeasons}
              onChange={(e) => setOrganizeBySeasons(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="organizeBySeasons">创建季度文件夹</label>
            <span className="text-xs text-muted-foreground ml-2">（按季度创建子文件夹）</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              动漫文件夹命名模板
            </p>
            <input
              type="text"
              value={folderTemplate}
              onChange={(e) => setFolderTemplate(e.target.value)}
              className="w-full p-2 border rounded bg-background"
              disabled={!createAnimeFolders}
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              季度文件夹命名模板
            </p>
            <input
              type="text"
              value={seasonFolderTemplate}
              onChange={(e) => setSeasonFolderTemplate(e.target.value)}
              className="w-full p-2 border rounded bg-background"
              disabled={!organizeBySeasons}
            />
          </div>
        </div>
        
        {/* 元数据设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">元数据设置</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useRomajiNames"
              checked={useRomajiNames}
              onChange={(e) => setUseRomajiNames(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="useRomajiNames">优先使用罗马音标题</label>
          </div>
        </div>
        
        {/* 性能设置 */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">性能设置</h2>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              并发处理任务数 (1-10)
            </p>
            <input
              type="number"
              min="1"
              max="10"
              value={concurrentLimit}
              onChange={(e) => setConcurrentLimit(Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            />
          </div>
        </div>
        
        {/* 日志设置 */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">日志级别</h2>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="w-full p-2 border rounded bg-background"
          >
            <option value="error">错误</option>
            <option value="warn">警告</option>
            <option value="info">信息</option>
            <option value="debug">调试</option>
            <option value="trace">跟踪</option>
          </select>
        </div>
        
        {/* 按钮组 */}
        <div className="pt-4 flex gap-3">
          <Button 
            onClick={saveConfig}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存设置"}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
          >
            重置为默认值
          </Button>
        </div>
      </div>
    </div>
  );
}
