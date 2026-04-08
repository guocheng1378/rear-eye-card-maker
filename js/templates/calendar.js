import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'calendar', icon: '📅', name: '日历卡片', desc: '显示日期和简要日程',
  updater: 'DateTime.Day',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '日历卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0f0f1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'dayColor', label: '日期颜色', type: 'color', default: '#ffffff' },
      { key: 'daySize', label: '日期字号', type: 'range', min: 36, max: 96, default: 72 },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#aaaaaa' },
    ]},
    { group: '内容', fields: [
      { key: 'event1', label: '日程1', type: 'text', default: '09:00 团队会议' },
      { key: 'event2', label: '日程2', type: 'text', default: '14:30 代码评审' },
      { key: 'event3', label: '日程3', type: 'text', default: '' },
    ]},
  ],
  elements(c) {
    var els = [
      { type: 'text', expression: "formatDate('MM/dd', #time_sys)", text: '04/08', x: 10, y: 20, size: 14, color: c.textColor, locked: false, opacity: 50 },
      { type: 'text', expression: "formatDate('EEEE', #time_sys)", text: '星期二', x: 10, y: 40, size: 18, color: c.accentColor, locked: false },
      { type: 'text', expression: "formatDate('dd', #time_sys)", text: '08', x: 10, y: 55, size: Number(c.daySize), color: c.dayColor, bold: true, fontFamily: 'mipro-demibold', locked: false },
    ];
    [c.event1, c.event2, c.event3].filter(Boolean).forEach(function (e, i) {
      els.push({ type: 'text', text: e, x: 10, y: 150 + i * 28, size: 14, color: c.textColor, locked: false });
    });
    return els;
  },
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
    ].join('\n');
  },
};
