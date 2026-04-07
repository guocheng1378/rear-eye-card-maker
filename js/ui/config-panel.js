// ─── Config Panel: 配置渲染 + 字段渲染 + 缩略图 ─────────────────
import * as S from '../state.js';
import { getDevice, cameraZoneWidth } from '../devices.js';
import { TEMPLATES, TPL_CATEGORIES, TPL_CATEGORY_MAP } from '../templates/index.js';
import { renderTemplatePreview } from '../live-preview.js';
import { escHtml, getRecentColors, addRecentColor, getFavorites, toggleFavorite } from '../utils.js';
import { isInCameraZone } from './elements.js';

export var COLOR_PRESETS = [
  '#ffffff', '#e0e0e0', '#888888', '#333333', '#000000',
  '#ff6b6b', '#ee5a24', '#f0932b', '#fdcb6e', '#ffeaa7',
  '#00b894', '#55efc4', '#4ecdc4', '#0984e3', '#74b9ff',
  '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393', '#d63031',
];

export var THEME_PRESETS = [
  { name: '赛博朋克', colors: ['#ff00ff', '#00ffff', '#ff6600', '#0d0221', '#f706cf'] },
  { name: '莫兰迪',   colors: ['#b0a084', '#c9b8a8', '#8b7d6b', '#d5c4a1', '#a0522d'] },
  { name: '霓虹',     colors: ['#39ff14', '#ff073a', '#bc13fe', '#01ffff', '#ffff33'] },
  { name: '暗夜蓝',   colors: ['#0f1b2d', '#1a3a5c', '#2e86de', '#48dbfb', '#c8d6e5'] },
  { name: '日落',     colors: ['#e55039', '#f39c12', '#f8c291', '#78e08f', '#3d3d3d'] },
  { name: '极简',     colors: ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#ffffff'] },
  { name: '糖果',     colors: ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1'] },
  { name: '森林',     colors: ['#2d5016', '#4a7c23', '#6ab04c', '#badc58', '#f9ca24'] },
];

var _activeCategory = 'all';
var _thumbCache = {};

function esc(s) { return escHtml(s); }

export function getActiveCategory() { return _activeCategory; }
export function setActiveCategory(v) { _activeCategory = v; }

// ─── Template Grid ────────────────────────────────────────────────
export function generateTplThumbnail(tpl) {
  if (_thumbCache[tpl.id]) return _thumbCache[tpl.id];
  var cfg = {};
  tpl.config.forEach(function (g) { g.fields.forEach(function (f) { cfg[f.key] = f.default; }); });
  var s = 0.22, w = 420 * s, h = 252 * s;
  try {
    var html = renderTemplatePreview({ width: 976, height: 596, cameraZoneRatio: 0.3 }, false, tpl, cfg);
    var result = '<div style="width:' + w + 'px;height:' + h + 'px;border-radius:6px;overflow:hidden;position:relative;flex-shrink:0"><div style="position:absolute;left:0;top:0;width:' + (976 * s) + 'px;height:' + (596 * s) + 'px;transform-origin:top left;transform:scale(' + s + ')">' + html + '</div></div>';
    _thumbCache[tpl.id] = result;
    return result;
  } catch (e) {
    var fallback = '<div class="tpl-thumb-fallback">' + tpl.icon + '</div>';
    _thumbCache[tpl.id] = fallback;
    return fallback;
  }
}

export function renderTplGrid() {
  var favs = getFavorites();
  var sorted = TEMPLATES.slice().sort(function (a, b) {
    var aFav = favs.indexOf(a.id) >= 0 ? 0 : 1;
    var bFav = favs.indexOf(b.id) >= 0 ? 0 : 1;
    return aFav - bFav;
  });
  document.getElementById('tplGrid').innerHTML = sorted.map(function (t) {
    var thumb = generateTplThumbnail(t);
    var isFav = favs.indexOf(t.id) >= 0;
    return '<div class="tpl-card' + (S.tpl && S.tpl.id === t.id ? ' active' : '') + '" data-tpl="' + t.id + '">' +
      '<button class="tpl-fav' + (isFav ? ' active' : '') + '" data-fav="' + t.id + '">' + (isFav ? '⭐' : '☆') + '</button>' +
      '<div class="tpl-thumb">' + thumb + '</div>' +
      '<div class="tpl-card-name">' + t.name + '</div>' +
      '<div class="tpl-card-desc">' + t.desc + '</div></div>';
  }).join('');
  renderTplCategories();
}

export function renderTplCategories() {
  var container = document.getElementById('tplCategories');
  if (!container) return;
  container.innerHTML = TPL_CATEGORIES.map(function (cat) {
    return '<button class="tpl-cat' + (_activeCategory === cat.id ? ' active' : '') + '" data-cat="' + cat.id + '">' + cat.label + '</button>';
  }).join('');
}

export function filterTemplates(query) {
  clearTimeout(filterTemplates._timer);
  filterTemplates._timer = setTimeout(function () {
    var cards = document.querySelectorAll('.tpl-card');
    query = (query || '').toLowerCase();
    cards.forEach(function (card) {
      var tplId = card.dataset.tpl;
      var name = (card.querySelector('.tpl-card-name') || {}).textContent || '';
      var desc = (card.querySelector('.tpl-card-desc') || {}).textContent || '';
      var catMatch = _activeCategory === 'all' || TPL_CATEGORY_MAP[tplId] === _activeCategory;
      var searchMatch = !query || name.toLowerCase().indexOf(query) >= 0 || desc.toLowerCase().indexOf(query) >= 0 || tplId.indexOf(query) >= 0;
      card.style.display = (catMatch && searchMatch) ? '' : 'none';
    });
  }, 150);
}

// ─── Config Rendering ─────────────────────────────────────────────
export function renderConfig(getTemplateMAML) {
  if (!S.tpl) return;
  var device = getSelectedDevice();

  document.getElementById('cfgIcon').textContent = S.tpl.icon;
  document.getElementById('cfgTitle').textContent = S.tpl.name;
  document.getElementById('cfgDesc').textContent = S.tpl.desc;

  var html = '';

  S.tpl.config.forEach(function (group) {
    html += '<div class="config-section"><div class="config-section-title"><span>▸</span> ' + group.group + '</div><div class="config-grid">';
    group.fields.forEach(function (f) { html += renderField(f); });
    html += '</div></div>';
  });

  // Element toolbar
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 额外元素' +
    (S.elements.length > 0 ? ' <span class="el-count-badge">' + S.elements.length + '</span>' : '') +
    '</div><div class="el-toolbar">' +
    '<button class="el-btn" data-add="text"><span class="el-btn-icon">T</span> 文字</button>' +
    '<button class="el-btn" data-add="rectangle"><span class="el-btn-icon">▢</span> 矩形</button>' +
    '<button class="el-btn" data-add="circle"><span class="el-btn-icon">○</span> 圆形</button>' +
    '<button class="el-btn" data-add="line"><span class="el-btn-icon">─</span> 线条</button>' +
    '<button class="el-btn" data-add="arc"><span class="el-btn-icon">◠</span> 弧形</button>' +
    '<button class="el-btn" data-add="progress"><span class="el-btn-icon">▰</span> 进度条</button>' +
    '<button class="el-btn" data-pick="image"><span class="el-btn-icon">🖼</span> 图片</button>' +
    '<button class="el-btn" data-pick="video"><span class="el-btn-icon">🎬</span> 视频</button>' +
    '<button class="el-btn" data-add="lottie"><span class="el-btn-icon">🎭</span> Lottie</button>' +
    '<button class="el-btn" data-action="importZip" title="导入 MAML ZIP"><span class="el-btn-icon">📦</span> 导入ZIP</button>' +
    '</div>';

  html += '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center">' +
    '<label class="check-label"><input type="checkbox" id="snapToggle" checked> 吸附网格 (' + S.SNAP_GRID + 'px)</label>' +
    '</div>';

  // Element list
  html += '<div class="el-list">';
  S.elements.forEach(function (el, i) {
    var label = el.type === 'text' ? (el.text || '')
      : el.type === 'image' ? '🖼 ' + (el.fileName || '图片')
      : el.type === 'video' ? '🎬 ' + (el.fileName || '视频')
      : (el.type === 'rectangle' && el.h <= 3 && el.radius >= 1) ? 'line'
      : el.type + ' #' + (i + 1);
    var inCam = isInCameraZone(el, device);
    html += '<div class="el-item' + (S.selIdx === i ? ' active' : '') + (el.visible === false ? ' hidden-el' : '') + '" draggable="true" data-sel="' + i + '">' +
      '<span class="el-badge">' + el.type + '</span>' +
      '<span class="el-item-name">' + esc(label) + '</span>' +
      (inCam ? '<span title="在摄像头遮挡区内" style="color:#e17055;font-size:14px">⚠️</span>' : '') +
      '<span class="layer-visibility" data-vis="' + i + '" title="' + (el.visible === false ? '显示' : '隐藏') + '">' + (el.visible === false ? '👁️‍🗨️' : '👁️') + '</span>' +
      '<button class="el-lock-btn" data-lock="' + i + '" title="锁定/解锁">' + (el.locked ? '🔒' : '🔓') + '</button>' +
      '<span class="el-z-btns">' +
      '<button class="el-z-btn" data-z="up" data-zi="' + i + '" title="上移一层">↑</button>' +
      '<button class="el-z-btn" data-z="down" data-zi="' + i + '" title="下移一层">↓</button>' +
      '</span>' +
      '<button class="el-item-del" data-del="' + i + '">✕</button></div>';
  });
  if (S.elements.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">点击上方按钮添加元素</div>';
  }
  html += '</div>';

  // Selected element editor
  if (S.selIdx >= 0 && S.selIdx < S.elements.length) {
    html += renderElementEditorInline(S.elements[S.selIdx], S.selIdx, device);
    html += '<div class="config-section" style="margin-top:12px"><div class="config-section-title"><span>▸</span> 快速操作</div>' +
      '<div class="el-toolbar">' +
      '<button class="el-btn" data-align="left" data-ai="' + S.selIdx + '">⬅ 左对齐</button>' +
      '<button class="el-btn" data-align="hcenter" data-ai="' + S.selIdx + '">↔ 水平居中</button>' +
      '<button class="el-btn" data-align="right" data-ai="' + S.selIdx + '">➡ 右对齐</button>' +
      '<button class="el-btn" data-align="top" data-ai="' + S.selIdx + '">⬆ 顶对齐</button>' +
      '<button class="el-btn" data-align="vcenter" data-ai="' + S.selIdx + '">↕ 垂直居中</button>' +
      '<button class="el-btn" data-align="bottom" data-ai="' + S.selIdx + '">⬇ 底对齐</button>' +
      '</div>';
    var selEl = S.elements[S.selIdx];
    if (selEl.type === 'rectangle' || selEl.type === 'image' || selEl.type === 'video') {
      html += '<div class="el-toolbar" style="margin-top:8px">' +
        '<button class="el-btn" data-qsize="full" data-qi="' + S.selIdx + '">全屏</button>' +
        '<button class="el-btn" data-qsize="half" data-qi="' + S.selIdx + '">半屏</button>' +
        '<button class="el-btn" data-qsize="quarter" data-qi="' + S.selIdx + '">1/4</button>' +
        '</div>';
    }
    if (selEl.color !== undefined) html += renderColorPresets('color', S.selIdx);
    html += '</div>';
  }
  html += '</div>';

  // Share buttons
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 模板分享</div>' +
    '<div class="el-toolbar">' +
    '<button class="el-btn" data-action="exportTemplate"><span class="el-btn-icon">💾</span> 导出配置</button>' +
    '<button class="el-btn" data-action="importTemplate"><span class="el-btn-icon">📂</span> 导入配置</button>' +
    '<button class="el-btn" data-action="shareTemplate" style="color:var(--green)"><span class="el-btn-icon">🔗</span> 分享链接</button>' +
    '<button class="el-btn" data-action="shareQR"><span class="el-btn-icon">📱</span> 扫码分享</button>' +
    '</div></div>';

  document.getElementById('cfgContent').innerHTML = html;
}

function renderField(f) {
  var v = S.cfg[f.key];
  switch (f.type) {
    case 'text':
      if (f.key === 'bgImage') {
        return '<div class="field"><label>' + f.label + '</label><div style="display:flex;gap:6px"><input type="text" value="' + esc(String(v)) + '" data-cfg="' + f.key + '" placeholder="https://... 或点击上传" style="flex:1"><button class="bg-upload-btn" data-bg-upload title="上传背景图">📁</button></div></div>';
      }
      return '<div class="field"><label>' + f.label + '</label><input type="text" value="' + esc(String(v)) + '" data-cfg="' + f.key + '"></div>';
    case 'textarea':
      return '<div class="field"><label>' + f.label + '</label><textarea rows="3" data-cfg="' + f.key + '">' + esc(String(v)) + '</textarea></div>';
    case 'color': {
      var recent = getRecentColors();
      var swatchHtml = '<div class="color-swatches">';
      recent.forEach(function (c) { swatchHtml += '<span class="color-dot" style="background:' + c + '" data-cfg-color="' + f.key + '" data-color="' + c + '"></span>'; });
      COLOR_PRESETS.forEach(function (c) { swatchHtml += '<span class="color-dot" style="background:' + c + '" data-cfg-color="' + f.key + '" data-color="' + c + '"></span>'; });
      swatchHtml += '</div>';
      return '<div class="field field-color"><label>' + f.label + '</label><input type="color" value="' + v + '" data-cfg="' + f.key + '"><span class="color-val">' + v + '</span>' + swatchHtml + '</div>';
    }
    case 'range':
      return '<div class="field"><label>' + f.label + ': <strong>' + v + '</strong></label><input type="range" min="' + f.min + '" max="' + f.max + '" value="' + v + '" data-cfg="' + f.key + '"></div>';
    case 'select':
      return '<div class="field"><label>' + f.label + '</label><select data-cfg="' + f.key + '">' +
        f.options.map(function (o) { return '<option value="' + o.v + '"' + (v === o.v ? ' selected' : '') + '>' + o.l + '</option>'; }).join('') +
        '</select></div>';
    default: return '';
  }
}

function renderColorPresets(prop, idx) {
  var html = '<div class="color-presets">' +
    COLOR_PRESETS.map(function (c) {
      return '<div class="color-swatch" style="background:' + c + '" data-color="' + c + '" data-cprop="' + prop + '" data-cidx="' + idx + '" title="' + c + '"></div>';
    }).join('') + '</div>';
  html += '<div class="theme-presets">';
  THEME_PRESETS.forEach(function (theme) {
    html += '<div class="theme-preset" data-theme-cprop="' + prop + '" data-theme-cidx="' + idx + '" title="' + theme.name + '">' +
      theme.colors.map(function (c) { return '<div class="theme-dot" style="background:' + c + '"></div>'; }).join('') +
      '<span class="theme-name">' + theme.name + '</span></div>';
  });
  html += '</div>';
  return html;
}

function renderElementEditorInline(el, idx, device) {
  var html = '<div class="el-detail">';
  if (isInCameraZone(el, device)) {
    var safeX = cameraZoneWidth(device);
    html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:rgba(225,112,85,0.1);border:1px solid rgba(225,112,85,0.3);border-radius:8px;font-size:12px;color:#e17055"><span>⚠️</span> 此元素位于摄像头遮挡区内，建议将 X 调整到 ≥ ' + safeX + '</div>';
  }
  html += '<div class="config-grid">';

  if (el.type === 'text') {
    html += fieldHtml('文字', '<input type="text" value="' + esc(el.text || '') + '" data-prop="text" data-idx="' + idx + '">', true);
    html += fieldHtml('字号', '<input type="number" value="' + el.size + '" data-prop="size" data-idx="' + idx + '">');
    html += colorFieldHtml('颜色', el.color || '#ffffff', 'color', idx);
    html += fieldHtml('加粗', '<label class="toggle-switch"><input type="checkbox" data-prop="bold" data-idx="' + idx + '"' + (el.bold ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('多行', '<label class="toggle-switch"><input type="checkbox" data-prop="multiLine" data-idx="' + idx + '"' + (el.multiLine ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('宽度', '<input type="number" value="' + (el.w || 200) + '" data-prop="w" data-idx="' + idx + '">');
    html += fieldHtml('透明度', '<input type="range" min="0" max="100" value="' + (el.opacity !== undefined ? el.opacity : 100) + '" data-prop="opacity" data-idx="' + idx + '">');
  } else if (el.type === 'rectangle') {
    html += fieldHtml('X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">');
    html += fieldHtml('Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">');
    html += fieldHtml('宽', '<input type="number" value="' + el.w + '" data-prop="w" data-idx="' + idx + '">');
    html += fieldHtml('高', '<input type="number" value="' + el.h + '" data-prop="h" data-idx="' + idx + '">');
    html += colorFieldHtml('颜色', el.color || '#333333', 'color', idx);
    html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 0) + '" data-prop="radius" data-idx="' + idx + '">');
    html += fieldHtml('透明度', '<input type="range" min="0" max="100" value="' + (el.opacity !== undefined ? el.opacity : 100) + '" data-prop="opacity" data-idx="' + idx + '">');
  } else if (el.type === 'circle') {
    html += fieldHtml('中心 X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">');
    html += fieldHtml('中心 Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">');
    html += fieldHtml('半径', '<input type="number" value="' + el.r + '" data-prop="r" data-idx="' + idx + '">');
    html += colorFieldHtml('填充', el.color || '#6c5ce7', 'color', idx);
    html += fieldHtml('描边宽', '<input type="number" value="' + (el.strokeWidth || 0) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="0" max="20">');
    if (el.strokeWidth > 0) {
      html += colorFieldHtml('描边色', el.strokeColor || '#ffffff', 'strokeColor', idx);
    }
  } else if (el.type === 'arc') {
    html += fieldHtml('中心 X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">');
    html += fieldHtml('中心 Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">');
    html += fieldHtml('半径', '<input type="number" value="' + (el.r || 40) + '" data-prop="r" data-idx="' + idx + '">');
    html += fieldHtml('起始角', '<input type="number" value="' + (el.startAngle || 0) + '" data-prop="startAngle" data-idx="' + idx + '" min="0" max="360">');
    html += fieldHtml('终止角', '<input type="number" value="' + (el.endAngle || 270) + '" data-prop="endAngle" data-idx="' + idx + '" min="0" max="360">');
    html += fieldHtml('线宽', '<input type="number" value="' + (el.strokeWidth || 6) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="1" max="20">');
    html += colorFieldHtml('颜色', el.color || '#6c5ce7', 'color', idx);
  } else {
    html += fieldHtml('X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">');
    html += fieldHtml('Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">');
    if (el.w !== undefined) html += fieldHtml('宽', '<input type="number" value="' + (el.w || 100) + '" data-prop="w" data-idx="' + idx + '">');
    if (el.h !== undefined) html += fieldHtml('高', '<input type="number" value="' + (el.h || 100) + '" data-prop="h" data-idx="' + idx + '">');
    if (el.color !== undefined) html += colorFieldHtml('颜色', el.color, 'color', idx);
    if (el.type === 'progress') {
      html += fieldHtml('进度', '<input type="range" min="0" max="100" value="' + (el.value || 60) + '" data-prop="value" data-idx="' + idx + '">');
      html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 4) + '" data-prop="radius" data-idx="' + idx + '">');
      html += colorFieldHtml('背景', el.bgColor || '#333333', 'bgColor', idx);
    }
  }
  html += '</div></div>';
  return html;
}

function fieldHtml(label, input, full) {
  return '<div class="field"' + (full ? ' style="grid-column:1/-1"' : '') + '><label>' + label + '</label>' + input + '</div>';
}

function colorFieldHtml(label, value, prop, idx) {
  return '<div class="field field-color"><label>' + label + '</label>' +
    '<input type="color" value="' + value + '" data-prop="' + prop + '" data-idx="' + idx + '">' +
    '<span class="color-val">' + value + '</span></div>';
}

function getSelectedDevice() {
  return getDevice(document.getElementById('deviceSelect').value);
}
