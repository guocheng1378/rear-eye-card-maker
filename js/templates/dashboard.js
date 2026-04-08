import { escXml } from '../maml.js';

export default {
  id: 'dashboard', icon: '📊', name: '仪表盘', desc: '时间/步数/电量/天气一屏聚合',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '仪表盘' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0e1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#cccccc' },
      { key: 'dimColor', label: '次要颜色', type: 'color', default: '#555555' },
    ]},
  ],
  elements(c) {
    var colW = Math.round((976 * (1 - 0.3) - 20) / 2);
    return [
      { type: 'text', expression: "formatDate('HH:mm', #time_sys)", text: '09:41', x: 10, y: 20, size: 40, color: c.timeColor, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "formatDate('MM/dd EEEE', #time_sys)", text: '04/08 星期二', x: 10, y: 68, size: 12, color: c.dimColor, locked: false },
      { type: 'rectangle', x: 10, y: 92, w: 400, h: 1, color: '#1a1f2e', locked: false },
      { type: 'text', text: '步数', x: 10, y: 110, size: 11, color: c.dimColor, locked: false },
      { type: 'text', expression: '#step_count', text: '6542', x: 10, y: 128, size: 24, color: c.textColor, bold: true, locked: false },
      { type: 'text', text: '步', x: 10, y: 158, size: 11, color: c.dimColor, locked: false, opacity: 60 },
      { type: 'text', text: '电量', x: colW, y: 110, size: 11, color: c.dimColor, locked: false },
      { type: 'text', expression: "concat(#battery_level, '%')", text: '78%', x: colW, y: 128, size: 24, color: c.textColor, bold: true, locked: false },
      { type: 'rectangle', x: 10, y: 178, w: 400, h: 1, color: '#1a1f2e', locked: false },
      { type: 'text', expression: '#weather_desc', text: '晴', x: 10, y: 196, size: 14, color: c.accentColor, locked: false },
      { type: 'text', expression: "concat(#weather_temp, '°')", text: '23°', x: colW, y: 196, size: 18, color: c.textColor, locked: false },
    ];
  },
  rawXml(c) {
    var safeW = '(#view_width - #marginL - 40)';
    var colW = '(' + safeW + ' / 2)';
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '仪表盘') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 仪表盘内容组 -->');
    lines.push('  <Group name="dashboard_content" x="#marginL" y="0" w="' + safeW + '">');
    lines.push('    <!-- 时间 -->');
    lines.push('    <Text x="0" y="20" size="40" color="' + c.timeColor + '" textExp="formatDate(\'HH:mm\', #time_sys)" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Text x="0" y="68" size="12" color="' + c.dimColor + '" textExp="formatDate(\'MM/dd EEEE\', #time_sys)" />');
    lines.push('    <!-- 分隔线 -->');
    lines.push('    <Rectangle x="0" y="92" w="' + safeW + '" h="1" fillColor="#1a1f2e" />');
    lines.push('    <!-- 步数 -->');
    lines.push('    <Group name="steps_col" x="0" y="110" w="' + colW + '">');
    lines.push('      <Text text="步数" x="0" y="0" size="11" color="' + c.dimColor + '" />');
    lines.push('      <Text x="0" y="18" size="24" color="' + c.textColor + '" textExp="#step_count" bold="true" />');
    lines.push('      <Text text="步" x="0" y="48" size="11" color="' + c.dimColor + '" alpha="0.6" />');
    lines.push('    </Group>');
    lines.push('    <!-- 电量 -->');
    lines.push('    <Group name="battery_col" x="' + colW + '" y="110" w="' + colW + '">');
    lines.push('      <Text text="电量" x="0" y="0" size="11" color="' + c.dimColor + '" />');
    lines.push('      <Text x="0" y="18" size="24" color="' + c.textColor + '" textExp="concat(#battery_level, \'%\')" bold="true" />');
    lines.push('    </Group>');
    lines.push('    <!-- 分隔线 -->');
    lines.push('    <Rectangle x="0" y="178" w="' + safeW + '" h="1" fillColor="#1a1f2e" />');
    lines.push('    <!-- 天气 -->');
    lines.push('    <Text x="0" y="196" size="14" color="' + c.accentColor + '" textExp="#weather_desc" />');
    lines.push('    <Text x="' + colW + '" y="196" size="18" color="' + c.textColor + '" textExp="concat(#weather_temp, \'°\')" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
