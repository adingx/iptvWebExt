/**
 * IPTV Player - 弹出窗口逻辑
 */

import { getChannels, saveChannels, getHistory } from '../shared/storage.js';
import { parseM3U } from '../shared/m3u-parser.js';

// 存储所有频道，用于搜索过滤
let allChannels = [];
// 当前视图状态
let currentView = 'channels'; // 'channels' or 'history'

// 存储所有频道，用于搜索过滤
let allChannels = [];

/**
 * 渲染完整频道列表
 * @param {Array<Channel>} channels - 频道数组
 */
function renderChannelList(channels) {
  const channelList = document.getElementById('channel-list');
  channelList.innerHTML = '';

  if (!channels || channels.length === 0) {
    channelList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无频道<br>请导入 M3U 文件</div>';
    return;
  }

  // 按分组归类频道
  const grouped = {};
  channels.forEach(channel => {
    const group = channel.group || '未分组';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(channel);
  });

  // 为每个分组创建标题和频道项
  Object.keys(grouped).sort().forEach(groupName => {
    // 创建分组标题
    const groupTitle = document.createElement('div');
    groupTitle.className = 'group-title';
    groupTitle.textContent = groupName;
    channelList.appendChild(groupTitle);

    // 创建该分组的频道
    grouped[groupName].forEach(channel => {
      channelList.appendChild(createChannelItem(channel));
    });
  });
}

/**
 * 创建单个频道 DOM 元素
 * @param {Channel} channel - 频道对象
 * @returns {HTMLElement}
 */
function createChannelItem(channel) {
  const item = document.createElement('div');
  item.className = 'channel-item';
  item.dataset.channelId = channel.id;

  // 如果有 logo，创建图片元素
  if (channel.logo) {
    const img = document.createElement('img');
    img.src = channel.logo;
    img.alt = channel.name;
    img.onerror = function() {
      this.style.display = 'none';
    };
    item.appendChild(img);
  }

  // 创建频道名称
  const nameSpan = document.createElement('span');
  nameSpan.className = 'channel-name';
  nameSpan.textContent = channel.name;
  item.appendChild(nameSpan);

  // 点击事件：打开播放器
  item.addEventListener('click', async () => {
    try {
      const playerUrl = chrome.runtime.getURL(`src/player/player.html?id=${encodeURIComponent(channel.id)}`);
      await chrome.tabs.create({ url: playerUrl });
      // 弹出窗口会自动关闭
    } catch (error) {
      console.error('打开播放器失败:', error);
    }
  });

  return item;
}

/**
 * 去重频道列表（按 URL）
 * @param {Array<Channel>} newChannels - 新导入的频道
 * @param {Array<Channel>} existingChannels - 现有频道
 * @returns {Array<Channel>} 去重后的频道
 */
function deduplicateChannels(newChannels, existingChannels) {
  const existingUrls = new Set(existingChannels.map(ch => ch.url));
  return newChannels.filter(ch => !existingUrls.has(ch.url));
}

/**
 * 显示通知
 * @param {string} message - 通知内容
 */
function showNotification(message) {
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #323232;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * 过滤频道
 * @param {Array<Channel>} channels - 频道数组
 * @param {string} keyword - 搜索关键字
 * @returns {Array<Channel>} 过滤后的频道数组
 */
function filterChannels(channels, keyword) {
  if (!keyword || keyword.trim() === '') {
    return channels;
  }

  const lowerKeyword = keyword.toLowerCase().trim();

  return channels.filter(channel => {
    const nameMatch = channel.name && channel.name.toLowerCase().includes(lowerKeyword);
    const groupMatch = channel.group && channel.group.toLowerCase().includes(lowerKeyword);
    return nameMatch || groupMatch;
  });
}

// 初始化：页面加载时获取并渲染频道列表
document.addEventListener('DOMContentLoaded', async () => {
  try {
    allChannels = await getChannels();
    renderChannelList(allChannels);

    // 搜索框事件监听
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      const keyword = e.target.value;
      const filtered = filterChannels(allChannels, keyword);

      if (filtered.length === 0) {
        const channelList = document.getElementById('channel-list');
        channelList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">未找到相关频道</div>';
      } else {
        renderChannelList(filtered);
      }
    });

    // 导入 M3U 按钮
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input');

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showNotification('加载中...');

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const content = event.target.result;
            const parsedChannels = parseM3U(content);
            const existingChannels = await getChannels();
            const newChannels = deduplicateChannels(parsedChannels, existingChannels);

            // 合并频道
            const mergedChannels = [...existingChannels, ...newChannels];
            await saveChannels(mergedChannels);

            // 更新全局频道列表
            allChannels = mergedChannels;
            renderChannelList(allChannels);

            // 清空搜索框
            searchInput.value = '';

            showNotification(`成功导入 ${newChannels.length} 个频道`);
          } catch (error) {
            console.error('解析 M3U 失败:', error);
            showNotification('导入失败：' + error.message);
          }
        };

        reader.onerror = () => {
          showNotification('读取文件失败');
        };

        reader.readAsText(file);
      } catch (error) {
        console.error('导入失败:', error);
        showNotification('导入失败');
      }

      // 重置 file input，允许重复选择同一文件
      fileInput.value = '';
    });

    // 历史记录按钮
    const historyBtn = document.getElementById('history-btn');
    historyBtn.addEventListener('click', async () => {
      try {
        const history = await getHistory();
        renderChannelList(history);
        currentView = 'history';
        historyBtn.textContent = '📋 频道列表';
      } catch (error) {
        console.error('加载历史记录失败:', error);
        showNotification('加载历史记录失败');
      }
    });

    // 返回频道列表（当点击历史按钮时切换）
    historyBtn.addEventListener('click', async () => {
      if (currentView === 'history') {
        renderChannelList(allChannels);
        currentView = 'channels';
        historyBtn.textContent = '🕒 历史';
      }
    });

    // 设置按钮
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', async () => {
      try {
        await chrome.runtime.openOptionsPage();
      } catch (error) {
        // 如果 openOptionsPage 不可用，使用 tabs.create
        const optionsUrl = chrome.runtime.getURL('src/options/options.html');
        await chrome.tabs.create({ url: optionsUrl });
      }
    });
  } catch (error) {
    console.error('加载频道失败:', error);
  }
});
