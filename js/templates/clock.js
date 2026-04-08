import { escXml } from '../maml.js';

export default {
  id: 'clock', icon: '⏰', name: '时钟卡片', desc: '深色极简时钟，带动画过渡',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '时钟卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
      { key: 'dateColor', label: '日期颜色', type: 'color', default: '#666666' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'timeSize', label: '时间字号', type: 'range', min: 36, max: 96, default: 64 },
    ]},
    { group: '格式', fields: [
      { key: 'timeFormat', label: '时间格式', type: 'select', options: [
        { v: 'HH:mm', l: '24小时制' },
        { v: 'hh:mm a', l: '12小时制' },
      ], default: 'HH:mm' },
      { key: 'dateFormat', label: '日期格式', type: 'select', options: [
        { v: 'yyyy/MM/dd EEEE', l: '2026/04/04 星期五' },
        { v: 'MM-dd EEEE', l: '04-04 星期五' },
        { v: 'MM/dd', l: '04/04' },
      ], default: 'yyyy/MM/dd EEEE' },
      { key: 'showSeconds', label: '显示秒数', type: 'select', default: 'false', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
    ]},
  ],
  elements(c) {
    var ts = Number(c.timeSize) || 64;
    var dateY = 80 + Math.round(ts * 0.9);
    var secY = 80 + Math.round(ts * 0.15);
    var els = [
      { type: 'text', expression: "formatDate('" + c.timeFormat + "', #time_sys)", text: '12:34', x: 10, y: 80, size: ts, color: c.timeColor, bold: true, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "formatDate('" + c.dateFormat + "', #time_sys)", text: '2026/04/04 星期五', x: 10, y: Math.round(dateY), size: 18, color: c.dateColor, locked: false },
      { type: 'rectangle', x: 10, y: Math.round(dateY) + 28, w: 32, h: 2, color: c.accentColor, radius: 1, locked: false },
    ];
    if (c.showSeconds === 'true') {
      els.push({ type: 'text', expression: "formatDate('ss', #time_sys)", text: '00', x: 10, y: Math.round(secY), size: Math.round(ts * 0.4), color: c.accentColor, locked: false, opacity: 60 });
    }
    return els;
  },
  rawXml(c) {
    var ts = Number(c.timeSize) || 64;
    var dateY = 80 + Math.round(ts * 0.9);
    var secY = 80 + Math.round(ts * 0.15);
    var showSec = c.showSeconds === 'true';
    var lines = [];

    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '时钟卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 时钟内容组 -->');
    lines.push('  <Group name="clock_content" x="#marginL" y="0" w="(#view_width - #marginL - 40)">');
    lines.push('    <Text x="0" y="80" size="' + ts + '" color="' + c.timeColor + '" textExp="formatDate(\'' + c.timeFormat + '\', #time_sys)" bold="true" fontFamily="mipro-demibold" />');
    if (showSec) {
      lines.push('    <Text x="0" y="' + secY + '" size="' + Math.round(ts * 0.4) + '" color="' + c.accentColor + '" textExp="formatDate(\'ss\', #time_sys)" alpha="0.6" />');
    }
    lines.push('    <Text x="0" y="' + dateY + '" size="18" color="' + c.dateColor + '" textExp="formatDate(\'' + c.dateFormat + '\', #time_sys)" />');
    lines.push('    <Rectangle x="0" y="' + (dateY + 28) + '" w="32" h="2" fillColor="' + c.accentColor + '" cornerRadius="1" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
