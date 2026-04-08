import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'carousel', icon: '🖼️', name: '照片轮播卡片', desc: '多张图片定时切换，自动轮播',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '照片轮播' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
    ]},
    { group: '轮播设置', fields: [
      { key: 'interval', label: '切换间隔(秒)', type: 'range', min: 2, max: 30, default: 5 },
      { key: 'transition', label: '过渡效果', type: 'select', default: 'fade', options: [
        { v: 'fade', l: '🌅 淡入淡出' },
        { v: 'slide', l: '➡️ 滑动' },
        { v: 'none', l: '⚡ 直接切换' },
      ]},
      { key: 'fitMode', label: '填充模式', type: 'select', default: 'cover', options: [
        { v: 'cover', l: '🔲 裁切填充' },
        { v: 'contain', l: '⬜ 完整显示' },
      ]},
      { key: 'showIndicator', label: '显示指示器', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'showCaption', label: '显示标题', type: 'select', default: 'false', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'caption', label: '标题文字', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'captionColor', label: '标题颜色', type: 'color', default: '#ffffff' },
      { key: 'captionBgAlpha', label: '标题背景透明度', type: 'range', min: 0, max: 100, default: 50 },
      { key: 'indicatorColor', label: '指示器颜色', type: 'color', default: '#ffffff' },
    ]},
  ],
  elements(c) {
    var els = [];
    if (c.showCaption === 'true' && c.caption) {
      els.push({ type: 'text', text: c.caption, x: 10, y: 596 - 36, size: 14, color: c.captionColor, fontFamily: 'mipro-normal', locked: false });
    }
    return els;
  },
  gen(c) {
    var interval = (c.interval || 5) * 1000;
    var transition = c.transition || 'fade';
    var fitMode = c.fitMode || 'cover';
    var showIndicator = c.showIndicator !== 'false';
    var showCaption = c.showCaption === 'true';

    var lines = [];
    lines.push(generateAutoDetectMAML());
    lines.push('');
    lines.push('  <!-- 照片轮播 -->');
    lines.push('  <Var name="slideIndex" type="number" expression="mod(floor(div(#time_sys, ' + interval + ')), 3)" />');
    lines.push('');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');

    for (var i = 0; i < 3; i++) {
      lines.push('  <!-- Slide ' + (i + 1) + ' -->');
      if (transition === 'fade') {
        lines.push('  <Image src="images/slide_' + i + '.png" x="0" y="0" w="#view_width" h="#view_height" fitMode="' + fitMode + '" alpha="ifelse(eq(#slideIndex, ' + i + '), 1, 0)" />');
      } else if (transition === 'slide') {
        lines.push('  <Image src="images/slide_' + i + '.png" x="ifelse(eq(#slideIndex, ' + i + '), 0, ifelse(gt(#slideIndex, ' + i + '), neg(#view_width), #view_width))" y="0" w="#view_width" h="#view_height" fitMode="' + fitMode + '" />');
      } else {
        lines.push('  <Image src="images/slide_' + i + '.png" x="0" y="0" w="#view_width" h="#view_height" fitMode="' + fitMode + '" alpha="ifelse(eq(#slideIndex, ' + i + '), 1, 0)" />');
      }
    }

    if (showCaption && c.caption) {
      lines.push('');
      lines.push('  <!-- 标题 -->');
      lines.push('  <Group name="caption_group" x="0" y="(#view_height - 50)">');
      lines.push('    <Rectangle w="#view_width" h="50" fillColor="#000000" alpha="' + ((c.captionBgAlpha || 50) / 100).toFixed(2) + '" />');
      lines.push('    <Text text="' + escXml(c.caption) + '" x="#marginL" y="14" size="14" color="' + c.captionColor + '" fontFamily="mipro-normal" />');
      lines.push('  </Group>');
    }

    if (showIndicator) {
      lines.push('');
      lines.push('  <!-- 指示器 -->');
      lines.push('  <Group name="indicators" x="((#view_width - 36) / 2)" y="(#view_height - 20)">');
      for (var j = 0; j < 3; j++) {
        lines.push('    <Circle x="' + (j * 14 + 4) + '" y="4" r="3" fillColor="' + c.indicatorColor + '" alpha="ifelse(eq(#slideIndex, ' + j + '), 1, 0.3)" />');
      }
      lines.push('  </Group>');
    }

    return lines.join('\n');
  },
};
