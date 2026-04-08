import { escXml } from '../maml.js';

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
  rawXml(c) {
    var ts = Number(c.textSize) || 36;
    var safeW = '(#view_width - #marginL - 40)';
    var textY = Math.round(596 * 0.3);
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" name="' + escXml(c.cardName || '渐变卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 渐变背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor1 + '" />');
    lines.push('  <Rectangle x="(#view_width * 0.5)" w="(#view_width * 0.5)" h="#view_height" fillColor="' + c.bgColor2 + '" alpha="0.7" />');
    lines.push('');
    lines.push('  <!-- 居中文字 -->');
    lines.push('  <Group name="gradient_text" x="#marginL" y="0" w="' + safeW + '">');
    lines.push('    <Text x="0" y="' + textY + '" size="' + ts + '" color="' + c.textColor + '" text="' + escXml(c.text || '') + '" w="' + safeW + '" multiLine="true" textAlign="center" lineHeight="1.5" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
