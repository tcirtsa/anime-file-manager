#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试季度文件夹命名功能
"""

def test_season_folder_templates():
    """测试不同的季度文件夹模板"""
    
    test_cases = [
        {
            "template": "Season {season}",
            "season": 1,
            "expected": "Season 1"
        },
        {
            "template": "Season {season}",
            "season": 2,
            "expected": "Season 2"
        },
        {
            "template": "S{season:02}",
            "season": 1,
            "expected": "S01"
        },
        {
            "template": "S{season:02}",
            "season": 12,
            "expected": "S12"
        },
        {
            "template": "第{season}季",
            "season": 1,
            "expected": "第1季"
        },
        {
            "template": "Season {season:03}",
            "season": 1,
            "expected": "Season 001"
        },
        {
            "template": "{season}st Season",
            "season": 1,
            "expected": "1st Season"
        }
    ]
    
    print("季度文件夹模板测试")
    print("=" * 50)
    
    for i, case in enumerate(test_cases, 1):
        template = case["template"]
        season = case["season"]
        expected = case["expected"]
        
        # 模拟模板替换逻辑
        result = template.replace("{season}", str(season))
        result = result.replace("{season:02}", f"{season:02d}")
        result = result.replace("{season:03}", f"{season:03d}")
        
        print(f"\n测试 {i}:")
        print(f"  模板: {template}")
        print(f"  季度: {season}")
        print(f"  期望结果: {expected}")
        print(f"  实际结果: {result}")
        print(f"  状态: {'✅ 通过' if result == expected else '❌ 失败'}")

def test_folder_structure():
    """测试完整的文件夹结构"""
    
    print("\n" + "=" * 50)
    print("完整文件夹结构测试")
    print("=" * 50)
    
    # 模拟动漫信息
    anime_info = {
        "title_romaji": "BanG Dream! Girls Band Party!☆PICO～OHMORI～",
        "year": 2022,
        "season": 2
    }
    
    # 不同的模板组合
    test_configs = [
        {
            "name": "默认配置",
            "folder_template": "{title_romaji} ({year})",
            "season_folder_template": "Season {season}",
            "organize_by_season": True
        },
        {
            "name": "简洁配置",
            "folder_template": "{title_romaji}",
            "season_folder_template": "S{season:02}",
            "organize_by_season": True
        },
        {
            "name": "中文配置",
            "folder_template": "{title_romaji} ({year})",
            "season_folder_template": "第{season}季",
            "organize_by_season": True
        },
        {
            "name": "不按季度组织",
            "folder_template": "{title_romaji} ({year})",
            "season_folder_template": "Season {season}",
            "organize_by_season": False
        }
    ]
    
    for config in test_configs:
        print(f"\n{config['name']}:")
        
        # 生成动漫文件夹名
        anime_folder = config["folder_template"]
        anime_folder = anime_folder.replace("{title_romaji}", anime_info["title_romaji"])
        anime_folder = anime_folder.replace("{year}", str(anime_info["year"]))
        
        # 清理文件夹名（模拟sanitize_filename）
        anime_folder_clean = anime_folder.replace("☆", "★").replace("～", "~")
        
        if config["organize_by_season"] and anime_info["season"] > 1:
            # 生成季度文件夹名
            season_folder = config["season_folder_template"]
            season_folder = season_folder.replace("{season}", str(anime_info["season"]))
            season_folder = season_folder.replace("{season:02}", f"{anime_info['season']:02d}")
            
            full_path = f"{anime_folder_clean}/{season_folder}"
        else:
            full_path = anime_folder_clean
        
        print(f"  文件夹结构: {full_path}")
        print(f"  按季度组织: {'是' if config['organize_by_season'] else '否'}")

def main():
    print("动漫文件管理器 - 季度文件夹功能测试")
    print("=" * 60)
    
    test_season_folder_templates()
    test_folder_structure()
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("\n功能说明:")
    print("1. 支持自定义季度文件夹命名模板")
    print("2. 默认模板: 'Season {season}' (例如: Season 1, Season 2)")
    print("3. 支持格式化: {season:02} (例如: S01, S02)")
    print("4. 支持中文模板: '第{season}季' (例如: 第1季, 第2季)")
    print("5. 只有当季度大于1时才创建季度子文件夹")
    print("6. 可以通过配置关闭按季度组织功能")

if __name__ == "__main__":
    main()