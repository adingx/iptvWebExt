/**
 * IPTV Player - Service Worker
 *
 * 后台服务工作脚本
 */

import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants.js';

/**
 * 扩展安装/更新事件
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');

    // 初始化默认设置
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      if (!result[STORAGE_KEYS.SETTINGS]) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
        });
        console.log('Default settings initialized');
      }
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

/**
 * 浏览器启动事件
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

/**
 * 创建右键菜单
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'playInIptvPlayer',
    title: '在 IPTV Player 中播放',
    contexts: ['selection']
  });
});

/**
 * 处理右键菜单点击
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'playInIptvPlayer') {
    const selectedText = info.selectionText;

    // 验证是否为有效的 m3u8 URL
    if (isValidM3U8Url(selectedText)) {
      // 创建临时频道对象
      const tempChannel = {
        id: 'temp_' + Date.now(),
        name: selectedText.split('/').pop().split('?')[0] || '临时频道',
        url: selectedText,
        group: '临时',
        logo: '',
        tvgId: '',
        tvgName: ''
      };

      // 保存临时频道到存储
      const { channels = [] } = await chrome.storage.local.get(STORAGE_KEYS.CHANNELS);
      const existingUrls = new Set(channels.map(ch => ch.url));

      if (!existingUrls.has(selectedText)) {
        channels.push(tempChannel);
        await chrome.storage.local.set({ [STORAGE_KEYS.CHANNELS]: channels });
      }

      // 打开播放器
      const playerUrl = chrome.runtime.getURL(`src/player/player.html?id=${encodeURIComponent(tempChannel.id)}`);
      await chrome.tabs.create({ url: playerUrl });
    } else {
      // 显示错误通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'IPTV Player',
        message: '无效的 m3u8 URL'
      });
    }
  }
});

/**
 * 验证是否为有效的 m3u8 URL
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
function isValidM3U8Url(url) {
  if (!url || typeof url !== 'string') return false;

  const trimmedUrl = url.trim();

  // 检查是否以 http:// 或 https:// 开头
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return false;
  }

  // 检查是否包含 .m3u8 或 .m3u
  return trimmedUrl.includes('.m3u8') || trimmedUrl.includes('.m3u');
}
