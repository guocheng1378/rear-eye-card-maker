import { escXml } from '../maml.js';

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
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'volume', label: '音量', type: 'range', min: 0, max: 100, default: 0 },
      { key: 'fitMode', label: '填充模式', type: 'select', default: 'cover', options: [
        { v: 'cover', l: '🔲 裁切填充' },
        { v: 'contain', l: '⬜ 完整显示' },
        { v: 'fill', l: '↔️ 拉伸填充' },
      ]},
      { key: 'removeDurationLimit', label: '解除时长限制', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'removeFpsLimit', label: '解除帧率限制', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'removeMuteLimit', label: '解除静音限制', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
    ]},
    { group: '遮罩层', fields: [
      { key: 'overlayEnable', label: '显示遮罩', type: 'select', default: 'false', options: [
        { v: 'false', l: '关闭' }, { v: 'true', l: '开启' },
      ]},
      { key: 'overlayColor', label: '遮罩颜色', type: 'color', default: '#000000' },
      { key: 'overlayOpacity', label: '遮罩透明度', type: 'range', min: 0, max: 100, default: 30 },
    ]},
    { group: '文字叠加', fields: [
      { key: 'showOverlayText', label: '显示叠加文字', type: 'select', default: 'false', options: [
        { v: 'false', l: '关闭' }, { v: 'true', l: '开启' },
      ]},
      { key: 'overlayText', label: '叠加文字', type: 'text', default: '' },
      { key: 'overlayTextSize', label: '文字大小', type: 'range', min: 12, max: 48, default: 24 },
      { key: 'overlayTextColor', label: '文字颜色', type: 'color', default: '#ffffff' },
    ]},
  ],
  elements(c) {
    var els = [];
    if (c.showOverlayText === 'true' && c.overlayText) {
      els.push({ type: 'text', text: c.overlayText, x: 40, y: 500, size: Number(c.overlayTextSize) || 24, color: c.overlayTextColor || '#ffffff', bold: true, locked: false });
    }
    return els;
  },
  rawXml(c) {
    var loop = c.loopMode || 'loop';
    var autoPlay = c.autoPlay !== 'false';
    var volume = c.volume !== undefined ? c.volume : 0;
    var fitMode = c.fitMode || 'cover';
    var removeDuration = c.removeDurationLimit !== 'false';
    var removeFps = c.removeFpsLimit !== 'false';
    var removeMute = c.removeMuteLimit !== 'false';

    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" name="' + escXml(c.cardName || '视频壁纸') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 视频壁纸 -->');

    var videoAttrs = ['src="videos/user_video.mp4"'];
    videoAttrs.push('x="0" y="0" w="#view_width" h="#view_height"');
    videoAttrs.push('autoPlay="' + autoPlay + '"');
    if (loop === 'loop') videoAttrs.push('loop="true"');
    else if (loop === 'bounce') { videoAttrs.push('loop="true"'); videoAttrs.push('reverse="true"'); }
    if (volume > 0 || removeMute) {
      videoAttrs.push('volume="' + (volume / 100).toFixed(2) + '"');
      videoAttrs.push('audioEnabled="true"');
    }
    videoAttrs.push('fitMode="' + fitMode + '"');
    if (removeDuration) videoAttrs.push('maxDuration="-1"');
    if (removeFps) videoAttrs.push('forceNativeFps="true"');

    lines.push('  <Video ' + videoAttrs.join(' ') + ' />');

    if (c.overlayEnable === 'true') {
      var alpha = ((c.overlayOpacity || 30) / 100).toFixed(2);
      lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + (c.overlayColor || '#000000') + '" alpha="' + alpha + '" />');
    }

    if (c.showOverlayText === 'true' && c.overlayText) {
      lines.push('  <Text text="' + escXml(c.overlayText) + '" x="#marginL" y="(#view_height - 60)" size="' + (c.overlayTextSize || 24) + '" color="' + (c.overlayTextColor || '#ffffff') + '" bold="true" />');
    }

    lines.push('</Widget>');
    return lines.join('\n');
  },
};
