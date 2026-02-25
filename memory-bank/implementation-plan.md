# IPTV WebExtension 播放器实施计划

## 计划说明

本文档面向 AI 开发者，提供逐步实施指令。每一步都包含明确的验证标准。

**重要约束**:
- 每步必须独立可验证
- 严禁跳过步骤
- 验证失败不得继续后续步骤

**技术规范**:
- 使用 ES6 模块语法：`export const`、`export function`
- HTML 引入脚本使用 `<script type="module">`
- 所有 Chrome API 调用使用 try-catch 包裹
- 错误提示使用 chrome.notifications API
- 测试前必须先加载扩展到浏览器

---

## Phase 1: 项目初始化与基础设施

### Step 1.1: 创建目录结构

**指令**:
在项目根目录下创建以下目录树：
- `src/background/`
- `src/popup/`
- `src/options/`
- `src/player/`
- `src/shared/`
- `lib/`
- `icons/`

**验证**:
运行命令列出目录结构，确认所有 7 个目录已创建且为空目录。

---

### Step 1.2: 创建 manifest.json

**指令**:
在项目根目录创建 `manifest.json` 文件，配置 Manifest V3 规范：

**必须包含的字段**:
- `name`: "IPTV Player"
- `version`: "1.0.0"
- `manifest_version`: 3
- `permissions`: 数组，包含 "storage"
- `host_permissions`: 数组，包含 "*://*/*"
- `action`: 对象，配置 `default_popup` 为 "src/popup/popup.html"
- `options_page`: "src/options/options.html"
- `background`: 对象，配置 `service_worker` 为 "src/background/service-worker.js"
- `icons`: 对象，配置 16/48/128 三个尺寸（文件路径："icons/icon16.png" 等）
- `web_accessible_resources`: 数组，包含 player.html 的资源配置
- `content_security_policy`: 对象，配置 `extension_pages: "script-src 'self'; object-src 'self'"`

**web_accessible_resources 配置示例**:
```json
{
  "resources": ["src/player/player.html"],
  "matches": ["<all_urls>"]
}
```

**验证**:
1. 使用 JSON 验证工具确认文件格式正确
2. 确认所有必需字段存在且类型正确
3. 确认没有尾随逗号
4. 确认 CSP 配置正确

---

### Step 1.3: 创建常量定义文件

**指令**:
创建 `src/shared/constants.js` 文件，定义以下常量：

**必须定义的常量**:
1. `STORAGE_KEYS`: 对象，包含 channels/history/settings 三个键
2. `DEFAULT_SETTINGS`: 对象，包含 defaultQuality/autoPlay/volume 三个属性
3. `MAX_HISTORY_COUNT`: 数值，设置为 50
4. `CHANNELS_PER_PAGE`: 数值，设置为 100

**导出语法**:
使用 `export const` 导出每个常量。

**DEFAULT_SETTINGS 默认值**:
- `defaultQuality`: "auto"
- `autoPlay`: true
- `volume`: 80

**验证**:
1. 确认文件使用 ES6 模块语法（export const）
2. 确认所有常量已定义
3. 确认 DEFAULT_SETTINGS 包含所有必需属性

---

### Step 1.4: 配置 HLS.js CDN 引用

**指令**:
本步骤不下载文件到本地，而是在 HTML 中直接引用 CDN。

**CDN 地址**:
使用 `https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js`

**注意**:
- lib/ 目录保留用于可能的本地库文件
- 在后续步骤（player.html）中直接引用 CDN

**验证**:
1. 在浏览器中直接访问 CDN URL，确认文件可访问
2. 确认版本为 1.4.12 或更新的稳定版本

---

## Phase 2: 核心模块开发

### Step 2.1: 实现 M3U 解析器 - 基础框架

**指令**:
创建 `src/shared/m3u-parser.js` 文件，实现以下功能：

**必须实现的导出函数**:
使用 `export function` 导出以下函数：
1. `parseM3U(content)` - 主解析函数，接收字符串参数，返回数组

**基础解析逻辑**:
- 按行分割输入内容
- 跳过空行和注释行（非 #EXTINF 开头的 # 开头行）
- 识别 #EXTINF 行和紧随其后的 URL 行

**数据结构要求**:
每个频道对象必须包含：
- `id`: 唯一标识符（使用 URL 或时间戳生成）
- `name`: 频道名称（从 #EXTINF 行提取）
- `url`: 流地址
- `group`: 默认为 "未分组"
- `logo`: 默认为空字符串

**验证**:
1. 使用包含 3 个频道的简单 M3U 内容测试
2. 确认返回数组长度为 3
3. 确认每个对象包含 id/name/url/group/logo 五个字段
4. 确认 name 字段正确提取（逗号后的内容）

---

### Step 2.2: 增强 M3U 解析器 - 属性提取

**指令**:
修改 `parseM3U` 函数，增加以下属性解析能力：

**必须解析的属性**:
1. `tvg-id`: 从 tvg-id="..." 提取，存入 tvgId 字段
2. `tvg-name`: 从 tvg-name="..." 提取，存入 tvgName 字段
3. `tvg-logo`: 从 tvg-logo="..." 提取，存入 logo 字段
4. `group-title`: 从 group-title="..." 提取，存入 group 字段

