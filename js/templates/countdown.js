import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'countdown', icon: '⏳', name: '倒计时卡片', desc: '倒计时到指定日期',
  updater: 'DateTime.Day',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '倒计时卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a0a2e' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '内容', fields: [
      { key: 'eventName', label: '事件名称', type: 'text', default: '距离新年' },
      { key: 'targetDate', label: '目标日期 (MMdd，如 0101=1月1日)', type: 'text', default: '0101' },
    ]},
    { group: '样式', fields: [
      { key: 'accentColor', label: '强调色', type: 'color', default: '#a29bfe' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
    ]},
  ],
  gen(c) {
    var td = String(c.targetDate || '0101');
    var validTd = /^\d{4}$/.test(td) ? td : '0101';
    return [
      generateAutoDetectMAML(),
      '  <Var name="m" type="number" expression="#month" />',
      '  <Var name="d" type="number" expression="#date" />',
      '  <Var name="doy_base" type="number" expression="(ifelse((#m == 1), 0, ifelse((#m == 2), 31, ifelse((#m == 3), 59, ifelse((#m == 4), 90, ifelse((#m == 5), 120, ifelse((#m == 6), 151, ifelse((#m == 7), 181, ifelse((#m == 8), 212, ifelse((#m == 9), 243, ifelse((#m == 10), 273, ifelse((#m == 11), 304, 334)))))))))))" />',
      '  <Var name="doy_leap" type="number" expression="ifelse((#year % 4 == 0), ifelse((#m >= 3), 1, 0), 0)" />',
      '  <Var name="doy" type="number" expression="(#doy_base + #d + #doy_leap)" />',
      '  <Var name="target" type="number" expression="' + validTd + '" />',
      '  <Var name="tMonth" type="number" expression="floor(#target / 100)" />',
      '  <Var name="tDay" type="number" expression="(#target - #tMonth * 100)" />',
      '  <Var name="tdoy_base" type="number" expression="(ifelse((#tMonth == 1), 0, ifelse((#tMonth == 2), 31, ifelse((#tMonth == 3), 59, ifelse((#tMonth == 4), 90, ifelse((#tMonth == 5), 120, ifelse((#tMonth == 6), 151, ifelse((#tMonth == 7), 181, ifelse((#tMonth == 8), 212, ifelse((#tMonth == 9), 243, ifelse((#tMonth == 10), 273, ifelse((#tMonth == 11), 304, 334)))))))))))" />',
      '  <Var name="tdoy_leap" type="number" expression="ifelse((#year % 4 == 0), ifelse((#tMonth >= 3), 1, 0), 0)" />',
      '  <Var name="tdoy" type="number" expression="(#tdoy_base + #tDay + #tdoy_leap)" />',
      '  <Var name="daysLeft" type="number" expression="(365 + ifelse((#year % 4 == 0), 1, 0) - #doy)" />',
      '  <Var name="diff" type="number" expression="ifelse((#tdoy >= #doy), (#tdoy - #doy), (#daysLeft + #tdoy))" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group name="countdown_display" x="#marginL" y="0">',
      '    <Text text="' + escXml(c.eventName) + '" x="0" y="50" size="18" color="' + c.textColor + '" alpha="153" />',
      '    <Text x="0" y="80" size="72" color="' + c.accentColor + '" textExp="#diff" bold="true" fontFamily="mipro-demibold" />',
      '    <Text text="天" x="0" y="160" size="20" color="' + c.textColor + '" alpha="128" />',
      '  </Group>',
    ].join('\n');
  },
};
