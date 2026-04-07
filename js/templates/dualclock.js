import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

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
  gen(c) {
    var ts = Number(c.timeSize);
    var o1 = Number(c.offset1) || 0;
    var o2 = Number(c.offset2) || 0;
    var cityY1 = 50, timeY1 = cityY1 + 26;
    var dateY1 = timeY1 + ts * 0.8;
    var divY = dateY1 + 30;
    var cityY2 = divY + 24, timeY2 = cityY2 + 26;
    var dateY2 = timeY2 + ts * 0.8;
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
      '  <Var name="utcNow" type="number" expression="(#time_sys + (' + (o1 * -3600000) + '))" />',
      '  <Var name="utcNow2" type="number" expression="(#time_sys + (' + (o2 * -3600000) + '))" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0" w="#safeW">',
      '    <Text text="' + escXml(c.city1) + '" x="0" y="' + cityY1 + '" size="13" color="' + c.dateColor + '" />',
      '    <Text textExp="formatDate(\'HH:mm\', #utcNow)" x="0" y="' + timeY1 + '" size="' + ts + '" color="' + c.timeColor1 + '" bold="true" />',
      '    <Text textExp="formatDate(\'MM/dd EEEE\', #utcNow)" x="0" y="' + Math.round(dateY1) + '" size="13" color="' + c.dateColor + '" alpha="153" />',
      '    <Rectangle x="0" y="' + divY + '" w="#safeW" h="1" fillColor="' + c.dividerColor + '" />',
      '    <Text text="' + escXml(c.city2) + '" x="0" y="' + cityY2 + '" size="13" color="' + c.dateColor + '" />',
      '    <Text textExp="formatDate(\'HH:mm\', #utcNow2)" x="0" y="' + timeY2 + '" size="' + ts + '" color="' + c.timeColor2 + '" bold="true" />',
      '    <Text textExp="formatDate(\'MM/dd EEEE\', #utcNow2)" x="0" y="' + Math.round(dateY2) + '" size="13" color="' + c.dateColor + '" alpha="153" />',
      '  </Group>',
    ].join('\n');
  },
};
