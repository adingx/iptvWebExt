/**
 * IPTV Player - M3U 文件解析器
 *
 * 此模块负责解析 M3U 播放列表文件
 * 使用 ES6 export function 语法导出
 */

/**
 * 解析 M3U 文件内容
 * @param {string} content - M3U 文件内容
 * @returns {Array<Channel>} 频道列表
 *
 * Channel 数据结构:
 * {
 *   id: string,           // 唯一标识符（基于 URL 生成）
 *   name: string,         // 频道名称
 *   url: string,          // 流地址
 *   group: string,        // 分组名称
 *   logo: string,         // 台标 URL
 *   tvgId?: string,       // EPG ID
 *   tvgName?: string      // EPG 名称
 * }
 */
export function parseM3U(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const channels = [];
  const lines = content.split('\n');

  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) {
      continue;
    }

    // 跳过注释行（非 #EXTINF 开头的 # 开头行）
    if (line.startsWith('#') && !line.startsWith('#EXTINF')) {
      continue;
    }

    // 识别 #EXTINF 行
    if (line.startsWith('#EXTINF')) {
      // 如果有未处理的频道，先保存
      if (currentChannel && currentChannel.url) {
        channels.push(currentChannel);
      }

      // 解析 #EXTINF 行
      // 格式: #EXTINF:-1 tvg-id="xxx" tvg-name="xxx" tvg-logo="xxx" group-title="xxx",频道名称
      currentChannel = {
        id: '',
        name: '',
        url: '',
        group: '未分组',
        logo: '',
        tvgId: '',
        tvgName: ''
      };

      // 提取频道名称（逗号后的内容）
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentChannel.name = line.substring(commaIndex + 1).trim();
      } else {
        currentChannel.name = '未知频道';
      }

      // 提取属性（逗号前的部分）
      const extinfPart = line.substring(0, commaIndex !== -1 ? commaIndex : line.length);

      // 使用正则表达式提取属性
      // tvg-id="xxx"
      const tvgIdMatch = extinfPart.match(/tvg-id="([^"]*)"/i);
      if (tvgIdMatch) {
        currentChannel.tvgId = tvgIdMatch[1];
      }

      // tvg-name="xxx"
      const tvgNameMatch = extinfPart.match(/tvg-name="([^"]*)"/i);
      if (tvgNameMatch) {
        currentChannel.tvgName = tvgNameMatch[1];
      }

      // tvg-logo="xxx"
      const tvgLogoMatch = extinfPart.match(/tvg-logo="([^"]*)"/i);
      if (tvgLogoMatch) {
        currentChannel.logo = tvgLogoMatch[1];
      }

      // group-title="xxx"
      const groupTitleMatch = extinfPart.match(/group-title="([^"]*)"/i);
      if (groupTitleMatch) {
        currentChannel.group = groupTitleMatch[1];
      }

      continue;
    }

    // 如果不是 # 开头，视为 URL 行
    if (currentChannel && !line.startsWith('#')) {
      currentChannel.url = line;
      // 使用 URL 生成唯一 ID
      currentChannel.id = generateIdFromUrl(line);
    }
  }

  // 保存最后一个频道
  if (currentChannel && currentChannel.url) {
    channels.push(currentChannel);
  }

  return channels;
}

/**
 * 从 URL 生成唯一 ID
 * @param {string} url - 频道 URL
 * @returns {string} 唯一 ID
 */
function generateIdFromUrl(url) {
  // 简单的哈希函数生成 ID
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }
  return 'ch_' + Math.abs(hash).toString(36);
}
