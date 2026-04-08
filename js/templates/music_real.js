import { escXml } from '../maml.js';

export default {
  id: 'music_real', icon: '🎵', name: '音乐卡片', desc: 'MusicControl 控件，显示歌曲信息和播放控制',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '音乐卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'titleColor', label: '歌名颜色', type: 'color', default: '#ffffff' },
      { key: 'artistColor', label: '歌手颜色', type: 'color', default: '#888888' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'showArtwork', label: '显示封面', type: 'select', default: 'true', options: [
        { v: 'true', l: '是' }, { v: 'false', l: '否' },
      ]},
      { key: 'artworkSize', label: '封面大小', type: 'range', min: 40, max: 120, default: 64 },
    ]},
  ],
  rawXml(c) {
    var artSize = c.artworkSize || 64;
    var showArt = c.showArtwork !== 'false';
    var safeW = '(#view_width - #marginL - 40)';
    var lines = [];

    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '音乐卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('  <Var name="isPlay" type="number" expression="eqs(#music_control.music_state,\'1\')" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- MusicControl 控件 -->');
    lines.push('  <MusicControl name="music_control" autoShow="false" autoRefresh="true" x="0" y="0" />');
    lines.push('');
    lines.push('  <!-- 音乐内容组 -->');
    lines.push('  <Group name="music_content" x="#marginL" y="0" w="' + safeW + '">');

    if (showArt) {
      lines.push('    <!-- 专辑封面 -->');
      lines.push('    <Image x="0" y="30" w="' + artSize + '" h="' + artSize + '" cornerRadius="12" src="music_control.artwork" srcType="BitmapVar" />');
    }

    var infoX = showArt ? (artSize + 16) : 0;
    var infoW = showArt ? '(' + safeW + ' - ' + (artSize + 16) + ')' : safeW;
    lines.push('    <!-- 歌曲信息 -->');
    lines.push('    <Group name="song_info" x="' + infoX + '" y="30" w="' + infoW + '">');
    lines.push('      <Text x="0" y="0" size="20" color="' + c.titleColor + '" textExp="@music_control.title" bold="true" fontFamily="mipro-demibold" w="' + infoW + '" ellipsis="true" />');
    lines.push('      <Text x="0" y="28" size="14" color="' + c.artistColor + '" textExp="@music_control.artist" fontFamily="mipro-normal" w="' + infoW + '" ellipsis="true" />');
    lines.push('    </Group>');
    lines.push('');
    lines.push('    <!-- 播放状态 -->');
    lines.push('    <Group name="play_status" x="0" y="' + (showArt ? (artSize + 44) : 80) + '">');
    lines.push('      <Rectangle x="0" y="0" w="' + safeW + '" h="3" fillColor="#222222" cornerRadius="1.5" />');
    lines.push('      <Rectangle x="0" y="0" w="5" h="5" fillColor="' + c.accentColor + '" cornerRadius="2.5" />');
    lines.push('      <Text x="12" y="-3" size="12" color="' + c.accentColor + '" textExp="ifelse(#isPlay, \'正在播放\', \'已暂停\')" />');
    lines.push('    </Group>');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
