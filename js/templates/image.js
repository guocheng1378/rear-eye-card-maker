import { escXml } from '../maml.js';

export default {
  id: 'image', icon: '🖼️', name: '纯图片', desc: '放壁纸、照片或二维码',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '图片卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
  ],
  rawXml(c) {
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" name="' + escXml(c.cardName || '图片卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 图片区域：请在编辑器中添加 Image 元素 -->');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
