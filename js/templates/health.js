import { escXml } from '../maml.js';

export default {
  id: 'health', icon: '❤️', name: '健康数据卡片', desc: '绑定系统健康数据：心率/血氧/步数/睡眠',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '健康卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a1628' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '显示项', fields: [
      { key: 'showHeartRate', label: '显示心率', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'showBloodOxygen', label: '显示血氧', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'showSteps', label: '显示步数', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'showSleep', label: '显示睡眠', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '标题颜色', type: 'color', default: '#ffffff' },
      { key: 'valueColor', label: '数值颜色', type: 'color', default: '#ffffff' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#e74c3c' },
      { key: 'barColor', label: '进度条颜色', type: 'color', default: '#6c5ce7' },
    ]},
  ],
  rawXml(c) {
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '健康卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <VariableBinders>');
    lines.push('    <ContentProviderBinder name="health_provider" uri="content://com.xiaomi.health/data" columns="heart_rate,blood_oxygen,steps,sleep_hours,sleep_quality">');
    lines.push('      <Variable name="health_heart_rate" type="int" column="heart_rate" />');
    lines.push('      <Variable name="health_blood_oxygen" type="int" column="blood_oxygen" />');
    lines.push('      <Variable name="health_steps" type="int" column="steps" />');
    lines.push('      <Variable name="health_sleep_hours" type="float" column="sleep_hours" />');
    lines.push('      <Variable name="health_sleep_quality" type="string" column="sleep_quality" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('    <ContentProviderBinder name="step_provider" uri="content://com.miui.step/counter" columns="step_count">');
    lines.push('      <Variable name="step_count" type="int" column="step_count" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('  </VariableBinders>');
    lines.push('');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('  <Group x="#marginL" y="20" w="(#view_width - #marginL - 40)">');

    var showHR = c.showHeartRate !== 'false';
    var showBO = c.showBloodOxygen !== 'false';
    var showST = c.showSteps !== 'false';
    var showSL = c.showSleep !== 'false';

    lines.push('    <Text text="健康数据" x="0" y="0" size="18" color="' + c.titleColor + '" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Rectangle x="0" y="28" w="40" h="2" fillColor="' + c.accentColor + '" cornerRadius="1" />');

    var colW = '((#view_width - #marginL - 40) / 2)';
    var y = 48;

    if (showHR) {
      lines.push('    <!-- 心率 -->');
      lines.push('    <Text text="❤️ 心率" x="0" y="' + y + '" size="12" color="' + c.labelColor + '" />');
      lines.push('    <Text textExp="(#health_heart_rate > 0 ? #health_heart_rate : \'--\')" x="0" y="' + (y + 20) + '" size="28" color="' + c.accentColor + '" bold="true" fontFamily="mipro-demibold" />');
      lines.push('    <Text text="BPM" x="0" y="' + (y + 52) + '" size="10" color="' + c.labelColor + '" alpha="153" />');
      y += 75;
    }

    if (showBO) {
      lines.push('    <!-- 血氧 -->');
      lines.push('    <Text text="🩸 血氧" x="' + colW + '" y="' + (showHR ? 48 : y) + '" size="12" color="' + c.labelColor + '" />');
      lines.push('    <Text textExp="(#health_blood_oxygen > 0 ? concat(#health_blood_oxygen, \'%\') : \'--\')" x="' + colW + '" y="' + ((showHR ? 48 : y) + 20) + '" size="28" color="' + c.valueColor + '" bold="true" fontFamily="mipro-demibold" />');
      lines.push('    <Text text="SpO₂" x="' + colW + '" y="' + ((showHR ? 48 : y) + 52) + '" size="10" color="' + c.labelColor + '" alpha="153" />');
      if (showHR) y += 75;
    }

    if (showST) {
      lines.push('    <!-- 步数 -->');
      lines.push('    <Rectangle x="0" y="' + y + '" w="(#view_width - #marginL - 40)" h="1" fillColor="#1a2040" />');
      y += 10;
      lines.push('    <Text text="🏃 步数" x="0" y="' + y + '" size="12" color="' + c.labelColor + '" />');
      lines.push('    <Text textExp="#step_count" x="0" y="' + (y + 20) + '" size="24" color="' + c.valueColor + '" bold="true" fontFamily="mipro-demibold" />');
      lines.push('    <Rectangle x="0" y="' + (y + 50) + '" w="(#view_width - #marginL - 40)" h="4" fillColor="#1a2040" cornerRadius="2" />');
      lines.push('    <Rectangle x="0" y="' + (y + 50) + '" w="clamp((#view_width - #marginL - 40) * #step_count / 10000, 0, (#view_width - #marginL - 40))" h="4" fillColor="' + c.barColor + '" cornerRadius="2" />');
      lines.push('    <Text text="目标 10,000 步" x="0" y="' + (y + 62) + '" size="10" color="' + c.labelColor + '" alpha="128" />');
      y += 82;
    }

    if (showSL) {
      lines.push('    <!-- 睡眠 -->');
      lines.push('    <Rectangle x="0" y="' + y + '" w="(#view_width - #marginL - 40)" h="1" fillColor="#1a2040" />');
      y += 10;
      lines.push('    <Text text="😴 睡眠" x="0" y="' + y + '" size="12" color="' + c.labelColor + '" />');
      lines.push('    <Text textExp="(#health_sleep_hours > 0 ? concat(floor(#health_sleep_hours), \'h\', floor((#health_sleep_hours - floor(#health_sleep_hours)) * 60), \'m\') : \'--\')" x="0" y="' + (y + 20) + '" size="24" color="' + c.valueColor + '" bold="true" fontFamily="mipro-demibold" />');
      lines.push('    <Text textExp="#health_sleep_quality" x="0" y="' + (y + 50) + '" size="12" color="' + c.barColor + '" />');
    }

    lines.push('  </Group>');
    lines.push('</Widget>');
    return lines.join('\n');
  },
};