**处理逻辑**:
- 使用正则表达式匹配属性值
- 如果属性不存在，使用默认值
- logo 属性优先级高于默认空字符串

**验证**:
1. 使用包含所有属性的测试 M3U 内容
2. 确认所有 4 个属性正确提取
3. 使用部分属性的 M3U 测试，确认默认值正确
4. 确认 group-title 覆盖默认的 "未分组"

---

### Step 2.3: 实现存储管理模块 - 频道列表

**指令**:
创建 `src/shared/storage.js` 文件，实现频道列表存储功能：

**必须实现的异步函数**:
使用 `export async function` 导出：
1. `saveChannels(channels)` - 保存频道数组到 chrome.storage.local
2. `getChannels()` - 从 chrome.storage.local 读取频道数组

**存储键使用**:
使用 constants.js 中定义的 STORAGE_KEYS.channels

**错误处理**:
- 用 try-catch 包裹所有 chrome.storage API 调用
- 如果 API 不可用，抛出包含 "Storage API not available" 的错误
- 调用者无需捕获，让错误向上传播

**验证**:
1. 调用 saveChannels 保存包含 2 个频道的数组
2. 等待操作完成
3. 调用 getChannels，确认返回数组长度为 2
4. 确认频道数据完整性（所有字段保持不变）

---

### Step 2.4: 实现存储管理模块 - 单频道操作

**指令**:
在 storage.js 中增加以下函数：

**必须实现的异步函数**:
使用 `export async function` 导出：
1. `addChannel(channel)` - 添加单个频道到现有列表
2. `removeChannel(channelId)` - 根据 id 删除频道
3. `updateChannel(channelId, updates)` - 更新指定频道的部分字段

**addChannel 逻辑**:
- 获取现有频道列表
- 追加新频道到数组末尾
- 保存更新后的列表

**removeChannel 逻辑**:
- 获取现有频道列表
- 过滤掉匹配 id 的频道
- 保存更新后的列表

**updateChannel 逻辑**:
- 获取现有频道列表
- 找到匹配 id 的频道
- 使用 Object.assign 合并 updates 对象
- 保存更新后的列表

**验证**:
1. 测试 addChannel：添加 1 个频道，确认列表长度增加 1
2. 测试 removeChannel：删除刚添加的频道，确认列表恢复原长度
3. 测试 updateChannel：更新某个频道的 name，确认修改生效

---

### Step 2.5: 实现存储管理模块 - 历史记录

**指令**:
在 storage.js 中增加播放历史功能：

**必须实现的异步函数**:
使用 `export async function` 导出：
1. `addHistory(channel)` - 添加频道到历史记录
2. `getHistory()` - 获取历史记录列表
3. `clearHistory()` - 清空历史记录

**addHistory 逻辑**:
- 获取现有历史记录
- 去重：如果频道已存在（按 url 匹配），先移除旧记录
- 将新频道添加到数组开头
- 如果超过 MAX_HISTORY_COUNT，移除末尾元素
- 保存更新后的列表
- 依赖数组顺序表示时间（最新的在前面）

**存储键使用**:
使用 STORAGE_KEYS.history

**验证**:
1. 添加 3 个不同频道，确认历史记录长度为 3
2. 再次添加第 1 个频道，确认它移到最前面且长度仍为 3
3. 调用 clearHistory，确认历史记录变为空数组
4. 循环添加 52 个频道，确认历史记录长度限制为 50

---

### Step 2.6: 实现存储管理模块 - 设置管理

**指令**:
在 storage.js 中增加设置管理功能：

**必须实现的异步函数**:
使用 `export async function` 导出：
1. `saveSettings(settings)` - 保存设置对象
2. `getSettings()` - 获取设置对象，如果不存在返回默认设置

**saveSettings 逻辑**:
- 直接保存设置对象到 storage
- 不需要合并现有设置

**getSettings 逻辑**:
- 尝试从 storage 读取设置
- 如果不存在或为空，返回 DEFAULT_SETTINGS 的副本
- 如果存在，与 DEFAULT_SETTINGS 合并（确保所有字段存在）

**存储键使用**:
使用 STORAGE_KEYS.settings

**验证**:
1. 首次调用 getSettings，确认返回 DEFAULT_SETTINGS 的副本
2. 修改部分设置并保存
3. 再次调用 getSettings，确认返回合并后的设置
4. 确认修改的值生效，未修改的值使用默认值

---

## Phase 3: 用户界面开发

### Step 3.1: 创建弹出窗口 HTML 结构

**指令**:
创建 `src/popup/popup.html` 文件，构建以下 DOM 结构：

**必须包含的元素**:
1. `<header>` - 标题栏，包含应用名称和设置按钮
2. 搜索框 `<input>` - placeholder 为 "搜索频道..."
3. 频道列表容器 `<div>` - id 为 "channel-list"
4. 底部按钮区 `<footer>` - 包含 "导入 M3U" 和 "历史" 按钮

**样式表引入**:
引入 `popup.css`

**脚本引入**:
使用 `<script type="module">` 引入以下文件：
- `../shared/constants.js`
- `../shared/storage.js`
- `../shared/m3u-parser.js`
- `popup.js`

**body 结构**:
header -> main (包含搜索框和频道列表) -> footer

**验证**:
1. 加载扩展到浏览器
2. 点击扩展图标打开弹出窗口
3. 确认所有元素可见
4. 确认没有 404 错误（JS 文件暂不存在会有错误，但这是预期的）

