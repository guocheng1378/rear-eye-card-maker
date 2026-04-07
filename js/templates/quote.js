import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'quote', icon: '💬', name: '名言卡片', desc: '显示一段文字或名言',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '名言卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a2e' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '内容', fields: [
      { key: 'text', label: '文字内容', type: 'textarea', default: 'Stay hungry.\nStay foolish.' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'textSize', label: '字号', type: 'range', min: 14, max: 64, default: 28 },
      { key: 'author', label: '作者', type: 'text', default: '— Steve Jobs' },
      { key: 'authorColor', label: '作者颜色', type: 'color', default: '#6c5ce7' },
    ]},
  ],
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="40" w="#safeW">',
      '    <Text text="' + escXml(c.text) + '" size="' + c.textSize + '" color="' + c.textColor + '" w="#safeW" multiLine="true" />',
      '    <Text text="' + escXml(c.author) + '" x="0" y="(#view_height - 80)" size="16" color="' + c.authorColor + '" w="#safeW" />',
      '  </Group>',
    ].join('\n');
  },
};
