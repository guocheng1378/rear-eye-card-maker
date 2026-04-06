JCM.TEMPLATES = [
  // ─── 时钟 ───
  {
    id: 'clock', icon: '⏰', name: '时钟卡片', desc: '显示当前时间和日期',
    updater: 'DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '时钟卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
        { key: 'dateColor', label: '日期颜色', type: 'color', default: '#888888' },
        { key: 'timeSize', label: '时间字号', type: 'range', min: 24, max: 96, default: 64 },
      ]},
      { group: '格式', fields: [
        { key: 'dateFormat', label: '日期格式', type: 'select', options: [
          { v: 'yyyy/MM/dd EEEE', l: '2026/04/04 星期五' },
          { v: 'MM-dd EEEE', l: '04-04 星期五' },
          { v: 'MM/dd', l: '04/04' },
        ], default: 'yyyy/MM/dd EEEE' },
        { key: 'timeFormat', label: '时间格式', type: 'select', options: [
          { v: 'HH:mm', l: '24小时制' },
          { v: 'hh:mm a', l: '12小时制' },
        ], default: 'HH:mm' },
      ]},
    ],
    gen: function (c) {
      var dateY = 80 + Number(c.timeSize) * 0.9;
      return [
        JCM.generateAutoDetectMAML(),
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Text textExp="formatDate(\'' + c.timeFormat + '\', #time_sys)" x="0" y="80" size="' + c.timeSize + '" color="' + c.timeColor + '" />',
        '    <Text textExp="formatDate(\'' + c.dateFormat + '\', #time_sys)" x="0" y="' + Math.round(dateY) + '" size="20" color="' + c.dateColor + '" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 名言 ───
  {
    id: 'quote', icon: '💬', name: '名言卡片', desc: '显示一段文字或名言',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '名言卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a2e' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '内容', fields: [
        { key: 'text', label: '文字内容', type: 'textarea', default: 'Stay hungry.\nStay foolish.' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
        { key: 'textSize', label: '字号', type: 'range', min: 14, max: 64, default: 28 },
        { key: 'author', label: '作者', type: 'text', default: '— Steve Jobs' },
        { key: 'authorColor', label: '作者颜色', type: 'color', default: '#6c5ce7' },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="40" w="#safeW">',
        '    <Text text="' + JCM.escXml(c.text) + '" size="' + c.textSize + '" color="' + c.textColor + '" w="#safeW" multiLine="true" />',
        '    <Text text="' + JCM.escXml(c.author) + '" x="0" y="(#view_height - 80)" size="16" color="' + c.authorColor + '" w="#safeW" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 电池 ───
  {
    id: 'battery', icon: '🔋', name: '电池卡片', desc: '显示电池电量和状态',
    updater: 'Battery',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '电池卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0d1117' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'barColor', label: '电量条颜色', type: 'color', default: '#00b894' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
        { key: 'demoLevel', label: '预览电量 (0-100)', type: 'range', min: 0, max: 100, default: 78 },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />',
        '  <Var name="barW" type="number" expression="(#safeW * #battery_level / 100)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Text text="电量" x="0" y="50" size="18" color="' + c.textColor + '" alpha="153" />',
        '    <Text textExp="(#battery_level + \'%\')" x="0" y="80" size="56" color="' + c.textColor + '" />',
        '    <Rectangle x="0" y="160" w="#safeW" h="12" fillColor="#333333" cornerRadius="6" />',
        '    <Rectangle x="0" y="160" w="#barW" h="12" fillColor="' + c.barColor + '" cornerRadius="6" />',
        '    <Text textExp="ifelse((#battery_level >= 80), \'电量充足\', ifelse((#battery_level >= 20), \'电量偏低\', \'电量极低\'))"',
        '          x="0" y="200" size="16" color="' + c.textColor + '" alpha="128" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 状态 ───
  {
    id: 'status', icon: '📊', name: '状态卡片', desc: '显示多个状态指标',
    updater: 'DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '状态卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0f0f1a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
        { key: 'title', label: '标题', type: 'text', default: '系统状态' },
      ]},
      { group: '项目', fields: [
        { key: 'item1', label: '项目1', type: 'text', default: 'WiFi: 已连接' },
        { key: 'item2', label: '项目2', type: 'text', default: '蓝牙: 已开启' },
        { key: 'item3', label: '项目3', type: 'text', default: 'GPS: 已关闭' },
        { key: 'item4', label: '项目4', type: 'text', default: 'NFC: 已开启' },
      ]},
      { group: '样式', fields: [
        { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#e0e0e0' },
      ]},
    ],
    gen: function (c) {
      var items = [c.item1, c.item2, c.item3, c.item4].filter(Boolean);
      var lines = [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0" w="#safeW">',
        '    <Rectangle x="0" y="40" w="4" h="24" fillColor="' + c.accentColor + '" cornerRadius="2" />',
        '    <Text text="' + JCM.escXml(c.title) + '" x="14" y="42" size="22" color="' + c.textColor + '" w="(#safeW - 14)" />',
      ];
      items.forEach(function (t, i) {
        lines.push('    <Text text="' + JCM.escXml(t) + '" x="14" y="' + (90 + i * 40) + '" size="16" color="' + c.textColor + '" alpha="204" w="(#safeW - 14)" />');
      });
      lines.push('  </Group>');
      return lines.join('\n');
    },
  },

  // ─── 倒计时 ───
  {
    id: 'countdown', icon: '⏳', name: '倒计时卡片', desc: '倒计时到指定日期',
    updater: 'DateTime.Day',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '倒计时卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a0a2e' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '内容', fields: [
        { key: 'eventName', label: '事件名称', type: 'text', default: '距离新年' },
        { key: 'targetDate', label: '目标日期 (MMdd，如 0101=1月1日)', type: 'text', default: '0101' },
      ]},
      { group: '样式', fields: [
        { key: 'accentColor', label: '强调色', type: 'color', default: '#a29bfe' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      ]},
    ],
    gen: function (c) {
      var td = String(c.targetDate || '0101');
      var validTd = /^\d{4}$/.test(td) ? td : '0101';
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="m" type="number" expression="#month" />',
        '  <Var name="d" type="number" expression="#date" />',
        '  <Var name="doy_base" type="number" expression="(ifelse((#m == 1), 0, ifelse((#m == 2), 31, ifelse((#m == 3), 59, ifelse((#m == 4), 90, ifelse((#m == 5), 120, ifelse((#m == 6), 151, ifelse((#m == 7), 181, ifelse((#m == 8), 212, ifelse((#m == 9), 243, ifelse((#m == 10), 273, ifelse((#m == 11), 304, 334)))))))))))" />',
        '  <Var name="doy_leap" type="number" expression="ifelse((#year % 4 == 0), ifelse((#m >= 3), 1, 0), 0)" />',
        '  <Var name="doy" type="number" expression="(#doy_base + #d + #doy_leap)" />',
        '  <Var name="target" type="number" expression="' + validTd + '" />',
        '  <Var name="tMonth" type="number" expression="floor(#target / 100)" />',
        '  <Var name="tDay" type="number" expression="(#target - #tMonth * 100)" />',
        '  <Var name="tdoy_base" type="number" expression="(ifelse((#tMonth == 1), 0, ifelse((#tMonth == 2), 31, ifelse((#tMonth == 3), 59, ifelse((#tMonth == 4), 90, ifelse((#tMonth == 5), 120, ifelse((#tMonth == 6), 151, ifelse((#tMonth == 7), 181, ifelse((#tMonth == 8), 212, ifelse((#tMonth == 9), 243, ifelse((#tMonth == 10), 273, ifelse((#tMonth == 11), 304, 334)))))))))))" />',
        '  <Var name="tdoy_leap" type="number" expression="ifelse((#year % 4 == 0), ifelse((#tMonth >= 3), 1, 0), 0)" />',
        '  <Var name="tdoy" type="number" expression="(#tdoy_base + #tDay + #tdoy_leap)" />',
        '  <Var name="daysLeft" type="number" expression="(365 + ifelse((#year % 4 == 0), 1, 0) - #doy)" />',
        '  <Var name="diff" type="number" expression="ifelse((#tdoy >= #doy), (#tdoy - #doy), (#daysLeft + #tdoy))" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Text text="' + JCM.escXml(c.eventName) + '" x="0" y="50" size="18" color="' + c.textColor + '" alpha="153" />',
        '    <Text textExp="#diff" x="0" y="80" size="72" color="' + c.accentColor + '" />',
        '    <Text text="天" x="0" y="160" size="20" color="' + c.textColor + '" alpha="128" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 音乐 ───
  {
    id: 'music', icon: '🎵', name: '音乐信息卡片', desc: '显示歌曲名和歌手',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '内容', fields: [
        { key: 'songName', label: '歌曲名称', type: 'text', default: '歌曲名称' },
        { key: 'artistName', label: '歌手名称', type: 'text', default: '歌手名称' },
      ]},
      { group: '样式', fields: [
        { key: 'titleColor', label: '歌名颜色', type: 'color', default: '#ffffff' },
        { key: 'artistColor', label: '歌手颜色', type: 'color', default: '#888888' },
        { key: 'accentColor', label: '强调色', type: 'color', default: '#1db954' },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Rectangle x="0" y="40" w="48" h="48" fillColor="' + c.accentColor + '" cornerRadius="12" />',
        '    <Text text="♪" x="14" y="52" size="28" color="#ffffff" />',
        '    <Text text="正在播放" x="60" y="48" size="12" color="' + c.accentColor + '" />',
        '    <Text text="' + JCM.escXml(c.songName) + '" x="0" y="120" size="24" color="' + c.titleColor + '" />',
        '    <Text text="' + JCM.escXml(c.artistName) + '" x="0" y="152" size="16" color="' + c.artistColor + '" />',
        '    <Rectangle x="0" y="200" w="#safeW" h="3" fillColor="#333333" cornerRadius="1.5" />',
        '    <Rectangle x="0" y="200" w="(#safeW * 0.4)" h="3" fillColor="' + c.accentColor + '" cornerRadius="1.5" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 渐变 ───
  {
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
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor1 + '" />',
        '  <Rectangle x="(#view_width * 0.5)" w="(#view_width * 0.5)" h="#view_height" fillColor="' + c.bgColor2 + '" alpha="179" />',
        '  <Group x="#marginL" y="0" w="#safeW" h="#view_height">',
        '    <Text text="' + JCM.escXml(c.text) + '" x="0" y="(#view_height * 0.3)" size="' + c.textSize + '" color="' + c.textColor + '" w="#safeW" multiLine="true" textAlign="center" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 天气 ───
  {
    id: 'weather', icon: '🌤️', name: '天气卡片', desc: '显示当前天气和温度',
    updater: 'Weather',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '天气卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a1628' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '天气', fields: [
        { key: 'city', label: '城市', type: 'text', default: '北京' },
        { key: 'tempColor', label: '温度颜色', type: 'color', default: '#ffffff' },
        { key: 'tempSize', label: '温度字号', type: 'range', min: 36, max: 96, default: 64 },
        { key: 'descColor', label: '描述颜色', type: 'color', default: '#88aacc' },
        { key: 'accentColor', label: '强调色', type: 'color', default: '#4ecdc4' },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Text text="' + JCM.escXml(c.city) + '" x="0" y="30" size="14" color="' + c.descColor + '" alpha="179" />',
        '    <Text textExp="(#weather_temp + \'°\')" x="0" y="60" size="' + c.tempSize + '" color="' + c.tempColor + '" />',
        '    <Text textExp="#weather_desc" x="0" y="140" size="18" color="' + c.descColor + '" />',
        '    <Text textExp="(\'湿度 \' + #weather_humidity + \'%\')" x="0" y="170" size="14" color="' + c.descColor + '" alpha="128" />',
        '    <Text textExp="(\'体感 \' + #weather_feels_like + \'°\')" x="100" y="170" size="14" color="' + c.descColor + '" alpha="128" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 步数 ───
  {
    id: 'steps', icon: '🏃', name: '步数卡片', desc: '显示今日步数和运动数据',
    updater: 'Step',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '步数卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'goal', label: '目标步数', type: 'text', default: '10000' },
        { key: 'barColor', label: '进度条颜色', type: 'color', default: '#ff6b6b' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
        { key: 'accentColor', label: '强调色', type: 'color', default: '#ff6b6b' },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />',
        '  <Var name="goalN" type="number" expression="' + (parseInt(c.goal) || 10000) + '" />',
        '  <Var name="pct" type="number" expression="ifelse((#step_count > #goalN), 100, (#step_count * 100 / #goalN))" />',
        '  <Var name="barW" type="number" expression="(#safeW * #pct / 100)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Text text="今日步数" x="0" y="30" size="14" color="' + c.textColor + '" alpha="128" />',
        '    <Text textExp="#step_count" x="0" y="50" size="52" color="' + c.textColor + '" />',
        '    <Text text="步" x="0" y="112" size="16" color="' + c.textColor + '" alpha="128" />',
        '    <Rectangle x="0" y="140" w="#safeW" h="8" fillColor="#222222" cornerRadius="4" />',
        '    <Rectangle x="0" y="140" w="#barW" h="8" fillColor="' + c.barColor + '" cornerRadius="4" />',
        '    <Text textExp="(\'目标 \' + #goalN + \' · \' + #pct + \'%\')" x="0" y="160" size="12" color="' + c.textColor + '" alpha="102" />',
        '    <Text textExp="(\'距离 \' + #step_distance + \' km\')" x="0" y="190" size="14" color="' + c.accentColor + '" alpha="179" />',
        '    <Text textExp="(\'消耗 \' + #step_calorie + \' kcal\')" x="120" y="190" size="14" color="' + c.accentColor + '" alpha="179" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 日历 ───
  {
    id: 'calendar', icon: '📅', name: '日历卡片', desc: '显示日期和简要日程',
    updater: 'DateTime.Day',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '日历卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0f0f1a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'dayColor', label: '日期颜色', type: 'color', default: '#ffffff' },
        { key: 'daySize', label: '日期字号', type: 'range', min: 36, max: 96, default: 72 },
        { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#aaaaaa' },
      ]},
      { group: '内容', fields: [
        { key: 'event1', label: '日程1', type: 'text', default: '09:00 团队会议' },
        { key: 'event2', label: '日程2', type: 'text', default: '14:30 代码评审' },
        { key: 'event3', label: '日程3', type: 'text', default: '' },
      ]},
    ],
    gen: function (c) {
      var events = [c.event1, c.event2, c.event3].filter(Boolean);
      var lines = [
        JCM.generateAutoDetectMAML(),
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0">',
        '    <Text textExp="formatDate(\'MM/dd\', #time_sys)" x="0" y="20" size="14" color="' + c.textColor + '" alpha="128" />',
        '    <Text textExp="formatDate(\'EEEE\', #time_sys)" x="0" y="40" size="18" color="' + c.accentColor + '" />',
        '    <Text textExp="formatDate(\'dd\', #time_sys)" x="0" y="55" size="' + c.daySize + '" color="' + c.dayColor + '" />',
      ];
      events.forEach(function (e, i) {
        lines.push('    <Text text="' + JCM.escXml(e) + '" x="0" y="' + (150 + i * 28) + '" size="14" color="' + c.textColor + '" />');
      });
      lines.push('  </Group>');
      return lines.join('\n');
    },
  },

  // ─── 双时钟 ───
  {
    id: 'dualclock', icon: '🌏', name: '双时钟', desc: '同时显示两个时区的时间',
    updater: 'DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '双时钟' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '城市 1', fields: [
        { key: 'city1', label: '城市名', type: 'text', default: '北京' },
        { key: 'offset1', label: '时区偏移 (小时)', type: 'range', min: -12, max: 12, default: 8 },
        { key: 'timeColor1', label: '时间颜色', type: 'color', default: '#ffffff' },
      ]},
      { group: '城市 2', fields: [
        { key: 'city2', label: '城市名', type: 'text', default: '纽约' },
        { key: 'offset2', label: '时区偏移 (小时)', type: 'range', min: -12, max: 12, default: -5 },
        { key: 'timeColor2', label: '时间颜色', type: 'color', default: '#6c5ce7' },
      ]},
      { group: '样式', fields: [
        { key: 'timeSize', label: '时间字号', type: 'range', min: 24, max: 72, default: 44 },
        { key: 'dateColor', label: '日期颜色', type: 'color', default: '#666666' },
        { key: 'dividerColor', label: '分隔线颜色', type: 'color', default: '#333333' },
      ]},
    ],
    gen: function (c) {
      var ts = Number(c.timeSize);
      var cityY1 = 50;
      var timeY1 = cityY1 + 26;
      var dateY1 = timeY1 + ts * 0.8;
      var divY = dateY1 + 30;
      var cityY2 = divY + 24;
      var timeY2 = cityY2 + 26;
      var dateY2 = timeY2 + ts * 0.8;
      var o1 = Number(c.offset1) || 0;
      var o2 = Number(c.offset2) || 0;
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
        '  <Var name="utcNow" type="number" expression="(#time_sys + (' + (o1 * -3600000) + '))" />',
        '  <Var name="utcNow2" type="number" expression="(#time_sys + (' + (o2 * -3600000) + '))" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0" w="#safeW">',
        '    <Text text="' + JCM.escXml(c.city1) + '" x="0" y="' + cityY1 + '" size="13" color="' + c.dateColor + '" />',
        '    <Text textExp="formatDate(\'HH:mm\', #utcNow)" x="0" y="' + timeY1 + '" size="' + ts + '" color="' + c.timeColor1 + '" bold="true" />',
        '    <Text textExp="formatDate(\'MM/dd EEEE\', #utcNow)" x="0" y="' + Math.round(dateY1) + '" size="13" color="' + c.dateColor + '" alpha="153" />',
        '    <Rectangle x="0" y="' + divY + '" w="#safeW" h="1" fillColor="' + c.dividerColor + '" />',
        '    <Text text="' + JCM.escXml(c.city2) + '" x="0" y="' + cityY2 + '" size="13" color="' + c.dateColor + '" />',
        '    <Text textExp="formatDate(\'HH:mm\', #utcNow2)" x="0" y="' + timeY2 + '" size="' + ts + '" color="' + c.timeColor2 + '" bold="true" />',
        '    <Text textExp="formatDate(\'MM/dd EEEE\', #utcNow2)" x="0" y="' + Math.round(dateY2) + '" size="13" color="' + c.dateColor + '" alpha="153" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 每日一句 ───
  {
    id: 'dailyquote', icon: '💊', name: '每日一句', desc: '每天自动切换一条语录',
    updater: 'DateTime.Day',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '每日一句' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
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
    gen: function (c) {
      var quotes = [c.quote1, c.quote2, c.quote3, c.quote4, c.quote5, c.quote6, c.quote7].filter(Boolean);
      if (quotes.length === 0) quotes = ['每日一句'];
      var lines = [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />',
        '  <Var name="dayIdx" type="number" expression="((#year * 366 + #month * 31 + #date) % ' + quotes.length + ')" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0" w="#safeW">',
      ];
      // Generate conditional text for each quote
      quotes.forEach(function (q, i) {
        var cond = i === 0 ? '' : 'else ';
        if (i < quotes.length - 1) {
          lines.push('    <Text' + (i === 0 ? '' : '') + ' textExp="ifelse((#dayIdx == ' + i + '), \'' + JCM.escXml(q).replace(/\n/g, '\\n') + '\', \'__NEXT__\')" x="0" y="50" size="' + c.textSize + '" color="' + c.textColor + '" w="#safeW" multiLine="true" />');
        }
      });
      // Simpler approach: just use ifelse chain for textExp
      var expr = quotes.map(function (q, i) {
        return '(ifelse((#dayIdx == ' + i + '), \'' + JCM.escXml(q).replace(/\n/g, '\\\\n') + '\', \'';
      }).join('') + '\'\')' + ')'.repeat(quotes.length);
      lines.length = 4; // reset, rebuild simpler
      lines.push(JCM.generateAutoDetectMAML());
      lines.push('  <Var name="dayIdx" type="number" expression="((#year * 366 + #month * 31 + #date) % ' + quotes.length + ')" />');
      lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
      lines.push('  <Group x="#marginL" y="0" w="#safeW">');
      // Build ifelse chain
      var textExpr = '\'' + JCM.escXml(quotes[quotes.length - 1]).replace(/\n/g, '\\\\n') + '\'';
      for (var i = quotes.length - 2; i >= 0; i--) {
        textExpr = 'ifelse((#dayIdx == ' + i + '), \'' + JCM.escXml(quotes[i]).replace(/\n/g, '\\\\n') + '\', ' + textExpr + ')';
      }
      lines.push('    <Text textExp="' + textExpr + '" x="0" y="50" size="' + c.textSize + '" color="' + c.textColor + '" w="#safeW" multiLine="true" />');
      lines.push('    <Rectangle x="0" y="42" w="24" h="3" fillColor="' + c.accentColor + '" cornerRadius="1.5" />');
      lines.push('    <Text textExp="formatDate(\'MM/dd EEEE\', #time_sys)" x="0" y="(#view_height - 50)" size="12" color="' + c.dayColor + '" alpha="128" />');
      lines.push('  </Group>');
      return lines.join('\n');
    },
  },

  // ─── 环形进度 ───
  {
    id: 'ring', icon: '🎯', name: '环形进度', desc: '环形进度条显示步数或电量',
    updater: 'Step,Battery',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '环形进度' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '数据源', fields: [
        { key: 'source', label: '数据来源', type: 'select', options: [
          { v: 'step', l: '步数' },
          { v: 'battery', l: '电量' },
        ], default: 'step' },
        { key: 'goal', label: '目标值 (步数模式)', type: 'text', default: '10000' },
        { key: 'demoValue', label: '预览值', type: 'range', min: 0, max: 100, default: 65 },
      ]},
      { group: '样式', fields: [
        { key: 'ringColor', label: '进度环颜色', type: 'color', default: '#6c5ce7' },
        { key: 'trackColor', label: '轨道颜色', type: 'color', default: '#222233' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
        { key: 'labelColor', label: '标签颜色', type: 'color', default: '#888888' },
        { key: 'ringSize', label: '环粗细', type: 'range', min: 6, max: 20, default: 12 },
      ]},
    ],
    gen: function (c) {
      var isBattery = c.source === 'battery';
      var goalN = parseInt(c.goal) || 10000;
      var dataVar = isBattery ? '#battery_level' : '(#step_count * 100 / ' + goalN + ')';
      var pctExpr = isBattery ? '#battery_level' : 'ifelse((#step_count > ' + goalN + '), 100, (#step_count * 100 / ' + goalN + '))';
      var label = isBattery ? '电量' : '步数';
      var valueExpr = isBattery ? '#battery_level' : '#step_count';
      var unit = isBattery ? '%' : '步';
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="cx" type="number" expression="(#marginL + (#view_width - #marginL) / 2)" />',
        '  <Var name="pct" type="number" expression="' + pctExpr + '" />',
        '  <Var name="ringR" type="number" expression="80" />',
        '  <Var name="ringW" type="number" expression="' + c.ringSize + '" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Circle x="#cx" y="120" r="#ringR" fillColor="' + c.trackColor + '" />',
        '  <Circle x="#cx" y="120" r="(#ringR - #ringW)" fillColor="' + c.bgColor + '" />',
        '  <Text textExp="#pct" x="(#cx - 50)" y="80" w="100" size="48" color="' + c.textColor + '" textAlign="center" bold="true" />',
        '  <Text text="' + unit + '" x="(#cx - 20)" y="138" size="16" color="' + c.labelColor + '" alpha="153" />',
        '  <Text text="' + label + '" x="(#cx - 30)" y="220" w="60" size="14" color="' + c.labelColor + '" alpha="128" textAlign="center" />',
      ].join('\n');
    },
  },

  // ─── 仪表盘 ───
  {
    id: 'dashboard', icon: '📊', name: '仪表盘', desc: '一屏聚合时间、步数、电量、天气',
    updater: 'DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '仪表盘' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0e1a' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
        { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#cccccc' },
        { key: 'dimColor', label: '次要颜色', type: 'color', default: '#555555' },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
        '  <Var name="colW" type="number" expression="(#safeW / 2)" />',
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
        '  <Group x="#marginL" y="0" w="#safeW">',
        // Time - top left
        '    <Text textExp="formatDate(\'HH:mm\', #time_sys)" x="0" y="20" size="40" color="' + c.timeColor + '" bold="true" />',
        '    <Text textExp="formatDate(\'MM/dd EEEE\', #time_sys)" x="0" y="68" size="12" color="' + c.dimColor + '" />',
        // Divider
        '    <Rectangle x="0" y="92" w="#safeW" h="1" fillColor="#1a1f2e" />',
        // Steps - bottom left
        '    <Text text="步数" x="0" y="110" size="11" color="' + c.dimColor + '" />',
        '    <Text textExp="#step_count" x="0" y="128" size="24" color="' + c.textColor + '" bold="true" />',
        '    <Text text="步" x="0" y="158" size="11" color="' + c.dimColor + '" alpha="153" />',
        // Battery - bottom right
        '    <Text text="电量" x="#colW" y="110" size="11" color="' + c.dimColor + '" />',
        '    <Text textExp="(#battery_level + \'%\')" x="#colW" y="128" size="24" color="' + c.textColor + '" bold="true" />',
        // Weather - bottom
        '    <Rectangle x="0" y="178" w="#safeW" h="1" fillColor="#1a1f2e" />',
        '    <Text textExp="#weather_desc" x="0" y="196" size="14" color="' + c.accentColor + '" />',
        '    <Text textExp="(#weather_temp + \'°\')" x="#colW" y="196" size="18" color="' + c.textColor + '" />',
        '    <Text textExp="(\'湿度 \' + #weather_humidity + \'%\')" x="0" y="218" size="11" color="' + c.dimColor + '" alpha="128" />',
        '  </Group>',
      ].join('\n');
    },
  },

  // ─── 纯图片 ───
  {
    id: 'image', icon: '🖼️', name: '纯图片', desc: '放壁纸、照片或二维码',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '图片卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
    ],
    gen: function (c) {
      return [
        JCM.generateAutoDetectMAML(),
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      ].join('\n');
    },
  },

  // ─── 自定义 ───
  {
    id: 'custom', icon: '🛠️', name: '自定义', desc: '从零开始，手动添加文字、形状、图片、视频',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '自定义卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
        { key: 'bgPattern', label: '背景图案', type: 'select', options: [
          { v: 'solid', l: '纯色' },
          { v: 'dots', l: '点阵' },
          { v: 'dots-large', l: '大点阵' },
          { v: 'grid', l: '网格' },
          { v: 'diagonal', l: '斜线' },
          { v: 'wave', l: '波浪' },
          { v: 'noise', l: '噪点' },
          { v: 'gradient', l: '线性渐变' },
          { v: 'gradient-radial', l: '径向渐变' },
        ], default: 'solid' },
        { key: 'bgColor2', label: '渐变色2 / 辅助色', type: 'color', default: '#1a1a2e' },
      ]},
    ],
    gen: null,
  },

  // ─── 真实设备模板 ──────────────────────────────────────────────
  {
    id: 'weather_real', icon: '🌤️', name: '天气卡片（真实）', desc: '绑定系统天气数据，实时显示',
    updater: 'DateTime.Hour,DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '天气卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a1628' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
        { key: 'tempColor', label: '温度颜色', type: 'color', default: '#ffffff' },
        { key: 'tempSize', label: '温度字号', type: 'range', min: 36, max: 80, default: 56 },
        { key: 'descColor', label: '描述颜色', type: 'color', default: '#aaaaaa' },
      ]},
    ],
    rawXml: (function () {
      return function (c) {
        var ts = c.tempSize || 56;
        return '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Hour,DateTime.Minute" name="' + JCM.escXml(c.cardName || '天气卡片') + '">\n' +
        '  <VariableBinders>\n' +
        '    <ContentProviderBinder name="weather_version_provider" uri="content://weather/weatherVersionData" columns="weather_version">\n' +
        '      <Variable name="weather_version" type="string" column="weather_version" />\n' +
        '    </ContentProviderBinder>\n' +
        '    <ContentProviderBinder name="weather_provider" uriFormat="content://weather/weatherData/4/%s" uriParas="@localId" columns="city_id,temperature,weather_type,description,city_name,tmphighs,tmplows" countName="hasweather">\n' +
        '      <Variable name="cityId" type="string" column="city_id" />\n' +
        '      <Variable name="weather_location" type="string" column="city_name" />\n' +
        '      <Variable name="weather_id" type="int" column="weather_type" />\n' +
        '      <Variable name="weather_temperature" type="int" column="temperature" />\n' +
        '      <Variable name="weather_description" type="string" column="description" />\n' +
        '      <Variable name="weather_temphigh" type="string[]" column="tmphighs" />\n' +
        '      <Variable name="weather_templow" type="string[]" column="tmplows" />\n' +
        '    </ContentProviderBinder>\n' +
        '  </VariableBinders>\n' +
        '  <!-- 自动检测设备 -->\n' +
        '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />\n' +
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />\n' +
        '  <DateTime x="#marginL" y="40" color="' + c.timeColor + '" size="72" format="HH:mm" fontFamily="mipro-demibold" align="left" />\n' +
        '  <DateTime x="#marginL" y="120" color="' + c.descColor + '" size="22" format="MM月dd日 E" fontFamily="mipro-normal" align="left" />\n' +
        '  <Text x="#marginL" y="200" color="' + c.tempColor + '" size="' + ts + '" textExp="@weather_temperature + \'°\'" bold="true" fontFamily="mipro-demibold" />\n' +
        '  <Text x="#marginL" y="' + (200 + ts + 10) + '" color="' + c.descColor + '" size="20" textExp="@weather_location + \' · \' + @weather_description" fontFamily="mipro-normal" />\n' +
        '  <Text x="#marginL" y="' + (200 + ts + 50) + '" color="' + c.descColor + '" size="16" textExp="\'最高 \' + @weather_temphigh[0] + \'°  最低 \' + @weather_templow[0] + \'°\'" fontFamily="mipro-normal" />\n' +
        '</Widget>';
      };
    })(),
  },

  {
    id: 'music_real', icon: '🎵', name: '音乐卡片（真实）', desc: '绑定系统音乐播放器，显示歌曲信息',
    updater: 'DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a2e' },
        { key: 'bgImage', label: '背景图 URL（可选）', type: 'text', default: '' },
      ]},
      { group: '样式', fields: [
        { key: 'titleColor', label: '歌名颜色', type: 'color', default: '#ffffff' },
        { key: 'artistColor', label: '歌手颜色', type: 'color', default: '#888888' },
        { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      ]},
    ],
    rawXml: (function () {
      return function (c) {
        return '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + JCM.escXml(c.cardName || '音乐卡片') + '">\n' +
        '  <MusicControl name="music_control" autoShow="false" autoRefresh="true" x="0" y="0" />\n' +
        '  <Var name="isPlay" type="number" expression="eqs(#music_control.music_state,\'1\')" />\n' +
        '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />\n' +
        '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />\n' +
        '  <Group x="#marginL" y="30" w="(#view_width - #marginL - 40)">\n' +
        '    <Text x="0" y="0" size="28" color="' + c.titleColor + '" textExp="@music_control.title" bold="true" fontFamily="mipro-demibold" w="(#view_width - #marginL - 40)" ellipsis="true" />\n' +
        '    <Text x="0" y="45" size="18" color="' + c.artistColor + '" textExp="@music_control.artist" fontFamily="mipro-normal" w="(#view_width - #marginL - 40)" ellipsis="true" />\n' +
        '    <Rectangle x="0" y="80" w="(#view_width - #marginL - 40)" h="3" fillColor="#333333" cornerRadius="1.5" />\n' +
        '    <Text x="0" y="100" size="14" color="' + c.accentColor + '" textExp="ifelse(#isPlay, \'正在播放\', \'已暂停\')" fontFamily="mipro-normal" />\n' +
        '  </Group>\n' +
        '</Widget>';
      };
    })(),
  },
];