---

### Step 3.2: 创建弹出窗口样式

**指令**:
创建 `src/popup/popup.css` 文件，设置以下样式：

**布局要求**:
1. 弹出窗口宽度固定为 400px，高度 600px
2. 使用 Flexbox 垂直布局（header 和 footer 固定，main 自适应）
3. 频道列表可滚动（overflow-y: auto）

**颜色方案**:
- 背景色：#ffffff
- 主文字：#333333
- 次要文字：#666666
- 边框：#e0e0e0
- 强调色：#4285f4（用于按钮和链接）

**组件样式**:
1. 搜索框：全宽，内边距 8px，圆角 4px
2. 频道项：padding 12px，border-bottom，hover 效果
3. 按钮：padding 8px 16px，圆角 4px，无背景
4. 分组标题：加粗，小字号，背景色 #f5f5f5

**验证**:
1. 重新加载扩展并打开弹出窗口
2. 确认宽度为 400px
3. 确认搜索框和频道列表可见
4. 确认频道列表可以滚动（添加临时测试内容验证）

---

### Step 3.3: 实现弹出窗口 - 频道列表渲染

**指令**:
创建 `src/popup/popup.js` 文件，实现频道列表渲染功能：

**必须实现的函数**:
1. `renderChannelList(channels)` - 渲染完整频道列表
2. `createChannelItem(channel)` - 创建单个频道 DOM 元素

**renderChannelList 逻辑**:
- 清空频道列表容器
- 按分组对频道进行归类
- 为每个分组创建标题和频道项
- 将所有元素追加到容器

**createChannelItem 逻辑**:
- 创建 div 元素，添加 "channel-item" 类
- 如果有 logo，创建 img 元素
- 创建频道名称 span
- 添加点击事件监听器（暂不实现跳转）

**初始化流程**:
页面加载时调用 getChannels 并渲染

**验证**:
1. 准备测试数据：使用 storage API 保存包含 2 个分组的测试频道（每组 2-3 个频道）
2. 重新加载扩展并打开弹出窗口
3. 确认频道列表正确显示
4. 确认分组标题可见
5. 确认频道按分组正确归类

---

### Step 3.4: 实现弹出窗口 - 搜索功能

**指令**:
在 popup.js 中添加搜索功能：

**必须实现的功能**:
1. 搜索框 input 事件监听
2. `filterChannels(channels, keyword)` - 过滤频道函数

**过滤逻辑**:
- 不区分大小写
- 匹配频道名称
- 匹配分组名称
- 返回匹配的频道数组

**用户体验**:
- 输入即时过滤（无需按回车）
- 清空搜索框时显示所有频道
- 无结果时显示 "未找到相关频道" 提示

**验证**:
1. 导入测试频道数据
2. 输入完整频道名，确认只显示匹配频道
3. 输入部分频道名，确认模糊匹配生效
4. 输入分组名，确认该组所有频道显示
5. 清空搜索框，确认所有频道恢复显示

---

### Step 3.5: 实现弹出窗口 - 播放器跳转

**指令**:
在 popup.js 中实现点击频道打开播放器的功能：

**必须实现的功能**:
修改 createChannelItem 中的点击事件处理

**跳转逻辑**:
- 使用 chrome.tabs.create API
- URL 使用 chrome.runtime.getURL("src/player/player.html?id={channelId}") 生成
- 如果 player.html 不在扩展目录，检查 web_accessible_resources 配置

**错误处理**:
- 用 try-catch 包裹 chrome.tabs API 调用
- 如果 API 不可用，在控制台输出错误信息
- 弹出窗口会自动关闭

**验证**:
1. 重新加载扩展到浏览器
2. 点击任意频道
3. 确认新标签页打开且 URL 包含正确的频道 ID
4. 确认弹出窗口自动关闭

---

### Step 3.6: 实现弹出窗口 - M3U 导入

**指令**:
在 popup.js 中添加 M3U 文件导入功能：

**必须实现的功能**:
1. "导入 M3U" 按钮点击事件
2. 隐藏的文件 input 元素（type="file"，accept=".m3u,.m3u8"）
3. `handleFileSelect(event)` - 文件选择处理函数
4. `deduplicateChannels(newChannels, existingChannels)` - 按 URL 去重函数

**去重逻辑**:
- 依据 url 字段去重
- 如果新导入的频道 URL 已存在，跳过该频道
- 保留未重复的新频道

**文件处理流程**:
- 点击按钮触发 file input 点击
- 使用 FileReader 读取文件内容（readAsText）
- 调用 parseM3U 解析内容
- 调用 getChannels 获取现有频道
- 调用 deduplicateChannels 去重
- 调用 saveChannels 保存结果（会覆盖现有频道）
- 重新渲染频道列表

**用户反馈**:
- 使用 chrome.notifications API 显示提示
- 读取中：显示 "加载中..." 提示
- 成功：显示 "成功导入 X 个频道" 提示
- 失败：显示错误信息

**验证**:
1. 点击导入按钮，确认文件选择器打开
2. 选择包含 5 个频道的 M3U 文件（其中 2 个 URL 与现有频道重复）
3. 确认通知显示成功导入 3 个频道
4. 确认频道列表更新，去重生效
5. 确认现有频道被保留（未被覆盖）

