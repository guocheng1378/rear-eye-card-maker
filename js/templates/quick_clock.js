import { escXml } from '../maml.js';

export default {
  id: 'quick_clock', icon: '⏱️', name: '速览时钟', desc: '极简大字时钟，一眼看时间',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '速览时钟' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0e1a' },
    ]},
    { group: '样式', fields: [
      { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
      { key: 'dateColor', label: '日期颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'timeSize', label: '时间字号', type: 'range', min: 36, max: 100, default: 80 },
      { key: 'showSeconds', label: '显示秒', type: 'select', options: [
        { v: 'true', l: '显示' },
        { v: 'false', l: '隐藏' },
      ], default: 'false' },
      { key: 'align', label: '对齐', type: 'select', options: [
        { v: 'center', l: '居中' },
        { v: 'left', l: '左侧' },
        { v: 'right', l: '右侧' },
      ], default: 'left' },
    ]},
  ],
  elements(c) {
    var ts = Number(c.timeSize) || 80;
    var isCenter = c.align === 'center';
    var isRight = c.align === 'right';
    var baseX = isCenter ? 0 : (isRight ? 976 - 80 : 80);
    var textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
    var showSec = c.showSeconds === 'true';
    var timeFmt = showSec ? 'HH:mm:ss' : 'HH:mm';
    var els = [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'text', expression: "formatDate('" + timeFmt + "', #time_sys)", text: showSec ? '12:34:56' : '12:34', x: baseX, y: 140, size: ts, color: c.timeColor, bold: true, textAlign: textAlign, fontFamily: 'mipro-demibold', w: isCenter ? 976 : 800 },
      { type: 'text', expression: "formatDate('MM/dd EEEE', #time_sys)", text: '04/10 星期五', x: baseX, y: 140 + Math.round(ts * 1.1), size: 18, color: c.dateColor, textAlign: textAlign, w: isCenter ? 976 : 800 },
      { type: 'rectangle', x: isCenter ? 438 : baseX, y: 140 + Math.round(ts * 1.1) + 30, w: isCenter ? 100 : 40, h: 3, color: c.accentColor, radius: 1.5 },
    ];
    return els;
  },
};
