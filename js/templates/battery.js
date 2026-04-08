import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'battery', icon: '🔋', name: '电池卡片', desc: '显示电池电量和状态',
  updater: 'Battery',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '电池卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0d1117' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'barColor', label: '电量条颜色', type: 'color', default: '#00b894' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'demoLevel', label: '预览电量 (0-100)', type: 'range', min: 0, max: 100, default: 78 },
    ]},
  ],
  elements(c) {
    var safeW = Math.round(976 * (1 - 0.3)) - 40;
    return [
      { type: 'text', text: '电量', x: 10, y: 50, size: 18, color: c.textColor, locked: false, opacity: 60 },
      { type: 'text', expression: "concat(#battery_level, '%')", text: c.demoLevel + '%', x: 10, y: 80, size: 56, color: c.textColor, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "ifelse((#battery_level >= 80), '电量充足', ifelse((#battery_level >= 20), '电量偏低', '电量极低'))", text: '电量充足', x: 10, y: 200, size: 16, color: c.textColor, locked: false, opacity: 50 },
    ];
  },
  gen(c) {
    var safeW = Math.round(976 * (1 - 0.3)) - 40;
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />',
      '  <Var name="barW" type="number" expression="(#safeW * #battery_level / 100)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group name="battery_bar" x="#marginL" y="160" w="#safeW">',
      '    <Rectangle x="0" y="0" w="#safeW" h="12" fillColor="#333333" cornerRadius="6" />',
      '    <Rectangle x="0" y="0" w="#barW" h="12" fillColor="' + c.barColor + '" cornerRadius="6" />',
      '  </Group>',
    ].join('\n');
  },
};