---

### Step 3.7: 实现弹出窗口 - 历史记录

**指令**:
在 popup.js 中添加历史记录功能：

**必须实现的功能**:
1. "历史" 按钮点击事件
2. `showHistory()` - 显示历史记录函数
3. `showChannels()` - 返回频道列表函数

**历史记录显示**:
- 隐藏频道列表，显示历史记录
- 使用相同的渲染逻辑（复用 createChannelItem）
- 添加 "返回" 按钮回到频道列表

**界面切换**:
- 维护当前视图状态（"channels" 或 "history"）
- 切换时清空并重新渲染容器

**验证**:
1. 通过播放器页面播放 3 个不同频道
2. 点击历史按钮，确认显示 3 个频道
3. 确认频道按最近播放时间排序（数组顺序）
4. 点击返回，确认恢复频道列表

---

### Step 3.8: 实现弹出窗口 - 设置按钮

**指令**:
在 popup.js 中添加设置页面跳转功能：

**必须实现的功能**:
设置按钮点击事件处理

**跳转逻辑**:
- 优先使用 chrome.runtime.openOptionsPage() API
- 如果 API 不可用，使用 chrome.tabs.create 打开 options.html

**错误处理**:
- 用 try-catch 包裹 API 调用
- 失败时在控制台输出错误

**验证**:
1. 点击设置按钮
2. 确认在新标签页打开 options.html
3. 确认弹出窗口保持打开状态

---

## Phase 4: 播放器开发

### Step 4.1: 创建播放器 HTML 结构

**指令**:
创建 `src/player/player.html` 文件，构建以下 DOM 结构：

**必须包含的元素**:
1. 顶部栏 `<header>` - 包含返回按钮和频道名称
2. 视频容器 `<div>` - 包含 `<video>` 元素
3. 控制栏 `<div>` - 包含播放/暂停、音量、画中画按钮
4. 频道列表侧边栏 `<aside>` - 默认隐藏

**video 元素属性**:
- id 为 "video-player"
- controls 属性（使用原生控制）
- preload 为 "metadata"

**样式和脚本引入**:
引入 `player.css`
使用 `<script type="module">` 引入：
- HLS.js CDN: `https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js`
- `../shared/constants.js`
- `../shared/storage.js`
- `player.js`

**验证**:
1. 加载扩展到浏览器
2. 通过 popup 打开 player.html?id=test
3. 确认所有元素可见
4. 确认 video 元素显示原生控制条
5. 确认没有 404 错误

---

### Step 4.2: 创建播放器样式

**指令**:
创建 `src/player/player.css` 文件，设置以下样式：

**布局要求**:
1. 全屏布局（100vw × 100vh）
2. 视频容器占据剩余空间（Flexbox）
3. video 元素宽度 100%，高度自适应
4. 控制栏固定在底部

**颜色方案**:
- 背景色：#000000（深色主题）
- 文字色：#ffffff
- 强调色：#4285f4

**控制栏样式**:
1. 固定高度 60px
2. Flexbox 水平居中布局
3. 按钮无背景，白色图标
4. hover 时图标变为强调色

**侧边栏样式**:
1. 固定宽度 300px
2. 从右侧滑入（transform: translateX）
3. 半透明背景（rgba(0,0,0,0.9)）
4. 可滚动内容区

**验证**:
1. 打开播放器页面
2. 确认背景为黑色
3. 确认视频元素占据主要空间
4. 确认控制栏固定在底部
5. 确认侧边栏默认隐藏（在屏幕右侧外）

---

### Step 4.3: 实现播放器 - URL 参数解析

**指令**:
创建 `src/player/player.js` 文件，实现 URL 参数解析功能：

**必须实现的函数**:
1. `getUrlParameter(name)` - 获取 URL 参数值
2. `loadChannel()` - 加载频道数据

**参数解析逻辑**:
- 使用 URLSearchParams API
- 获取 "id" 参数
- 如果没有 id，显示错误信息并返回

**loadChannel 逻辑**:
- 调用 getChannels 获取所有频道
- 根据 id 查找匹配的频道
- 如果找到，更新页面标题并初始化播放器
- 如果未找到，显示 "频道不存在" 错误

**验证**:
1. 打开 player.html?id=test123
2. 确认正确解析 id 参数
3. 使用测试频道数据，确认频道信息正确加载
4. 测试无效 id，确认错误信息显示

---

### Step 4.4: 实现播放器 - HLS.js 集成

**指令**:
在 player.js 中添加 HLS.js 播放功能：

**必须实现的函数**:
1. `initPlayer(channel)` - 初始化播放器
2. `setupHLS(url)` - 配置 HLS.js

**setupHLS 逻辑**:
- 检查 HLS.js 是否支持（Hls.isSupported()）
- 创建 Hls 实例
- 配置错误处理（on error 事件）
- 加载源并播放

**回退方案**:
- 如果 HLS.js 不支持，检查 video 元素原生支持（canPlayType）
- 如果原生支持，直接设置 src
- 否则显示 "您的浏览器不支持 HLS 播放" 错误

**错误处理**:
- 网络错误：显示 "网络错误，正在重试..."
- 解码错误：显示 "视频解码失败"
- 其他错误：显示具体错误信息
- 使用 chrome.notifications API 显示错误

