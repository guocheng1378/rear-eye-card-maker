import { escXml } from '../maml.js';

export default {
  id: 'dailyquote', icon: '💊', name: '每日一句', desc: '每天自动切换一条语录',
  updater: 'DateTime.Day',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '每日一句' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '语录 (每天轮换一条)', fields: [
      { key: 'quote1', label: '语录 1', type: 'textarea', default: '生活不止眼前的苟且\n还有诗和远方' },
      { key: 'quote2', label: '语录 2', type: 'textarea', default: '世界上只有一种英雄主义\n就是在认清生活真相之后\n依然热爱生活' },
      { key: 'quote3', label: '语录 3', type: 'textarea', default: '万物皆有裂痕\n那是光照进来的地方' },
      { key: 'quote4', label: '语录 4', type: 'textarea', default: '凡是过往\n皆为序章' },
      { key: 'quote5', label: '语录 5', type: 'textarea', default: '知足且上进\n温柔而坚定' },
      { key: 'quote6', label: '语录 6', type: 'textarea', default: '不乱于心\n不困于情\n不畏将来\n不念过往' },
      { key: 'quote7', label: '语录 7', type: 'textarea', default: '愿你出走半生\n归来仍是少年' },
    ]},
    { group: '样式', fields: [
      { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      { key: 'textSize', label: '字号', type: 'range', min: 18, max: 48, default: 26 },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'dayColor', label: '日期颜色', type: 'color', default: '#555555' },
    ]},
  ],
  elements(c) {
    var quotes = [c.quote1, c.quote2, c.quote3, c.quote4, c.quote5, c.quote6, c.quote7].filter(Boolean);
    if (quotes.length === 0) quotes = ['每日一句'];
    var textExpr = "'" + escXml(quotes[quotes.length - 1]).replace(/\n/g, '\\n') + "'";
    for (var i = quotes.length - 2; i >= 0; i--) {
      textExpr = "ifelse((#dayIdx == " + i + "), '" + escXml(quotes[i]).replace(/\n/g, '\\n') + "', " + textExpr + ")";
    }
    var safeW = Math.round(976 * (1 - 0.3)) - 20;
    return [
      { type: 'rectangle', x: 10, y: 42, w: 24, h: 3, color: c.accentColor, radius: 1.5, locked: false },
      { type: 'text', expression: textExpr, text: quotes[0], x: 10, y: 56, size: Number(c.textSize), color: c.textColor, multiLine: true, w: safeW, lineHeight: 1.5, fontFamily: 'mipro-demibold', locked: false },
      { type: 'text', expression: "formatDate('MM/dd EEEE', #time_sys)", text: '04/08 星期二', x: 10, y: 596 - 50, size: 12, color: c.dayColor, locked: false, opacity: 50 },
    ];
  },
  rawXml(c) {
    var quotes = [c.quote1, c.quote2, c.quote3, c.quote4, c.quote5, c.quote6, c.quote7].filter(Boolean);
    if (quotes.length === 0) quotes = ['每日一句'];
    var ts = Number(c.textSize) || 26;
    var safeW = '(#view_width - #marginL - 40)';

    // Build text expression for switching quotes
    var textExpr = "'" + escXml(quotes[quotes.length - 1]).replace(/\n/g, '\\n') + "'";
    for (var i = quotes.length - 2; i >= 0; i--) {
      textExpr = "ifelse((#dayIdx == " + i + "), '" + escXml(quotes[i]).replace(/\n/g, '\\n') + "', " + textExpr + ")";
    }

    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Day" name="' + escXml(c.cardName || '每日一句') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <Var name="dayIdx" type="number" expression="((#year * 366 + #month * 31 + #date) % ' + quotes.length + ')" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 每日一句内容组 -->');
    lines.push('  <Group name="dailyquote_content" x="#marginL" y="0" w="' + safeW + '">');
    lines.push('    <!-- 强调色标记 -->');
    lines.push('    <Rectangle x="0" y="42" w="24" h="3" fillColor="' + c.accentColor + '" cornerRadius="1.5" />');
    lines.push('    <!-- 语录文字 -->');
    lines.push('    <Text x="0" y="56" size="' + ts + '" color="' + c.textColor + '" textExp="' + textExpr + '" w="' + safeW + '" multiLine="true" lineHeight="1.5" fontFamily="mipro-demibold" />');
    lines.push('    <!-- 日期 -->');
    lines.push('    <Text x="0" y="(#view_height - 50)" size="12" color="' + c.dayColor + '" textExp="formatDate(\'MM/dd EEEE\', #time_sys)" alpha="0.5" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
