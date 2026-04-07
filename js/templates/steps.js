import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'steps', icon: '🏃', name: '步数卡片', desc: '显示今日步数和运动数据',
  updater: 'Step',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '步数卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'goal', label: '目标步数', type: 'text', default: '10000' },
      { key: 'barColor', label: '进度条颜色', type: 'color', default: '#ff6b6b' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#ff6b6b' },
    ]},
  ],
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />',
      '  <Var name="goalN" type="number" expression="' + (parseInt(c.goal) || 10000) + '" />',
      '  <Var name="pct" type="number" expression="ifelse((#step_count > #goalN), 100, (#step_count * 100 / #goalN))" />',
      '  <Var name="barW" type="number" expression="(#safeW * #pct / 100)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0">',
      '    <Text text="今日步数" x="0" y="30" size="14" color="' + c.textColor + '" alpha="128" />',
      '    <Text textExp="#step_count" x="0" y="50" size="52" color="' + c.textColor + '" />',
      '    <Text text="步" x="0" y="112" size="16" color="' + c.textColor + '" alpha="128" />',
      '    <Rectangle x="0" y="140" w="#safeW" h="8" fillColor="#222222" cornerRadius="4" />',
      '    <Rectangle x="0" y="140" w="#barW" h="8" fillColor="' + c.barColor + '" cornerRadius="4" />',
      '    <Text textExp="(\'目标 \' + #goalN + \' · \' + #pct + \'%\')" x="0" y="160" size="12" color="' + c.textColor + '" alpha="102" />',
      '    <Text textExp="(\'距离 \' + #step_distance + \' km\')" x="0" y="190" size="14" color="' + c.accentColor + '" alpha="179" />',
      '    <Text textExp="(\'消耗 \' + #step_calorie + \' kcal\')" x="120" y="190" size="14" color="' + c.accentColor + '" alpha="179" />',
      '  </Group>',
    ].join('\n');
  },
};
