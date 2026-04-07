import { escXml } from '../maml.js';
import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'music', icon: '🎵', name: '音乐信息卡片', desc: '显示歌曲名和歌手',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a0a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
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
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 30)" />',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '  <Group x="#marginL" y="0">',
      '    <Rectangle x="0" y="40" w="48" h="48" fillColor="' + c.accentColor + '" cornerRadius="12" />',
      '    <Text text="♪" x="14" y="52" size="28" color="#ffffff" />',
      '    <Text text="正在播放" x="60" y="48" size="12" color="' + c.accentColor + '" />',
      '    <Text text="' + escXml(c.songName) + '" x="0" y="120" size="24" color="' + c.titleColor + '" />',
      '    <Text text="' + escXml(c.artistName) + '" x="0" y="152" size="16" color="' + c.artistColor + '" />',
      '    <Rectangle x="0" y="200" w="#safeW" h="3" fillColor="#333333" cornerRadius="1.5" />',
      '    <Rectangle x="0" y="200" w="(#safeW * 0.4)" h="3" fillColor="' + c.accentColor + '" cornerRadius="1.5" />',
      '  </Group>',
    ].join('\n');
  },
};
