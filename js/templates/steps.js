import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'steps', icon: '🏃', name: '步数卡片', desc: '今日步数和运动数据',
  updater: 'Step',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '步数卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'goal', label: '目标步数', type: 'text', default: '10000' },
      { key: 'barColor', label: '进度条颜色', type: 'color', default: '#ff6b6b' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#ff6b6b' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'text', text: '今日步数', x: 10, y: 30, size: 14, color: c.textColor, locked: false, opacity: 50 },
      { type: 'text', expression: '#step_count', text: '6542', x: 10, y: 50, size: 52, color: c.textColor, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', text: '步', x: 10, y: 112, size: 16, color: c.textColor, locked: false, opacity: 50 },
      { type: 'text', expression: "concat('目标 ', #goalN, ' · ', #pct, '%')", text: '目标 10000 · 65%', x: 10, y: 160, size: 12, color: c.textColor, locked: false, opacity: 40 },
      { type: 'text', expression: "concat('距离 ', #step_distance, ' km')", text: '距离 4.2 km', x: 10, y: 190, size: 14, color: c.accentColor, locked: false, opacity: 70 },
      { type: 'text', expression: "concat('消耗 ', #step_calorie, ' kcal')", text: '消耗 256 kcal', x: 130, y: 190, size: 14, color: c.accentColor, locked: false, opacity: 70 },
    ];
  },
  gen(c) {
    var goalN = parseInt(c.goal) || 10000;
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />',
      '  <Var name="goalN" type="number" expression="' + goalN + '" />',
      '  <Var name="pct" type="number" expression="ifelse((#step_count > #goalN), 100, (#step_count * 100 / #goalN))" />',
      '  <Var name="barW" type="number" expression="(#safeW * #pct / 100)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group name="step_progress" x="#marginL" y="140" w="#safeW">',
      '    <Rectangle x="0" y="0" w="#safeW" h="8" fillColor="#222222" cornerRadius="4" />',
      '    <Rectangle x="0" y="0" w="#barW" h="8" fillColor="' + c.barColor + '" cornerRadius="4" />',
      '  </Group>',
    ].join('\n');
  },
};
