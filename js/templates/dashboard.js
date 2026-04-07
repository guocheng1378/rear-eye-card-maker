import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'dashboard', icon: '📊', name: '仪表盘', desc: '一屏聚合时间、步数、电量、天气',
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
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
      '  <Var name="colW" type="number" expression="(#safeW / 2)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0" w="#safeW">',
      '    <Text textExp="formatDate(\'HH:mm\', #time_sys)" x="0" y="20" size="40" color="' + c.timeColor + '" bold="true" />',
      '    <Text textExp="formatDate(\'MM/dd EEEE\', #time_sys)" x="0" y="68" size="12" color="' + c.dimColor + '" />',
      '    <Rectangle x="0" y="92" w="#safeW" h="1" fillColor="#1a1f2e" />',
      '    <Text text="步数" x="0" y="110" size="11" color="' + c.dimColor + '" />',
      '    <Text textExp="#step_count" x="0" y="128" size="24" color="' + c.textColor + '" bold="true" />',
      '    <Text text="步" x="0" y="158" size="11" color="' + c.dimColor + '" alpha="153" />',
      '    <Text text="电量" x="#colW" y="110" size="11" color="' + c.dimColor + '" />',
      '    <Text textExp="(#battery_level + \'%\')" x="#colW" y="128" size="24" color="' + c.textColor + '" bold="true" />',
      '    <Rectangle x="0" y="178" w="#safeW" h="1" fillColor="#1a1f2e" />',
      '    <Text textExp="#weather_desc" x="0" y="196" size="14" color="' + c.accentColor + '" />',
      '    <Text textExp="(#weather_temp + \'°\')" x="#colW" y="196" size="18" color="' + c.textColor + '" />',
      '    <Text textExp="(\'湿度 \' + #weather_humidity + \'%\')" x="0" y="218" size="11" color="' + c.dimColor + '" alpha="128" />',
      '  </Group>',
    ].join('\n');
  },
};
