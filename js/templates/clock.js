import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'clock', icon: '⏰', name: '时钟卡片', desc: '显示当前时间和日期',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '时钟卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
      { key: 'dateColor', label: '日期颜色', type: 'color', default: '#888888' },
      { key: 'timeSize', label: '时间字号', type: 'range', min: 24, max: 96, default: 64 },
    ]},
    { group: '格式', fields: [
      { key: 'dateFormat', label: '日期格式', type: 'select', options: [
        { v: 'yyyy/MM/dd EEEE', l: '2026/04/04 星期五' },
        { v: 'MM-dd EEEE', l: '04-04 星期五' },
        { v: 'MM/dd', l: '04/04' },
      ], default: 'yyyy/MM/dd EEEE' },
      { key: 'timeFormat', label: '时间格式', type: 'select', options: [
        { v: 'HH:mm', l: '24小时制' },
        { v: 'hh:mm a', l: '12小时制' },
      ], default: 'HH:mm' },
    ]},
  ],
  gen(c) {
    var dateY = 80 + Number(c.timeSize) * 0.9;
    return [
      generateAutoDetectMAML(),
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0">',
      '    <Text textExp="formatDate(\'' + c.timeFormat + '\', #time_sys)" x="0" y="80" size="' + c.timeSize + '" color="' + c.timeColor + '" />',
      '    <Text textExp="formatDate(\'' + c.dateFormat + '\', #time_sys)" x="0" y="' + Math.round(dateY) + '" size="20" color="' + c.dateColor + '" />',
      '  </Group>',
    ].join('\n');
  },
};
