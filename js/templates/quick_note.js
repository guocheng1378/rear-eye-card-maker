import { escXml } from '../maml.js';

export default {
  id: 'quick_note', icon: '📝', name: '快捷便签', desc: '自定义文字备忘，支持多行',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '快捷便签' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a0a' },
    ]},
    { group: '内容', fields: [
      { key: 'title', label: '标题', type: 'text', default: '今日待办' },
      { key: 'line1', label: '第1行', type: 'text', default: '✅ 完成卡片模板' },
      { key: 'line2', label: '第2行', type: 'text', default: '⬜ 修复预览bug' },
      { key: 'line3', label: '第3行', type: 'text', default: '⬜ 添加新模板' },
      { key: 'line4', label: '第4行', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '标题颜色', type: 'color', default: '#ffd700' },
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#cccccc' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#ffd700' },
    ]},
  ],
  elements(c) {
    var lines = [c.line1, c.line2, c.line3, c.line4].filter(Boolean);
    var els = [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'rectangle', x: 25, y: 30, w: 4, h: 20, color: c.accentColor, radius: 2 },
      { type: 'text', text: c.title, x: 38, y: 30, size: 18, color: c.titleColor, bold: true },
    ];
    lines.forEach(function(line, i) {
      els.push({ type: 'text', text: line, x: 30, y: 70 + i * 36, size: 16, color: c.textColor });
    });
    return els;
  },
  rawXml(c) {
    var lines = [c.line1, c.line2, c.line3, c.line4].filter(Boolean);
    var xml = [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '快捷便签') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 标题强调线 -->',
      '    <Rectangle x="0" y="10" w="4" h="20" fillColor="' + c.accentColor + '" cornerRadius="2" />',
      '',
      '    <!-- 标题 -->',
      '    <Text x="13" y="10" size="18" color="' + c.titleColor + '" text="' + escXml(c.title || '今日待办') + '" bold="true" />',
    ];
    lines.forEach(function(line, i) {
      xml.push('    <Text x="5" y="' + (50 + i * 36) + '" size="16" color="' + c.textColor + '" text="' + escXml(line) + '" />');
    });
    xml.push('  </Group>');
    xml.push('</Widget>');
    return xml.join('\n');
  },
};
