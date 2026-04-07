import { escXml } from '../maml.js';

export default {
  id: 'music_real', icon: '🎵', name: '音乐卡片（真实）', desc: '绑定系统音乐播放器，显示歌曲信息',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#1a1a2e' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '歌名颜色', type: 'color', default: '#ffffff' },
      { key: 'artistColor', label: '歌手颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
    ]},
  ],
  rawXml(c) {
    return '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '音乐卡片') + '">\n' +
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
  },
};
