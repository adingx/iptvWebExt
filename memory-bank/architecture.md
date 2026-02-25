# IPTV WebExtension 架构文档

## 项目状态

**版本**: 1.0.0
**状态**: 核心功能开发完成
**完成率**: 77% (37/48 步骤)

---

## 目录结构

```
iptvWebExt/
├── manifest.json              # Manifest V3 配置文件 ✅
├── README.md                  # 用户文档 ✅
├── src/                       # 源代码目录
│   ├── background/            # 后台服务
│   │   └── service-worker.js  # Service Worker ✅
│   ├── popup/                 # 弹出窗口
│   │   ├── popup.html         # HTML 结构 ✅
│   │   ├── popup.css          # 样式 ✅
│   │   └── popup.js           # 逻辑 ✅
│   ├── options/               # 设置页面
│   │   ├── options.html       # HTML 结构 ✅
│   │   ├── options.css        # 样式 ✅
│   │   └── options.js         # 逻辑 ✅
│   ├── player/                # 播放器页面
│   │   ├── player.html        # HTML 结构 ✅
│   │   ├── player.css         # 样式 ✅
│   │   └── player.js          # 逻辑 ✅
│   └── shared/                # 共享模块
│       ├── constants.js       # 常量定义 ✅
│       ├── storage.js         # 存储管理 ✅
│       └── m3u-parser.js      # M3U 解析器 ✅
├── icons/                     # 扩展图标
│   └── icon.svg               # SVG 图标 (需转PNG) ⚠️
└── memory-bank/               # 开发文档
    ├── app-design-document.md # 设计文档
    ├── implementation-plan.md # 实施计划
    ├── progress.md            # 开发进度
    └── architecture.md        # 本文件
```

---

## 已实现文件详解

### 1. manifest.json
**作用**: 扩展配置文件
**关键字段**:
- Manifest V3 规范
- permissions: ["storage"]
- host_permissions: ["*://*/*"]
- web_accessible_resources: player.html
- CSP 配置

**技术决策**:
- CSP 限制脚本源为 'self'，防止 XSS
- player.html 可公开访问，允许通过 chrome.runtime.getURL() 访问

---

### 2. src/shared/constants.js
**作用**: 全局常量定义
**导出内容**:
- `STORAGE_KEYS`: channels/history/settings/error_logs
- `DEFAULT_SETTINGS`: defaultQuality='auto', autoPlay=true, volume=80
- `MAX_HISTORY_COUNT`: 50
- `CHANNELS_PER_PAGE`: 100

---

### 3. src/shared/m3u-parser.js
**作用**: M3U 文件解析
**核心函数**:
- `parseM3U(content)`: 解析 M3U 字符串，返回频道数组
- `generateIdFromUrl(url)`: 基于 URL 生成唯一 ID

**解析能力**:
- 标准 #EXTINF 格式
- tvg-id, tvg-name, tvg-logo, group-title 属性
- 正则表达式提取，不区分大小写

---

### 4. src/shared/storage.js
**作用**: 封装 chrome.storage API
**核心函数**:

**频道管理**:
- `saveChannels(channels)`: 保存频道列表
- `getChannels()`: 获取频道列表
- `addChannel(channel)`: 添加单个频道
- `removeChannel(channelId)`: 删除频道
- `updateChannel(channelId, updates)`: 更新频道

**历史记录**:
- `addHistory(channel)`: 添加历史（按 URL 去重，限制 50 条）
- `getHistory()`: 获取历史记录
- `clearHistory()`: 清空历史

**设置管理**:
- `saveSettings(settings)`: 保存设置
- `getSettings()`: 获取设置（与默认值合并）

**特性**:
- 所有 API 调用用 try-catch 包裹
- 返回默认值而非 undefined

---

### 5. src/popup/popup.html
**作用**: 弹出窗口 HTML 结构
**包含元素**:
- header: 标题 + 设置按钮
- main: 搜索框 + 频道列表容器
- footer: 导入/历史按钮
- 隐藏的 file input

---

### 6. src/popup/popup.css
**作用**: 弹出窗口样式
**布局**: 400x600px，Flexbox 垂直布局
**颜色**: 白色背景，#4285f4 强调色

---

### 7. src/popup/popup.js
**作用**: 弹出窗口业务逻辑
**功能**:
- 频道列表渲染（按分组）
- 搜索/过滤（频道名、分组）
- M3U 文件导入（去重）
- 历史记录视图切换
- 点击频道打开播放器
- 设置页面跳转

---

### 8. src/player/player.html
**作用**: 播放器 HTML 结构
**包含元素**:
- video 元素（controls, preload="metadata"）
- 顶部栏：返回按钮 + 频道标题
- 控制栏：播放/暂停、静音、画中画、频道列表
- 侧边栏：频道列表
- HLS.js CDN

---

### 9. src/player/player.css
**作用**: 播放器样式
**布局**: 全屏深色主题
**特性**: 视频占据主要空间，侧边栏从右侧滑入

---

### 10. src/player/player.js
**作用**: 播放器业务逻辑
**功能**:
- URL 参数解析（获取频道 ID）
- HLS.js 集成播放
- 播放历史记录
- 控制按钮（播放/暂停、静音、画中画、侧边栏）
- 键盘快捷键（空格、方向键、ESC）
- 频道切换（上一个/下一个）

---

### 11. src/options/options.html
**作用**: 设置页面 HTML 结构
**包含**:
- 三个标签页：频道管理、播放设置、关于
- 频道表格、搜索/过滤、导入/清空按钮
- 表单控件（下拉框、复选框、滑块）
- 版本信息显示

---

### 12. src/options/options.css
**作用**: 设置页面样式
**布局**: 900px 居中，标签页导航

---

### 13. src/options/options.js
**作用**: 设置页面业务逻辑
**功能**:
- 标签页切换
- 频道管理（导入、删除、清空、表格渲染）
- 播放设置（加载、即时保存）
- 搜索和分组过滤
- 版本信息显示

---

### 14. src/background/service-worker.js
**作用**: 后台服务工作脚本
**功能**:
- onInstalled: 初始化默认设置
- 右键菜单创建和点击处理
- 验证 m3u8 URL
- 创建临时频道并播放

---

## 数据流

### M3U 导入流程
```
用户选择文件 → FileReader → parseM3U() →
去重（按 URL） → saveChannels() → 更新 UI
```

### 播放流程
```
点击频道 → chrome.tabs.create(player.html?id=xxx) →
loadChannel() → getChannels() → initPlayer() →
HLS.js 加载 → addHistory()
```

### 历史记录流程
```
播放成功 → addHistory() →
去重（按 URL）→ 添加到数组开头 →
限制 50 条 → 保存
```

---

## 技术规范

- **模块系统**: ES6 Modules (export const/function)
- **HTML 脚本**: `<script type="module">`
- **异步处理**: async/await
- **错误处理**: try-catch 包裹 Chrome API
- **通知**: 内联提示（popup）、chrome.notifications（background）
- **存储**: chrome.storage.local
- **播放**: HTML5 Video + HLS.js (CDN v1.4.12)

---

## 待完成项

### 必需
1. **图标文件**: 需要将 icon.svg 转换为 PNG (16/48/128)
2. **测试**: 端到端功能测试
3. **打包**: 创建发布 ZIP 包

### 可选
1. **虚拟滚动**: 频道数 > 100 时启用
2. **图片懒加载**: 频道 logo 按需加载
3. **错误日志**: 统一的错误处理和日志系统

---

## 最后更新

- **日期**: 2026-02-25
- **状态**: Phase 1-6 核心功能完成
- **剩余**: Phase 7 测试和发布准备
