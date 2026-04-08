import { escXml } from '../maml.js';

export default {
  id: 'dualclock', icon: '🌏', name: '双时钟', desc: '同时显示两个时区的时间',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '双时钟' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '城市 1', fields: [
      { key: 'city1', label: '城市名', type: 'text', default: '北京' },
      { key: 'offset1', label: '时区偏移 (小时)', type: 'range', min: -12, max: 12, default: 8 },
      { key: 'timeColor1', label: '时间颜色', type: 'color', default: '#ffffff' },
    ]},
    { group: '城市 2', fields: [
      { key: 'city2', label: '城市名', type: 'text', default: '纽约' },
      { key: 'offset2', label: '时区偏移 (小时)', type: 'range', min: -12, max: 12, default: -5 },
      { key: 'timeColor2', label: '时间颜色', type: 'color', default: '#6c5ce7' },
    ]},
    { group: '样式', fields: [
      { key: 'timeSize', label: '时间字号', type: 'range', min: 24, max: 72, default: 44 },
      { key: 'dateColor', label: '日期颜色', type: 'color', default: '#666666' },
      { key: 'dividerColor', label: '分隔线颜色', type: 'color', default: '#333333' },
    ]},
  ],
  elements(c) {
    var ts = Number(c.timeSize) || 44;
    var cityY1 = 50, timeY1 = cityY1 + 26;
    var dateY1 = timeY1 + ts * 0.8;
    var divY = dateY1 + 30;
    var cityY2 = divY + 24, timeY2 = cityY2 + 26;
    var dateY2 = timeY2 + ts * 0.8;
    return [
      { type: 'text', text: c.city1, x: 10, y: cityY1, size: 13, color: c.dateColor, locked: false },
      { type: 'text', expression: "formatDate('HH:mm', #utcNow)", text: '08:00', x: 10, y: timeY1, size: ts, color: c.timeColor1, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "formatDate('MM/dd EEEE', #utcNow)", text: '04/08 星期二', x: 10, y: Math.round(dateY1), size: 13, color: c.dateColor, locked: false, opacity: 60 },
      { type: 'rectangle', x: 10, y: divY, w: 300, h: 1, color: c.dividerColor, locked: false },
      { type: 'text', text: c.city2, x: 10, y: cityY2, size: 13, color: c.dateColor, locked: false },
      { type: 'text', expression: "formatDate('HH:mm', #utcNow2)", text: '19:00', x: 10, y: timeY2, size: ts, color: c.timeColor2, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "formatDate('MM/dd EEEE', #utcNow2)", text: '04/07 星期一', x: 10, y: Math.round(dateY2), size: 13, color: c.dateColor, locked: false, opacity: 60 },
    ];
  },
  rawXml(c) {
    var ts = Number(c.timeSize) || 44;
    var o1 = Number(c.offset1) || 0;
    var o2 = Number(c.offset2) || 0;
    var cityY1 = 50, timeY1 = cityY1 + 26;
    var dateY1 = timeY1 + Math.round(ts * 0.8);
    var divY = dateY1 + 30;
    var cityY2 = divY + 24, timeY2 = cityY2 + 26;
    var dateY2 = timeY2 + Math.round(ts * 0.8);
    var safeW = '(#view_width - #marginL - 40)';
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '双时钟') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <Var name="utcNow" type="number" expression="(#time_sys + (' + (o1 * -3600000) + '))" />');
    lines.push('  <Var name="utcNow2" type="number" expression="(#time_sys + (' + (o2 * -3600000) + '))" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 双时钟内容组 -->');
    lines.push('  <Group name="dualclock_content" x="#marginL" y="0" w="' + safeW + '">');
    lines.push('    <!-- 城市 1 -->');
    lines.push('    <Text text="' + escXml(c.city1 || '北京') + '" x="0" y="' + cityY1 + '" size="13" color="' + c.dateColor + '" />');
    lines.push('    <Text x="0" y="' + timeY1 + '" size="' + ts + '" color="' + c.timeColor1 + '" textExp="formatDate(\'HH:mm\', #utcNow)" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Text x="0" y="' + dateY1 + '" size="13" color="' + c.dateColor + '" textExp="formatDate(\'MM/dd EEEE\', #utcNow)" alpha="0.6" />');
    lines.push('    <!-- 分隔线 -->');
    lines.push('    <Rectangle x="0" y="' + divY + '" w="' + safeW + '" h="1" fillColor="' + c.dividerColor + '" />');
    lines.push('    <!-- 城市 2 -->');
    lines.push('    <Text text="' + escXml(c.city2 || '纽约') + '" x="0" y="' + cityY2 + '" size="13" color="' + c.dateColor + '" />');
    lines.push('    <Text x="0" y="' + timeY2 + '" size="' + ts + '" color="' + c.timeColor2 + '" textExp="formatDate(\'HH:mm\', #utcNow2)" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Text x="0" y="' + dateY2 + '" size="13" color="' + c.dateColor + '" textExp="formatDate(\'MM/dd EEEE\', #utcNow2)" alpha="0.6" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
