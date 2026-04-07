import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'status', icon: '📊', name: '状态卡片', desc: '显示多个状态指标',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '状态卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0f0f1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
      { key: 'title', label: '标题', type: 'text', default: '系统状态' },
    ]},
    { group: '项目', fields: [
      { key: 'item1', label: '项目1', type: 'text', default: 'WiFi: 已连接' },
      { key: 'item2', label: '项目2', type: 'text', default: '蓝牙: 已开启' },
      { key: 'item3', label: '项目3', type: 'text', default: 'GPS: 已关闭' },
      { key: 'item4', label: '项目4', type: 'text', default: 'NFC: 已开启' },
    ]},
    { group: '样式', fields: [
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#e0e0e0' },
    ]},
  ],
  gen(c) {
    var items = [c.item1, c.item2, c.item3, c.item4].filter(Boolean);
    var lines = [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0" w="#safeW">',
      '    <Rectangle x="0" y="40" w="4" h="24" fillColor="' + c.accentColor + '" cornerRadius="2" />',
      '    <Text text="' + escXml(c.title) + '" x="14" y="42" size="22" color="' + c.textColor + '" w="(#safeW - 14)" />',
    ];
    items.forEach(function (t, i) {
      lines.push('    <Text text="' + escXml(t) + '" x="14" y="' + (90 + i * 40) + '" size="16" color="' + c.textColor + '" alpha="204" w="(#safeW - 14)" />');
    });
    lines.push('  </Group>');
    return lines.join('\n');
  },
};