**验证**:
1. 使用有效的 m3u8 URL 测试
2. 确认 HLS.js 正确加载并播放视频
3. 模拟网络错误，确认错误通知显示
4. 测试原生支持的浏览器，确认回退方案生效

---

### Step 4.5: 实现播放器 - 播放历史记录

**指令**:
在 player.js 中添加播放历史功能：

**必须实现的功能**:
播放成功时调用 addHistory

**触发时机**:
- HLS.js MANIFEST_PARSED 事件后
- 或原生 video canplay 事件后

**数据传递**:
传入完整的频道对象（包含所有字段）

**验证**:
1. 播放一个频道
2. 在弹出窗口查看历史记录
3. 确认该频道出现在历史记录顶部
4. 播放 3 个不同频道，确认历史记录按时间排序

---

### Step 4.6: 实现播放器 - 控制按钮

**指令**:
在 player.js 中添加自定义控制按钮功能：

**必须实现的按钮**:
1. 播放/暂停按钮
2. 静音/取消静音按钮
3. 画中画按钮
4. 频道列表切换按钮

**播放/暂停逻辑**:
- 切换 video 元素的播放状态
- 更新按钮图标

**静音逻辑**:
- 切换 video 元素的 muted 属性
- 更新按钮图标

**画中画逻辑**:
- 检查 document.pictureInPictureElement 支持
- 调用 video.requestPictureInPicture()
- 如果已进入，调用 document.exitPictureInPicture()

**频道列表逻辑**:
- 切换侧边栏显示/隐藏
- 添加 CSS class 控制 slide 动画

**验证**:
1. 点击播放/暂停，确认视频状态切换
2. 点击静音，确认视频静音
3. 点击画中画，确认进入画中画模式
4. 点击频道列表，确认侧边栏滑入

---

### Step 4.7: 实现播放器 - 键盘快捷键

**指令**:
在 player.js 中添加键盘快捷键功能：

**必须实现的快捷键**:
1. 空格 - 播放/暂停
2. ESC - 退出画中画或关闭侧边栏
3. 左/右箭头 - 切换到上一个/下一个频道
4. 上/下箭头 - 音量增减

**实现逻辑**:
- 监听 document keydown 事件
- 使用 switch 语句匹配按键
- 阻止默认行为（防止空格滚动页面）
- 调用对应的控制函数

**频道切换逻辑**:
- 从当前频道列表中找到当前频道索引
- 索引加/减 1
- 循环处理（最后一个下一个是第一个）
- 重新加载新频道

**验证**:
1. 按空格键，确认播放/暂停切换
2. 按 ESC，确认画中画退出
3. 按左右箭头，确认频道切换
4. 按上下箭头，确认音量变化

---

### Step 4.8: 实现播放器 - 频道侧边栏

**指令**:
在 player.js 中完善频道侧边栏功能：

**必须实现的功能**:
1. 渲染频道列表到侧边栏
2. 点击频道切换播放
3. 高亮当前播放频道

**渲染逻辑**:
- 创建类似 popup.js 的 createChannelItem 函数
- 渲染所有频道到侧边栏容器
- 当前播放频道添加 "active" 类

**切换逻辑**:
- 点击频道后立即加载新频道
- 不需要关闭侧边栏（方便快速切换）
- 更新 active 类到新频道

**验证**:
1. 打开侧边栏，确认显示所有频道
2. 确认当前播放频道有高亮效果
3. 点击其他频道，确认立即切换播放
4. 确认高亮移到新频道

---

## Phase 5: 设置页面开发

### Step 5.1: 创建设置页面 HTML 结构

**指令**:
创建 `src/options/options.html` 文件，构建以下 DOM 结构：

**必须包含的元素**:
1. 页面标题 `<h1>`
2. 标签页导航 `<nav>` - 包含 "频道管理"、"播放设置"、"关于" 三个标签按钮
3. 内容区域 `<main>` - 包含三个标签页对应的内容区域（id: tab-channels, tab-settings, tab-about）
4. 频道管理页：文件导入按钮、清空按钮、搜索框、频道表格
5. 播放设置页：表单控件（下拉框、复选框、滑块）
6. 关于页：版本信息、说明文字

**样式和脚本引入**:
引入 `options.css`
使用 `<script type="module">` 引入：
- `../shared/constants.js`
- `../shared/storage.js`
- `../shared/m3u-parser.js`
- `options.js`

**验证**:
1. 加载扩展到浏览器
2. 打开设置页面（右键扩展图标 -> 选项，或通过 popup）
3. 确认所有标签可见
4. 确认所有表单元素可见

---

### Step 5.2: 创建设置页面样式

**指令**:
创建 `src/options/options.css` 文件，设置以下样式：

**布局要求**:
1. 最大宽度 900px，居中显示
2. 标签页导航使用 Flexbox 水平布局
3. 内容区域最小高度 400px

**标签页样式**:
1. 激活标签：底部边框 2px 强调色，class="active"
2. 未激活标签：灰色文字，无边框
3. hover 时背景色变为浅灰
4. 内容区域默认隐藏，active 时显示

**表格样式**:
1. 宽度 100%，边框合并
2. 表头：背景色 #f5f5f5，加粗
3. 行：border-bottom 1px
4. hover 行：背景色变化
5. 删除按钮：红色文字，hover 时下划线

