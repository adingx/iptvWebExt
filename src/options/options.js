/**
 * IPTV Player - 设置页面逻辑
 */

import { getChannels, saveChannels, removeChannel, getSettings, saveSettings } from '../shared/storage.js';
import { parseM3U } from '../shared/m3u-parser.js';

// 全局状态
let allChannels = [];
let currentTab = 'tab-channels';

/**
 * 切换标签页
 * @param {string} tabId - 标签页 ID
 */
function switchTab(tabId) {
  // 移除所有 active 类
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // 添加 active 类到选中的标签
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');

  currentTab = tabId;
}

/**
 * 渲染频道表格
 * @param {Array<Channel>} channels - 频道数组
 */
function renderChannelsTable(channels) {
  const tbody = document.querySelector('#channels-table tbody');
  tbody.innerHTML = '';

  if (channels.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">暂无频道</td></tr>';
    return;
  }

  channels.forEach((channel, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(channel.name)}</td>
      <td>${escapeHtml(channel.group || '未分组')}</td>
      <td class="url-cell" title="${escapeHtml(channel.url)}">${escapeHtml(channel.url)}</td>
      <td><button class="delete-btn" data-id="${channel.id}">删除</button></td>
    `;

    tbody.appendChild(tr);
  });

  // 更新频道数量
  document.getElementById('channel-count').textContent = `总计: ${channels.length} 个频道`;

  // 绑定删除按钮事件
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const channelId = btn.dataset.id;
      if (confirm('确定要删除这个频道吗？')) {
        try {
          await removeChannel(channelId);
          await loadAndRenderChannels();
        } catch (error) {
          console.error('删除频道失败:', error);
          alert('删除失败');
        }
      }
    });
  });
}

/**
 * 转义 HTML
 * @param {string} text - 文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 加载并渲染频道列表
 */
async function loadAndRenderChannels() {
  try {
    allChannels = await getChannels();
    renderChannelsTable(allChannels);
    updateGroupFilter();
  } catch (error) {
    console.error('加载频道失败:', error);
  }
}

/**
 * 更新分组筛选下拉框
 */
function updateGroupFilter() {
  const groups = [...new Set(allChannels.map(ch => ch.group || '未分组'))].sort();
  const select = document.getElementById('group-filter');
  const currentValue = select.value;

  select.innerHTML = '<option value="">全部分组</option>';
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    select.appendChild(option);
  });

  select.value = currentValue;
}

/**
 * 过滤频道
 */
function filterChannels() {
  const searchKeyword = document.getElementById('channel-search').value.toLowerCase();
  const groupFilter = document.getElementById('group-filter').value;

  let filtered = allChannels;

  // 搜索过滤
  if (searchKeyword) {
    filtered = filtered.filter(ch =>
      ch.name.toLowerCase().includes(searchKeyword) ||
      ch.url.toLowerCase().includes(searchKeyword)
    );
  }

  // 分组过滤
  if (groupFilter) {
    filtered = filtered.filter(ch => (ch.group || '未分组') === groupFilter);
  }

  renderChannelsTable(filtered);
}

/**
 * 加载播放设置
 */
async function loadSettings() {
  try {
    const settings = await getSettings();

    document.getElementById('default-quality').value = settings.defaultQuality || 'auto';
    document.getElementById('auto-play').checked = settings.autoPlay !== false;
    document.getElementById('default-volume').value = settings.volume || 80;
    document.getElementById('volume-value').textContent = settings.volume || 80;
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

/**
 * 保存播放设置
 */
async function saveSettingsFromForm() {
  try {
    const settings = {
      defaultQuality: document.getElementById('default-quality').value,
      autoPlay: document.getElementById('auto-play').checked,
      volume: parseInt(document.getElementById('default-volume').value, 10)
    };

    await saveSettings(settings);
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

/**
 * 显示关于信息
 */
function showAbout() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('extension-version').textContent = manifest.version;
}

/**
 * 初始化
 */
async function init() {
  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);

      // 切换到频道管理时加载频道
      if (tabId === 'tab-channels') {
        loadAndRenderChannels();
      }
      // 切换到关于时显示版本
      if (tabId === 'tab-about') {
        showAbout();
      }
    });
  });

  // 频道管理 - 导入 M3U
  const importBtn = document.getElementById('import-options-btn');
  const fileInput = document.getElementById('file-input-options');

  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        const parsedChannels = parseM3U(content);

        // 合并频道（不覆盖现有频道）
        const existingChannels = await getChannels();
        const existingUrls = new Set(existingChannels.map(ch => ch.url));
        const newChannels = parsedChannels.filter(ch => !existingUrls.has(ch.url));

        const mergedChannels = [...existingChannels, ...newChannels];
        await saveChannels(mergedChannels);

        alert(`成功导入 ${newChannels.length} 个频道`);
        await loadAndRenderChannels();
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败');
    }

    fileInput.value = '';
  });

  // 频道管理 - 清空所有频道
  document.getElementById('clear-channels-btn').addEventListener('click', async () => {
    if (confirm('确定要清空所有频道吗？此操作不可恢复。')) {
      try {
        await saveChannels([]);
        await loadAndRenderChannels();
        alert('已清空所有频道');
      } catch (error) {
        console.error('清空失败:', error);
        alert('清空失败');
      }
    }
  });

  // 搜索和过滤
  document.getElementById('channel-search').addEventListener('input', filterChannels);
  document.getElementById('group-filter').addEventListener('change', filterChannels);

  // 播放设置 - 实时保存
  document.getElementById('default-quality').addEventListener('change', saveSettingsFromForm);
  document.getElementById('auto-play').addEventListener('change', saveSettingsFromForm);
  document.getElementById('default-volume').addEventListener('input', (e) => {
    document.getElementById('volume-value').textContent = e.target.value;
    saveSettingsFromForm();
  });

  // 初始加载
  await loadAndRenderChannels();
  await loadSettings();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
