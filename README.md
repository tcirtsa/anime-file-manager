# 动漫文件管理器 (Anime File Manager)

一个基于Tauri的跨平台动漫文件管理工具，帮助您整理和管理动漫视频文件。

## 功能特点

- **智能文件名解析**：自动解析动漫文件名，提取标题、季度、集数等信息
- **批量重命名**：根据元数据自动生成规范的文件名
- **文件夹组织**：自动创建动漫文件夹和季度文件夹，保持媒体库整洁
- **硬链接支持**：使用硬链接而非复制文件，节省磁盘空间
- **元数据获取**：从AniList获取准确的动漫信息
- **日志系统**：详细记录所有操作，方便排查问题
- **自定义命名模板**：灵活配置文件命名格式(是否有模板无效没测试，我自用够用了捏)

## 技术栈

- **前端**：React + TypeScript
- **后端**：Rust (Tauri)
- **元数据API**：AniList GraphQL API

本项目使用了[Anitomy](https://github.com/erengy/anitomy)库（通过[anitomy-rs](https://github.com/Xtansia/anitomy-rs) Rust绑定）来解析动漫文件名。

## 安装与使用

### 安装步骤

1. 从[Releases](https://github.com/yourusername/anime-file-manager/releases)页面下载适合您系统的安装包
2. 安装应用程序
3. 启动"动漫文件管理器"

### 基本使用流程

1. 在"设置"页面配置您的首选项
2. 在"导入"页面选择包含动漫文件的源文件夹
3. 选择目标文件夹
4. 应用程序会自动解析文件名并获取元数据
5. 预览生成的文件名和文件夹结构
6. 点击"处理"按钮开始整理文件

## 开发

### 环境设置

1. 安装Rust和Node.js
2. 安装Tauri CLI: `cargo install tauri-cli`
3. 克隆仓库: `git clone https://github.com/tcirtsa/anime-file-manager.git`
4. 安装依赖: `cd anime-file-manager && npm install`
5. 运行开发服务器: `cargo tauri dev`

### 构建

```bash
cargo tauri build
```

## 许可证

MIT

## 致谢

- [Anitomy](https://github.com/erengy/anitomy) - 动漫文件名解析库
- [anitomy-rs](https://github.com/Xtansia/anitomy-rs) - Anitomy的Rust绑定
- [Tauri](https://tauri.app) - 构建跨平台应用的框架
- [AniList](https://anilist.co) - 提供动漫元数据API
