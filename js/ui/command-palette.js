// ─── Command Palette: Ctrl+K 快捷命令面板 ─────────────────────────
import * as S from '../state.js';
import { toast } from './toast.js';

var _modal = null;
var _filteredCommands = [];

var COMMANDS = [
  { id: 'nextStep', icon: '→', label: '下一步', shortcut: '', category: '导航', fn: function (c) { c.nextStep(); } },
  { id: 'prevStep', icon: '←', label: '上一步', shortcut: '', category: '导航', fn: function (c) { c.prevStep(); } },
  { id: 'goStep0', icon: '📋', label: '跳转到模板选择', shortcut: '', category: '导航', fn: function (c) { c.goStep(0); } },
  { id: 'goStep1', icon: '⚙️', label: '跳转到配置', shortcut: '', category: '导航', fn: function (c) { c.goStep(1); } },
  { id: 'goStep2', icon: '👁️', label: '跳转到预览', shortcut: '', category: '导航', fn: function (c) { c.goStep(2); } },
  { id: 'undo', icon: '↩️', label: '撤销', shortcut: 'Ctrl+Z', category: '编辑', fn: function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })); } },
  { id: 'redo', icon: '↪️', label: '重做', shortcut: 'Ctrl+Y', category: '编辑', fn: function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true })); } },
  { id: 'exportZip', icon: '📦', label: '导出 ZIP', shortcut: '', category: '导出', fn: function (c) { c.handleExport(); } },
  { id: 'exportPng', icon: '🖼️', label: '导出 PNG', shortcut: '', category: '导出', fn: function (c) { c.handleExportPNG(); } },
  { id: 'exportSvg', icon: '📐', label: '导出 SVG', shortcut: '', category: '导出', fn: function (c) { c.handleExportSVG(); } },
  { id: 'batchExport', icon: '📦', label: '批量导出全部机型', shortcut: '', category: '导出', fn: function (c) { c.handleBatchExport(); } },
  { id: 'copyXml', icon: '📋', label: '复制 XML', shortcut: '', category: '导出', fn: function (c) { c.copyXML(); } },
  { id: 'formatXml', icon: '🔧', label: '格式化 XML', shortcut: '', category: '编辑', fn: function (c) { c.formatXML(); } },
  { id: 'saveToLib', icon: '📚', label: '保存到卡片库', shortcut: '', category: '库', fn: function (c) { c.saveToLibrary(); } },
  { id: 'openLib', icon: '📚', label: '打开卡片库', shortcut: '', category: '库', fn: function (c) { c.openLibrary(); } },
  { id: 'openMarket', icon: '🏪', label: '打开模板市场', shortcut: '', category: '库', fn: function (c) { c.openMarket(); } },
  { id: 'shareLink', icon: '🔗', label: '生成分享链接', shortcut: '', category: '分享', fn: function (c) { c.shareTemplate(); } },
  { id: 'shareQR', icon: '📱', label: '二维码分享', shortcut: '', category: '分享', fn: function (c) { c.showQR(); } },
  { id: 'toggleTheme', icon: '🌙', label: '切换亮色/暗色主题', shortcut: '', category: '视图', fn: function (c) { c.toggleTheme(); } },
  { id: 'toggleGrid', icon: '⊞', label: '切换网格', shortcut: '', category: '视图', fn: function (c) { var cb = document.getElementById('showGrid'); if (cb) { cb.checked = !cb.checked; c.toggleGrid(); } } },
  { id: 'toggleFullscreen', icon: '⛶', label: '全屏预览', shortcut: '', category: '视图', fn: function (c) { c.toggleFullscreen(); } },
  { id: 'zoomIn', icon: '🔍', label: '放大预览', shortcut: '', category: '视图', fn: function (c) { c.zoomIn(); } },
  { id: 'zoomOut', icon: '🔍', label: '缩小预览', shortcut: '', category: '视图', fn: function (c) { c.zoomOut(); } },
  { id: 'zoomReset', icon: '↺', label: '重置缩放', shortcut: '', category: '视图', fn: function (c) { c.zoomReset(); } },
  { id: 'addText', icon: 'T', label: '添加文字元素', shortcut: '', category: '元素', fn: function (c) { c.addElement('text'); } },
  { id: 'addRect', icon: '▢', label: '添加矩形元素', shortcut: '', category: '元素', fn: function (c) { c.addElement('rectangle'); } },
  { id: 'addCircle', icon: '○', label: '添加圆形元素', shortcut: '', category: '元素', fn: function (c) { c.addElement('circle'); } },
  { id: 'addGroup', icon: '📦', label: '添加 Group 容器', shortcut: '', category: '元素', fn: function (c) { c.addElement('group'); } },
  { id: 'addLayer', icon: '🎨', label: '添加 Layer 层', shortcut: '', category: '元素', fn: function (c) { c.addElement('layer'); } },
  { id: 'addMusic', icon: '🎵', label: '添加 MusicControl', shortcut: '', category: '元素', fn: function (c) { c.addElement('musiccontrol'); } },
  { id: 'designTools', icon: '🎨', label: '打开设计工具', shortcut: '', category: '工具', fn: function (c) { c.openDesignTools('palette'); } },
  { id: 'bindingWizard', icon: '🔗', label: '数据绑定向导', shortcut: '', category: '工具', fn: function (c) { c.openBindingWizard(); } },
  { id: 'mamlLint', icon: '✅', label: 'MAML 语法检查', shortcut: '', category: '工具', fn: function (c) { c.runMamlLint(); } },
  { id: 'perfCheck', icon: '📊', label: '性能分析', shortcut: '', category: '工具', fn: function (c) { c.runPerfCheck(); } },
  { id: 'a11yCheck', icon: '♿', label: '无障碍检查', shortcut: '', category: '工具', fn: function (c) { c.runA11yCheck(); } },
  { id: 'snippets', icon: '🧩', label: 'MAML 代码片段', shortcut: '', category: '工具', fn: function (c) { c.openSnippets(); } },
  { id: 'batchOps', icon: '✏️', label: '批量操作', shortcut: '', category: '工具', fn: function (c) { c.openBatchOps(); } },
  { id: 'schemeImport', icon: '🎨', label: '配色方案导入', shortcut: '', category: '工具', fn: function (c) { c.openSchemeImport(); } },
  { id: 'switchLang', icon: '🌐', label: '切换语言 (中/EN)', shortcut: '', category: '设置', fn: function (c) { c.switchLang(); } },
  { id: 'buildApk', icon: '🤖', label: '构建 APK', shortcut: '', category: '工具', fn: function (c) { c.triggerBuild(); } },
  { id: 'clearToken', icon: '🔑', label: '清除 GitHub Token', shortcut: '', category: '设置', fn: function (c) { c.clearToken(); } },
];

