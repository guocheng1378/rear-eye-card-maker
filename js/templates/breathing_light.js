import { escXml } from '../maml.js';

export default {
  id: 'breathing_light', icon: '💡', name: '呼吸灯', desc: '柔和呼吸闪烁的氛围灯效果',
  updater: 'DateTime.Second',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '呼吸灯' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
    ]},
    { group: '样式', fields: [
      { key: 'lightColor', label: '灯光颜色', type: 'color', default: '#6c5ce7' },
      { key: 'glowColor', label: '光晕颜色', type: 'color', default: '#a29bfe' },
      { key: 'speed', label: '呼吸速度(ms)', type: 'range', min: 500, max: 3000, default: 1500 },
      { key: 'size', label: '灯大小', type: 'range', min: 20, max: 80, default: 40 },
    ]},
  ],
  elements(c) {
    var s = Number(c.size) || 40;
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'circle', x: 120, y: 120, r: s + 20, color: c.glowColor, opacity: 20 },
      { type: 'circle', x: 120, y: 120, r: s, color: c.lightColor },
      { type: 'text', text: '呼吸灯', x: 30, y: 230, size: 13, color: '#666666' },
    ];
  },
  rawXml(c) {
    var spd = Number(c.speed) || 1500;
    var s = Number(c.size) || 40;
    var half = Math.round(spd / 2);
    return [
      '<Widget screenWidth="976" frameRate="30" scaleByDensity="false" useVariableUpdater="DateTime.Second" name="' + escXml(c.cardName || '呼吸灯') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 光晕（大圆，低透明度） -->',
      '    <Circle x="' + (s + 20) + '" y="' + (s + 20) + '" r="' + (s + 20) + '" color="' + c.glowColor + '">',
      '      <AlphaAnimation repeat="-1">',
      '        <A time="0" alpha="0.1" />',
      '        <A time="' + half + '" alpha="0.35" />',
      '        <A time="' + spd + '" alpha="0.1" />',
      '      </AlphaAnimation>',
      '      <SizeAnimation repeat="-1">',
      '        <A time="0" w="' + ((s+20)*2) + '" h="' + ((s+20)*2) + '" />',
      '        <A time="' + half + '" w="' + ((s+30)*2) + '" h="' + ((s+30)*2) + '" />',
      '        <A time="' + spd + '" w="' + ((s+20)*2) + '" h="' + ((s+20)*2) + '" />',
      '      </SizeAnimation>',
      '    </Circle>',
      '',
      '    <!-- 核心灯 -->',
      '    <Circle x="' + s + '" y="' + s + '" r="' + s + '" color="' + c.lightColor + '">',
      '      <AlphaAnimation repeat="-1">',
      '        <A time="0" alpha="0.6" />',
      '        <A time="' + half + '" alpha="1.0" />',
      '        <A time="' + spd + '" alpha="0.6" />',
      '      </AlphaAnimation>',
      '    </Circle>',
      '',
      '    <!-- 标签 -->',
      '    <Text x="0" y="' + (s * 2 + 50) + '" size="12" color="#444444" text="呼吸灯" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
