// ─── Templates: All card template definitions ──────────────────────

import { CardTemplate } from './schema';
import { escXml } from './maml';

export const TEMPLATES: CardTemplate[] = [
  // ─── Clock ───
  {
    id: 'clock', icon: '⏰', name: '时钟卡片', desc: '显示当前时间和日期',
    updater: 'DateTime.Minute',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '时钟卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
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
    gen: (c) => {
      const timeY = 80;
      const dateY = Math.round(80 + Number(c.timeSize) * 0.9);
      return [
        `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
        `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
        `  <Group x="#marginL" y="0">`,
        `    <Text textExp="formatDate('${c.timeFormat}', #time_sys)" x="0" y="${timeY}" size="${c.timeSize}" color="${c.timeColor}" />`,
        `    <Text textExp="formatDate('${c.dateFormat}', #time_sys)" x="0" y="${dateY}" size="20" color="${c.dateColor}" />`,
        `  </Group>`,
      ].join('\n');
    },
  },

  // ─── Quote ───
  {
    id: 'quote', icon: '💬', name: '名言卡片', desc: '显示一段文字或名言',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '名言卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a2e' },
      ]},
      { group: '内容', fields: [
        { key: 'text', label: '文字内容', type: 'textarea', default: 'Stay hungry.\nStay foolish.' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
        { key: 'textSize', label: '字号', type: 'range', min: 14, max: 64, default: 28 },
        { key: 'author', label: '作者', type: 'text', default: '— Steve Jobs' },
        { key: 'authorColor', label: '作者颜色', type: 'color', default: '#6c5ce7' },
      ]},
    ],
    gen: (c) => [
      `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
      `  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />`,
      `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
      `  <Group x="#marginL" y="40" w="#safeW">`,
      `    <Text text="${escXml(c.text)}" size="${c.textSize}" color="${c.textColor}" w="#safeW" multiLine="true" />`,
      `    <Text text="${escXml(c.author)}" x="0" y="(#view_height - 80)" size="16" color="${c.authorColor}" w="#safeW" />`,
      `  </Group>`,
    ].join('\n'),
  },

  // ─── Battery ───
  {
    id: 'battery', icon: '🔋', name: '电池卡片', desc: '显示电池电量和状态',
    updater: 'Battery',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '电池卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0d1117' },
      ]},
      { group: '样式', fields: [
        { key: 'barColor', label: '电量条颜色', type: 'color', default: '#00b894' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      ]},
    ],
    gen: (c) => [
      `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
      `  <Var name="safeW" type="number" expression="(#view_width - #marginL - 40)" />`,
      `  <Var name="barW" type="number" expression="(#safeW * #battery_level / 100)" />`,
      `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
      `  <Group x="#marginL" y="0">`,
      `    <Text text="电量" x="0" y="50" size="18" color="${c.textColor}" alpha="0.6" />`,
      `    <Text textExp="(#battery_level + '%')" x="0" y="80" size="56" color="${c.textColor}" />`,
      `    <Rectangle x="0" y="160" w="#safeW" h="12" fillColor="#333333" cornerRadius="6" />`,
      `    <Rectangle x="0" y="160" w="#barW" h="12" fillColor="${c.barColor}" cornerRadius="6" />`,
      `    <Text textExp="ifelse((#battery_level >= 80), '电量充足', ifelse((#battery_level >= 20), '电量偏低', '电量极低'))"`,
      `          x="0" y="200" size="16" color="${c.textColor}" alpha="0.5" />`,
      `  </Group>`,
    ].join('\n'),
  },

  // ─── Status ───
  {
    id: 'status', icon: '📊', name: '状态卡片', desc: '显示多个状态指标',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '状态卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0f0f1a' },
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
    gen: (c) => {
      const items = [c.item1, c.item2, c.item3, c.item4].filter(Boolean);
      return [
        `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
        `  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />`,
        `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
        `  <Group x="#marginL" y="0">`,
        `    <Rectangle x="0" y="40" w="4" h="24" fillColor="${c.accentColor}" cornerRadius="2" />`,
        `    <Text text="${escXml(c.title)}" x="14" y="42" size="22" color="${c.textColor}" />`,
        ...items.map((t, i) =>
          `    <Text text="${escXml(t)}" x="14" y="${90 + i * 40}" size="16" color="${c.textColor}" alpha="0.8" />`
        ),
        `  </Group>`,
      ].join('\n');
    },
  },

  // ─── Countdown ───
  {
    id: 'countdown', icon: '⏳', name: '倒计时卡片', desc: '倒计时到指定日期',
    updater: 'DateTime.Day',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '倒计时卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a0a2e' },
      ]},
      { group: '内容', fields: [
        { key: 'eventName', label: '事件名称', type: 'text', default: '距离新年' },
        { key: 'targetDate', label: '目标日期 (MMdd)', type: 'text', default: '0101' },
      ]},
      { group: '样式', fields: [
        { key: 'accentColor', label: '强调色', type: 'color', default: '#a29bfe' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
      ]},
    ],
    gen: (c) => [
      `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
      `  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />`,
      // Cumulative days before each month (non-leap year)
      `  <Var name="m" type="number" expression="#month" />`,
      `  <Var name="d" type="number" expression="#date" />`,
      `  <Var name="doy" type="number" expression="(ifelse((#m == 1), 0, ifelse((#m == 2), 31, ifelse((#m == 3), 59, ifelse((#m == 4), 90, ifelse((#m == 5), 120, ifelse((#m == 6), 151, ifelse((#m == 7), 181, ifelse((#m == 8), 212, ifelse((#m == 9), 243, ifelse((#m == 10), 273, ifelse((#m == 11), 304, 334))))))))))) + #d)" />`,
      `  <Var name="target" type="number" expression="${c.targetDate}" />`,
      `  <Var name="tMonth" type="number" expression="floor(#target / 100)" />`,
      `  <Var name="tDay" type="number" expression="(#target - #tMonth * 100)" />`,
      `  <Var name="tdoy" type="number" expression="(ifelse((#tMonth == 1), 0, ifelse((#tMonth == 2), 31, ifelse((#tMonth == 3), 59, ifelse((#tMonth == 4), 90, ifelse((#tMonth == 5), 120, ifelse((#tMonth == 6), 151, ifelse((#tMonth == 7), 181, ifelse((#tMonth == 8), 212, ifelse((#tMonth == 9), 243, ifelse((#tMonth == 10), 273, ifelse((#tMonth == 11), 304, 334))))))))))) + #tDay)" />`,
      `  <Var name="diff" type="number" expression="ifelse((#tdoy >= #doy), (#tdoy - #doy), (365 - #doy + #tdoy))" />`,
      `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
      `  <Group x="#marginL" y="0">`,
      `    <Text text="${escXml(c.eventName)}" x="0" y="50" size="18" color="${c.textColor}" alpha="0.6" />`,
      `    <Text textExp="#diff" x="0" y="80" size="72" color="${c.accentColor}" />`,
      `    <Text text="天" x="0" y="160" size="20" color="${c.textColor}" alpha="0.5" />`,
      `  </Group>`,
    ].join('\n'),
  },

  // ─── Music ───
  {
    id: 'music', icon: '🎵', name: '音乐信息卡片', desc: '显示歌曲名和歌手',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
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
    gen: (c) => [
      `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
      `  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />`,
      `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
      `  <Group x="#marginL" y="0">`,
      `    <Rectangle x="0" y="40" w="48" h="48" fillColor="${c.accentColor}" cornerRadius="12" />`,
      `    <Text text="♪" x="14" y="52" size="28" color="#ffffff" />`,
      `    <Text text="正在播放" x="60" y="48" size="12" color="${c.accentColor}" />`,
      `    <Text text="${escXml(c.songName)}" x="0" y="120" size="24" color="${c.titleColor}" />`,
      `    <Text text="${escXml(c.artistName)}" x="0" y="152" size="16" color="${c.artistColor}" />`,
      `    <Rectangle x="0" y="200" w="#safeW" h="3" fillColor="#333333" cornerRadius="1.5" />`,
      `    <Rectangle x="0" y="200" w="(#safeW * 0.4)" h="3" fillColor="${c.accentColor}" cornerRadius="1.5" />`,
      `  </Group>`,
    ].join('\n'),
  },

  // ─── Gradient ───
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
    gen: (c) => [
      `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
      `  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />`,
      `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor1}" />`,
      `  <Rectangle x="(#view_width * 0.5)" w="(#view_width * 0.5)" h="#view_height" fillColor="${c.bgColor2}" alpha="0.7" />`,
      `  <Group x="#marginL" y="0" w="#safeW" h="#view_height">`,
      `    <Text text="${escXml(c.text)}" x="0" y="(#view_height * 0.3)" size="${c.textSize}" color="${c.textColor}" w="#safeW" multiLine="true" textAlign="center" />`,
      `  </Group>`,
    ].join('\n'),
  },

  // ─── Custom ───
  {
    id: 'custom', icon: '🛠️', name: '自定义', desc: '从零开始，手动添加文字、形状、图片、视频',
    config: [
      { group: '基本', fields: [
        { key: 'cardName', label: '卡片名称', type: 'text', default: '自定义卡片' },
        { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      ]},
    ],
    gen: null,
  },
];
