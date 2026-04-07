import { escXml } from '../maml.js';

export default {
  id: 'schedule', icon: '📅', name: '日程卡片', desc: '绑定系统日历，显示今日/近期日程',
  updater: 'DateTime.Hour,DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '日程卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0d1117' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '显示设置', fields: [
      { key: 'maxEvents', label: '最大显示数', type: 'range', min: 1, max: 5, default: 3 },
      { key: 'showTime', label: '显示时间', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
    ]},
    { group: '样式', fields: [
      { key: 'dateColor', label: '日期颜色', type: 'color', default: '#ffffff' },
      { key: 'eventTitleColor', label: '事件标题颜色', type: 'color', default: '#e0e0e0' },
      { key: 'eventTimeColor', label: '事件时间颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'dotColor', label: '标记点颜色', type: 'color', default: '#00b894' },
    ]},
  ],
  rawXml(c) {
    var maxEvents = c.maxEvents || 3;
    var showTime = c.showTime !== 'false';
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Hour,DateTime.Minute" name="' + escXml(c.cardName || '日程卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <VariableBinders>');
    lines.push('    <ContentProviderBinder name="calendar_provider" uri="content://com.android.calendar/events" columns="title,dtstart,dtend,allDay" sortOrder="dtstart ASC" limit="' + maxEvents + '">');
    lines.push('      <Variable name="event_title_0" type="string" column="title" />');
    lines.push('      <Variable name="event_start_0" type="long" column="dtstart" />');
    lines.push('      <Variable name="event_end_0" type="long" column="dtend" />');
    lines.push('      <Variable name="event_allday_0" type="int" column="allDay" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('  </VariableBinders>');
    lines.push('');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('  <Group x="#marginL" y="20" w="(#view_width - #marginL - 40)">');

    // Date header
    lines.push('    <Text textExp="formatDate(\'MM月dd日\', #time_sys)" x="0" y="0" size="14" color="' + c.eventTimeColor + '" />');
    lines.push('    <Text textExp="formatDate(\'EEEE\', #time_sys)" x="0" y="20" size="26" color="' + c.dateColor + '" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Rectangle x="0" y="54" w="30" h="2" fillColor="' + c.accentColor + '" cornerRadius="1" />');

    // Events
    for (var i = 0; i < maxEvents; i++) {
      var yBase = 72 + i * 60;
      lines.push('    <!-- Event ' + i + ' -->');
      lines.push('    <Rectangle x="0" y="' + yBase + '" w="4" h="4" fillColor="' + c.dotColor + '" cornerRadius="2" />');
      if (showTime) {
        lines.push('    <Text textExp="formatDate(\'HH:mm\', #event_start_' + i + ')" x="14" y="' + (yBase - 2) + '" size="12" color="' + c.eventTimeColor + '" />');
        lines.push('    <Text textExp="@event_title_' + i + '" x="70" y="' + (yBase - 2) + '" size="14" color="' + c.eventTitleColor + '" w="(#view_width - #marginL - 110)" ellipsis="true" />');
      } else {
        lines.push('    <Text textExp="@event_title_' + i + '" x="14" y="' + (yBase - 2) + '" size="14" color="' + c.eventTitleColor + '" w="(#view_width - #marginL - 54)" ellipsis="true" />');
      }
    }

    lines.push('  </Group>');
    lines.push('</Widget>');
    return lines.join('\n');
  },
};
