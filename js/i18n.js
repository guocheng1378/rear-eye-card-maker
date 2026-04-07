// ─── i18n: 多语言支持 ────────────────────────────────────────────
var _lang = localStorage.getItem('rear-eye-lang') || 'zh';

var translations = {
  zh: {
    // Top bar
    'app.title': 'REAREye 卡片制作器',
    'app.library': '我的卡片库',
    'app.help': '快捷键帮助',
    'app.history': '操作历史',
    'app.changelog': '更新日志',
    // Steps
    'step.template': '选择模板',
    'step.config': '配置参数',
    'step.preview': '预览导出',
    // Template page
    'tpl.title': '选择卡片模板',
    'tpl.subtitle': '从预设模板开始，或选择自定义从零创建',
    'tpl.search': '搜索模板...',
    'tpl.all': '全部',
    'tpl.time': '⏰ 时间',
    'tpl.info': '📊 信息',
    'tpl.media': '🎨 媒体',
    'tpl.device': '📱 设备',
    'tpl.custom': '🛠️ 自定义',
    // Config page
    'cfg.device': '机型',
    'cfg.camera': '摄像头',
    'cfg.preview': '实时预览',
    'cfg.zoom': '缩放',
    'cfg.reset': '重置',
    'cfg.fullscreen': '全屏预览',
    'cfg.export': '导出 ZIP',
    'cfg.saveLib': '保存到库',
    // Preview page
    'preview.generate': '生成预览',
    'preview.copy': '复制 XML',
    'preview.exportZip': '导出 ZIP',
    'preview.exportPng': '导出 PNG',
    'preview.exportSvg': '导出 SVG',
    'preview.batchExport': '全部机型 ZIP',
    'preview.universal': '通用卡片',
    'preview.fullscreen': '全屏预览',
    'preview.buildApk': '构建 APK',
    'preview.grid': '网格',
    'preview.themeCompare': '双主题',
    // Actions
    'btn.prev': '上一步',
    'btn.next': '下一步',
    // Elements
    'el.title': '额外元素',
    'el.text': '文字',
    'el.rectangle': '矩形',
    'el.circle': '圆形',
    'el.line': '线条',
    'el.arc': '弧形',
    'el.progress': '进度条',
    'el.image': '图片',
    'el.video': '视频',
    'el.lottie': 'Lottie',
    'el.importZip': '导入ZIP',
    'el.snapGrid': '吸附网格',
    'el.clickToAdd': '点击上方按钮添加元素',
    // Share
    'share.title': '模板分享',
    'share.export': '导出配置',
    'share.import': '导入配置',
    'share.link': '分享链接',
    // Toast messages
    'toast.selectTpl': '请先选择模板',
    'toast.exported': 'ZIP 已导出',
    'toast.exportFail': '导出失败',
    'toast.copied': 'XML 已复制到剪贴板',
    'toast.saved': '已保存到卡片库',
    'toast.loaded': '已加载',
    'toast.deleted': '已删除',
    // Shortcuts
    'shortcut.undo': '撤销',
    'shortcut.redo': '重做',
    'shortcut.duplicate': '复制当前元素',
    'shortcut.copy': '复制到剪贴板',
    'shortcut.paste': '从剪贴板粘贴',
    'shortcut.delete': '删除当前元素',
    'shortcut.move': '方向键移动（Shift+方向键 = 10px）',
    'shortcut.altDrag': 'Alt+拖拽 = 复制并拖动',
    'shortcut.tab': 'Tab 缩进 / Shift+Tab 反缩进',
  },
  en: {
    'app.title': 'REAREye Card Maker',
    'app.library': 'Card Library',
    'app.help': 'Keyboard Shortcuts',
    'app.history': 'History',
    'app.changelog': 'Changelog',
    'step.template': 'Templates',
    'step.config': 'Configure',
    'step.preview': 'Preview & Export',
    'tpl.title': 'Choose a Template',
    'tpl.subtitle': 'Start from a preset, or create from scratch',
    'tpl.search': 'Search templates...',
    'tpl.all': 'All',
    'tpl.time': '⏰ Time',
    'tpl.info': '📊 Info',
    'tpl.media': '🎨 Media',
    'tpl.device': '📱 Device',
    'tpl.custom': '🛠️ Custom',
    'cfg.device': 'Device',
    'cfg.camera': 'Camera',
    'cfg.preview': 'Live Preview',
    'cfg.zoom': 'Zoom',
    'cfg.reset': 'Reset',
    'cfg.fullscreen': 'Fullscreen',
    'cfg.export': 'Export ZIP',
    'cfg.saveLib': 'Save to Library',
    'preview.generate': 'Generate Preview',
    'preview.copy': 'Copy XML',
    'preview.exportZip': 'Export ZIP',
    'preview.exportPng': 'Export PNG',
    'preview.exportSvg': 'Export SVG',
    'preview.batchExport': 'All Devices ZIP',
    'preview.universal': 'Universal Card',
    'preview.fullscreen': 'Fullscreen',
    'preview.buildApk': 'Build APK',
    'preview.grid': 'Grid',
    'preview.themeCompare': 'Theme Compare',
    'btn.prev': 'Back',
    'btn.next': 'Next',
    'el.title': 'Extra Elements',
    'el.text': 'Text',
    'el.rectangle': 'Rectangle',
    'el.circle': 'Circle',
    'el.line': 'Line',
    'el.arc': 'Arc',
    'el.progress': 'Progress',
    'el.image': 'Image',
    'el.video': 'Video',
    'el.lottie': 'Lottie',
    'el.importZip': 'Import ZIP',
    'el.snapGrid': 'Snap Grid',
    'el.clickToAdd': 'Click buttons above to add elements',
    'share.title': 'Share Template',
    'share.export': 'Export Config',
    'share.import': 'Import Config',
    'share.link': 'Share Link',
    'toast.selectTpl': 'Please select a template first',
    'toast.exported': 'ZIP exported',
    'toast.exportFail': 'Export failed',
    'toast.copied': 'XML copied to clipboard',
    'toast.saved': 'Saved to card library',
    'toast.loaded': 'Loaded',
    'toast.deleted': 'Deleted',
    'shortcut.undo': 'Undo',
    'shortcut.redo': 'Redo',
    'shortcut.duplicate': 'Duplicate element',
    'shortcut.copy': 'Copy to clipboard',
    'shortcut.paste': 'Paste from clipboard',
    'shortcut.delete': 'Delete element',
    'shortcut.move': 'Arrow keys to move (Shift+Arrow = 10px)',
    'shortcut.altDrag': 'Alt+Drag = duplicate & move',
    'shortcut.tab': 'Tab indent / Shift+Tab outdent',
  }
};

export function t(key) {
  return (translations[_lang] || translations.zh)[key] || key;
}

export function getLang() {
  return _lang;
}

export function setLang(lang) {
  _lang = lang;
  localStorage.setItem('rear-eye-lang', lang);
}

export function getAvailableLangs() {
  return [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
  ];
}
