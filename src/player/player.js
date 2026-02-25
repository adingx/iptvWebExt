/**
 * IPTV Player - 播放器逻辑
 */

import { getChannels, addHistory } from '../shared/storage.js';

// 全局状态
let currentChannel = null;
let allChannels = [];
let hls = null;

/**
 * 获取 URL 参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * 加载频道数据
 */
async function loadChannel() {
  const channelId = getUrlParameter('id');

  if (!channelId) {
    document.getElementById('channel-title').textContent = '频道不存在';
    return;
  }

  try {
    allChannels = await getChannels();
    currentChannel = allChannels.find(ch => ch.id === channelId);

    if (!currentChannel) {
      document.getElementById('channel-title').textContent = '频道不存在';
      return;
    }

    // 更新页面标题
    document.getElementById('channel-title').textContent = currentChannel.name;
    document.title = `${currentChannel.name} - IPTV Player`;

    // 初始化播放器
    initPlayer(currentChannel);
  } catch (error) {
    console.error('加载频道失败:', error);
    document.getElementById('channel-title').textContent = '加载失败';
  }
}

/**
 * 初始化播放器
 * @param {Channel} channel - 频道对象
 */
function initPlayer(channel) {
  const video = document.getElementById('video-player');
  const url = channel.url;

  // 检查是否支持 HLS.js
  if (Hls.isSupported()) {
    setupHLS(url);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // 原生支持 HLS (Safari)
    video.src = url;
    setupVideoEvents(video);
  } else {
    // 不支持 HLS
    document.getElementById('channel-title').textContent = '您的浏览器不支持 HLS 播放';
  }
}

/**
 * 配置 HLS.js
 * @param {string} url - 流地址
 */
function setupHLS(url) {
  const video = document.getElementById('video-player');

  hls = new Hls({
    debug: false,
    enableWorker: true,
  });

  hls.loadSource(url);
  hls.attachMedia(video);

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    console.log('HLS manifest parsed, playing...');
    setupVideoEvents(video);
  });

  hls.on(Hls.Events.ERROR, (event, data) => {
    console.error('HLS error:', data);
    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          console.log('网络错误，尝试恢复...');
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          console.log('媒体错误，尝试恢复...');
          hls.recoverMediaError();
          break;
        default:
          console.error('无法恢复的错误');
          break;
      }
    }
  });
}

/**
 * 设置视频事件
 * @param {HTMLVideoElement} video - 视频元素
 */
function setupVideoEvents(video) {
  // 播放成功时添加到历史记录
  const onCanPlay = () => {
    addHistory(currentChannel);
    video.removeEventListener('canplay', onCanPlay);
    video.removeEventListener('playing', onCanPlay);
  };

  video.addEventListener('canplay', onCanPlay);
  video.addEventListener('playing', onCanPlay);

  // 更新播放/暂停按钮
  video.addEventListener('play', () => {
    document.getElementById('play-pause-btn').textContent = '⏸️';
  });

  video.addEventListener('pause', () => {
    document.getElementById('play-pause-btn').textContent = '▶️';
  });

  // 更新静音按钮
  video.addEventListener('volumechange', () => {
    document.getElementById('mute-btn').textContent = video.muted ? '🔇' : '🔊';
  });
}

/**
 * 渲染频道侧边栏
 */
function renderSidebarChannels() {
  const container = document.getElementById('sidebar-channel-list');
  container.innerHTML = '';

  allChannels.forEach(channel => {
    const item = document.createElement('div');
    item.className = 'sidebar-channel-item';
    if (currentChannel && channel.id === currentChannel.id) {
      item.classList.add('active');
    }

    if (channel.logo) {
      const img = document.createElement('img');
      img.src = channel.logo;
      img.alt = channel.name;
      img.onerror = function() { this.style.display = 'none'; };
      item.appendChild(img);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'channel-name';
    nameSpan.textContent = channel.name;
    item.appendChild(nameSpan);

    item.addEventListener('click', () => {
      loadChannelById(channel.id);
    });

    container.appendChild(item);
  });
}

/**
 * 根据 ID 加载频道
 * @param {string} channelId - 频道 ID
 */
function loadChannelById(channelId) {
  const channel = allChannels.find(ch => ch.id === channelId);
  if (channel) {
    currentChannel = channel;
    document.getElementById('channel-title').textContent = channel.name;
    document.title = `${channel.name} - IPTV Player`;
    initPlayer(channel);
    renderSidebarChannels();
  }
}

/**
 * 切换到上一个/下一个频道
 * @param {number} direction - 1 为下一个，-1 为上一个
 */
function switchChannel(direction) {
  if (!currentChannel || allChannels.length === 0) return;

  const currentIndex = allChannels.findIndex(ch => ch.id === currentChannel.id);
  if (currentIndex === -1) return;

  let newIndex = currentIndex + direction;

  // 循环处理
  if (newIndex >= allChannels.length) {
    newIndex = 0;
  } else if (newIndex < 0) {
    newIndex = allChannels.length - 1;
  }

  loadChannelById(allChannels[newIndex].id);
}

/**
 * 设置控制按钮
 */
function setupControls() {
  const video = document.getElementById('video-player');

  // 播放/暂停
  document.getElementById('play-pause-btn').addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  // 静音/取消静音
  document.getElementById('mute-btn').addEventListener('click', () => {
    video.muted = !video.muted;
  });

  // 画中画
  document.getElementById('pip-btn').addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('画中画错误:', error);
    }
  });

  // 频道列表侧边栏
  const sidebar = document.getElementById('channels-sidebar');
  document.getElementById('channels-btn').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
      renderSidebarChannels();
    }
  });

  document.getElementById('close-sidebar-btn').addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  // 返回按钮
  document.getElementById('back-btn').addEventListener('click', () => {
    window.close();
  });

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;
      case 'Escape':
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        }
        if (sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
        break;
      case 'ArrowLeft':
        switchChannel(-1);
        break;
      case 'ArrowRight':
        switchChannel(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;
    }
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadChannel();
  setupControls();
});
