import { escXml } from '../maml.js';

export default {
  id: 'photo_frame', icon: '🖼️', name: '相框卡片', desc: '圆形/圆角裁切照片展示',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '相框卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0d1117' },
    ]},
    { group: '样式', fields: [
      { key: 'frameStyle', label: '边框样式', type: 'select', options: [
        { v: 'circle', l: '圆形' },
        { v: 'rounded', l: '圆角方形' },
        { v: 'none', l: '无边框' },
      ], default: 'circle' },
      { key: 'borderColor', label: '边框颜色', type: 'color', default: '#30363d' },
      { key: 'borderWidth', label: '边框粗细', type: 'range', min: 0, max: 8, default: 3 },
      { key: 'frameSize', label: '相框大小', type: 'range', min: 80, max: 200, default: 140 },
      { key: 'nameColor', label: '名字颜色', type: 'color', default: '#ffffff' },
      { key: 'subColor', label: '副标题颜色', type: 'color', default: '#8b949e' },
      { key: 'nameText', label: '名字', type: 'text', default: '我的照片' },
      { key: 'subText', label: '副标题', type: 'text', default: '2026 · 春' },
    ]},
  ],
  elements(c) {
    var fs = Number(c.frameSize) || 140;
    var bw = Number(c.borderWidth) || 3;
    var isCircle = c.frameStyle === 'circle';
    var els = [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
    ];
    if (isCircle) {
      els.push({ type: 'circle', x: 120, y: 100, r: fs / 2 + bw, color: c.borderColor });
      els.push({ type: 'circle', x: 120, y: 100, r: fs / 2, color: '#222222' });
    } else {
      var radius = c.frameStyle === 'rounded' ? 16 : 0;
      els.push({ type: 'rectangle', x: 120 - fs / 2 - bw, y: 100 - fs / 2 - bw, w: fs + bw * 2, h: fs + bw * 2, color: c.borderColor, radius: radius });
      els.push({ type: 'rectangle', x: 120 - fs / 2, y: 100 - fs / 2, w: fs, h: fs, color: '#222222', radius: radius });
    }
    els.push({ type: 'text', text: c.nameText, x: 30, y: 220, size: 20, color: c.nameColor, bold: true });
    els.push({ type: 'text', text: c.subText, x: 30, y: 248, size: 13, color: c.subColor });
    return els;
  },
  rawXml(c) {
    var fs = Number(c.frameSize) || 140;
    var bw = Number(c.borderWidth) || 3;
    var isCircle = c.frameStyle === 'circle';
    var lines = [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" name="' + escXml(c.cardName || '相框卡片') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
    ];
    if (isCircle) {
      lines.push('    <!-- 圆形边框 -->');
      lines.push('    <Circle x="' + (fs/2+bw) + '" y="' + (fs/2+bw) + '" r="' + (fs/2+bw) + '" color="' + c.borderColor + '" />');
      lines.push('    <Circle x="' + (fs/2+bw) + '" y="' + (fs/2+bw) + '" r="' + (fs/2) + '" color="#222222" />');
    } else {
      var r = c.frameStyle === 'rounded' ? 16 : 0;
      lines.push('    <Rectangle x="0" y="0" w="' + (fs+bw*2) + '" h="' + (fs+bw*2) + '" fillColor="' + c.borderColor + '" cornerRadius="' + (r+bw) + '" />');
      lines.push('    <Rectangle x="' + bw + '" y="' + bw + '" w="' + fs + '" h="' + fs + '" fillColor="#222222" cornerRadius="' + r + '" />');
    }
    lines.push('    <!-- 用户需替换为自己的图片 -->');
    lines.push('    <!-- <Image x="0" y="0" w="' + fs + '" h="' + fs + '" src="photo.jpg" maskShape="' + (isCircle ? 'circle' : 'roundedrect') + '" cornerRadius="' + (isCircle ? 0 : 16) + '" /> -->');
    lines.push('');
    lines.push('    <Text x="0" y="' + (fs + bw*2 + 15) + '" size="20" color="' + c.nameColor + '" text="' + escXml(c.nameText || '我的照片') + '" bold="true" />');
    lines.push('    <Text x="0" y="' + (fs + bw*2 + 42) + '" size="13" color="' + c.subColor + '" text="' + escXml(c.subText || '2026 · 春') + '" />');
    lines.push('  </Group>');
    lines.push('</Widget>');
    return lines.join('\n');
  },
};
