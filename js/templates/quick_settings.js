import { escXml } from '../maml.js';

export default {
  id: 'quick_settings', icon: '⚡', name: '快捷开关卡片', desc: '显示 WiFi/蓝牙/亮度等系统开关状态',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '快捷开关' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0e1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '显示开关', fields: [
      { key: 'showWifi', label: 'WiFi', type: 'select', default: 'true', options: [{ v: 'true', l: '显示' }, { v: 'false', l: '隐藏' }]},
      { key: 'showBluetooth', label: '蓝牙', type: 'select', default: 'true', options: [{ v: 'true', l: '显示' }, { v: 'false', l: '隐藏' }]},
      { key: 'showBrightness', label: '亮度', type: 'select', default: 'true', options: [{ v: 'true', l: '显示' }, { v: 'false', l: '隐藏' }]},
      { key: 'showSilent', label: '静音', type: 'select', default: 'true', options: [{ v: 'true', l: '显示' }, { v: 'false', l: '隐藏' }]},
      { key: 'showNfc', label: 'NFC', type: 'select', default: 'true', options: [{ v: 'true', l: '显示' }, { v: 'false', l: '隐藏' }]},
      { key: 'showFlashlight', label: '手电筒', type: 'select', default: 'true', options: [{ v: 'true', l: '显示' }, { v: 'false', l: '隐藏' }]},
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '标题颜色', type: 'color', default: '#ffffff' },
      { key: 'activeColor', label: '开启颜色', type: 'color', default: '#6c5ce7' },
      { key: 'inactiveColor', label: '关闭颜色', type: 'color', default: '#333333' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#888888' },
      { key: 'iconSize', label: '图标大小', type: 'range', min: 24, max: 56, default: 40 },
    ]},
  ],
  rawXml(c) {
    var iconSize = c.iconSize || 40;
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '快捷开关') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <VariableBinders>');
    lines.push('    <ContentProviderBinder name="settings_provider" uri="content://com.android.systemui/settings" columns="wifi_state,bluetooth_state,brightness_level,silent_mode,nfc_state,flashlight_state">');
    lines.push('      <Variable name="qs_wifi" type="int" column="wifi_state" />');
    lines.push('      <Variable name="qs_bt" type="int" column="bluetooth_state" />');
    lines.push('      <Variable name="qs_brightness" type="int" column="brightness_level" />');
    lines.push('      <Variable name="qs_silent" type="int" column="silent_mode" />');
    lines.push('      <Variable name="qs_nfc" type="int" column="nfc_state" />');
    lines.push('      <Variable name="qs_flash" type="int" column="flashlight_state" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('  </VariableBinders>');
    lines.push('');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('  <Group x="#marginL" y="20" w="(#view_width - #marginL - 40)">');
    lines.push('    <Text text="快捷设置" x="0" y="0" size="16" color="' + c.titleColor + '" bold="true" fontFamily="mipro-demibold" />');

    var toggles = [];
    if (c.showWifi !== 'false') toggles.push({ icon: '📶', label: 'WiFi', var: '#qs_wifi' });
    if (c.showBluetooth !== 'false') toggles.push({ icon: '🔵', label: '蓝牙', var: '#qs_bt' });
    if (c.showBrightness !== 'false') toggles.push({ icon: '☀️', label: '亮度', var: '#qs_brightness', isSlider: true });
    if (c.showSilent !== 'false') toggles.push({ icon: '🔇', label: '静音', var: '#qs_silent' });
    if (c.showNfc !== 'false') toggles.push({ icon: '📡', label: 'NFC', var: '#qs_nfc' });
    if (c.showFlashlight !== 'false') toggles.push({ icon: '🔦', label: '手电', var: '#qs_flash' });

    var cols = 3;
    var cellW = '((#view_width - #marginL - 40) / ' + cols + ')';

    toggles.forEach(function (t, i) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var x = '(' + cellW + ' * ' + col + ')';
      var y = 30 + row * 72;

      if (t.isSlider) {
        lines.push('    <!-- ' + t.label + ' (slider) -->');
        lines.push('    <Text text="' + t.icon + '" x="' + x + '" y="' + y + '" size="20" />');
        lines.push('    <Rectangle x="' + x + '" y="' + (y + 30) + '" w="(' + cellW + ' - 16)" h="3" fillColor="' + c.inactiveColor + '" cornerRadius="1.5" />');
        lines.push('    <Rectangle x="' + x + '" y="' + (y + 30) + '" w="((' + cellW + ' - 16) * ' + t.var + ' / 255)" h="3" fillColor="' + c.activeColor + '" cornerRadius="1.5" />');
        lines.push('    <Text text="亮度" x="' + x + '" y="' + (y + 40) + '" size="10" color="' + c.labelColor + '" />');
      } else {
        lines.push('    <!-- ' + t.label + ' -->');
        lines.push('    <Circle x="(' + x + ' + ' + (iconSize / 2) + ')" y="' + (y + iconSize / 2) + '" r="' + (iconSize / 2) + '" fillColor="ifelse(' + t.var + ', ' + c.activeColor + ', ' + c.inactiveColor + ')" />');
        lines.push('    <Text text="' + t.icon + '" x="(' + x + ' + ' + ((iconSize - 20) / 2) + ')" y="' + (y + ((iconSize - 20) / 2)) + '" size="18" />');
        lines.push('    <Text text="' + t.label + '" x="' + x + '" y="' + (y + iconSize + 6) + '" size="10" color="' + c.labelColor + '" textAlign="center" w="' + cellW + '" />');
      }
    });

    lines.push('  </Group>');
    lines.push('</Widget>');
    return lines.join('\n');
  },
};
