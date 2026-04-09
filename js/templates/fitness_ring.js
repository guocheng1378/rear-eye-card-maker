import { escXml } from '../maml.js';

export default {
  id: 'fitness_ring', icon: '🏋️', name: '健身圆环', desc: '步数/卡路里/距离三环进度',
  updater: 'Sensor',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '健身圆环' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
    ]},
    { group: '目标', fields: [
      { key: 'stepGoal', label: '步数目标', type: 'range', min: 3000, max: 20000, default: 8000 },
      { key: 'calGoal', label: '卡路里目标', type: 'range', min: 100, max: 1000, default: 400 },
      { key: 'distGoal', label: '距离目标(km)', type: 'range', min: 1, max: 15, default: 5 },
    ]},
    { group: '颜色', fields: [
      { key: 'ring1Color', label: '步数环颜色', type: 'color', default: '#ff3b30' },
      { key: 'ring2Color', label: '卡路里环颜色', type: 'color', default: '#34c759' },
      { key: 'ring3Color', label: '距离环颜色', type: 'color', default: '#007aff' },
      { key: 'numColor', label: '数字颜色', type: 'color', default: '#ffffff' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#666666' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'circle', x: 100, y: 100, r: 60, color: '#1a1a1a' },
      { type: 'circle', x: 100, y: 100, r: 45, color: '#1a1a1a' },
      { type: 'circle', x: 100, y: 100, r: 30, color: '#1a1a1a' },
      { type: 'text', text: '6,542', x: 30, y: 230, size: 32, color: c.numColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'text', text: '步', x: 30, y: 265, size: 13, color: c.labelColor },
      { type: 'text', text: '256', x: 130, y: 230, size: 32, color: c.numColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'text', text: '千卡', x: 130, y: 265, size: 13, color: c.labelColor },
      { type: 'text', text: '4.2', x: 230, y: 230, size: 32, color: c.numColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'text', text: '公里', x: 230, y: 265, size: 13, color: c.labelColor },
    ];
  },
  rawXml(c) {
    var stepG = c.stepGoal || 8000;
    var calG = c.calGoal || 400;
    var distG = c.distGoal || 5;
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="Sensor" name="' + escXml(c.cardName || '健身圆环') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 步数环 最外层 -->',
      '    <Arc x="80" y="80" r="60" startAngle="0" endAngle="360" strokeColor="' + c.ring1Color + '" strokeWidth="10" strokeLineCap="round" />',
      '',
      '    <!-- 卡路里环 中间层 -->',
      '    <Arc x="80" y="80" r="45" startAngle="0" endAngle="270" strokeColor="' + c.ring2Color + '" strokeWidth="10" strokeLineCap="round" />',
      '',
      '    <!-- 距离环 最内层 -->',
      '    <Arc x="80" y="80" r="30" startAngle="0" endAngle="200" strokeColor="' + c.ring3Color + '" strokeWidth="10" strokeLineCap="round" />',
      '',
      '    <!-- 步数 -->',
      '    <Text x="0" y="170" size="32" color="' + c.numColor + '" textExp="#step_count" bold="true" fontFamily="mipro-demibold" />',
      '    <Text x="0" y="205" size="13" color="' + c.labelColor + '" text="步" />',
      '',
      '    <!-- 卡路里 -->',
      '    <Text x="90" y="170" size="32" color="' + c.numColor + '" textExp="#step_calorie" bold="true" fontFamily="mipro-demibold" />',
      '    <Text x="90" y="205" size="13" color="' + c.labelColor + '" text="千卡" />',
      '',
      '    <!-- 距离 -->',
      '    <Text x="180" y="170" size="32" color="' + c.numColor + '" textExp="#step_distance" bold="true" fontFamily="mipro-demibold" />',
      '    <Text x="180" y="205" size="13" color="' + c.labelColor + '" text="公里" />',
      '',
      '    <!-- 目标 -->',
      '    <Text x="0" y="235" size="11" color="#444444" text="目标: ' + stepG + ' 步 / ' + calG + ' 千卡 / ' + distG + ' km" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
