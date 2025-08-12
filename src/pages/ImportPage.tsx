import React, { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Tauri v2 API 可用性检查
const isTauriAvailable = () => {
  return typeof window !== 'undefined' && 
         window.__TAURI_INTERNALS__ !== undefined;
};

const isDialogAvailable = () => {
  // 在 Tauri v2 中，dialog 插件应该是直接可用的
  return typeof window !== 'undefined' && 
         typeof window.__TAURI_INTERNALS__ !== 'undefined';
};

import { bytesToSize } from "../utils/formatters";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Loader2, X, FileVideo, FileText, FolderOpen, Upload, Search, Info, Edit, Settings } from "lucide-react";
import { toast } from "sonner";

interface FileInfo {
  path: string;
  name: string;
  size: number;
  file_type: string;
  is_video: boolean;
  is_subtitle: boolean;
  parsed?: ParsedFilename;
  metadata?: AnimeInfo;
  new_name?: string;
}

interface ProcessResult {
  success: boolean;
  message: string;
  processed_files: string[];
  failed_files: FileError[];
}

interface FileError {
  path: string;
  error: string;
}

interface ParsedFilename {
  anime_title: string;
  episode_number?: number;
  season?: number;
  group?: string;
  resolution?: string;
  video_codec?: string;
  audio_codec?: string;
}

interface AnimeInfo {
  title: string;
  title_romaji?: string;
  title_english?: string;
  episode?: number;
  season?: number;
  year?: number;
  format?: string;
}

interface AniListResponse {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  format?: string;
  episodes?: number;
  season_year?: number;
  cover_image?: {
    large?: string;
    medium?: string;
  };
}

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

function ImportPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [fileNameTemplate, setFileNameTemplate] = useState<string>("{title_romaji} - S{season}E{episode:02}");
  const [subtitleSuffix, setSubtitleSuffix] = useState<string>(".chs");
  const [folderTemplate, setFolderTemplate] = useState<string>("{title_romaji} ({year})");
  const [seasonFolderTemplate, setSeasonFolderTemplate] = useState<string>("Season {season}");
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
  const [animeSearchResults, setAnimeSearchResults] = useState<AniListResponse[]>([]);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [currentEditingFile, setCurrentEditingFile] = useState<number | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [organizeBySeasons, setOrganizeBySeasons] = useState(true);
  const [createAnimeFolders, setCreateAnimeFolders] = useState(true);
  const [manualSearchQuery, setManualSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  
  // 加载配置
  useEffect(() => {
    // 等待 Tauri 完全初始化
    const initTauri = async () => {
      // 调试信息
      console.log('检查 Tauri 环境...');
      console.log('window.__TAURI_INTERNALS__:', window.__TAURI_INTERNALS__);
      console.log('isTauriAvailable():', isTauriAvailable());
      console.log('isDialogAvailable():', isDialogAvailable());
      
      // 等待 Tauri API 可用
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        if (isTauriAvailable()) {
          console.log('Tauri API 已可用');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.error('Tauri API 初始化超时');
        toast.error('Tauri API 初始化失败，某些功能可能不可用');
        return;
      }
      
      loadConfig();
    };
    
    initTauri();
  }, []);
  
  const loadConfig = async () => {
    if (!isTauriAvailable()) {
      console.warn('Tauri API 不可用，使用默认配置');
      setFileNameTemplate("{title_romaji} - S{season}E{episode:02}");
      setSubtitleSuffix(".chs");
      setFolderTemplate("{title_romaji} ({year})");
      setSeasonFolderTemplate("Season {season}");
      setOrganizeBySeasons(true);
      return;
    }
    
    try {
      const appConfig = await invoke<AppConfig>('load_config');
      setConfig(appConfig);
      setFileNameTemplate(appConfig.naming_template);
      // 从完整的字幕模板中提取后缀部分
      const subtitleTemplate = appConfig.subtitle_template || "{title_romaji} - S{season}E{episode:02}.chs";
      const baseTemplate = appConfig.naming_template;
      if (subtitleTemplate.includes(baseTemplate.replace(/\{ext\}$/, ''))) {
        const suffix = subtitleTemplate.replace(baseTemplate.replace(/\{ext\}$/, ''), '');
        setSubtitleSuffix(suffix || ".chs");
      } else {
        setSubtitleSuffix(".chs");
      }
      setFolderTemplate(appConfig.folder_template);
      setSeasonFolderTemplate(appConfig.season_folder_template || "Season {season}");
      setOutputDir(appConfig.output_directory);
      setOrganizeBySeasons(appConfig.organize_by_season);
      setCreateAnimeFolders(appConfig.create_anime_folders !== false); // 默认为true
    } catch (error) {
      console.error("加载配置失败:", error);
      toast.error(`加载配置失败: ${error}`);
      // 使用默认配置
      setFileNameTemplate("{title_romaji} - S{season}E{episode:02}");
      setSubtitleSuffix(".chs");
      setFolderTemplate("{title_romaji} ({year})");
      setSeasonFolderTemplate("Season {season}");
      setOrganizeBySeasons(true);
    }
  };

  // 处理拖拽事件 - 优化性能
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当鼠标真正离开拖放区域时才设置为false
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理文件拖放 - 简化版本
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      // 直接处理拖拽的文件，让浏览器处理路径
      await handleFiles(files);
    } catch (error) {
      console.error("拖拽处理失败:", error);
      toast.error(`拖拽处理失败: ${error}`);
    }
  }, []);

  // 处理文件选择 - 修复版本
  const handleFileSelect = useCallback(async () => {
    if (!isDialogAvailable()) {
      toast.error('文件选择功能不可用，请检查 Tauri 环境');
      return;
    }
    
    try {
      console.log('开始选择文件...');
      
      const selected = await open({
        multiple: true,
        filters: [
          { name: '支持的文件', extensions: ['mkv', 'mp4', 'avi', 'mov', 'mka', 'ass', 'srt', 'vtt'] }
        ]
      });
      console.log('文件选择结果:', selected);
      
      if (selected && Array.isArray(selected) && selected.length > 0) {
        const fileObjects: FileInfo[] = selected.map(path => {
          const name = path.split(/[/\\]/).pop() || '';
          const extension = name.split('.').pop()?.toLowerCase() || '';
          const is_video = ['mkv', 'mp4', 'avi', 'mov', 'mka'].includes(extension);
          const is_subtitle = ['ass', 'srt', 'vtt'].includes(extension);
          
          return {
            path,
            name,
            size: 0, // 文件大小将在后台获取
            file_type: extension,
            is_video,
            is_subtitle
          };
        });
        
        setFiles(prev => [...prev, ...fileObjects]);
        toast.success(`已添加 ${fileObjects.length} 个文件`);
      }
    } catch (error) {
      console.error('选择文件错误:', error);
      if (error !== "User cancelled the dialog") {
        toast.error(`选择文件失败: ${error}`);
      }
    }
  }, []);


  // 处理文件 - 优化版本
  const handleFiles = useCallback((fileList: File[]) => {
    const newFiles: FileInfo[] = [];
    
    for (const file of fileList) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const is_video = ['mkv', 'mp4', 'avi', 'mov', 'mka'].includes(extension);
      const is_subtitle = ['ass', 'srt', 'vtt'].includes(extension);
      
      if (is_video || is_subtitle) {
        // 确保获取完整路径
        const filePath = (file as any).path || '';
        if (!filePath) {
          console.warn(`文件 ${file.name} 没有完整路径信息，可能无法正确处理`);
          toast.warning(`文件 ${file.name} 缺少路径信息，请使用文件选择器选择文件`);
          continue;
        }
        
        newFiles.push({
          path: filePath,
          name: file.name,
          size: file.size,
          file_type: extension,
          is_video,
          is_subtitle
        });
      }
    }
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      toast.success(`已添加 ${newFiles.length} 个文件`);
    } else {
      toast.warning("没有找到支持的文件格式");
    }
  }, []);

  // 扫描目录
  const scanDirectory = async (path: string) => {
    if (!isTauriAvailable()) {
      toast.error('目录扫描功能不可用，请检查 Tauri 环境');
      return;
    }
    
    try {
      const scannedFiles = await invoke<FileInfo[]>('scan_directory', { path });
      setFiles(prev => [...prev, ...scannedFiles]);
      toast.success(`成功扫描目录: ${path}`);
    } catch (error) {
      console.error('扫描目录错误:', error);
      toast.error(`扫描目录失败: ${error}`);
    }
  };

  // 移除文件
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 选择输出目录
  const selectOutputDirectory = async () => {
    if (!isDialogAvailable()) {
      toast.error('目录选择功能不可用，请检查 Tauri 环境');
      return;
    }
    
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      
      if (selected && !Array.isArray(selected)) {
        setOutputDir(selected);
        // 自动保存输出目录
        autoSaveConfig({ output_directory: selected });
        toast.success(`已选择输出目录: ${selected}`);
      }
    } catch (error) {
      console.error('选择目录错误:', error);
      if (error !== "User cancelled the dialog") {
        toast.error(`选择输出目录失败: ${error}`);
      }
    }
  };

  // 解析文件名
  const parseFilenames = async () => {
    if (files.length === 0) {
      toast.error("请先选择文件");
      return;
    }
    
    if (!isTauriAvailable()) {
      toast.error('文件名解析功能不可用，请检查 Tauri 环境');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const updatedFiles = [...files];
      let videoFiles = updatedFiles.filter(f => f.is_video);
      let parsedCount = 0;
      let firstAnimeTitle = '';
      
      // 只解析视频文件名
      for (let i = 0; i < videoFiles.length; i++) {
        try {
          const parsed = await invoke<ParsedFilename>('parse_anime_filename', {
            filename: videoFiles[i].name
          });
          
          // 更新文件信息
          const fileIndex = updatedFiles.findIndex(f => f.path === videoFiles[i].path);
          if (fileIndex !== -1) {
            updatedFiles[fileIndex].parsed = parsed;
            parsedCount++;
            
            // 记录第一个成功解析的动漫标题
            if (!firstAnimeTitle && parsed.anime_title) {
              firstAnimeTitle = parsed.anime_title;
            }
          }
        } catch (error) {
          console.error(`解析文件名失败: ${videoFiles[i].name}`, error);
        }
      }
      
      setFiles(updatedFiles);
      
      // 如果成功解析了至少一个文件，自动搜索元数据
      if (parsedCount > 0 && firstAnimeTitle) {
        console.log(`开始搜索动漫元数据: ${firstAnimeTitle}`);
        toast.success(`文件名解析完成，找到 ${parsedCount} 个文件，正在搜索动漫信息...`);
        await searchAnimeMetadata(firstAnimeTitle);
      } else {
        toast.success("文件名解析完成，但未找到可识别的动漫信息");
      }
    } catch (error) {
      console.error('解析文件名错误:', error);
      toast.error(`文件名解析失败: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 搜索动漫元数据
  const searchAnimeMetadata = async (title: string) => {
    if (!isTauriAvailable()) {
      toast.error('元数据搜索功能不可用，请检查 Tauri 环境');
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results = await invoke<AniListResponse[]>('search_anilist', {
        query: title
      });
      
      setAnimeSearchResults(results);
      
      if (results.length > 0) {
        setSelectedAnimeId(results[0].id);
        applyMetadata(results[0]);
      }
      
      setShowMetadataPanel(true);
      toast.success(`找到 ${results.length} 个搜索结果`);
    } catch (error) {
      toast.error(`搜索元数据失败: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  // 手动搜索动漫
  const handleManualSearch = async () => {
    if (!manualSearchQuery.trim()) {
      toast.error('请输入动漫名称');
      return;
    }
    
    await searchAnimeMetadata(manualSearchQuery.trim());
  };
  
  // 提取字幕文件的后缀（倒数第二个.到最后一个.之前的部分）
  const extractSubtitleSuffix = (filename: string): string => {
    const parts = filename.split('.');
    if (parts.length >= 3) {
      // 如果有至少3个部分（文件名.后缀.扩展名），返回倒数第二个部分
      return parts[parts.length - 2];
    }
    return ''; // 没有后缀
  };

  // 应用元数据到文件
  const applyMetadata = (animeData: AniListResponse) => {
    const updatedFiles = [...files];
    
    // 分离视频文件和字幕文件，分别处理
    const videoFiles = updatedFiles
      .map((file, originalIndex) => ({ file, originalIndex }))
      .filter(({ file }) => file.is_video)
      .sort((a, b) => a.file.name.localeCompare(b.file.name));
    
    // 字幕文件按后缀分组，然后在每组内排序
    const subtitleFiles = updatedFiles
      .map((file, originalIndex) => ({ 
        file, 
        originalIndex,
        suffix: extractSubtitleSuffix(file.name)
      }))
      .filter(({ file }) => file.is_subtitle);
    
    // 按后缀分组
    const subtitleGroups = subtitleFiles.reduce((groups, item) => {
      const suffix = item.suffix || 'default';
      if (!groups[suffix]) {
        groups[suffix] = [];
      }
      groups[suffix].push(item);
      return groups;
    }, {} as Record<string, typeof subtitleFiles>);
    
    // 对每组内的文件进行排序
    Object.keys(subtitleGroups).forEach(suffix => {
      subtitleGroups[suffix].sort((a, b) => a.file.name.localeCompare(b.file.name));
    });
    
    // 处理视频文件
    videoFiles.forEach(({ file, originalIndex }, sortedIndex) => {
      // 按排序后的顺序分配集数（从1开始）
      const episodeNumber = sortedIndex + 1;
      
      // 保留原有的技术信息（如果已解析）
      let groupName: string | undefined;
      let seasonNumber: number | undefined;
      
      if (file.parsed) {
        groupName = file.parsed.group;
        seasonNumber = file.parsed.season;
      } else {
        // 尝试从文件名中提取技术信息
        const seasonMatch = file.name.match(/[Ss](\d+)/);
        if (seasonMatch) {
          seasonNumber = parseInt(seasonMatch[1]);
        }
        
        // 尝试提取分辨率
        const resolutionMatch = file.name.match(/(\d{3,4}[pP])/);
        if (resolutionMatch) {
        }
        
        // 尝试提取字幕组
        const groupMatch = file.name.match(/\[([^\]]+)\]/);
        if (groupMatch) {
          groupName = groupMatch[1];
        }
      }
      
      const animeInfo: AnimeInfo = {
        title: animeData.title.romaji || animeData.title.english || animeData.title.native || "Unknown",
        title_romaji: animeData.title.romaji,
        title_english: animeData.title.english,
        episode: episodeNumber,
        season: seasonNumber || 1,
        year: animeData.season_year,
        format: animeData.format
      };
      
      updatedFiles[originalIndex].metadata = animeInfo;
      
      // 生成新文件名
      let newName = fileNameTemplate;
      newName = newName.replace("{title}", animeInfo.title);
      newName = newName.replace("{title_romaji}", animeInfo.title_romaji || animeInfo.title);
      newName = newName.replace("{title_english}", animeInfo.title_english || animeInfo.title);
      newName = newName.replace("{episode}", episodeNumber.toString().padStart(2, '0'));
      newName = newName.replace("{episode:02}", episodeNumber.toString().padStart(2, '0'));
      newName = newName.replace("{episode:03}", episodeNumber.toString().padStart(3, '0'));
      
      if (seasonNumber) {
        newName = newName.replace("{season}", seasonNumber.toString());
      } else {
        newName = newName.replace("{season}", "1");
      }
      
      if (animeInfo.year) {
        newName = newName.replace("{year}", animeInfo.year.toString());
      } else {
        newName = newName.replace("{year}", "");
      }
      
      // 添加字幕组信息
      if (groupName) {
        newName = newName.replace("{group}", groupName);
      } else {
        newName = newName.replace("{group}", "");
      }
      
      // 清理模板中的空白部分
      newName = newName.replace(/\s+/g, ' ').trim();
      
      // 添加文件扩展名
      newName = newName.replace("{ext}", file.file_type);
      if (!newName.endsWith(`.${file.file_type}`)) {
        newName += `.${file.file_type}`;
      }
      
      updatedFiles[originalIndex].new_name = newName;
    });
    
    // 按后缀分组处理字幕文件
    let subtitleProcessedCount = 0;
    Object.keys(subtitleGroups).forEach(suffix => {
      const groupFiles = subtitleGroups[suffix];
      
      groupFiles.forEach(({ file, originalIndex }, groupIndex) => {
        // 在每个后缀组内按排序后的顺序分配集数（从1开始）
        const episodeNumber = groupIndex + 1;
        
        // 保留原有的技术信息（如果已解析）
        let groupName: string | undefined;
        let seasonNumber: number | undefined;
        
        if (file.parsed) {
          groupName = file.parsed.group;
          seasonNumber = file.parsed.season;
        } else {
          // 尝试从文件名中提取技术信息
          const seasonMatch = file.name.match(/[Ss](\d+)/);
          if (seasonMatch) {
            seasonNumber = parseInt(seasonMatch[1]);
          }
          
          // 尝试提取字幕组
          const groupMatch = file.name.match(/\[([^\]]+)\]/);
          if (groupMatch) {
            groupName = groupMatch[1];
          }
        }
        
        const animeInfo: AnimeInfo = {
          title: animeData.title.romaji || animeData.title.english || animeData.title.native || "Unknown",
          title_romaji: animeData.title.romaji,
          title_english: animeData.title.english,
          episode: episodeNumber,
          season: seasonNumber || 1,
          year: animeData.season_year,
          format: animeData.format
        };
        
        updatedFiles[originalIndex].metadata = animeInfo;
        
        // 生成新文件名 - 使用视频模板加上字幕后缀
        let newName = fileNameTemplate + subtitleSuffix;
        newName = newName.replace("{title}", animeInfo.title);
        newName = newName.replace("{title_romaji}", animeInfo.title_romaji || animeInfo.title);
        newName = newName.replace("{title_english}", animeInfo.title_english || animeInfo.title);
        newName = newName.replace("{episode}", episodeNumber.toString().padStart(2, '0'));
        newName = newName.replace("{episode:02}", episodeNumber.toString().padStart(2, '0'));
        newName = newName.replace("{episode:03}", episodeNumber.toString().padStart(3, '0'));
        
        if (seasonNumber) {
          newName = newName.replace("{season}", seasonNumber.toString());
        } else {
          newName = newName.replace("{season}", "1");
        }
        
        if (animeInfo.year) {
          newName = newName.replace("{year}", animeInfo.year.toString());
        } else {
          newName = newName.replace("{year}", "");
        }
        
        // 添加字幕组信息
        if (groupName) {
          newName = newName.replace("{group}", groupName);
        } else {
          newName = newName.replace("{group}", "");
        }
        
        // 清理模板中的空白部分
        newName = newName.replace(/\s+/g, ' ').trim();
        
        // 如果原文件有后缀，在扩展名前添加后缀
        if (suffix && suffix !== 'default') {
          // 在添加扩展名之前插入后缀
          newName = newName.replace("{ext}", `${suffix}.{ext}`);
        }
        
        // 添加文件扩展名
        newName = newName.replace("{ext}", file.file_type);
        if (!newName.endsWith(`.${file.file_type}`)) {
          newName += `.${file.file_type}`;
        }
        
        updatedFiles[originalIndex].new_name = newName;
        subtitleProcessedCount++;
      });
    });
    
    setFiles(updatedFiles);
    
    // 提示用户重新排序的结果
    const videoCount = videoFiles.length;
    const subtitleCount = subtitleProcessedCount;
    const suffixGroups = Object.keys(subtitleGroups).filter(suffix => suffix !== 'default');
    let message = '';
    
    if (videoCount > 0) {
      message += `视频文件已按文件名排序重新分配集数：第1集到第${videoCount}集`;
    }
    
    if (subtitleCount > 0) {
      if (message) message += '；';
      if (suffixGroups.length > 0) {
        message += `字幕文件已按后缀分组处理：${suffixGroups.map(suffix => `${suffix}(${subtitleGroups[suffix].length}个)`).join('、')}`;
        if (subtitleGroups['default'] && subtitleGroups['default'].length > 0) {
          message += `、无后缀(${subtitleGroups['default'].length}个)`;
        }
      } else {
        message += `字幕文件已按文件名排序重新分配集数：第1集到第${subtitleCount}集`;
      }
    }
    
    toast.success(message);
    
    if (animeData.episodes && videoCount !== animeData.episodes) {
      toast.warning(`注意：检测到${videoCount}个视频文件，但该动漫共有${animeData.episodes}集`);
    }
  };
  
  // 选择不同的元数据结果
  const selectAnimeMetadata = (animeId: number) => {
    const selected = animeSearchResults.find(anime => anime.id === animeId);
    if (selected) {
      setSelectedAnimeId(animeId);
      applyMetadata(selected);
    }
  };
  
  // 处理文件
  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("请先选择文件");
      return;
    }
    
    if (!outputDir) {
      toast.error("请选择输出目录");
      return;
    }
    
    if (!isTauriAvailable()) {
      toast.error('文件处理功能不可用，请检查 Tauri 环境');
      return;
    }
    
    try {
      // 检查硬链接能力
      const canHardlink = await invoke<boolean>('check_hardlink_capability', {
        sourceDir: files[0].path.split(/[/\\]/).slice(0, -1).join('/'),
        targetDir: outputDir
      });
      
      if (!canHardlink) {
        toast.error("源目录和目标目录不支持硬链接，请选择同一文件系统上的目录");
        return;
      }
      
      setIsProcessing(true);
      setProcessingProgress(0);
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = prev + (100 - prev) * 0.1;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 300);
      
      // 准备重命名映射
      const renameMap: Record<string, string> = {};
      
      // 如果有元数据，创建基于动漫的文件夹结构
      if (files.some(f => f.metadata)) {
        // 获取第一个有元数据的文件
        const fileWithMetadata = files.find(f => f.metadata);
        if (fileWithMetadata && fileWithMetadata.metadata) {
          const animeInfo = fileWithMetadata.metadata;
          
          // 处理每个文件
          files.forEach(file => {
            if (file.new_name) {
              let targetPath = "";
              
              // 如果启用创建动漫文件夹
              if (createAnimeFolders) {
                let animeFolder = folderTemplate;
                animeFolder = animeFolder.replace("{title}", animeInfo.title);
                animeFolder = animeFolder.replace("{title_romaji}", animeInfo.title_romaji || animeInfo.title);
                animeFolder = animeFolder.replace("{title_english}", animeInfo.title_english || animeInfo.title);
                
                if (animeInfo.year) {
                  animeFolder = animeFolder.replace("{year}", animeInfo.year.toString());
                } else {
                  animeFolder = animeFolder.replace(" ({year})", "");
                  animeFolder = animeFolder.replace("({year})", "");
                }
                
                targetPath = animeFolder;
                
                // 如果按季度组织且有季度信息
                if (organizeBySeasons && file.metadata?.season) {
                  let seasonFolder = seasonFolderTemplate;
                  seasonFolder = seasonFolder.replace("{season}", file.metadata.season.toString());
                  seasonFolder = seasonFolder.replace("{season:02}", file.metadata.season.toString().padStart(2, '0'));
                  seasonFolder = seasonFolder.replace("{season:03}", file.metadata.season.toString().padStart(3, '0'));
                  targetPath += `/${seasonFolder}`;
                }
                
                // 完整路径
                targetPath += `/${file.new_name}`;
              } else {
                // 不创建动漫文件夹，但可能创建季度文件夹
                if (organizeBySeasons && file.metadata?.season) {
                  let seasonFolder = seasonFolderTemplate;
                  seasonFolder = seasonFolder.replace("{season}", file.metadata.season.toString());
                  seasonFolder = seasonFolder.replace("{season:02}", file.metadata.season.toString().padStart(2, '0'));
                  seasonFolder = seasonFolder.replace("{season:03}", file.metadata.season.toString().padStart(3, '0'));
                  targetPath = `${seasonFolder}/${file.new_name}`;
                } else {
                  // 直接使用新文件名
                  targetPath = file.new_name;
                }
              }
              
              renameMap[file.path] = targetPath;
            }
          });
        }
      } else {
        // 简单模式，直接使用新文件名
        files.forEach(file => {
          if (file.new_name) {
            renameMap[file.path] = file.new_name;
          }
        });
      }
      
      // 批量处理文件 - 使用新的季度文件夹处理函数
      const result = await invoke<ProcessResult>('batch_process_with_season_folders', {
        files: files.map(f => f.path),
        outputDir,
        renameMap,
        createSeasonFolders: organizeBySeasons,
        seasonFolderTemplate: seasonFolderTemplate
      });
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
        if (result.failed_files.length > 0) {
          console.error("处理失败的文件:", result.failed_files);
        }
      }
    } catch (error) {
      toast.error(`处理文件失败: ${error}`);
    } finally {
      setIsProcessing(false);
      // 延迟重置进度条，以便用户看到完成状态
      setTimeout(() => setProcessingProgress(0), 2000);
    }
  };
  
  // 保存当前设置到配置
  const saveCurrentSettings = async () => {
    if (!config || !isTauriAvailable()) {
      toast.error('配置保存功能不可用，请检查 Tauri 环境');
      return;
    }
    
    try {
      const updatedConfig = {
        ...config,
        output_directory: outputDir || config.output_directory,
        naming_template: fileNameTemplate,
        subtitle_template: fileNameTemplate + subtitleSuffix,
        folder_template: folderTemplate,
        season_folder_template: seasonFolderTemplate,
        organize_by_season: organizeBySeasons
      };
      
      const saved = await invoke<boolean>('save_config', { config: updatedConfig });
      if (saved) {
        toast.success("设置已保存");
        setConfig(updatedConfig);
      }
    } catch (error) {
      toast.error(`保存设置失败: ${error}`);
    }
  };
  
  // 编辑单个文件的新名称
  const editFileName = (index: number, newName: string) => {
    const updatedFiles = [...files];
    updatedFiles[index].new_name = newName;
    setFiles(updatedFiles);
  };
  
  // 更新文件名模板并应用到所有文件
  const updateFileNameTemplate = (template: string) => {
    setFileNameTemplate(template);
    
    // 自动保存配置
    autoSaveConfig({ naming_template: template });
    
    // 如果有选中的动漫元数据，重新应用
    if (selectedAnimeId !== null) {
      const selected = animeSearchResults.find(anime => anime.id === selectedAnimeId);
      if (selected) {
        applyMetadata(selected);
      }
    }
  };

  // 更新字幕后缀并自动保存
  const updateSubtitleSuffix = (suffix: string) => {
    setSubtitleSuffix(suffix);
    autoSaveConfig({ subtitle_template: fileNameTemplate + suffix });
  };

  // 更新文件夹模板并自动保存
  const updateFolderTemplate = (template: string) => {
    setFolderTemplate(template);
    autoSaveConfig({ folder_template: template });
  };

  // 更新季度文件夹模板并自动保存
  const updateSeasonFolderTemplate = (template: string) => {
    setSeasonFolderTemplate(template);
    autoSaveConfig({ season_folder_template: template });
  };

  // 更新按季度组织设置并自动保存
  const updateOrganizeBySeasons = (organize: boolean) => {
    setOrganizeBySeasons(organize);
    autoSaveConfig({ organize_by_season: organize });
  };

  // 更新创建动漫文件夹设置并自动保存
  const updateCreateAnimeFolders = (create: boolean) => {
    setCreateAnimeFolders(create);
    autoSaveConfig({ create_anime_folders: create });
  };

  // 自动保存配置的辅助函数
  const autoSaveConfig = async (updates: Partial<AppConfig>) => {
    if (!config || !isTauriAvailable()) return;
    
    try {
      const updatedConfig = {
        ...config,
        output_directory: outputDir || config.output_directory,
        naming_template: fileNameTemplate,
        subtitle_template: fileNameTemplate + subtitleSuffix,
        folder_template: folderTemplate,
        season_folder_template: seasonFolderTemplate,
        organize_by_season: organizeBySeasons,
        ...updates
      };
      
      await invoke<boolean>('save_config', { config: updatedConfig });
      setConfig(updatedConfig);
      console.log('配置已自动保存:', updates);
    } catch (error) {
      console.error('自动保存配置失败:', error);
    }
  };


  // 清空文件列表
  const clearFiles = () => {
    setFiles([]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">文件导入</h1>
      <p className="text-muted-foreground mb-6">
        导入视频文件（MKV/MP4）和字幕文件（ASS/SRT）进行处理
      </p>
      
      {/* Tauri 状态提示 */}
      {!isTauriAvailable() && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md">
          ⚠️ Tauri API 不可用，某些功能可能无法正常工作。请确保应用在 Tauri 环境中运行。
        </div>
      )}
      
      {/* 拖放区域 */}
      <div 
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-primary/20 hover:border-primary/50'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${isDragging ? 'text-primary' : 'text-primary/60'}`}
          >
            <path d="M4 22h16a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M2 15h10v5h-8a2 2 0 0 1-2-2z" />
            <path d="m9 15-2-2-2 2" />
          </svg>
          <p className="text-lg font-medium">拖放文件到此处或点击选择文件</p>
          <p className="text-sm text-muted-foreground">
            支持 MKV、MP4、ASS、SRT 格式文件
          </p>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleFileSelect}>
              选择文件
            </Button>
            <Button variant="outline" onClick={() => {
              const path = prompt("请输入目录路径");
              if (path) scanDirectory(path);
            }}>
              <FolderOpen className="mr-2 h-4 w-4" />
              扫描目录
            </Button>
          </div>
        </div>
      </div>
      
      {/* 处理控制区 */}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={selectOutputDirectory}>
                <FolderOpen className="mr-2 h-4 w-4" />
                选择输出目录
              </Button>
              {outputDir && (
                <span className="text-sm text-muted-foreground">
                  输出到: {outputDir}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={parseFilenames} disabled={isAnalyzing || isProcessing || !isTauriAvailable()}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    解析文件名
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={clearFiles} disabled={isProcessing || isAnalyzing}>
                清空列表
              </Button>
              <Button onClick={processFiles} disabled={isProcessing || !outputDir || !isTauriAvailable()}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    开始处理
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* 进度条 */}
          {isProcessing && processingProgress > 0 && (
            <div className="w-full">
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">
                处理进度: {Math.round(processingProgress)}%
              </p>
            </div>
          )}

          {/* 手动搜索动漫 */}
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={manualSearchQuery}
              onChange={(e) => setManualSearchQuery(e.target.value)}
              placeholder="输入动漫名称进行搜索..."
              className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSearch();
                }
              }}
              disabled={isSearching || !isTauriAvailable()}
            />
            <Button 
              onClick={handleManualSearch} 
              disabled={isSearching || !manualSearchQuery.trim() || !isTauriAvailable()}
              size="sm"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  搜索中...
                </>
              ) : (
                '搜索动漫'
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* 设置面板 */}
      {files.length > 0 && (
        <div className="mt-6 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">文件命名设置</h3>
            <Button variant="outline" size="sm" onClick={saveCurrentSettings} disabled={!isTauriAvailable()}>
              <Settings className="mr-2 h-4 w-4" />
              保存设置
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">视频文件名模板</label>
              <input
                type="text"
                value={fileNameTemplate}
                onChange={(e) => updateFileNameTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder="{title_romaji} - {episode:02}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                视频文件命名模板
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">字幕文件后缀</label>
              <input
                type="text"
                value={subtitleSuffix}
                onChange={(e) => updateSubtitleSuffix(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder=".chs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                字幕文件后缀（将添加到视频文件名后）
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">动漫文件夹模板</label>
              <input
                type="text"
                value={folderTemplate}
                onChange={(e) => updateFolderTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder="{title_romaji} ({year})"
              />
              <p className="text-xs text-muted-foreground mt-1">
                动漫主文件夹命名模板
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">季度文件夹模板</label>
              <input
                type="text"
                value={seasonFolderTemplate}
                onChange={(e) => updateSeasonFolderTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder="Season {season}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                季度子文件夹命名模板
              </p>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              文件名变量: {"{title}, {title_romaji}, {title_english}, {episode}, {episode:02}, {episode:03}, {season}, {year}, {group}, {ext}"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              季度文件夹变量: {"{season}, {season:02}, {season:03}"} (例如: Season {"{season}"} → Season 1, S{"{season:02}"} → S01)
            </p>
          </div>
          
          <div className="mt-4 space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={createAnimeFolders}
                onChange={(e) => updateCreateAnimeFolders(e.target.checked)}
                className="mr-2"
              />
              创建动漫文件夹
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={organizeBySeasons}
                onChange={(e) => updateOrganizeBySeasons(e.target.checked)}
                className="mr-2"
              />
              按季度组织文件夹
            </label>
          </div>
        </div>
      )}
      
      {/* 元数据面板 */}
      {showMetadataPanel && animeSearchResults.length > 0 && (
        <div className="mt-6 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">选择动漫信息</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowMetadataPanel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {animeSearchResults.map((anime) => (
              <div
                key={anime.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAnimeId === anime.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => selectAnimeMetadata(anime.id)}
              >
                <div className="flex items-start gap-3">
                  {anime.cover_image?.medium && (
                    <img
                      src={anime.cover_image.medium}
                      alt={anime.title.romaji || anime.title.english || ''}
                      className="w-16 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {anime.title.romaji || anime.title.english}
                    </h4>
                    {anime.title.english && anime.title.romaji !== anime.title.english && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {anime.title.english}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {anime.season_year && <span>{anime.season_year}</span>}
                      {anime.format && <span>{anime.format}</span>}
                      {anime.episodes && <span>{anime.episodes}话</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">文件列表 ({files.length})</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>视频: {files.filter(f => f.is_video).length}</span>
              <span>字幕: {files.filter(f => f.is_subtitle).length}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {file.is_video ? (
                    <FileVideo className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-green-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    {file.size > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {bytesToSize(file.size)}
                      </span>
                    )}
                  </div>
                  
                  {file.parsed && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span>解析结果: {file.parsed.anime_title}</span>
                      {file.parsed.episode_number && (
                        <span> - 第{file.parsed.episode_number}话</span>
                      )}
                      {file.parsed.season && (
                        <span> (第{file.parsed.season}季)</span>
                      )}
                      {file.parsed.group && (
                        <span> [{file.parsed.group}]</span>
                      )}
                    </div>
                  )}
                  
                  {file.new_name && (
                    <div className="mt-1 flex items-center gap-2">
                      {currentEditingFile === index ? (
                        <input
                          type="text"
                          value={file.new_name}
                          onChange={(e) => editFileName(index, e.target.value)}
                          onBlur={() => setCurrentEditingFile(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setCurrentEditingFile(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="text-xs text-green-600 flex-1 truncate">
                            新名称: {file.new_name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentEditingFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0 h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportPage;
