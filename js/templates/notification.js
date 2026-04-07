import { escXml } from '../maml.js';

export default {
  id: 'notification', icon: '🔔', name: '通知卡片', desc: '显示系统最新通知消息',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '通知卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '显示设置', fields: [
      { key: 'maxNotifs', label: '最大通知数', type: 'range', min: 1, max: 5, default: 3 },
      { key: 'showApp', label: '显示应用名', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'showTime', label: '显示时间', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '标题颜色', type: 'color', default: '#ffffff' },
      { key: 'bodyColor', label: '内容颜色', type: 'color', default: '#aaaaaa' },
      { key: 'appColor', label: '应用名颜色', type: 'color', default: '#6c5ce7' },
      { key: 'timeColor', label: '时间颜色', type: 'color', default: '#555555' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
    ]},
  ],
  rawXml(c) {
    var maxN = c.maxNotifs || 3;
    var showApp = c.showApp !== 'false';
    var showTime = c.showTime !== 'false';
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '通知卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <VariableBinders>');
    lines.push('    <ContentProviderBinder name="notification_provider" uri="content://com.android.notification/history" columns="app,title,body,pkg,time" sortOrder="time DESC" limit="' + maxN + '">');
    lines.push('      <Variable name="notif_app_0" type="string" column="app" />');
    lines.push('      <Variable name="notif_title_0" type="string" column="title" />');
    lines.push('      <Variable name="notif_body_0" type="string" column="body" />');
    lines.push('      <Variable name="notif_pkg_0" type="string" column="pkg" />');
    lines.push('      <Variable name="notif_time_0" type="long" column="time" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('  </VariableBinders>');
    lines.push('');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('  <Group x="#marginL" y="16" w="(#view_width - #marginL - 40)">');
    lines.push('    <Text text="通知" x="0" y="0" size="18" color="' + c.titleColor + '" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Rectangle x="0" y="26" w="24" h="2" fillColor="' + c.accentColor + '" cornerRadius="1" />');

    for (var i = 0; i < maxN; i++) {
      var yBase = 40 + i * 68;
      lines.push('    <!-- Notification ' + i + ' -->');
      lines.push('    <Rectangle x="0" y="' + yBase + '" w="(#view_width - #marginL - 40)" h="56" fillColor="#141418" cornerRadius="8" />');
      if (showApp) {
        lines.push('    <Text textExp="@notif_app_' + i + '" x="10" y="' + (yBase + 8) + '" size="10" color="' + c.appColor + '" w="(#view_width - #marginL - 60)" ellipsis="true" />');
      }
      lines.push('    <Text textExp="@notif_title_' + i + '" x="10" y="' + (yBase + (showApp ? 22 : 10)) + '" size="13" color="' + c.titleColor + '" bold="true" w="(#view_width - #marginL - 60)" ellipsis="true" />');
      lines.push('    <Text textExp="@notif_body_' + i + '" x="10" y="' + (yBase + (showApp ? 38 : 28)) + '" size="11" color="' + c.bodyColor + '" w="(#view_width - #marginL - 60)" ellipsis="true" />');
      if (showTime) {
        lines.push('    <Text textExp="formatDate(\'HH:mm\', #notif_time_' + i + ')" x="(#view_width - #marginL - 70)" y="' + (yBase + 8) + '" size="10" color="' + c.timeColor + '" textAlign="right" />');
      }
    }

    lines.push('  </Group>');
    lines.push('</Widget>');
    return lines.join('\n');
  },
};
