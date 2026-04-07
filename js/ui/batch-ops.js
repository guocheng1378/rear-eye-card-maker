// ─── Batch Operations: 批量改色 + 配色方案导入 ─────────────────
import * as S from '../state.js';
import { toast } from './toast.js';
import { captureState } from '../history.js';

var _modal = null;

// ─── Batch Color Change ────────────────────────────────────────
export function openBatchOpsModal(callbacks) {
  if (_modal) { _modal.remove(); _modal = null; }
  if (S.elements.length === 0) return toast('请先添加元素', 'warning');

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeBatchOpsModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '500px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header"><h3>✏️ 批量操作</h3><button class="modal-close" id="boCloseBtn">✕</button></div>';
  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto;padding:16px">';

  // Element selection
  html += '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:600;margin-bottom:8px">选择元素</div>';
  html += '<div style="display:flex;gap:6px;margin-bottom:8px"><button class="el-btn" id="boSelectAll">全选</button><button class="el-btn" id="boSelectNone">全不选</button><button class="el-btn" id="boSelectText">仅文字</button><button class="el-btn" id="boSelectShape">仅形状</button></div>';
  html += '<div id="boElementList" style="max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px">';
  S.elements.forEach(function (el, i) {
    var label = el.type === 'text' ? (el.text || '文字').substring(0, 10) : el.type + ' #' + (i + 1);
    html += '<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;font-size:12px;border-radius:4px" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">' +
      '<input type="checkbox" class="bo-check" data-bo-idx="' + i + '" checked> ' +
      '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:' + (el.color || '#333') + ';border:1px solid var(--border)"></span>' +
      '<span style="color:var(--text2)">' + el.type + '</span> ' +
      '<span style="color:var(--text3)">' + label + '</span></label>';
  });
  html += '</div></div>';

  // Batch color
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px">';
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">🎨 批量改色</div>';
  html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">';
  html += '<input type="color" id="boColor" value="#ffffff" style="width:40px;height:32px;border:none;cursor:pointer">';
  html += '<input type="text" id="boColorHex" value="#ffffff" style="flex:1;padding:6px 10px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:monospace;font-size:12px">';
  html += '<button class="btn btn-primary" id="boApplyColor" style="font-size:12px;padding:6px 14px">应用</button>';
  html += '</div>';
  // Color presets
  var presets = ['#ffffff', '#e0e0e0', '#000000', '#6c5ce7', '#00b894', '#e74c3c', '#f39c12', '#0984e3', '#fd79a8', '#2d3436'];
  html += '<div style="display:flex;gap:4px">';
  presets.forEach(function (c) {
    html += '<span class="bo-preset" data-bo-color="' + c + '" style="width:24px;height:24px;border-radius:4px;background:' + c + ';cursor:pointer;border:1px solid var(--border);flex-shrink:0"></span>';
  });
  html += '</div></div>';

  // Batch font
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px">';
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">🔤 批量改字体</div>';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  var fonts = ['default', 'mipro-normal', 'mipro-demibold', 'mipro-bold', 'noto-sans-sc', 'roboto', 'monospace'];
  var fontNames = { 'default': '系统默认', 'mipro-normal': 'Mi Sans', 'mipro-demibold': 'Mi Sans 粗', 'mipro-bold': 'Mi Sans 加粗', 'noto-sans-sc': 'Noto Sans SC', 'roboto': 'Roboto', 'monospace': '等宽' };
  html += '<select id="boFont" style="flex:1;padding:6px 10px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">';
  fonts.forEach(function (f) { html += '<option value="' + f + '">' + (fontNames[f] || f) + '</option>'; });
  html += '</select>';
  html += '<button class="btn btn-primary" id="boApplyFont" style="font-size:12px;padding:6px 14px">应用</button>';
  html += '</div></div>';

  // Batch opacity
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px">';
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">🌫️ 批量改透明度</div>';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<input type="range" id="boOpacity" min="0" max="100" value="100" style="flex:1"><span id="boOpacityVal" style="font-size:12px;color:var(--text3);width:36px">100%</span>';
  html += '<button class="btn btn-primary" id="boApplyOpacity" style="font-size:12px;padding:6px 14px">应用</button>';
  html += '</div></div>';

  html += '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  // Events
  overlay.querySelector('#boCloseBtn').onclick = function () { closeBatchOpsModal(); };

  // Color picker sync
  var colorInput = overlay.querySelector('#boColor');
  var colorHex = overlay.querySelector('#boColorHex');
  colorInput.oninput = function () { colorHex.value = this.value; };
  colorHex.oninput = function () { if (/^#[0-9a-f]{6}$/i.test(this.value)) colorInput.value = this.value; };

  // Presets
  overlay.querySelectorAll('.bo-preset').forEach(function (p) {
    p.onclick = function () { colorInput.value = p.dataset.boColor; colorHex.value = p.dataset.boColor; };
  });

  // Select buttons
  overlay.querySelector('#boSelectAll').onclick = function () { overlay.querySelectorAll('.bo-check').forEach(function (c) { c.checked = true; }); };
  overlay.querySelector('#boSelectNone').onclick = function () { overlay.querySelectorAll('.bo-check').forEach(function (c) { c.checked = false; }); };
  overlay.querySelector('#boSelectText').onclick = function () {
    overlay.querySelectorAll('.bo-check').forEach(function (c) {
      var idx = Number(c.dataset.boIdx);
      c.checked = S.elements[idx] && S.elements[idx].type === 'text';
    });
  };
  overlay.querySelector('#boSelectShape').onclick = function () {
    overlay.querySelectorAll('.bo-check').forEach(function (c) {
      var idx = Number(c.dataset.boIdx);
      c.checked = S.elements[idx] && (S.elements[idx].type === 'rectangle' || S.elements[idx].type === 'circle');
    });
  };

  // Apply color
  overlay.querySelector('#boApplyColor').onclick = function () {
    var color = colorHex.value;
    var selected = getSelectedIndices(overlay);
    if (selected.length === 0) return toast('请先选择元素', 'warning');
    captureState('批量改色');
    selected.forEach(function (idx) { S.elements[idx].color = color; });
    S.setDirty(true);
    toast('🎨 已更新 ' + selected.length + ' 个元素颜色', 'success');
    if (callbacks) { if (callbacks.renderConfig) callbacks.renderConfig(); if (callbacks.renderLivePreview) callbacks.renderLivePreview(); }
  };

  // Apply font
  overlay.querySelector('#boApplyFont').onclick = function () {
    var font = overlay.querySelector('#boFont').value;
    var selected = getSelectedIndices(overlay).filter(function (idx) { return S.elements[idx].type === 'text'; });
    if (selected.length === 0) return toast('没有选中文字元素', 'warning');
    captureState('批量改字体');
    selected.forEach(function (idx) { S.elements[idx].fontFamily = font; });
    S.setDirty(true);
    toast('🔤 已更新 ' + selected.length + ' 个文字元素字体', 'success');
    if (callbacks) { if (callbacks.renderConfig) callbacks.renderConfig(); if (callbacks.renderLivePreview) callbacks.renderLivePreview(); }
  };

  // Opacity slider
  var opSlider = overlay.querySelector('#boOpacity');
  var opVal = overlay.querySelector('#boOpacityVal');
  opSlider.oninput = function () { opVal.textContent = this.value + '%'; };
  overlay.querySelector('#boApplyOpacity').onclick = function () {
    var opacity = Number(opSlider.value);
    var selected = getSelectedIndices(overlay);
    if (selected.length === 0) return toast('请先选择元素', 'warning');
    captureState('批量改透明度');
    selected.forEach(function (idx) { S.elements[idx].opacity = opacity; });
    S.setDirty(true);
    toast('🌫️ 已更新 ' + selected.length + ' 个元素透明度', 'success');
    if (callbacks) { if (callbacks.renderConfig) callbacks.renderConfig(); if (callbacks.renderLivePreview) callbacks.renderLivePreview(); }
  };
}

function getSelectedIndices(overlay) {
  var indices = [];
  overlay.querySelectorAll('.bo-check:checked').forEach(function (c) { indices.push(Number(c.dataset.boIdx)); });
  return indices;
}

// ─── Color Scheme Import ────────────────────────────────────────
var COLOR_SCHEMES = [
  { name: '赛博朋克', colors: ['#ff00ff', '#00ffff', '#ff6600', '#0d0221', '#f706cf'] },
  { name: '莫兰迪', colors: ['#b0a084', '#c9b8a8', '#8b7d6b', '#d5c4a1', '#a0522d'] },
  { name: '霓虹', colors: ['#39ff14', '#ff073a', '#bc13fe', '#01ffff', '#ffff33'] },
  { name: '暗夜蓝', colors: ['#0f1b2d', '#1a3a5c', '#2e86de', '#48dbfb', '#c8d6e5'] },
  { name: '日落', colors: ['#e55039', '#f39c12', '#f8c291', '#78e08f', '#3d3d3d'] },
  { name: '极简', colors: ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#ffffff'] },
  { name: '糖果', colors: ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1'] },
  { name: '森林', colors: ['#2d5016', '#4a7c23', '#6ab04c', '#badc58', '#f9ca24'] },
  { name: '樱花', colors: ['#ffb7c5', '#ff69b4', '#ff1493', '#db7093', '#ffc0cb'] },
  { name: '深海', colors: ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6'] },
  { name: '沙漠', colors: ['#bb9457', '#99582a', '#6f1d1b', '#432818', '#ffe6a7'] },
  { name: '薰衣草', colors: ['#7b2d8e', '#9b59b6', '#d4a5ff', '#f0e6ff', '#2c1654'] },
];

export function openSchemeImportModal(callbacks) {
  if (_modal) { _modal.remove(); _modal = null; }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeSchemeImportModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '560px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header"><h3>🎨 配色方案</h3><button class="modal-close" id="siCloseBtn">✕</button></div>';
  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto;padding:16px">';

  // URL import
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px">';
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">🔗 从 URL 导入</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">支持 coolors.co 链接（如 coolors.co/2d3436-636e72-b2bec3）</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="text" id="siUrl" placeholder="粘贴 coolors.co 链接..." style="flex:1;padding:8px 12px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">';
  html += '<button class="btn btn-primary" id="siImportUrl" style="font-size:12px;padding:6px 14px;white-space:nowrap">导入</button>';
  html += '</div></div>';

  // Manual input
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px">';
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">📋 手动输入色值</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">输入逗号分隔的 hex 色值（如 #ff0000, #00ff00, #0000ff）</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input type="text" id="siManual" placeholder="#ff0000, #00ff00, #0000ff" style="flex:1;padding:8px 12px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:monospace">';
  html += '<button class="btn btn-primary" id="siImportManual" style="font-size:12px;padding:6px 14px;white-space:nowrap">应用</button>';
  html += '</div></div>';

  // Preset schemes
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">🎨 预设方案</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  COLOR_SCHEMES.forEach(function (scheme, si) {
    html += '<div class="card-lib-item" style="cursor:pointer;padding:10px 12px" data-si-apply="' + si + '">' +
      '<div style="flex:1"><div style="font-size:12px;font-weight:600;margin-bottom:6px">' + scheme.name + '</div>' +
      '<div style="display:flex;gap:3px;height:24px;border-radius:6px;overflow:hidden">' +
      scheme.colors.map(function (c) { return '<div style="flex:1;background:' + c + '"></div>'; }).join('') +
      '</div></div>' +
      '<button class="card-lib-btn" data-si-apply="' + si + '" title="应用">🎨</button>' +
      '</div>';
  });
  html += '</div>';

  html += '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  overlay.querySelector('#siCloseBtn').onclick = function () { closeSchemeImportModal(); };

  // URL import
  overlay.querySelector('#siImportUrl').onclick = function () {
    var url = overlay.querySelector('#siUrl').value.trim();
    var colors = parseCoolorsUrl(url);
    if (!colors) return toast('无法解析链接，请检查格式', 'error');
    applyColors(colors, callbacks);
  };

  // Manual import
  overlay.querySelector('#siImportManual').onclick = function () {
    var input = overlay.querySelector('#siManual').value.trim();
    var colors = input.split(/[,\s]+/).map(function (c) { return c.trim(); }).filter(function (c) { return /^#[0-9a-f]{3,6}$/i.test(c); });
    if (colors.length === 0) return toast('未找到有效的 hex 色值', 'error');
    applyColors(colors, callbacks);
  };

  // Preset apply
  overlay.querySelectorAll('[data-si-apply]').forEach(function (btn) {
    btn.onclick = function () {
      var idx = Number(btn.dataset.siApply);
      if (COLOR_SCHEMES[idx]) applyColors(COLOR_SCHEMES[idx].colors, callbacks);
    };
  });
}

function parseCoolorsUrl(url) {
  // coolors.co/2d3436-636e72-b2bec3-dfe6e9-ffffff
  var match = url.match(/coolors\.co\/([0-9a-f-]+)/i);
  if (match) return match[1].split('-').map(function (c) { return '#' + c; });
  // Also try palette ID format
  var match2 = url.match(/([0-9a-f]{6}[-_]?){2,}/i);
  if (match2) return match2[0].split(/[-_]/).filter(Boolean).map(function (c) { return '#' + c; });
  return null;
}

function applyColors(colors, callbacks) {
  if (!S.elements || S.elements.length === 0) return toast('请先添加元素', 'warning');
  captureState('应用配色方案');
  // Apply colors round-robin to elements that have a color property
  var colorIdx = 0;
  S.elements.forEach(function (el) {
    if (el.color !== undefined) {
      el.color = colors[colorIdx % colors.length];
      colorIdx++;
    }
  });
  S.setDirty(true);
  toast('🎨 配色方案已应用到 ' + colorIdx + ' 个元素', 'success');
  if (callbacks) { if (callbacks.renderConfig) callbacks.renderConfig(); if (callbacks.renderLivePreview) callbacks.renderLivePreview(); }
}

export function closeSchemeImportModal() {
  if (_modal) { _modal.remove(); _modal = null; }
}
