import { escXml } from '../maml.js';

export default {
  id: 'smart_battery', icon: '🔋', name: '智能电池', desc: '根据电量条件切换显示样式',
  updater: 'Battery',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '智能电池' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a1a0a' },
    ]},
    { group: '阈值', fields: [
      { key: 'lowThreshold', label: '低电阈值', type: 'range', min: 5, max: 30, default: 20 },
      { key: 'highThreshold', label: '高电阈值', type: 'range', min: 70, max: 95, default: 80 },
    ]},
    { group: '颜色', fields: [
      { key: 'lowColor', label: '低电颜色', type: 'color', default: '#ff4444' },
      { key: 'midColor', label: '正常颜色', type: 'color', default: '#ffffff' },
      { key: 'highColor', label: '高电颜色', type: 'color', default: '#00e676' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'text', expression: '#battery_level + "%"', text: '85%', x: 30, y: 80, size: 64, color: c.midColor, bold: true, fontFamily: 'mipro-demibold' },
      { type: 'progress', x: 30, y: 170, w: 240, h: 6, value: 85, color: c.midColor, bgColor: '#333333', radius: 3 },
      { type: 'text', text: '电量', x: 30, y: 190, size: 14, color: '#666666' },
    ];
  },
  rawXml(c) {
    var lowT = c.lowThreshold || 20;
    var highT = c.highThreshold || 80;
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="Battery" name="' + escXml(c.cardName || '智能电池') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '  <Var name="lvl" type="number" expression="#battery_level" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 条件：低电警告 -->',
      '    <IfCommand condition="#lvl < ' + lowT + '">',
      '      <Consequent>',
      '        <Text x="0" y="70" size="64" color="' + c.lowColor + '" textExp="#battery_level + &quot;%&quot;" bold="true" fontFamily="mipro-demibold">',
      '          <AlphaAnimation repeat="-1">',
      '            <A time="0" alpha="1.0" />',
      '            <A time="500" alpha="0.3" />',
      '            <A time="1000" alpha="1.0" />',
      '          </AlphaAnimation>',
      '        </Text>',
      '        <Text x="0" y="140" size="14" color="' + c.lowColor + '" text="⚠️ 电量不足，请充电" />',
      '      </Consequent>',
      '      <Alternate>',
      '        <!-- 条件：高电 -->',
      '        <IfCommand condition="#lvl >= ' + highT + '">',
      '          <Consequent>',
      '            <Text x="0" y="70" size="64" color="' + c.highColor + '" textExp="#battery_level + &quot;%&quot;" bold="true" fontFamily="mipro-demibold" />',
      '            <Text x="0" y="140" size="14" color="' + c.highColor + '" text="✅ 电量充足" />',
      '          </Consequent>',
      '          <Alternate>',
      '            <Text x="0" y="70" size="64" color="' + c.midColor + '" textExp="#battery_level + &quot;%&quot;" bold="true" fontFamily="mipro-demibold" />',
      '          </Alternate>',
      '        </IfCommand>',
      '      </Alternate>',
      '    </IfCommand>',
      '',
      '    <!-- 进度条 -->',
      '    <Rectangle x="0" y="160" w="240" h="6" fillColor="#333333" cornerRadius="3" />',
      '    <Rectangle x="0" y="160" w="0" h="6" fillColor="' + c.midColor + '" cornerRadius="3" />',
      '      <!-- 进度条宽度随电量变化 -->',
      '    </Rectangle>',
      '    <Text x="0" y="178" size="12" color="#666666" textExp="(ge(#battery_state, 1) ? (eq(#battery_state, 3) ? &quot;已充满&quot; : &quot;充电中&quot;) : &quot;电量&quot;)" />',
      '',
      '    <!-- 底部信息 -->',
      '    <Text x="0" y="210" size="11" color="#444444" text="智能电池监控" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
