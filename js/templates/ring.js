import { escXml } from '../maml.js';

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
    ]},
    { group: '样式', fields: [
      { key: 'ringColor', label: '进度环颜色', type: 'color', default: '#6c5ce7' },
      { key: 'trackColor', label: '轨道颜色', type: 'color', default: '#222233' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#888888' },
      { key: 'ringSize', label: '环粗细', type: 'range', min: 6, max: 20, default: 12 },
    ]},
  ],
  elements(c) {
    var isBattery = c.source === 'battery';
    var unit = isBattery ? '%' : '步';
    var label = isBattery ? '电量' : '步数';
    var demoText = isBattery ? '78' : '6542';
    var expr = isBattery ? "concat(#battery_level, '%')" : "#step_count";
    return [
      { type: 'text', expression: expr, text: demoText, x: 380, y: 80, size: 48, color: c.textColor, bold: true, textAlign: 'center', w: 100, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', text: unit, x: 420, y: 130, size: 16, color: c.labelColor, locked: false, opacity: 60 },
      { type: 'text', text: label, x: 400, y: 220, size: 14, color: c.labelColor, textAlign: 'center', w: 60, locked: false, opacity: 50 },
    ];
  },
  rawXml(c) {
    var isBattery = c.source === 'battery';
    var goalN = parseInt(c.goal) || 10000;
    var pctExpr = isBattery ? '#battery_level' : 'ifelse((#step_count > ' + goalN + '), 100, (#step_count * 100 / ' + goalN + '))';
    var valueExpr = isBattery ? "concat(#battery_level, '%')" : "#step_count";
    var unit = isBattery ? '%' : '步';
    var label = isBattery ? '电量' : '步数';
    var ringR = 80;
    var ringW = Number(c.ringSize) || 12;
    var lines = [];

    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="Step,Battery" name="' + escXml(c.cardName || '环形进度') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <Var name="cx" type="number" expression="(#marginL + (#view_width - #marginL) / 2)" />');
    lines.push('  <Var name="pct" type="number" expression="' + pctExpr + '" />');
    lines.push('  <Var name="ringR" type="number" expression="' + ringR + '" />');
    lines.push('  <Var name="ringW" type="number" expression="' + ringW + '" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 环形轨道 (同心圆模拟) -->');
    lines.push('  <Group name="ring_track" x="#cx" y="120" align="center" alignV="center">');
    lines.push('    <Circle x="0" y="0" r="#ringR" fillColor="' + c.trackColor + '" />');
    lines.push('    <Circle x="0" y="0" r="(#ringR - #ringW)" fillColor="' + c.bgColor + '" />');
    lines.push('  </Group>');
    lines.push('');
    lines.push('  <!-- 中心文字 -->');
    lines.push('  <Group name="ring_center" x="#cx" y="120" align="center" alignV="center">');
    lines.push('    <Text x="0" y="-10" size="48" color="' + c.textColor + '" textExp="' + valueExpr + '" bold="true" fontFamily="mipro-demibold" textAlign="center" w="120" />');
    lines.push('    <Text text="' + unit + '" x="0" y="30" size="16" color="' + c.labelColor + '" textAlign="center" w="120" alpha="0.6" />');
    lines.push('    <Text text="' + label + '" x="0" y="100" size="14" color="' + c.labelColor + '" textAlign="center" w="120" alpha="0.5" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
