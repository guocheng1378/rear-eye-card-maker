import { escXml } from '../maml.js';

export default {
  id: 'date_beauty', icon: '📅', name: '精美日期', desc: '大号日期显示，带节日/倒计时',
  updater: 'DateTime.Day',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '精美日期' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0f0f1a' },
    ]},
    { group: '样式', fields: [
      { key: 'dayColor', label: '日期数字颜色', type: 'color', default: '#ffffff' },
      { key: 'monthColor', label: '月份颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#ff6b6b' },
      { key: 'weekColor', label: '星期颜色', type: 'color', default: '#666666' },
      { key: 'countdownLabel', label: '倒计时标签', type: 'text', default: '距离新年' },
      { key: 'countdownDate', label: '倒计时日期(MMDD)', type: 'text', default: '0101' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'text', text: '2026', x: 30, y: 50, size: 18, color: c.monthColor, locked: true },
      { type: 'text', text: '04', x: 30, y: 80, size: 96, color: c.dayColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'rectangle', x: 30, y: 195, w: 50, h: 3, color: c.accentColor, radius: 1.5 },
      { type: 'text', text: '星期四', x: 30, y: 215, size: 16, color: c.weekColor },
      { type: 'text', text: c.countdownLabel + ': 272天', x: 30, y: 250, size: 13, color: c.accentColor },
    ];
  },
  rawXml(c) {
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Day" name="' + escXml(c.cardName || '精美日期') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 年份 -->',
      '    <Text x="0" y="30" size="18" color="' + c.monthColor + '" textExp="#year" />',
      '',
      '    <!-- 大号日期 -->',
      '    <Text x="0" y="60" size="96" color="' + c.dayColor + '" textExp="formatDate(\'dd\', #time_sys)" bold="true" fontFamily="mipro-demibold" />',
      '',
      '    <!-- 强调线 -->',
      '    <Rectangle x="0" y="175" w="50" h="3" fillColor="' + c.accentColor + '" cornerRadius="1.5" />',
      '',
      '    <!-- 星期 -->',
      '    <Text x="0" y="195" size="16" color="' + c.weekColor + '" textExp="formatDate(\'EEEE\', #time_sys)" />',
      '',
      '    <!-- 月份 -->',
      '    <Text x="0" y="222" size="14" color="' + c.monthColor + '" textExp="formatDate(\'MM月\', #time_sys)" />',
      '',
      '    <!-- 倒计时 -->',
      '    <Text x="0" y="250" size="13" color="' + c.accentColor + '" textExp="' + escXml(c.countdownLabel || '距离新年') + ' + &quot;: &quot; + countDown(\'' + (c.countdownDate || '0101') + '\') + &quot;天&quot;" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
