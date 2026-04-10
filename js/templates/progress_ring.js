import { escXml } from '../maml.js';

export default {
  id: 'progress_ring', icon: '🎯', name: '目标进度', desc: '环形进度条显示目标完成度',
  updater: 'DateTime.Day',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '目标进度' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'goalName', label: '目标名称', type: 'text', default: '年度阅读' },
      { key: 'currentVal', label: '当前值', type: 'range', min: 0, max: 100, default: 68 },
      { key: 'goalVal', label: '目标值', type: 'range', min: 1, max: 100, default: 100 },
      { key: 'unit', label: '单位', type: 'text', default: '本' },
    ]},
    { group: '样式', fields: [
      { key: 'ringColor', label: '进度环颜色', type: 'color', default: '#4fc3f7' },
      { key: 'ringBgColor', label: '环背景颜色', type: 'color', default: '#1a2a3a' },
      { key: 'numColor', label: '数字颜色', type: 'color', default: '#ffffff' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#888888' },
      { key: 'completeColor', label: '完成颜色', type: 'color', default: '#00e676' },
      { key: 'ringWidth', label: '环粗细', type: 'range', min: 6, max: 20, default: 12 },
    ]},
  ],
  elements(c) {
    var cur = Number(c.currentVal) || 68;
    var goal = Number(c.goalVal) || 100;
    var pct = Math.round(cur / goal * 100);
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'circle', x: 120, y: 120, r: 80, color: c.ringBgColor },
      { type: 'text', text: pct + '%', x: 90, y: 110, size: 40, color: c.numColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'text', text: c.goalName || '年度阅读', x: 90, y: 155, size: 14, color: c.labelColor },
      { type: 'text', text: cur + '/' + goal + ' ' + (c.unit || '本'), x: 30, y: 230, size: 16, color: c.numColor },
    ];
  },
  rawXml(c) {
    var goal = escXml(c.goalName || '年度阅读');
    var cur = Number(c.currentVal) || 68;
    var goalV = Number(c.goalVal) || 100;
    var unit = escXml(c.unit || '本');
    var rw = Number(c.ringWidth) || 12;
    var r = 80;
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Day" name="' + escXml(c.cardName || '目标进度') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.25)" />',
      '  <Var name="pct" type="number" expression="div(mul(#progress_current, 100), ' + goalV + ')" />',
      '',
      '  <!-- 持久化当前值 -->',
      '  <Permanence name="progress_current" expression="' + cur + '" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 环形背景 -->',
      '    <Arc x="' + r + '" y="' + r + '" r="' + r + '" startAngle="0" endAngle="360" strokeColor="' + c.ringBgColor + '" strokeWidth="' + rw + '" />',
      '',
      '    <!-- 环形进度 -->',
      '    <Arc x="' + r + '" y="' + r + '" r="' + r + '" startAngle="-90" endAngle="270" strokeColor="' + c.ringColor + '" strokeWidth="' + rw + '" strokeLineCap="round" />',
      '',
      '    <!-- 百分比数字 -->',
      '    <Text x="' + (r - 40) + '" y="' + (r - 25) + '" size="40" color="' + c.numColor + '" textExp="#pct + &quot;%&quot;" bold="true" fontFamily="mipro-demibold" />',
      '',
      '    <!-- 目标名称 -->',
      '    <Text x="' + (r - 40) + '" y="' + (r + 15) + '" size="14" color="' + c.labelColor + '" text="' + goal + '" />',
      '',
      '    <!-- 进度数值 -->',
      '    <Text x="0" y="' + (r * 2 + 30) + '" size="16" color="' + c.numColor + '" textExp="#progress_current + &quot;/ ' + goalV + ' ' + unit + '&quot;" />',
      '',
      '    <!-- 剩余提示 -->',
      '    <Text x="0" y="' + (r * 2 + 55) + '" size="12" color="' + c.labelColor + '" textExp="&quot;还差 &quot; + (' + goalV + ' - #progress_current) + &quot; ' + unit + '&quot;" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
