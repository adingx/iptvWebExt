/**
 * IPTV Player - 存储管理模块
 *
 * 此模块封装 chrome.storage API，提供数据持久化功能
 * 使用 ES6 export async function 语法导出
 */

import { STORAGE_KEYS, MAX_HISTORY_COUNT, DEFAULT_SETTINGS } from './constants.js';

/**
 * 保存频道列表到 chrome.storage.local
 * @param {Array<Channel>} channels - 频道数组
 * @returns {Promise<void>}
 */
export async function saveChannels(channels) {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.CHANNELS]: channels
    });
  } catch (error) {
    throw new Error(`Failed to save channels: ${error.message}`);
  }
}

/**
 * 从 chrome.storage.local 读取频道列表
 * @returns {Promise<Array<Channel>>} 频道数组
 */
export async function getChannels() {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    const result = await chrome.storage.local.get(STORAGE_KEYS.CHANNELS);
    return result[STORAGE_KEYS.CHANNELS] || [];
  } catch (error) {
    throw new Error(`Failed to get channels: ${error.message}`);
  }
}

/**
 * 添加单个频道到现有列表
 * @param {Channel} channel - 频道对象
 * @returns {Promise<void>}
 */
export async function addChannel(channel) {
  try {
    const channels = await getChannels();
    channels.push(channel);
    await saveChannels(channels);
  } catch (error) {
    throw new Error(`Failed to add channel: ${error.message}`);
  }
}

/**
 * 根据 id 删除频道
 * @param {string} channelId - 频道 ID
 * @returns {Promise<void>}
 */
export async function removeChannel(channelId) {
  try {
    const channels = await getChannels();
    const filteredChannels = channels.filter(ch => ch.id !== channelId);
    await saveChannels(filteredChannels);
  } catch (error) {
    throw new Error(`Failed to remove channel: ${error.message}`);
  }
}

/**
 * 更新指定频道的部分字段
 * @param {string} channelId - 频道 ID
 * @param {Partial<Channel>} updates - 要更新的字段
 * @returns {Promise<void>}
 */
export async function updateChannel(channelId, updates) {
  try {
    const channels = await getChannels();
    const channelIndex = channels.findIndex(ch => ch.id === channelId);

    if (channelIndex === -1) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // 使用 Object.assign 合并更新
    channels[channelIndex] = Object.assign({}, channels[channelIndex], updates);
    await saveChannels(channels);
  } catch (error) {
    throw new Error(`Failed to update channel: ${error.message}`);
  }
}

/**
 * 添加频道到历史记录
 * @param {Channel} channel - 频道对象
 * @returns {Promise<void>}
 */
export async function addHistory(channel) {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    let history = result[STORAGE_KEYS.HISTORY] || [];

    // 去重：如果频道已存在（按 url 匹配），先移除旧记录
    history = history.filter(ch => ch.url !== channel.url);

    // 将新频道添加到数组开头
    history.unshift(channel);

    // 如果超过最大数量，移除末尾元素
    if (history.length > MAX_HISTORY_COUNT) {
      history = history.slice(0, MAX_HISTORY_COUNT);
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: history
    });
  } catch (error) {
    throw new Error(`Failed to add history: ${error.message}`);
  }
}

/**
 * 获取历史记录列表
 * @returns {Promise<Array<Channel>>} 历史记录数组
 */
export async function getHistory() {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  } catch (error) {
    throw new Error(`Failed to get history: ${error.message}`);
  }
}

/**
 * 清空历史记录
 * @returns {Promise<void>}
 */
export async function clearHistory() {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: []
    });
  } catch (error) {
    throw new Error(`Failed to clear history: ${error.message}`);
  }
}

/**
 * 保存用户设置
 * @param {Settings} settings - 设置对象
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: settings
    });
  } catch (error) {
    throw new Error(`Failed to save settings: ${error.message}`);
  }
}

/**
 * 获取用户设置
 * @returns {Promise<Settings>} 设置对象
 */
export async function getSettings() {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Storage API not available');
    }

    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const savedSettings = result[STORAGE_KEYS.SETTINGS];

    // 如果不存在或为空，返回 DEFAULT_SETTINGS 的副本
    if (!savedSettings || Object.keys(savedSettings).length === 0) {
      return { ...DEFAULT_SETTINGS };
    }

    // 与 DEFAULT_SETTINGS 合并，确保所有字段存在
    return { ...DEFAULT_SETTINGS, ...savedSettings };
  } catch (error) {
    throw new Error(`Failed to get settings: ${error.message}`);
  }
}
