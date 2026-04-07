import { escXml } from '../maml.js';

export default {
  id: 'lyrics', icon: '🎤', name: '歌词卡片', desc: '绑定系统音乐，显示歌词（原文/翻译/罗马音）',
  updater: 'DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '歌词卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a0a1a' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '歌词设置', fields: [
      { key: 'lyricMode', label: '歌词显示模式', type: 'select', default: 'original', options: [
        { v: 'original', l: '📝 原文' },
        { v: 'translation', l: '🌐 翻译' },
        { v: 'romanization', l: '🔤 罗马音' },
        { v: 'dual', l: '📝+🌐 原文+翻译' },
        { v: 'triple', l: '📝+🌐+🔤 三行显示' },
      ]},
      { key: 'lyricProvider', label: '歌词来源', type: 'select', default: 'lyricon', options: [
        { v: 'lyricon', l: 'Lyricon' },
        { v: 'superlyric', l: 'SuperLyric' },
      ]},
      { key: 'lyricAlign', label: '歌词对齐', type: 'select', default: 'left', options: [
        { v: 'left', l: '左对齐' },
        { v: 'center', l: '居中' },
        { v: 'right', l: '右对齐' },
      ]},
    ]},
    { group: '样式', fields: [
      { key: 'songColor', label: '歌名颜色', type: 'color', default: '#ffffff' },
      { key: 'artistColor', label: '歌手颜色', type: 'color', default: '#888888' },
      { key: 'lyricColor', label: '当前歌词颜色', type: 'color', default: '#ffffff' },
      { key: 'lyricSubColor', label: '翻译/罗马音颜色', type: 'color', default: '#777777' },
      { key: 'lyricDimColor', label: '非当前行颜色', type: 'color', default: '#444444' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#6c5ce7' },
      { key: 'lyricSize', label: '歌词字号', type: 'range', min: 16, max: 36, default: 22 },
      { key: 'songSize', label: '歌名字号', type: 'range', min: 18, max: 40, default: 26 },
    ]},
  ],
  rawXml(c) {
    var align = c.lyricAlign || 'left';
    var textAlign = align === 'center' ? 'center' : align;
    var anchorX = align === 'center' ? '#view_width / 2' : '#marginL';
    var textW = align === 'center' ? '#view_width' : '(#view_width - #marginL - 40)';
    var mode = c.lyricMode || 'original';
    var provider = c.lyricProvider || 'lyricon';
    var lyricSize = c.lyricSize || 22;
    var songSize = c.songSize || 26;
    var subSize = Math.max(14, lyricSize - 4);

    // Build lyric source based on provider
    var lyricSource = provider === 'superlyric' ? 'superlyric_lyric' : 'lyricon_lyric';
    var lyricTransSource = provider === 'superlyric' ? 'superlyric_lyric_trans' : 'lyricon_lyric_trans';
    var lyricRomSource = provider === 'superlyric' ? 'superlyric_lyric_rom' : 'lyricon_lyric_rom';

    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Minute" name="' + escXml(c.cardName || '歌词卡片') + '">');
    lines.push('  <MusicControl name="music_control" autoShow="false" autoRefresh="true" x="0" y="0" />');
    lines.push('  <Var name="isPlay" type="number" expression="eqs(#music_control.music_state,\'1\')" />');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 歌词绑定 -->');
    lines.push('  <VariableBinders>');
    if (provider === 'lyricon') {
      lines.push('    <ContentProviderBinder name="lyricon_binder" uri="content://com.xiaomi.lrc/lyric" columns="title,artist,lrc,lrc_trans,lrc_rom">');
      lines.push('      <Variable name="lyricon_title" type="string" column="title" />');
      lines.push('      <Variable name="lyricon_artist" type="string" column="artist" />');
      lines.push('      <Variable name="lyricon_lyric" type="string" column="lrc" />');
      lines.push('      <Variable name="lyricon_lyric_trans" type="string" column="lrc_trans" />');
      lines.push('      <Variable name="lyricon_lyric_rom" type="string" column="lrc_rom" />');
      lines.push('    </ContentProviderBinder>');
    } else {
      lines.push('    <ContentProviderBinder name="superlyric_binder" uri="content://com.xiaomi.superlyric/lyric" columns="title,artist,lrc,lrc_trans,lrc_rom">');
      lines.push('      <Variable name="superlyric_title" type="string" column="title" />');
      lines.push('      <Variable name="superlyric_artist" type="string" column="artist" />');
      lines.push('      <Variable name="superlyric_lyric" type="string" column="lrc" />');
      lines.push('      <Variable name="superlyric_lyric_trans" type="string" column="lrc_trans" />');
      lines.push('      <Variable name="superlyric_lyric_rom" type="string" column="lrc_rom" />');
      lines.push('    </ContentProviderBinder>');
    }
    lines.push('  </VariableBinders>');
    lines.push('');

    // Background
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');

    // Accent bar
    lines.push('  <Rectangle x="#marginL" y="0" w="3" h="#view_height" fillColor="' + c.accentColor + '" alpha="0.3" />');

    // Song info - use MusicControl data as primary, fallback to lyric provider
    var titleExp = '@music_control.title';
    var artistExp = '@music_control.artist';
    if (provider !== 'lyricon') {
      titleExp = 'ifelse(eq(#music_control.title,\'\'), @' + provider + '_title, #music_control.title)';
      artistExp = 'ifelse(eq(#music_control.artist,\'\'), @' + provider + '_artist, #music_control.artist)';
    }

    lines.push('');
    lines.push('  <!-- 歌曲信息 -->');
    lines.push('  <Group x="(#marginL + 16)" y="20" w="' + textW + '">');
    lines.push('    <Text x="0" y="0" size="' + songSize + '" color="' + c.songColor + '" textExp="' + titleExp + '" bold="true" fontFamily="mipro-demibold" w="' + textW + '" ellipsis="true" textAlign="' + textAlign + '" />');
    lines.push('    <Text x="0" y="' + (songSize + 8) + '" size="14" color="' + c.artistColor + '" textExp="' + artistExp + '" fontFamily="mipro-normal" w="' + textW + '" ellipsis="true" textAlign="' + textAlign + '" />');
    lines.push('    <Rectangle x="0" y="' + (songSize + 32) + '" w="' + textW + '" h="1" fillColor="' + c.accentColor + '" alpha="0.2" />');
    lines.push('  </Group>');
    lines.push('');

    // Lyrics display area
    var lyricY = songSize + 52;
    lines.push('  <!-- 歌词显示区域 -->');
    lines.push('  <Group x="(#marginL + 16)" y="' + lyricY + '" w="' + textW + '">');

    switch (mode) {
      case 'original':
        lines.push('    <Text x="0" y="0" size="' + lyricSize + '" color="' + c.lyricColor + '" textExp="ifelse(eq(@' + lyricSource + ',\'\'), \'♪ 暂无歌词\', @' + lyricSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.6" textAlign="' + textAlign + '" />');
        break;
      case 'translation':
        lines.push('    <Text x="0" y="0" size="' + lyricSize + '" color="' + c.lyricColor + '" textExp="ifelse(eq(@' + lyricTransSource + ',\'\'), \'♪ 暂无翻译\', @' + lyricTransSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.6" textAlign="' + textAlign + '" />');
        break;
      case 'romanization':
        lines.push('    <Text x="0" y="0" size="' + lyricSize + '" color="' + c.lyricColor + '" textExp="ifelse(eq(@' + lyricRomSource + ',\'\'), \'♪ 暂无罗马音\', @' + lyricRomSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.6" textAlign="' + textAlign + '" />');
        break;
      case 'dual':
        lines.push('    <Text x="0" y="0" size="' + lyricSize + '" color="' + c.lyricColor + '" textExp="ifelse(eq(@' + lyricSource + ',\'\'), \'♪ 暂无歌词\', @' + lyricSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.4" textAlign="' + textAlign + '" />');
        lines.push('    <Text x="0" y="' + (lyricSize * 1.6 + 8) + '" size="' + subSize + '" color="' + c.lyricSubColor + '" textExp="ifelse(eq(@' + lyricTransSource + ',\'\'), \'\', @' + lyricTransSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.4" textAlign="' + textAlign + '" />');
        break;
      case 'triple':
        lines.push('    <Text x="0" y="0" size="' + lyricSize + '" color="' + c.lyricColor + '" textExp="ifelse(eq(@' + lyricSource + ',\'\'), \'♪ 暂无歌词\', @' + lyricSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.3" textAlign="' + textAlign + '" />');
        lines.push('    <Text x="0" y="' + (lyricSize * 1.5 + 6) + '" size="' + subSize + '" color="' + c.lyricSubColor + '" textExp="ifelse(eq(@' + lyricTransSource + ',\'\'), \'\', @' + lyricTransSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.3" textAlign="' + textAlign + '" />');
        lines.push('    <Text x="0" y="' + (lyricSize * 1.5 + subSize * 1.5 + 12) + '" size="' + (subSize - 2) + '" color="' + c.lyricDimColor + '" textExp="ifelse(eq(@' + lyricRomSource + ',\'\'), \'\', @' + lyricRomSource + ')" fontFamily="mipro-normal" w="' + textW + '" multiLine="true" lineHeight="1.3" textAlign="' + textAlign + '" />');
        break;
    }

    lines.push('  </Group>');
    lines.push('');

    // Play state indicator at bottom
    lines.push('  <!-- 播放状态 -->');
    lines.push('  <Group x="(#marginL + 16)" y="(#view_height - 40)">');
    lines.push('    <Rectangle x="0" y="0" w="6" h="6" fillColor="' + c.accentColor + '" cornerRadius="3" alpha="ifelse(#isPlay, 1, 0.3)" />');
    lines.push('    <Text x="14" y="-2" size="12" color="' + c.artistColor + '" textExp="ifelse(#isPlay, \'正在播放\', \'已暂停\')" fontFamily="mipro-normal" />');
    lines.push('  </Group>');

    lines.push('</Widget>');
    return lines.join('\n');
  },
};
