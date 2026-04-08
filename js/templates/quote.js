import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'quote', icon: '💬', name: '名言卡片', desc: '显示一段文字或名言',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '名言卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a2e' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '内容', fields: [
      { key: 'text', label: '文字内容', type: 'textarea', default: 'Stay hungry.\nStay foolish.' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'textSize', label: '字号', type: 'range', min: 14, max: 64, default: 28 },
      { key: 'author', label: '作者', type: 'text', default: '— Steve Jobs' },
      { key: 'authorColor', label: '作者颜色', type: 'color', default: '#6c5ce7' },
    ]},
  ],
  elements(c) {
    var safeW = 976 * (1 - 0.3) - 20;
    return [
      { type: 'rectangle', x: 10, y: 30, w: 3, h: 40, color: c.authorColor, radius: 1.5, locked: false },
      { type: 'text', text: c.text, x: 22, y: 40, size: Number(c.textSize), color: c.textColor, multiLine: true, w: safeW - 12, lineHeight: 1.4, locked: false },
      { type: 'text', text: c.author, x: 22, y: 596 - 80, size: 16, color: c.authorColor, w: safeW, locked: false },
    ];
  },
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
    ].join('\n');
  },
};
