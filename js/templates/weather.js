import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'weather', icon: '🌤️', name: '天气卡片', desc: '显示当前天气和温度',
  updater: 'Weather',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '天气卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a1628' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '天气', fields: [
      { key: 'city', label: '城市', type: 'text', default: '北京' },
      { key: 'tempColor', label: '温度颜色', type: 'color', default: '#ffffff' },
      { key: 'tempSize', label: '温度字号', type: 'range', min: 36, max: 96, default: 64 },
      { key: 'descColor', label: '描述颜色', type: 'color', default: '#88aacc' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#4ecdc4' },
    ]},
  ],
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0">',
      '    <Text text="' + escXml(c.city) + '" x="0" y="30" size="14" color="' + c.descColor + '" alpha="179" />',
      '    <Text textExp="(#weather_temp + \'°\')" x="0" y="60" size="' + c.tempSize + '" color="' + c.tempColor + '" />',
      '    <Text textExp="#weather_desc" x="0" y="140" size="18" color="' + c.descColor + '" />',
      '    <Text textExp="(\'湿度 \' + #weather_humidity + \'%\')" x="0" y="170" size="14" color="' + c.descColor + '" alpha="128" />',
      '    <Text textExp="(\'体感 \' + #weather_feels_like + \'°\')" x="100" y="170" size="14" color="' + c.descColor + '" alpha="128" />',
      '  </Group>',
    ].join('\n');
  },
};
