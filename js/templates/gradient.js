import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'gradient', icon: '🌈', name: '渐变文字卡片', desc: '渐变背景 + 居中文字',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '渐变卡片' },
    ]},
    { group: '渐变', fields: [
      { key: 'bgColor1', label: '渐变色1', type: 'color', default: '#667eea' },
      { key: 'bgColor2', label: '渐变色2', type: 'color', default: '#764ba2' },
    ]},
    { group: '文字', fields: [
      { key: 'text', label: '文字', type: 'textarea', default: 'Hello\nWorld' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'textSize', label: '字号', type: 'range', min: 16, max: 72, default: 36 },
    ]},
  ],
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor1 + '" />',
      '  <Rectangle x="(#view_width * 0.5)" w="(#view_width * 0.5)" h="#view_height" fillColor="' + c.bgColor2 + '" alpha="179" />',
      '  <Group x="#marginL" y="0" w="#safeW" h="#view_height">',
      '    <Text text="' + escXml(c.text) + '" x="0" y="(#view_height * 0.3)" size="' + c.textSize + '" color="' + c.textColor + '" w="#safeW" multiLine="true" textAlign="center" />',
      '  </Group>',
    ].join('\n');
  },
};
