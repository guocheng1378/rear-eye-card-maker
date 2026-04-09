import { escXml } from '../maml.js';

export default {
  id: 'mini_status', icon: '📟', name: '迷你状态栏', desc: '紧凑的时间+电量+步数组合',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '迷你状态栏' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#111111' },
    ]},
    { group: '样式', fields: [
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#cccccc' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#00c9a0' },
      { key: 'batteryColor', label: '电池颜色', type: 'color', default: '#00c9a0' },
      { key: 'layout', label: '布局', type: 'select', options: [
        { v: 'horizontal', l: '横向' },
        { v: 'vertical', l: '纵向' },
      ], default: 'horizontal' },
    ]},
  ],
  elements(c) {
    var isH = c.layout === 'horizontal';
    if (isH) {
      return [
        { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
        { type: 'text', expression: "formatDate('HH:mm', #time_sys)", text: '12:34', x: 80, y: 220, size: 48, color: c.textColor, bold: true, fontFamily: 'mipro-demibold' },
        { type: 'text', expression: "formatDate('MM/dd EEE', #time_sys)", text: '04/10 Fri', x: 80, y: 280, size: 16, color: c.textColor, opacity: 60 },
        { type: 'rectangle', x: 460, y: 240, w: 2, h: 60, color: c.textColor, opacity: 20, radius: 1 },
        { type: 'text', x: 500, y: 220, size: 16, color: c.accentColor, text: '🔋', opacity: 80 },
        { type: 'text', expression: "#battery_level + '%'", text: '85%', x: 530, y: 222, size: 24, color: c.textColor, fontFamily: 'roboto-mono' },
        { type: 'rectangle', x: 500, y: 260, w: 120, h: 6, color: c.textColor, opacity: 15, radius: 3 },
        { type: 'rectangle', x: 500, y: 260, w: 102, h: 6, color: c.batteryColor, radius: 3 },
        { type: 'text', x: 680, y: 220, size: 16, color: c.accentColor, text: '👣', opacity: 80 },
        { type: 'text', expression: "#step_count + ' 步'", text: '3,256 步', x: 710, y: 222, size: 24, color: c.textColor, fontFamily: 'roboto-mono' },
        { type: 'rectangle', x: 680, y: 260, w: 120, h: 6, color: c.textColor, opacity: 15, radius: 3 },
        { type: 'rectangle', x: 680, y: 260, w: 65, h: 6, color: c.accentColor, radius: 3 },
      ];
    }
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'text', expression: "formatDate('HH:mm', #time_sys)", text: '12:34', x: 80, y: 100, size: 56, color: c.textColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'text', expression: "formatDate('EEEE, MM/dd', #time_sys)", text: 'Friday, 04/10', x: 80, y: 170, size: 16, color: c.textColor, opacity: 50 },
      { type: 'rectangle', x: 80, y: 210, w: 200, h: 1, color: c.textColor, opacity: 15 },
      { type: 'text', x: 80, y: 230, size: 14, color: c.accentColor, text: '🔋 BATTERY' },
      { type: 'text', expression: "#battery_level + '%'", text: '85%', x: 80, y: 255, size: 28, color: c.textColor, fontFamily: 'roboto-mono' },
      { type: 'rectangle', x: 180, y: 265, w: 160, h: 6, color: c.textColor, opacity: 15, radius: 3 },
      { type: 'rectangle', x: 180, y: 265, w: 136, h: 6, color: c.batteryColor, radius: 3 },
      { type: 'text', x: 80, y: 310, size: 14, color: c.accentColor, text: '👣 STEPS' },
      { type: 'text', expression: "#step_count", text: '3,256', x: 80, y: 335, size: 28, color: c.textColor, fontFamily: 'roboto-mono' },
      { type: 'rectangle', x: 180, y: 345, w: 160, h: 6, color: c.textColor, opacity: 15, radius: 3 },
      { type: 'rectangle', x: 180, y: 345, w: 65, h: 6, color: c.accentColor, radius: 3 },
    ];
  },
};