**表单样式**:
1. 标签和控件水平排列（Flexbox）
2. 控件宽度固定（下拉框 200px，滑块 150px）
3. 保存按钮：强调色背景，白色文字

**验证**:
1. 打开 options.html
2. 确认布局居中
3. 点击标签页，确认样式切换正确
4. 确认表格样式美观
5. 确认表单控件对齐

---

### Step 5.3: 实现设置页面 - 频道管理

**指令**:
创建 `src/options/options.js` 文件，实现频道管理功能：

**必须实现的功能**:
1. `loadAndRenderChannels()` - 加载并渲染频道表格
2. `createChannelRow(channel)` - 创建频道表格行
3. 导入 M3U 功能（复用 popup 逻辑，包括去重）
4. 删除频道功能
5. 清空所有频道功能

**表格渲染逻辑**:
- 清空表格内容
- 遍历频道列表，为每个频道创建一行
- 行包含：序号、频道名、分组、URL、删除按钮
- URL 列截断过长文本（max-width: 300px，overflow: hidden，text-overflow: ellipsis）

**删除逻辑**:
- 点击删除按钮
- 显示确认对话框（使用 confirm）
- 确认后调用 removeChannel
- 重新渲染表格

**清空逻辑**:
- 点击清空按钮
- 显示确认对话框
- 确认后保存空数组
- 重新渲染表格

**验证**:
1. 导入测试频道，确认表格显示正确
2. 点击删除按钮，确认对话框出现
3. 确认删除后表格更新
4. 点击清空，确认所有频道被删除

---

### Step 5.4: 实现设置页面 - 播放设置

**指令**:
在 options.js 中添加播放设置功能：

**必须实现的功能**:
1. `loadSettings()` - 加载设置到表单
2. `saveSettingsFromForm()` - 从表单保存设置
3. 表单控件事件监听
4. `switchTab()` - 标签页切换函数

**标签页切换逻辑**:
- 维护当前激活标签的状态
- 点击标签时移除所有 active 类，添加到点击的标签
- 隐藏所有内容区域，显示对应的内容区域

**表单控件**:
1. 默认画质：下拉框（auto/720p/1080p）
2. 自动播放：复选框
3. 默认音量：滑块（0-100）

**加载逻辑**:
- 调用 getSettings
- 设置每个表单控件的值
- 更新音量数值显示

**保存逻辑**:
- 收集所有表单控件的值
- 构造设置对象
- 调用 saveSettings
- 使用 chrome.notifications API 显示 "设置已保存" 提示

**即时保存**:
- 控件值改变时自动保存
- 不需要手动点击保存按钮

**验证**:
1. 切换到播放设置标签页
2. 修改画质设置，确认立即保存并显示通知
3. 刷新页面，确认设置保持
4. 调整音量滑块，确认数值显示更新
5. 确认所有设置正确存储

---

### Step 5.5: 实现设置页面 - 搜索和过滤

**指令**:
在 options.js 中添加频道搜索功能：

**必须实现的功能**:
1. 搜索框 input 事件监听
2. 分组过滤下拉框

**搜索逻辑**:
- 过滤频道名称或 URL 包含关键字的频道
- 实时更新表格显示

**分组过滤**:
- 下拉框列出所有分组（从频道列表提取）
- 选择分组后只显示该组频道
- "全部分组" 选项显示所有频道

**组合过滤**:
- 搜索和分组过滤同时生效
- 使用 AND 逻辑（满足两个条件）

**验证**:
1. 输入频道名，确认表格只显示匹配频道
2. 选择分组，确认只显示该组频道
3. 组合使用搜索和分组，确认过滤正确
4. 清空搜索和重置分组，确认显示所有频道

---

### Step 5.6: 实现设置页面 - 关于页面

**指令**:
在 options.js 中实现关于页面内容：

**必须包含的信息**:
1. 扩展名称和版本号（从 manifest.json 读取）
2. 简短描述
3. 技术栈说明（Vanilla JS + HLS.js）
4. 开源许可信息

**实现方式**:
- 使用 chrome.runtime.getManifest() 获取版本信息
- 动态更新 DOM 元素内容

**验证**:
1. 切换到关于标签页
2. 确认显示正确的版本号
3. 确认所有信息完整显示

---

## Phase 6: 后台服务与优化

### Step 6.1: 实现 Service Worker 基础框架

**指令**:
创建 `src/background/service-worker.js` 文件，实现基础功能：

**必须实现的事件监听**:
1. `onInstalled` - 扩展安装/更新事件
2. `onStartup` - 浏览器启动事件

**onInstalled 逻辑**:
- 检查是否首次安装（reason === "install"）
- 如果是首次安装，初始化默认设置（调用 saveSettings）
- 在控制台输出 "Extension installed" 消息

**onStartup 逻辑**:
- 在控制台输出 "Extension started" 消息
- 预留后续功能扩展空间

**验证**:
1. 重新加载扩展
2. 打开 chrome://extensions 页面
3. 点击 "Service Worker" 链接查看日志
4. 确认看到 "Extension installed" 或 "Extension started" 消息

---

### Step 6.2: 实现 Service Worker - 右键菜单

**指令**:
在 service-worker.js 中添加上下文菜单功能：

**必须实现的功能**:
1. 创建右键菜单项
2. 处理菜单点击事件

