import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'ring', icon: '🎯', name: '环形进度', desc: '环形进度条显示步数或电量',
  updater: 'Step,Battery',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '环形进度' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '数据源', fields: [
      { key: 'source', label: '数据来源', type: 'select', options: [
        { v: 'step', l: '步数' },
        { v: 'battery', l: '电量' },
      ], default: 'step' },
      { key: 'goal', label: '目标值 (步数模式)', type: 'text', default: '10000' },
      { key: 'demoValue', label: '预览值', type: 'range', min: 0, max: 100, default: 65 },
    ]},
    { group: '样式', fields: [
      { key: 'ringColor', label: '进度环颜色', type: 'color', default: '#6c5ce7' },
      { key: 'trackColor', label: '轨道颜色', type: 'color', default: '#222233' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#888888' },
      { key: 'ringSize', label: '环粗细', type: 'range', min: 6, max: 20, default: 12 },
    ]},
  ],
  gen(c) {
    var isBattery = c.source === 'battery';
    var goalN = parseInt(c.goal) || 10000;
    var pctExpr = isBattery ? '#battery_level' : 'ifelse((#step_count > ' + goalN + '), 100, (#step_count * 100 / ' + goalN + '))';
    var label = isBattery ? '电量' : '步数';
    var unit = isBattery ? '%' : '步';
    return [
      generateAutoDetectMAML(),
      '  <Var name="cx" type="number" expression="(#marginL + (#view_width - #marginL) / 2)" />',
      '  <Var name="pct" type="number" expression="' + pctExpr + '" />',
      '  <Var name="ringR" type="number" expression="80" />',
      '  <Var name="ringW" type="number" expression="' + c.ringSize + '" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Circle x="#cx" y="120" r="#ringR" fillColor="' + c.trackColor + '" />',
      '  <Circle x="#cx" y="120" r="(#ringR - #ringW)" fillColor="' + c.bgColor + '" />',
      '  <Text textExp="#pct" x="(#cx - 50)" y="80" w="100" size="48" color="' + c.textColor + '" textAlign="center" bold="true" />',
      '  <Text text="' + unit + '" x="(#cx - 20)" y="138" size="16" color="' + c.labelColor + '" alpha="153" />',
      '  <Text text="' + label + '" x="(#cx - 30)" y="220" w="60" size="14" color="' + c.labelColor + '" alpha="128" textAlign="center" />',
    ].join('\n');
  },
};
