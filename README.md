# IPTV Player

一款轻量级的 IPTV 浏览器扩展，支持导入 M3U 播放列表并播放 M3U8 直播流。

## 功能特性

- ✅ M3U 文件导入（支持拖拽和文件选择）
- ✅ M3U8 流媒体播放
- ✅ 频道列表管理与搜索
- ✅ 播放历史记录
- ✅ 键盘快捷键支持
- ✅ 画中画模式
- ✅ 右键菜单快速播放

## 安装方法

### 开发者模式安装

1. 下载或克隆此项目
2. 准备图标文件（见下方说明）
3. 打开 Chrome/Edge 浏览器
4. 访问 `chrome://extensions/` (Chrome) 或 `edge://extensions/` (Edge)
5. 开启"开发者模式"
6. 点击"加载已解压的扩展程序"
7. 选择项目根目录

### 图标文件准备

由于项目未包含 PNG 图标文件，您需要手动创建以下图标：

**方法 1: 使用在线工具**
1. 访问 https://www.favicon.cc/ 或类似网站
2. 创建一个蓝色 (#4285f4) 背景、白色播放符号的图标
3. 下载以下尺寸：
   - icon16.png (16x16 像素)
   - icon48.png (48x48 像素)
   - icon128.png (128x128 像素)
4. 放入 `icons/` 目录

**方法 2: 使用提供的 SVG**
- `icons/icon.svg` 已提供，可使用在线工具转换为 PNG

## 使用说明

### 导入 M3U 播放列表

1. 点击扩展图标打开弹出窗口
2. 点击"📁 导入 M3U"按钮
3. 选择您的 M3U 文件
4. 频道将自动导入并显示

### 播放频道

1. 在弹出窗口中点击任意频道
2. 播放器将在新标签页中打开
3. 使用控制栏或键盘快捷键控制播放

### 键盘快捷键

- `空格` - 播放/暂停
- `ESC` - 退出画中画或关闭侧边栏
- `←/→` - 切换上一个/下一个频道
- `↑/↓` - 音量增减

### 右键菜单

1. 在网页上选中 m3u8 URL
2. 右键点击
3. 选择"在 IPTV Player 中播放"
4. 视频将自动开始播放

## M3U 文件格式

支持的 M3U 格式示例：

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="CCTV1" tvg-name="CCTV1" tvg-logo="http://example.com/cctv1.png" group-title="央视",CCTV-1
http://example.com/live/cctv1.m3u8
#EXTINF:-1 tvg-id="CCTV2" tvg-name="CCTV2" tvg-logo="http://example.com/cctv2.png" group-title="央视",CCTV-2
http://example.com/live/cctv2.m3u8
```

## 设置

右键点击扩展图标，选择"选项"或访问设置页面：

- **频道管理**: 查看、导入、删除频道
- **播放设置**: 调整默认画质、音量、自动播放
- **关于**: 查看版本信息

## 技术栈

- Vanilla JavaScript ES6+（无框架依赖）
- HLS.js（M3U8 播放支持）
- Chrome Extension Manifest V3
- chrome.storage.local（数据存储）

## 开发

### 项目结构

```
iptvWebExt/
├── manifest.json              # 扩展配置
├── src/
│   ├── background/            # Service Worker
│   ├── popup/                 # 弹出窗口
│   ├── options/               # 设置页面
│   ├── player/                # 播放器页面
│   └── shared/                # 共享模块
│       ├── constants.js       # 常量定义
│       ├── storage.js         # 存储管理
│       └── m3u-parser.js      # M3U 解析器
├── icons/                     # 图标资源
└── README.md                  # 本文件
```

### 构建说明

本项目无需构建步骤，直接加载即可使用。

## 常见问题

**Q: 为什么视频无法播放？**
A: 请确保视频源地址有效且支持 CORS。某些视频源可能需要特殊配置。

**Q: 导入 M3U 后没有显示频道？**
A: 请检查 M3U 文件格式是否正确，确保 URL 以 http:// 或 https:// 开头。

**Q: 如何导出我的频道列表？**
A: 目前不支持导出功能，请保留您的原始 M3U 文件。

**Q: 支持哪些浏览器？**
A: Chrome 88+ 和 Edge 88+（基于 Chromium 的浏览器）

## 隐私政策

本扩展完全在本地运行，所有数据存储在浏览器本地：
- 频道列表存储在 chrome.storage.local
- 播放历史存储在 chrome.storage.local
- 不向任何服务器发送用户数据
- M3U 视频流直接从原始服务器加载

## 开源许可

MIT License

## 版本历史

### v1.0.0 (2026-02-25)
- 初始发布
- 支持 M3U 文件导入
- 支持 M3U8 播放
- 频道列表管理
- 播放历史记录
- 键盘快捷键
- 画中画模式
- 右键菜单

## 联系方式

如有问题或建议，请提交 Issue。

---

**IPTV Player** - 轻松观看您喜爱的 IPTV 频道