**菜单配置**:
- 标题："在 IPTV Player 中播放"
- 显示条件：仅当选中文本时
- 使用 chrome.contextMenus API

**点击处理**:
- 获取选中的文本（URL）
- 验证是否为有效的 m3u8 URL
- 创建临时频道对象
- 打开播放器页面并传递频道信息

**URL 验证**:
- 检查是否以 http:// 或 https:// 开头
- 检查是否包含 .m3u8 或 .m3u

**验证**:
1. 在网页上选中一个 m3u8 URL
2. 右键单击，确认看到自定义菜单项
3. 点击菜单项，确认播放器打开
4. 确认视频开始播放

---

### Step 6.3: 实现性能优化 - 虚拟滚动

**指令**:
在 popup.js 和 options.js 中实现虚拟滚动（当频道数 > 100 时）：

**最佳实践方案**:

**数据结构**:
- 频道项固定高度：60px
- 缓冲区大小：上下各 5 项（300px）
- 可见区域高度：容器高度

**必须实现的函数**:
1. `createVirtualScroll(container, channels, renderItem)` - 创建虚拟滚动
2. `updateVisibleItems()` - 更新可见区域的项目
3. `onScroll()` - 滚动事件处理

**createVirtualScroll 参数**:
- container: 滚动容器 DOM 元素
- channels: 完整频道数组
- renderItem: (channel, index) => DOM 元素的回调函数

**实现逻辑**:
- 计算可见区域的起始和结束索引
- 只渲染可见项目加上缓冲区
- 使用 transform: translateY() 定位项目
- 创建占位容器撑开滚动高度

**触发条件**:
- 频道数超过 100 时启用
- 少于 100 时使用普通渲染

**验证**:
1. 导入 200 个频道
2. 打开弹出窗口，确认列表仍然流畅滚动
3. 检查 DOM 元素数量，确认只有可见项（约 15-20 个）被渲染
4. 快速滚动，确认无明显卡顿
5. 确认滚动位置正确

---

### Step 6.4: 实现性能优化 - 图片懒加载

**指令**:
在所有渲染频道列表的地方添加图片懒加载：

**必须实现的功能**:
使用 Intersection Observer API 懒加载频道 logo

**实现逻辑**:
- 初始时 img 元素不设置 src，使用 data-src 属性
- 创建全局 Intersection Observer 实例
- 当图片进入视口时，将 data-src 赋值给 src
- 加载后取消观察
- 设置 rootMargin: "50px" 提前加载

**占位符**:
- 加载前：灰色背景（#e0e0e0）
- 加载中：显示加载动画（可选）
- 加载失败：显示默认图标（简单 SVG 或 emoji）

**错误处理**:
- img onerror 事件：设置默认图标
- 确保不会重复加载

**验证**:
1. 导入包含 logo 的频道列表（至少 20 个频道）
2. 打开弹出窗口，确认初始时 logo 未加载
3. 滚动列表，确认 logo 逐个加载
4. 打开浏览器网络面板，确认只有可见图片被请求
5. 测试加载失败的 URL，确认显示默认图标

---

### Step 6.5: 实现错误处理和日志

**指令**:
在所有模块中添加统一的错误处理和日志功能：

**必须实现的函数**:
在 shared/storage.js 中添加：
1. `logError(message, error)` - 记录错误到 console 和 storage
2. `showUserError(message)` - 使用 chrome.notifications 显示错误

**错误日志**:
- 保存最近 100 条错误到 chrome.storage.local
- 存储键：error_logs
- 每条错误包含：timestamp、message、stack、url

**用户提示**:
- 使用 chrome.notifications API
- type: "basic"
- iconUrl: 图标路径
- title: "IPTV Player 错误"
- message: 用户友好的错误信息
- 不直接显示技术错误堆栈

**集成方式**:
- 在所有 try-catch 块中调用 logError
- 在需要用户反馈时调用 showUserError

**验证**:
1. 触发一个错误（如导入无效 M3U 文件）
2. 确认看到通知提示
3. 检查 storage，确认错误被记录
4. 确认控制台有详细错误日志
5. 检查错误日志不超过 100 条

---

## Phase 7: 测试与发布准备

### Step 7.1: 创建图标资源

**指令**:
创建三个尺寸的图标文件：

**文件**:
1. `icons/icon16.png` - 16×16 像素
2. `icons/icon48.png` - 48×48 像素
3. `icons/icon128.png` - 128×128 像素

**设计要求**:
- 使用简洁的播放器或电视图标
- 主色调使用 #4285f4
- 背景透明或白色
- 可接受简单的纯色方块作为临时方案

**实现方式**:
- 使用 Canvas API 绘制纯色方块（蓝色背景，白色播放符号）
- 或使用在线工具（如 Favicon.io）生成
- 保存为 PNG 格式

**验证**:
1. 确认三个文件存在
2. 确认文件尺寸正确
3. 重新加载扩展，确认工具栏图标显示
4. 确认图标清晰可辨

---

### Step 7.2: 端到端功能测试

**指令**:
执行完整的功能测试清单：

**测试用例**:

1. **M3U 导入测试**
   - 导入包含 10 个频道的 M3U 文件
   - 验证所有频道正确解析
   - 验证分组正确识别
   - 测试去重功能（再次导入，重复 URL 应被跳过）

