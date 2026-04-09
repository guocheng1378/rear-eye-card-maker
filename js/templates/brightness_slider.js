import { escXml } from '../maml.js';

export default {
  id: 'brightness_slider', icon: '🔆', name: '亮度滑块', desc: '拖拽调节亮度的交互卡片',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '亮度调节' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
    ]},
    { group: '样式', fields: [
      { key: 'sliderColor', label: '滑块颜色', type: 'color', default: '#ffd60a' },
      { key: 'trackColor', label: '轨道颜色', type: 'color', default: '#333333' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'iconColor', label: '图标颜色', type: 'color', default: '#888888' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'text', text: '🔆', x: 30, y: 60, size: 28, color: c.iconColor },
      { type: 'text', text: '亮度', x: 70, y: 65, size: 16, color: c.textColor, bold: true },
      { type: 'rectangle', x: 30, y: 110, w: 250, h: 8, color: c.trackColor, radius: 4 },
      { type: 'rectangle', x: 30, y: 110, w: 180, h: 8, color: c.sliderColor, radius: 4 },
      { type: 'circle', x: 210, y: 114, r: 10, color: '#ffffff' },
      { type: 'text', text: '72%', x: 30, y: 140, size: 14, color: c.iconColor },
    ];
  },
  rawXml(c) {
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '亮度调节') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 标题 -->',
      '    <Text x="0" y="40" size="16" color="' + c.textColor + '" text="亮度" bold="true" />',
      '',
      '    <!-- 滑块轨道 -->',
      '    <Rectangle x="0" y="90" w="250" h="8" fillColor="' + c.trackColor + '" cornerRadius="4" />',
      '',
      '    <!-- 滑块填充 -->',
      '    <Rectangle x="0" y="90" w="180" h="8" fillColor="' + c.sliderColor + '" cornerRadius="4" />',
      '',
      '    <!-- 滑块手柄 -->',
      '    <Circle x="180" y="94" r="10" color="#ffffff" />',
      '',
      '    <!-- 百分比 -->',
      '    <Text x="0" y="120" size="12" color="' + c.iconColor + '" text="72%" />',
      '',
      '    <!-- 快捷按钮：25/50/75/100 -->',
      '    <Text x="0" y="155" size="11" color="' + c.iconColor + '" text="25%   50%   75%   100%" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
