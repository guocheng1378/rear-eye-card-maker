import { escXml } from '../maml.js';

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
    return [
      { type: 'text', text: '电量', x: 10, y: 50, size: 18, color: c.textColor, locked: false, opacity: 60 },
      { type: 'text', expression: "concat(#battery_level, '%')", text: c.demoLevel + '%', x: 10, y: 80, size: 56, color: c.textColor, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "ifelse((#battery_level >= 80), '电量充足', ifelse((#battery_level >= 20), '电量偏低', '电量极低'))", text: '电量充足', x: 10, y: 200, size: 16, color: c.textColor, locked: false, opacity: 50 },
    ];
  },
  rawXml(c) {
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="Battery" name="' + escXml(c.cardName || '电池卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />');
    lines.push('  <Var name="barW" type="number" expression="(#safeW * #battery_level / 100)" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 电池内容组 -->');
    lines.push('  <Group name="battery_content" x="#marginL" y="0" w="#safeW">');
    lines.push('    <Text text="电量" x="0" y="50" size="18" color="' + c.textColor + '" alpha="0.6" />');
    lines.push('    <Text x="0" y="80" size="56" color="' + c.textColor + '" textExp="concat(#battery_level, \'%\')" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <!-- 电量条背景 -->');
    lines.push('    <Group name="battery_bar" x="0" y="160" w="#safeW">');
    lines.push('      <Rectangle x="0" y="0" w="#safeW" h="12" fillColor="#333333" cornerRadius="6" />');
    lines.push('      <Rectangle x="0" y="0" w="#barW" h="12" fillColor="' + c.barColor + '" cornerRadius="6" />');
    lines.push('    </Group>');
    lines.push('    <!-- 状态文字 -->');
    lines.push('    <Text x="0" y="200" size="16" color="' + c.textColor + '" textExp="ifelse((#battery_level >= 80), \'电量充足\', ifelse((#battery_level >= 20), \'电量偏低\', \'电量极低\'))" alpha="0.5" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
