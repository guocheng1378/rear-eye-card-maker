import { escXml } from '../maml.js';

export default {
  id: 'dual_clock', icon: '🌍', name: '双时区时钟', desc: '同时显示两个时区的时间',
  updater: 'DateTime.Second',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '双时区' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0e1a' },
    ]},
    { group: '本地时间', fields: [
      { key: 'localLabel', label: '本地标签', type: 'text', default: '北京' },
      { key: 'localColor', label: '本地时间颜色', type: 'color', default: '#ffffff' },
    ]},
    { group: '远程时间', fields: [
      { key: 'remoteLabel', label: '远程标签', type: 'text', default: '纽约' },
      { key: 'remoteColor', label: '远程时间颜色', type: 'color', default: '#4fc3f7' },
      { key: 'remoteOffset', label: '时差(小时)', type: 'range', min: -12, max: 12, default: -13 },
    ]},
    { group: '样式', fields: [
      { key: 'dividerColor', label: '分隔线颜色', type: 'color', default: '#333333' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#666666' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      // 本地时间
      { type: 'text', text: c.localLabel, x: 30, y: 50, size: 13, color: c.labelColor },
      { type: 'text', text: '10:30', x: 30, y: 75, size: 52, color: c.localColor, bold: true, fontFamily: 'mipro-demibold' },
      // 分隔线
      { type: 'rectangle', x: 30, y: 145, w: 250, h: 1, color: c.dividerColor },
      // 远程时间
      { type: 'text', text: c.remoteLabel, x: 30, y: 165, size: 13, color: c.labelColor },
      { type: 'text', text: '21:30', x: 30, y: 190, size: 52, color: c.remoteColor, bold: true, fontFamily: 'mipro-demibold' },
      // 日期
      { type: 'text', text: '2026/04/10 星期四', x: 30, y: 260, size: 13, color: c.labelColor },
    ];
  },
  rawXml(c) {
    var offset = c.remoteOffset || -13;
    return [
      '<Widget screenWidth="976" frameRate="30" scaleByDensity="false" useVariableUpdater="DateTime.Second" name="' + escXml(c.cardName || '双时区') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 本地时间标签 -->',
      '    <Text x="0" y="30" size="13" color="' + c.labelColor + '" text="' + escXml(c.localLabel || '北京') + '" />',
      '',
      '    <!-- 本地时间 -->',
      '    <Text x="0" y="55" size="52" color="' + c.localColor + '" textExp="formatDate(\'HH:mm\', #time_sys)" bold="true" fontFamily="mipro-demibold" />',
      '',
      '    <!-- 分隔线 -->',
      '    <Rectangle x="0" y="125" w="250" h="1" fillColor="' + c.dividerColor + '" />',
      '',
      '    <!-- 远程时间标签 -->',
      '    <Text x="0" y="145" size="13" color="' + c.labelColor + '" text="' + escXml(c.remoteLabel || '纽约') + '" />',
      '',
      '    <!-- 远程时间（带时差偏移） -->',
      '    <Text x="0" y="170" size="52" color="' + c.remoteColor + '" textExp="formatDate(\'HH:mm\', #time_sys + ' + (offset * 3600000) + ')" bold="true" fontFamily="mipro-demibold" />',
      '',
      '    <!-- 日期 -->',
      '    <Text x="0" y="240" size="13" color="' + c.labelColor + '" textExp="formatDate(\'yyyy/MM/dd EEEE\', #time_sys)" />',
      '',
      '    <!-- 秒数（闪烁） -->',
      '    <Text x="0" y="265" size="11" color="#444444" textExp="formatDate(\'ss\', #time_sys) + &quot; 秒&quot;">',
      '      <AlphaAnimation repeat="-1">',
      '        <A time="0" alpha="0.4" />',
      '        <A time="500" alpha="0.8" />',
      '        <A time="1000" alpha="0.4" />',
      '      </AlphaAnimation>',
      '    </Text>',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
