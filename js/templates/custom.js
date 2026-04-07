export default {
  id: 'custom', icon: '🛠️', name: '自定义', desc: '从零开始，手动添加文字、形状、图片、视频',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '自定义卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#000000' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
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
};
