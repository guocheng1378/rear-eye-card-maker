import { generateAutoDetectMAML } from '../devices.js';

export default {
  id: 'image', icon: '🖼️', name: '纯图片', desc: '放壁纸、照片或二维码',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '图片卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
  ],
  gen(c) {
    return [
      generateAutoDetectMAML(),
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
    ].join('\n');
  },
};
