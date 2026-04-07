import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'video_wallpaper', icon: '🎬', name: '视频壁纸卡片', desc: '增强视频壁纸：音频、循环、音量控制',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '视频壁纸' },
    ]},
    { group: '视频设置', fields: [
      { key: 'loopMode', label: '播放模式', type: 'select', default: 'loop', options: [
        { v: 'loop', l: '🔁 无限循环' },
        { v: 'once', l: '▶️ 播放一次' },
        { v: 'bounce', l: '↔️ 来回播放' },
      ]},
      { key: 'autoPlay', label: '自动播放', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' },
        { v: 'false', l: '否' },
      ]},
      { key: 'volume', label: '音量', type: 'range', min: 0, max: 100, default: 0 },
      { key: 'fitMode', label: '填充模式', type: 'select', default: 'cover', options: [
        { v: 'cover', l: '🔲 裁切填充' },
        { v: 'contain', l: '⬜ 完整显示' },
        { v: 'fill', l: '↔️ 拉伸填充' },
      ]},
      { key: 'removeDurationLimit', label: '解除时长限制', type: 'select', default: 'true', options: [
        { v: 'true', l: '是（允许任意时长视频）' },
        { v: 'false', l: '否（保持系统默认限制）' },
      ]},
      { key: 'removeFpsLimit', label: '解除帧率限制', type: 'select', default: 'true', options: [
        { v: 'true', l: '是（使用原始帧率）' },
        { v: 'false', l: '否（保持系统默认帧率）' },
      ]},
      { key: 'removeMuteLimit', label: '解除静音限制', type: 'select', default: 'true', options: [
        { v: 'true', l: '是（允许带音频播放）' },
        { v: 'false', l: '否（强制静音）' },
      ]},
    ]},
    { group: '遮罩层', fields: [
      { key: 'overlayEnable', label: '显示遮罩', type: 'select', default: 'false', options: [
        { v: 'false', l: '关闭' },
        { v: 'true', l: '开启' },
      ]},
      { key: 'overlayColor', label: '遮罩颜色', type: 'color', default: '#000000' },
      { key: 'overlayOpacity', label: '遮罩透明度', type: 'range', min: 0, max: 100, default: 30 },
    ]},
    { group: '文字叠加', fields: [
      { key: 'showOverlayText', label: '显示叠加文字', type: 'select', default: 'false', options: [
        { v: 'false', l: '关闭' },
        { v: 'true', l: '开启' },
      ]},
      { key: 'overlayText', label: '叠加文字内容', type: 'text', default: '' },
      { key: 'overlayTextSize', label: '文字大小', type: 'range', min: 12, max: 48, default: 24 },
      { key: 'overlayTextColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'overlayTextX', label: '文字 X', type: 'range', min: 0, max: 976, default: 40 },
      { key: 'overlayTextY', label: '文字 Y', type: 'range', min: 0, max: 596, default: 500 },
    ]},
  ],
  gen(c) {
    var loop = c.loopMode || 'loop';
    var autoPlay = c.autoPlay !== 'false';
    var volume = c.volume !== undefined ? c.volume : 0;
    var fitMode = c.fitMode || 'cover';
    var removeDuration = c.removeDurationLimit !== 'false';
    var removeFps = c.removeFpsLimit !== 'false';
    var removeMute = c.removeMuteLimit !== 'false';

    var lines = [];
    lines.push(generateAutoDetectMAML());
    lines.push('');
    lines.push('  <!-- 增强视频壁纸卡片 -->');

    // Video element
    var videoAttrs = [];
    videoAttrs.push('src="videos/user_video.mp4"');
    videoAttrs.push('x="0"');
    videoAttrs.push('y="0"');
    videoAttrs.push('w="#view_width"');
    videoAttrs.push('h="#view_height"');
    videoAttrs.push('autoPlay="' + autoPlay + '"');

    if (loop === 'loop') {
      videoAttrs.push('loop="true"');
    } else if (loop === 'bounce') {
      videoAttrs.push('loop="true"');
      videoAttrs.push('reverse="true"');
    }
    // once: no loop attribute

    if (volume > 0 || removeMute) {
      videoAttrs.push('volume="' + (volume / 100).toFixed(2) + '"');
      videoAttrs.push('audioEnabled="true"');
    }

    if (fitMode === 'cover') {
      videoAttrs.push('fitMode="cover"');
    } else if (fitMode === 'contain') {
      videoAttrs.push('fitMode="contain"');
    } else {
      videoAttrs.push('fitMode="fill"');
    }

    if (removeDuration) {
      videoAttrs.push('maxDuration="-1"');
    }
    if (removeFps) {
      videoAttrs.push('forceNativeFps="true"');
    }

    lines.push('  <Video ' + videoAttrs.join(' ') + ' />');

    // Overlay layer
    if (c.overlayEnable === 'true') {
      var alpha = ((c.overlayOpacity || 30) / 100).toFixed(2);
      lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + (c.overlayColor || '#000000') + '" alpha="' + alpha + '" />');
    }

    // Text overlay
    if (c.showOverlayText === 'true' && c.overlayText) {
      lines.push('  <Text text="' + escXml(c.overlayText) + '" x="' + (c.overlayTextX || 40) + '" y="' + (c.overlayTextY || 500) + '" size="' + (c.overlayTextSize || 24) + '" color="' + (c.overlayTextColor || '#ffffff') + '" bold="true" />');
    }

    return lines.join('\n');
  },
};
