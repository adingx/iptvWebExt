/**
 * IPTV Player - 全局常量定义
 *
 * 此文件定义了整个应用使用的常量
 * 使用 ES6 export const 语法导出
 */

// chrome.storage.local 的存储键名
export const STORAGE_KEYS = {
  CHANNELS: 'channels',    // 频道列表
  HISTORY: 'history',      // 播放历史
  SETTINGS: 'settings',    // 用户设置
  ERROR_LOGS: 'error_logs' // 错误日志
};

// 默认用户设置
export const DEFAULT_SETTINGS = {
  defaultQuality: 'auto',  // 默认画质：auto/720p/1080p
  autoPlay: true,          // 自动播放
  volume: 80               // 默认音量 (0-100)
};

// 历史记录最大数量
export const MAX_HISTORY_COUNT = 50;

// 虚拟滚动阈值（频道数超过此值时启用虚拟滚动）
export const CHANNELS_PER_PAGE = 100;