export function openCommandPalette(jcmRef) {
  if (_modal) { _modal.remove(); _modal = null; }
  _filteredCommands = COMMANDS.slice();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.onclick = function () { closeCommandPalette(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '500px';
  modal.style.margin = '10vh auto';
  modal.style.padding = '0';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div style="padding:12px 16px;border-bottom:1px solid var(--border)">' +
    '<input type="text" id="cmdSearch" placeholder="🔍 输入命令..." autofocus style="width:100%;background:none;border:none;color:var(--text);font-size:15px;outline:none">' +
    '</div>' +
    '<div id="cmdList" style="max-height:400px;overflow-y:auto;padding:4px"></div>' +
    '<div style="padding:6px 12px;border-top:1px solid var(--border);font-size:10px;color:var(--text3)">↑↓ 选择 · Enter 执行 · Esc 关闭</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  renderCmdList(jcmRef);

  var searchInput = overlay.querySelector('#cmdSearch');
  searchInput.focus();
  searchInput.addEventListener('input', function () {
    var q = this.value.toLowerCase();
    _filteredCommands = COMMANDS.filter(function (c) {
      return !q || c.label.toLowerCase().indexOf(q) >= 0 || c.category.toLowerCase().indexOf(q) >= 0 || c.id.indexOf(q) >= 0;
    });
    renderCmdList(jcmRef);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeCommandPalette(); return; }
    if (e.key === 'Enter') {
      var first = _modal.querySelector('.cmd-item');
      if (first) first.click();
      return;
    }
  });
}

function renderCmdList(jcmRef) {
  var list = document.getElementById('cmdList');
  if (!list) return;
  var lastCat = '';
  var html = '';
  _filteredCommands.forEach(function (cmd) {
    if (cmd.category !== lastCat) {
      html += '<div style="padding:8px 12px 4px;font-size:10px;color:var(--text3);font-weight:600;text-transform:uppercase">' + cmd.category + '</div>';
      lastCat = cmd.category;
    }
    html += '<div class="cmd-item" data-cmd-id="' + cmd.id + '" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px" onmouseover="this.style.background=\'var(--surface3)\'" onmouseout="this.style.background=\'\'">' +
      '<span style="width:20px;text-align:center">' + cmd.icon + '</span>' +
      '<span style="flex:1">' + cmd.label + '</span>' +
      (cmd.shortcut ? '<span style="font-size:10px;color:var(--text3)">' + cmd.shortcut + '</span>' : '') +
      '</div>';
  });
  if (_filteredCommands.length === 0) {
    html = '<div style="padding:20px;text-align:center;color:var(--text3)">没有匹配的命令</div>';
  }
  list.innerHTML = html;

  list.querySelectorAll('.cmd-item').forEach(function (item) {
    item.onclick = function () {
      var cmd = COMMANDS.find(function (c) { return c.id === item.dataset.cmdId; });
      if (cmd) {
        closeCommandPalette();
        cmd.fn(jcmRef);
      }
    };
  });
}

export function closeCommandPalette() {
  if (_modal) { _modal.remove(); _modal = null; }
}

export function isCommandPaletteOpen() {
  return !!_modal;
}