2. **播放测试**
   - 播放一个频道
   - 验证视频正常播放
   - 验证控制按钮工作正常
   - 验证快捷键工作正常

3. **历史记录测试**
   - 播放 5 个不同频道
   - 验证历史记录按时间排序（数组顺序）
   - 验证重复播放只保留最新记录

4. **设置持久化测试**
   - 修改设置
   - 刷新页面
   - 验证设置保持

5. **搜索测试**
   - 测试频道名搜索
   - 测试分组搜索
   - 测试部分匹配

**验证标准**:
- 所有测试用例通过
- 无控制台错误
- 无明显性能问题

---

### Step 7.3: 浏览器兼容性测试

**指令**:
在 Chrome 和 Edge 浏览器中测试：

**测试版本**:
- Chrome 最新稳定版
- Chrome 最新测试版（可选）
- Edge 最新稳定版

**测试内容**:
1. 扩展安装
2. 所有核心功能
3. UI 显示效果
4. 性能表现

**验证标准**:
- 两个浏览器功能一致
- 无浏览器特定问题

---

### Step 7.4: 安全与隐私审查

**指令**:
审查扩展的安全和隐私方面：

**检查项**:
1. 权限最小化原则
   - 确认只请求必需的权限（storage、*://*/*）
   - 确认 host_permissions 范围合理

2. 内容安全策略
   - 确认 manifest.json 中配置了 CSP
   - 确认没有内联脚本
   - 确认只有 'self' 源

3. 数据处理
   - 确认用户数据只存储在本地（chrome.storage.local）
   - 确认没有数据发送到外部服务器
   - 确认 HLS.js 从 CDN 加载，不涉及用户数据

4. 第三方库
   - 确认 HLS.js 来自可信 CDN（jsdelivr.net）
   - 确认没有其他第三方库

**验证标准**:
- 所有权限都有明确用途
- 用户数据完全本地化
- 无安全漏洞

---

### Step 7.5: 性能基准测试

**指令**:
进行性能基准测试：

**测试场景**:
1. 大量频道测试（导入 1000 个频道）
2. 频繁切换测试（快速切换 50 次）
3. 长时间播放测试（连续播放 1 小时）

**性能指标**:
- 列表滚动帧率 > 30fps
- 频道切换响应时间 < 500ms
- 内存增长 < 50MB/小时
- CPU 占用 < 20%

**验证标准**:
- 所有指标在合理范围内
- 无明显内存泄漏

---

### Step 7.6: 用户文档编写

**指令**:
创建用户使用文档 `README.md`：

**必须包含的内容**:
1. 功能简介
2. 安装方法
3. 基本使用教程
4. M3U 文件格式说明
5. 常见问题解答
6. 键盘快捷键列表

**格式要求**:
- 使用 Markdown 格式
- 包含截图（可选）
- 清晰的章节划分

**验证标准**:
- 新用户能够根据文档完成安装和基本使用
- 文档覆盖所有核心功能

---

### Step 7.7: 打包与发布准备

**指令**:
准备发布材料：

**必须完成的任务**:
1. 创建 ZIP 包（排除不必要的文件）
2. 准备商店截图（1280×800 或 640×400）
3. 编写商店描述（简短和详细版本）
4. 准备推广图（可选）

**ZIP 包内容**:
- manifest.json
- src/ 目录（所有源代码）
- icons/ 目录
- README.md

**排除文件**:
- .git 目录
- 测试文件
- 设计文档（app-design-document.md、implementation-plan.md）
- memory-bank/ 目录

**验证标准**:
- ZIP 包大小 < 5MB
- 解压后扩展能正常加载
- 所有商店素材准备完毕

---

## 附录

### 测试数据样本

使用以下 M3U 内容进行测试：

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="test1" tvg-name="Test Channel 1" tvg-logo="http://example.com/logo1.png" group-title="测试组",测试频道1
https://test.com/stream1.m3u8
#EXTINF:-1 tvg-id="test2" tvg-name="Test Channel 2" group-title="测试组",测试频道2
https://test.com/stream2.m3u8
```

### 验证清单模板

每步完成后打钩：
- [ ] 功能实现完成
- [ ] 功能测试通过
- [ ] 无控制台错误
- [ ] 代码风格一致
- [ ] 无性能问题

### 技术决策总结

| 决策点 | 选择方案 |
|--------|---------|
| 模块语法 | ES6 modules (export const/function) |
| HTML 脚本 | `<script type="module">` |
| 错误处理 | try-catch 包裹 Chrome API 调用 |
| 去重依据 | URL 字段 |
| 导入行为 | 覆盖现有频道（带去重） |
| 播放器 URL | chrome.runtime.getURL() |
| HLS.js | CDN 引用（v1.4.12） |
| 标签切换 | JavaScript 维护状态 |
| 虚拟滚动 | 固定高度 60px，缓冲区 5 项 |
| 测试方式 | 加载扩展后验证 |
| 错误提示 | chrome.notifications API |
| 历史排序 | 依赖数组顺序 |
| 图标 | 纯色方块可接受 |
| CSP | Step 1.2 配置 |

---

**实施计划版本**: 2.0
**最后更新**: 2026-02-25
**预计总步骤数**: 48
**预计开发时间**: 依据开发者经验而定
