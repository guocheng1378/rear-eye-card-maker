import { escXml } from '../maml.js';

export default {
  id: 'music_player', icon: '🎵', name: '音乐卡片', desc: '显示当前播放歌曲和控制按钮',
  updater: 'Music',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '歌名颜色', type: 'color', default: '#ffffff' },
      { key: 'artistColor', label: '歌手颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#1db954' },
      { key: 'progressBg', label: '进度条底色', type: 'color', default: '#333333' },
    ]},
  ],
  elements(c) {
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'rectangle', x: 30, y: 50, w: 100, h: 100, color: '#222222', radius: 8 },
      { type: 'text', text: '歌曲名称', x: 150, y: 70, size: 20, color: c.titleColor, bold: true },
      { type: 'text', text: '歌手名', x: 150, y: 100, size: 14, color: c.artistColor },
      { type: 'rectangle', x: 30, y: 170, w: 250, h: 3, color: c.progressBg, radius: 1.5 },
      { type: 'rectangle', x: 30, y: 170, w: 120, h: 3, color: c.accentColor, radius: 1.5 },
      { type: 'text', text: '⏮  ⏸  ⏭', x: 100, y: 190, size: 20, color: c.titleColor },
    ];
  },
  rawXml(c) {
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="Music" name="' + escXml(c.cardName || '音乐卡片') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 专辑封面占位 -->',
      '    <Rectangle x="0" y="30" w="100" h="100" fillColor="#222222" cornerRadius="8" />',
      '',
      '    <!-- 歌名 -->',
      '    <Text x="115" y="50" size="20" color="' + c.titleColor + '" textExp="#music_title" bold="true" />',
      '',
      '    <!-- 歌手 -->',
      '    <Text x="115" y="80" size="14" color="' + c.artistColor + '" textExp="#music_artist" />',
      '',
      '    <!-- 进度条背景 -->',
      '    <Rectangle x="0" y="150" w="250" h="3" fillColor="' + c.progressBg + '" cornerRadius="1.5" />',
      '',
      '    <!-- 进度条 -->',
      '    <Rectangle x="0" y="150" w="0" h="3" fillColor="' + c.accentColor + '" cornerRadius="1.5" />',
      '',
      '    <!-- 控制按钮区域 -->',
      '    <MusicControl x="60" y="170" w="130" h="40" prevColor="' + c.titleColor + '" playColor="' + c.accentColor + '" nextColor="' + c.titleColor + '" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
