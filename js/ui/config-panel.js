// ─── Config Panel: 配置渲染 + 字段渲染 + 缩略图 ─────────────────
import * as S from '../state.js';
import { getDevice, cameraZoneWidth } from '../devices.js';
import { TEMPLATES, TPL_CATEGORIES, TPL_CATEGORY_MAP } from '../templates/index.js';
import { renderTemplatePreview, PreviewRenderer } from '../live-preview.js';
import { escHtml, getRecentColors, addRecentColor, getFavorites, toggleFavorite } from '../utils.js';
import { isInCameraZone, hasStyleClipboard } from './elements.js';

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
    var device = { width: 976, height: 596, cameraZoneRatio: 0.3 };
    var html = renderTemplatePreview(device, false, tpl, cfg);
    // For templates with elements(), also render elements in the thumbnail
    if (tpl.elements) {
      var els = tpl.elements(cfg);
      html += new PreviewRenderer(device, false).renderElements(els, {}, -1);
    }
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
  _thumbCache = {}; // clear cache to pick up config changes
  var favs = getFavorites();
  // Get custom order from localStorage
  var customOrder = [];
  try { customOrder = JSON.parse(localStorage.getItem('jcm-tpl-order') || '[]'); } catch(e) {}
  var sorted = TEMPLATES.slice().sort(function (a, b) {
    var aFav = favs.indexOf(a.id) >= 0 ? 0 : 1;
    var bFav = favs.indexOf(b.id) >= 0 ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    var aOrd = customOrder.indexOf(a.id);
    var bOrd = customOrder.indexOf(b.id);
    if (aOrd >= 0 && bOrd >= 0) return aOrd - bOrd;
    if (aOrd >= 0) return -1;
    if (bOrd >= 0) return 1;
    return 0;
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

function hlText(text, query) {
  if (!query) return esc(text);
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc(text).replace(new RegExp('(' + escaped + ')', 'gi'), '<span class="search-hl">$1</span>');
}

export function filterTemplates(query) {
  clearTimeout(filterTemplates._timer);
  filterTemplates._timer = setTimeout(function () {
    var cards = document.querySelectorAll('.tpl-card');
    var q = (query || '').toLowerCase().trim();
    cards.forEach(function (card) {
      var tplId = card.dataset.tpl;
      var nameEl = card.querySelector('.tpl-card-name');
      var descEl = card.querySelector('.tpl-card-desc');
      var name = (nameEl || {}).textContent || '';
      var desc = (descEl || {}).textContent || '';
      var catMatch = _activeCategory === 'all' || TPL_CATEGORY_MAP[tplId] === _activeCategory;
      var searchMatch = !q || name.toLowerCase().indexOf(q) >= 0 || desc.toLowerCase().indexOf(q) >= 0 || tplId.indexOf(q) >= 0;
      card.style.display = (catMatch && searchMatch) ? '' : 'none';
      // Highlight matching text
      if (q && searchMatch && nameEl) nameEl.innerHTML = hlText(name, q);
      if (q && searchMatch && descEl) descEl.innerHTML = hlText(desc, q);
      if (!q) {
        if (nameEl) nameEl.textContent = name;
        if (descEl) descEl.textContent = desc;
      }
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

  // Section collapse state
  var collapseState = {};
  try { collapseState = JSON.parse(localStorage.getItem('jcm-collapsed') || '{}'); } catch(e) {}
  var isMobile = window.innerWidth <= 768;
  function sec(key, title, inner, defaultCollapsed) {
    var collapsed = collapseState[key] !== undefined ? collapseState[key] : (isMobile ? true : !!defaultCollapsed);
    return '<div class="config-section' + (collapsed ? ' collapsed' : '') + '" data-section="' + key + '">' +
      '<div class="config-section-title' + (collapsed ? ' collapsed' : '') + '" data-toggle-section="' + key + '"><span>▸</span> ' + title + '</div>' +
      inner + '</div>';
  }

  var html = '';

  // Template config groups
  S.tpl.config.forEach(function (group) {
    html += sec('tpl_' + group.group, group.group, '<div class="config-grid">' +
      group.fields.map(function (f) { return renderField(f); }).join('') + '</div>');
  });

  // ── Element toolbar (simplified on mobile) ──
  var coreAddBtns =
    '<button class="el-btn" data-add="text"><span class="el-btn-icon">T</span> 文字</button>' +
    '<button class="el-btn" data-add="rectangle"><span class="el-btn-icon">▢</span> 矩形</button>' +
    '<button class="el-btn" data-pick="image"><span class="el-btn-icon">🖼</span> 图片</button>' +
    '<button class="el-btn" data-pick="video"><span class="el-btn-icon">🎬</span> 视频</button>' +
    '<button class="el-btn" data-add="circle"><span class="el-btn-icon">○</span> 圆形</button>';
  var extraAddBtns =
    '<button class="el-btn" data-add="line"><span class="el-btn-icon">─</span> 线条</button>' +
    '<button class="el-btn" data-add="arc"><span class="el-btn-icon">◠</span> 弧形</button>' +
    '<button class="el-btn" data-add="progress"><span class="el-btn-icon">▰</span> 进度条</button>' +
    '<button class="el-btn" data-add="lottie"><span class="el-btn-icon">🎭</span> Lottie</button>' +
    '<button class="el-btn" data-add="group"><span class="el-btn-icon">📦</span> Group</button>' +
    '<button class="el-btn" data-add="layer"><span class="el-btn-icon">🎨</span> Layer</button>' +
    '<button class="el-btn" data-add="musiccontrol"><span class="el-btn-icon">🎵</span> Music</button>' +
    '<button class="el-btn" data-action="importZip"><span class="el-btn-icon">📦</span> 导入ZIP</button>';

  var elementSectionInner = '<div class="el-toolbar">' + coreAddBtns +
    '<div class="el-toolbar-more-wrap">' +
    '<button class="el-btn" data-elmore-toggle>⋯ 更多</button>' +
    '<div class="el-toolbar-more-menu" style="display:none" data-elmore-menu>' + extraAddBtns + '</div>' +
    '</div></div>' +
    '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center">' +
    '<label class="check-label"><input type="checkbox" id="snapToggle" checked> 吸附网格 (' + S.SNAP_GRID + 'px)</label>' +
    '</div>';

  // Element list with layer-panel style: drag reorder, visibility, lock, delete, camera warning
  var LAYER_ICONS = { text: '🔤', rectangle: '⬜', circle: '⭕', image: '🖼️', video: '🎬', arc: '🌗', progress: '📊', lottie: '✨', group: '📦', layer: '🎨', musiccontrol: '🎵' };
  elementSectionInner += '<div class="el-list" id="elListDrag">';
  // Render in reverse order (top layer first) like the layer panel
  for (var li = S.elements.length - 1; li >= 0; li--) {
    var el = S.elements[li];
    var label = el.type === 'text' ? (el.text || '空文字')
      : el.type === 'image' ? (el.fileName || '图片')
      : el.type === 'video' ? (el.fileName || '视频')
      : (el.type === 'rectangle' && el._isLine) ? '线条'
      : el.type === 'rectangle' ? '矩形 #' + (li + 1)
      : el.type + ' #' + (li + 1);
    var inCam = isInCameraZone(el, device);
    var isHidden = el.visible === false;
    var isLocked = el.locked === true;
    var icon = LAYER_ICONS[el.type] || '❓';
    elementSectionInner += '<div class="el-item' + (S.selIdx === li ? ' active' : '') + (isHidden ? ' hidden-el' : '') + '" draggable="true" data-sel="' + li + '" data-drag-idx="' + li + '">' +
      '<span class="layer-drag-handle" title="拖拽排序">⠿</span>' +
      '<span class="layer-icon">' + icon + '</span>' +
      '<span class="el-badge">' + el.type + '</span>' +
      '<span class="el-item-name">' + esc(label) + '</span>' +
      (inCam ? '<span title="在摄像头遮挡区内" style="color:#e17055;font-size:14px">⚠️</span>' : '') +
      '<span class="el-item-actions">' +
      '<button class="layer-btn' + (isHidden ? ' active' : '') + '" data-vis="' + li + '" title="' + (isHidden ? '显示' : '隐藏') + '">' + (isHidden ? '🙈' : '👁️') + '</button>' +
      '<button class="layer-btn' + (isLocked ? ' active' : '') + '" data-lock="' + li + '" title="' + (isLocked ? '解锁' : '锁定') + '">' + (isLocked ? '🔒' : '🔓') + '</button>' +
      '<button class="el-item-del" data-del="' + li + '" title="删除">✕</button>' +
      '</span></div>';
  }
  if (S.elements.length === 0) {
    elementSectionInner += '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">点击上方按钮添加元素</div>';
  }
  elementSectionInner += '</div>';

  html += sec('elements', '额外元素' + (S.elements.length > 0 ? ' <span class="el-count-badge">' + S.elements.length + '</span>' : ''), elementSectionInner);

  // Selected element editor
  if (S.selIdx >= 0 && S.selIdx < S.elements.length) {
    html += renderElementEditorInline(S.elements[S.selIdx], S.selIdx, device);

    // Quick operations + copy/paste
    var quickOpsInner = '<div class="el-toolbar">' +
      '<button class="el-btn" data-duplicate="' + S.selIdx + '">📋 复制元素</button>' +
      (S.clipboard ? '<button class="el-btn" data-paste-el>📌 粘贴</button>' : '') +
      '<button class="el-btn" data-align="left" data-ai="' + S.selIdx + '">⬅ 左对齐</button>' +
      '<button class="el-btn" data-align="hcenter" data-ai="' + S.selIdx + '">↔ 居中</button>' +
      '<button class="el-btn" data-align="right" data-ai="' + S.selIdx + '">➡ 右对齐</button>' +
      '</div>';
    var selEl = S.elements[S.selIdx];
    if (selEl.type === 'rectangle' || selEl.type === 'image' || selEl.type === 'video') {
      quickOpsInner += '<div class="el-toolbar" style="margin-top:8px">' +
        '<button class="el-btn" data-align="top" data-ai="' + S.selIdx + '">⬆ 顶</button>' +
        '<button class="el-btn" data-align="vcenter" data-ai="' + S.selIdx + '">↕ 中</button>' +
        '<button class="el-btn" data-align="bottom" data-ai="' + S.selIdx + '">⬇ 底</button>' +
        '<button class="el-btn" data-qsize="full" data-qi="' + S.selIdx + '">全屏</button>' +
        '<button class="el-btn" data-qsize="half" data-qi="' + S.selIdx + '">半屏</button>' +
        '<button class="el-btn" data-qsize="quarter" data-qi="' + S.selIdx + '">1/4</button>' +
        '</div>';
    }
    if (selEl.color !== undefined) quickOpsInner += renderColorPresets('color', S.selIdx);
    html += sec('quickOps', '快速操作', quickOpsInner);

  }
  html += '</div>';

  document.getElementById('cfgContent').innerHTML = html;
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

// ─── Design Tool Inline Helpers ───────────────────────────────────
var FONTS = [
  { id: 'default', name: '系统默认', family: '-apple-system, sans-serif' },
  { id: 'mipro-normal', name: 'Mi Sans Regular', family: 'MiSans, sans-serif' },
  { id: 'mipro-demibold', name: 'Mi Sans SemiBold', family: 'MiSans, sans-serif', weight: 600 },
  { id: 'mipro-bold', name: 'Mi Sans Bold', family: 'MiSans, sans-serif', weight: 700 },
  { id: 'mipro-light', name: 'Mi Sans Light', family: 'MiSans, sans-serif', weight: 300 },
  { id: 'mibright', name: 'Mi Bright', family: 'MiBright, serif' },
  { id: 'noto-sans-sc', name: 'Noto Sans SC', family: '"Noto Sans SC", sans-serif' },
  { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'monospace', name: '等宽', family: 'monospace' },
];

function hexToHSL(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substr(0, 2), 16) / 255;
  var g = parseInt(hex.substr(2, 2), 16) / 255;
  var b = parseInt(hex.substr(4, 2), 16) / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  var r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    var hue2rgb = function (p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return '#' + [r, g, b].map(function (x) { return Math.round(x * 255).toString(16).padStart(2, '0'); }).join('');
}

function generateHarmony(baseHex, type) {
  var hsl = hexToHSL(baseHex);
  var h = hsl[0], s = hsl[1], l = hsl[2];
  var colors = [baseHex];
  switch (type) {
    case 'complementary': colors.push(hslToHex((h + 180) % 360, s, l)); break;
    case 'triadic': colors.push(hslToHex((h + 120) % 360, s, l)); colors.push(hslToHex((h + 240) % 360, s, l)); break;
    case 'split': colors.push(hslToHex((h + 150) % 360, s, l)); colors.push(hslToHex((h + 210) % 360, s, l)); break;
    case 'analogous': colors.push(hslToHex((h + 30) % 360, s, l)); colors.push(hslToHex((h + 330) % 360, s, l)); break;
    case 'monochromatic': colors.push(hslToHex(h, s, Math.min(l + 20, 95))); colors.push(hslToHex(h, s, Math.max(l - 20, 5))); colors.push(hslToHex(h, Math.max(s - 30, 10), l)); break;
  }
  return colors;
}

var GRAD_PRESETS = [
  { name: '赛博朋克', c1: '#ff00ff', c2: '#00ffff' },
  { name: '日落', c1: '#e55039', c2: '#f39c12' },
  { name: '海洋', c1: '#0984e3', c2: '#00cec9' },
  { name: '森林', c1: '#2d5016', c2: '#6ab04c' },
  { name: '极光', c1: '#6c5ce7', c2: '#00b894' },
  { name: '霓虹', c1: '#ff00ff', c2: '#39ff14' },
  { name: '暗金', c1: '#2c3e50', c2: '#f39c12' },
  { name: '玫瑰', c1: '#e84393', c2: '#fd79a8' },
];

var ANIM_LIST = [
  { v: 'none', l: '无动画' }, { v: 'fadeIn', l: '淡入' }, { v: 'fadeOut', l: '淡出' },
  { v: 'slideInLeft', l: '从左滑入' }, { v: 'slideInRight', l: '从右滑入' },
  { v: 'slideInUp', l: '从下滑入' }, { v: 'slideInDown', l: '从上滑入' },
  { v: 'zoomIn', l: '放大进入' }, { v: 'zoomOut', l: '缩小退出' },
  { v: 'bounce', l: '弹跳' }, { v: 'pulse', l: '脉冲' }, { v: 'shake', l: '抖动' },
  { v: 'rotate', l: '旋转' }, { v: 'blink', l: '闪烁' },
];

function renderDesignToolsInline(idx) {
  var el = S.elements[idx];
  if (!el) return '';
  var html = '';

  // ── 调色板 ──
  var base = el.color || '#6c5ce7';
  var types = [
    { id: 'complementary', name: '互补色' },
    { id: 'triadic', name: '三色' },
    { id: 'split', name: '分裂互补' },
    { id: 'analogous', name: '类似色' },
    { id: 'monochromatic', name: '单色' },
  ];
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 🎨 色彩搭配</div>';
  html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">';
  types.forEach(function (t) {
    var colors = generateHarmony(base, t.id);
    html += '<div style="flex:1;min-width:100px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">' + t.name + '</div><div style="display:flex;gap:2px;height:24px;border-radius:4px;overflow:hidden">';
    colors.forEach(function (c) {
      html += '<div style="flex:1;background:' + c + ';cursor:pointer" class="palette-swatch" data-color="' + c + '" data-apply-to="' + idx + '" title="' + c + '"></div>';
    });
    html += '</div></div>';
  });
  html += '</div></div>';

  // ── 字体预览 (仅文字元素) ──
  if (el.type === 'text') {
    html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 🔤 字体选择</div>';
    FONTS.forEach(function (f) {
      var isActive = el.fontFamily === f.id;
      html += '<div class="font-preview-item' + (isActive ? ' active' : '') + '" data-font-apply="' + f.id + '" data-font-idx="' + idx + '" style="padding:8px 10px;margin-bottom:3px;border-radius:6px;cursor:pointer;border:1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)') + ';background:' + (isActive ? 'var(--accent-glow)' : 'var(--surface2)') + '">' +
        '<div style="font-size:10px;color:var(--text3)">' + f.name + '</div>' +
        '<div style="font-family:' + f.family + ';font-size:16px;' + (f.weight ? 'font-weight:' + f.weight + ';' : '') + '">小米背屏 123 ABC</div></div>';
    });
    html += '</div>';
  }

  // ── 渐变编辑 (文字/矩形) ──
  if (el.type === 'text' || el.type === 'rectangle') {
    var gc1 = el.color || '#6c5ce7';
    var gc2 = (el.type === 'text' ? el.gradientColor2 : el.fillColor2) || '#00b894';
    html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 🌈 渐变编辑</div>';
    html += '<div style="height:36px;border-radius:8px;background:linear-gradient(135deg,' + gc1 + ',' + gc2 + ');margin-bottom:10px"></div>';
    html += '<div style="display:flex;gap:10px;margin-bottom:10px">';
    html += '<div class="field field-color" style="flex:1"><label>起始色</label><input type="color" value="' + gc1 + '" data-prop="color" data-idx="' + idx + '"><span class="color-val">' + gc1 + '</span></div>';
    html += '<div class="field field-color" style="flex:1"><label>结束色</label><input type="color" value="' + gc2 + '" data-prop="' + (el.type === 'text' ? 'gradientColor2' : 'fillColor2') + '" data-idx="' + idx + '"><span class="color-val">' + gc2 + '</span></div>';
    html += '</div>';
    // Presets
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">';
    GRAD_PRESETS.forEach(function (p) {
      html += '<div class="grad-preset" data-gp-c1="' + p.c1 + '" data-gp-c2="' + p.c2 + '" data-gp-idx="' + idx + '" data-gp-type="' + el.type + '" style="height:28px;border-radius:5px;background:linear-gradient(135deg,' + p.c1 + ',' + p.c2 + ');cursor:pointer;position:relative" title="' + p.name + '"><span style="position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:8px;color:rgba(255,255,255,.8);text-shadow:0 1px 2px rgba(0,0,0,.5)">' + p.name + '</span></div>';
    });
    html += '</div>';
    html += '</div>';
  }

  // ── 动画编辑 ──
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> ✨ 动画效果</div>';
  html += '<div class="config-grid">';
  html += '<div class="field"><label>动画类型</label><select data-prop="animationName" data-idx="' + idx + '">';
  ANIM_LIST.forEach(function (a) {
    html += '<option value="' + a.v + '"' + ((el.animationName || '') === a.v ? ' selected' : '') + '>' + a.l + '</option>';
  });
  html += '</select></div>';
  html += '<div class="field"><label>持续 (ms)</label><input type="number" value="' + (el.animationDuration || 500) + '" data-prop="animationDuration" data-idx="' + idx + '" min="100" max="5000" step="100"></div>';
  html += '<div class="field"><label>延迟 (ms)</label><input type="number" value="' + (el.animationDelay || 0) + '" data-prop="animationDelay" data-idx="' + idx + '" min="0" max="3000" step="100"></div>';
  html += '<div class="field"><label>重复</label><input type="number" value="' + (el.animationRepeat || 1) + '" data-prop="animationRepeat" data-idx="' + idx + '" min="1" max="99"></div>';
  html += '<div class="field"><label>无限循环</label><label class="toggle-switch"><input type="checkbox" data-prop="animationInfinite" data-idx="' + idx + '"' + (el.animationInfinite ? ' checked' : '') + '><span class="toggle-slider"></span></label></div>';
  html += '</div></div>';

  return html;
}

function renderElementEditorInline(el, idx, device) {
  var html = '<div class="el-detail">';
  if (isInCameraZone(el, device)) {
    var safeX = cameraZoneWidth(device);
    html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:rgba(225,112,85,0.1);border:1px solid rgba(225,112,85,0.3);border-radius:8px;font-size:12px;color:#e17055"><span>⚠️</span> 此元素位于摄像头遮挡区内，建议将 X 调整到 ≥ ' + safeX + '</div>';
  }

  // Element type header with lock + visible toggle
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  html += '<div style="display:flex;align-items:center;gap:8px">';
  html += '<span class="el-badge">' + el.type + '</span>';
  html += '<span style="font-size:13px;font-weight:600">' + getElementTypeLabel(el) + '</span>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<label class="check-label" style="font-size:11px"><input type="checkbox" data-prop="visible" data-idx="' + idx + '"' + (el.visible !== false ? ' checked' : '') + '> 👁</label>';
  html += '<label class="check-label" style="font-size:11px"><input type="checkbox" data-prop="locked" data-idx="' + idx + '"' + (el.locked ? ' checked' : '') + '> 🔒</label>';
  html += '</div></div>';

  // ── Section: Position & Size ──
  html += '<div class="el-editor-section">';
  html += '<div class="el-editor-section-title">📍 位置 & 大小</div>';
  html += '<div class="config-grid">';
  html += fieldHtml('X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">');
  html += fieldHtml('Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">');
  if (el.w !== undefined) html += fieldHtml('宽', '<input type="number" value="' + (el.w || 100) + '" data-prop="w" data-idx="' + idx + '" min="1" max="9999">');
  if (el.h !== undefined) html += fieldHtml('高', '<input type="number" value="' + (el.h || 100) + '" data-prop="h" data-idx="' + idx + '" min="1" max="9999">');
  if (el.r !== undefined) html += fieldHtml('半径', '<input type="number" value="' + (el.r || 30) + '" data-prop="r" data-idx="' + idx + '" min="1" max="999">');
  html += '</div>';
  // Align buttons
  html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">';
  html += '<button class="el-btn" data-align="left" data-ai="' + idx + '" style="font-size:10px;padding:4px 8px">⬅ 左</button>';
  html += '<button class="el-btn" data-align="hcenter" data-ai="' + idx + '" style="font-size:10px;padding:4px 8px">↔ 中</button>';
  html += '<button class="el-btn" data-align="right" data-ai="' + idx + '" style="font-size:10px;padding:4px 8px">➡ 右</button>';
  html += '<button class="el-btn" data-align="top" data-ai="' + idx + '" style="font-size:10px;padding:4px 8px">⬆ 顶</button>';
  html += '<button class="el-btn" data-align="vcenter" data-ai="' + idx + '" style="font-size:10px;padding:4px 8px">↕ 中</button>';
  html += '<button class="el-btn" data-align="bottom" data-ai="' + idx + '" style="font-size:10px;padding:4px 8px">⬇ 底</button>';
  html += '</div>';
  // Quick size buttons
  if (el.type === 'rectangle' || el.type === 'image' || el.type === 'video' || el.type === 'progress') {
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">';
    html += '<button class="el-btn" data-qsize="full" data-qi="' + idx + '" style="font-size:10px;padding:4px 8px">⛶ 全屏</button>';
    html += '<button class="el-btn" data-qsize="half" data-qi="' + idx + '" style="font-size:10px;padding:4px 8px">◧ 半屏</button>';
    html += '<button class="el-btn" data-qsize="quarter" data-qi="' + idx + '" style="font-size:10px;padding:4px 8px">◫ 1/4</button>';
    html += '</div>';
  }
  html += '</div>';

  // ── Section: Style (type-specific) ──
  html += '<div class="el-editor-section">';
  html += '<div class="el-editor-section-title">🎨 样式</div>';
  html += '<div class="config-grid">';

  if (el.type === 'text') {
    html += fieldHtml('文字', '<input type="text" value="' + esc(el.text || '') + '" data-prop="text" data-idx="' + idx + '">', true);
    // Expression field for dynamic template elements
    html += fieldHtml('表达式', '<input type="text" value="' + esc(el.expression || '') + '" data-prop="expression" data-idx="' + idx + '" placeholder="如 formatDate(\'HH:mm\', #time_sys)" style="font-size:11px"><div style="font-size:10px;color:var(--text3);margin-top:2px">留空使用静态文字，填写后用 textExp 生成</div>', true);
    html += fieldHtml('字号', '<input type="number" value="' + el.size + '" data-prop="size" data-idx="' + idx + '" min="8" max="200">');
    html += colorFieldHtml('颜色', el.color || '#ffffff', 'color', idx);
    // Font family
    html += '<div class="field"><label>字体</label><select data-prop="fontFamily" data-idx="' + idx + '">' +
      FONT_OPTIONS.map(function (f) { return '<option value="' + f.id + '"' + (el.fontFamily === f.id ? ' selected' : '') + '>' + f.name + '</option>'; }).join('') +
      '</select></div>';
    // Text alignment
    html += '<div class="field"><label>对齐</label><div style="display:flex;gap:2px">' +
      ['left', 'center', 'right'].map(function (a) {
        var icons = { left: '⬅', center: '≡', right: '➡' };
        var isActive = (el.textAlign || 'left') === a;
        return '<button class="el-btn" data-prop="textAlign" data-idx="' + idx + '" data-val="' + a + '" style="flex:1;justify-content:center;font-size:12px;padding:6px;background:' + (isActive ? 'var(--accent-glow)' : '') + ';border-color:' + (isActive ? 'var(--accent)' : 'var(--border)') + '">' + icons[a] + '</button>';
      }).join('') + '</div></div>';
    html += fieldHtml('加粗', '<label class="toggle-switch"><input type="checkbox" data-prop="bold" data-idx="' + idx + '"' + (el.bold ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    // Text decorations
    html += fieldHtml('下划线', '<label class="toggle-switch"><input type="checkbox" data-prop="underline" data-idx="' + idx + '"' + (el.underline ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('删除线', '<label class="toggle-switch"><input type="checkbox" data-prop="strikethrough" data-idx="' + idx + '"' + (el.strikethrough ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('字间距', '<input type="number" value="' + (el.letterSpacing || 0) + '" data-prop="letterSpacing" data-idx="' + idx + '" min="-5" max="20" step="0.5">');
    html += fieldHtml('多行', '<label class="toggle-switch"><input type="checkbox" data-prop="multiLine" data-idx="' + idx + '"' + (el.multiLine ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    if (el.multiLine) {
      html += fieldHtml('行高', '<input type="range" min="10" max="30" value="' + Math.round((el.lineHeight || 1.4) * 10) + '" data-prop="lineHeight" data-idx="' + idx + '" step="1"><span style="font-size:10px;color:var(--text3)">' + (el.lineHeight || 1.4).toFixed(1) + '</span>');
    }
    html += fieldHtml('宽度', '<input type="number" value="' + (el.w || 200) + '" data-prop="w" data-idx="' + idx + '" min="20" max="999">');

  } else if (el.type === 'rectangle') {
    html += colorFieldHtml('颜色', el.color || '#333333', 'color', idx);
    html += fieldHtml('渐变', '<div style="display:flex;gap:6px;align-items:center">' +
      colorFieldHtml2(el.fillColor2 || '', 'fillColor2', idx) +
      (el.fillColor2 ? '<button class="el-btn" data-clear-fill2 data-idx="' + idx + '" style="font-size:10px;padding:3px 6px">✕</button>' : '') +
      '</div>');
    html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 0) + '" data-prop="radius" data-idx="' + idx + '" min="0" max="500">');
    html += fieldHtml('描边', '<div style="display:flex;gap:6px;align-items:center">' +
      '<input type="number" value="' + (el.strokeWidth || 0) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="0" max="20" style="width:60px">' +
      (el.strokeWidth > 0 ? colorFieldHtml2(el.strokeColor || '#ffffff', 'strokeColor', idx) : '') +
      '</div>');
    html += fieldHtml('模糊', '<input type="range" min="0" max="30" value="' + (el.blur || 0) + '" data-prop="blur" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.blur || 0) + 'px</span>');

  } else if (el.type === 'circle') {
    html += colorFieldHtml('颜色', el.color || '#6c5ce7', 'color', idx);
    html += fieldHtml('描边', '<div style="display:flex;gap:6px;align-items:center">' +
      '<input type="number" value="' + (el.strokeWidth || 0) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="0" max="20" style="width:60px">' +
      (el.strokeWidth > 0 ? colorFieldHtml2(el.strokeColor || '#ffffff', 'strokeColor', idx) : '') +
      '</div>');

  } else if (el.type === 'arc') {
    html += colorFieldHtml('颜色', el.color || '#6c5ce7', 'color', idx);
    html += fieldHtml('起始角', '<input type="number" value="' + (el.startAngle || 0) + '" data-prop="startAngle" data-idx="' + idx + '" min="0" max="360">°');
    html += fieldHtml('终止角', '<input type="number" value="' + (el.endAngle || 270) + '" data-prop="endAngle" data-idx="' + idx + '" min="0" max="360">°');
    html += fieldHtml('线宽', '<input type="number" value="' + (el.strokeWidth || 6) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="1" max="30">');

  } else if (el.type === 'image' || el.type === 'video') {
    html += '<div class="field"><label>适配</label><select data-prop="fit" data-idx="' + idx + '">' +
      ['cover', 'contain', 'fill', 'none'].map(function (f) { return '<option value="' + f + '"' + ((el.fit || 'cover') === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') +
      '</select></div>';
    html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 0) + '" data-prop="radius" data-idx="' + idx + '" min="0" max="500">');
    // File replace buttons
    if (el.type === 'image' && el.fileName) html += '<div style="grid-column:1/-1"><button class="el-btn" data-pick="image" style="font-size:11px">🖼 替换图片</button></div>';
    if (el.type === 'video' && el.fileName) html += '<div style="grid-column:1/-1"><button class="el-btn" data-pick="video" style="font-size:11px">🎬 替换视频</button></div>';

  } else if (el.type === 'progress') {
    html += fieldHtml('进度', '<input type="range" min="0" max="100" value="' + (el.value || 60) + '" data-prop="value" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.value || 60) + '%</span>');
    html += colorFieldHtml('前景', el.color || '#6c5ce7', 'color', idx);
    html += colorFieldHtml('背景', el.bgColor || '#333333', 'bgColor', idx);
    html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 4) + '" data-prop="radius" data-idx="' + idx + '" min="0" max="50">');

  } else if (el.type === 'lottie') {
    html += fieldHtml('资源', '<input type="text" value="' + esc(el.src || el.fileName || '') + '" data-prop="src" data-idx="' + idx + '" placeholder="如 assets/play.json">');
    html += fieldHtml('名称', '<input type="text" value="' + esc(el.name || '') + '" data-prop="name" data-idx="' + idx + '" placeholder="MAML name 属性">');
    html += fieldHtml('对齐', '<select data-prop="align" data-idx="' + idx + '">' +
      ['center', 'left', 'right', 'top', 'bottom'].map(function (a) { return '<option value="' + a + '"' + ((el.align || 'center') === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>');
    html += fieldHtml('循环', '<input type="number" value="' + (el.loop !== undefined ? el.loop : 0) + '" data-prop="loop" data-idx="' + idx + '" min="0" max="999"><span style="font-size:10px;color:var(--text3)">0=无限</span>');
    html += fieldHtml('速度', '<input type="range" min="1" max="50" value="' + Math.round((el.speed || 1) * 10) + '" data-prop="speed" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.speed || 1).toFixed(1) + 'x</span>');

  } else if (el.type === 'group') {
    html += fieldHtml('名称', '<input type="text" value="' + esc(el.name || '') + '" data-prop="name" data-idx="' + idx + '" placeholder="MAML name">');
    html += fieldHtml('可见性', '<input type="text" value="' + esc(el.visibility || '') + '" data-prop="visibility" data-idx="' + idx + '" placeholder="如 !#enable_hyper_material">');
    html += fieldHtml('Folme', '<label class="toggle-switch"><input type="checkbox" data-prop="folmeMode" data-idx="' + idx + '"' + (el.folmeMode ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('水平对齐', '<select data-prop="align" data-idx="' + idx + '">' +
      ['', 'left', 'center', 'right'].map(function (a) { return '<option value="' + a + '"' + ((el.align || '') === a ? ' selected' : '') + '>' + (a || '无') + '</option>'; }).join('') + '</select>');
    html += fieldHtml('垂直对齐', '<select data-prop="alignV" data-idx="' + idx + '">' +
      ['', 'top', 'center', 'bottom'].map(function (a) { return '<option value="' + a + '"' + ((el.alignV || '') === a ? ' selected' : '') + '>' + (a || '无') + '</option>'; }).join('') + '</select>');
    html += fieldHtml('描述', '<input type="text" value="' + esc(el.contentDescription || '') + '" data-prop="contentDescription" data-idx="' + idx + '" placeholder="contentDescriptionExp">');

  } else if (el.type === 'layer') {
    html += fieldHtml('名称', '<input type="text" value="' + esc(el.name || '') + '" data-prop="name" data-idx="' + idx + '" placeholder="MAML name">');
    html += fieldHtml('层类型', '<select data-prop="layerType" data-idx="' + idx + '">' +
      ['bottom', 'top', 'overlay'].map(function (t) { return '<option value="' + t + '"' + ((el.layerType || 'bottom') === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>');
    html += fieldHtml('可见性', '<input type="text" value="' + esc(el.visibility || '') + '" data-prop="visibility" data-idx="' + idx + '" placeholder="如 #enable_hyper_material">');
    html += fieldHtml('模糊半径', '<input type="number" value="' + (el.blurRadius || 0) + '" data-prop="blurRadius" data-idx="' + idx + '" min="0" max="500">');
    html += fieldHtml('模糊色', '<input type="text" value="' + esc(el.blurColors || '') + '" data-prop="blurColors" data-idx="' + idx + '" placeholder="如 #00000000">');
    html += fieldHtml('颜色模式', '<input type="number" value="' + (el.colorModes || 0) + '" data-prop="colorModes" data-idx="' + idx + '">');
    html += fieldHtml('帧率', '<input type="number" value="' + (el.frameRate !== undefined ? el.frameRate : -1) + '" data-prop="frameRate" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">-1=跟随</span>');

  } else if (el.type === 'musiccontrol') {
    html += fieldHtml('名称', '<input type="text" value="' + esc(el.name || 'music_control') + '" data-prop="name" data-idx="' + idx + '">');
    html += fieldHtml('歌词', '<label class="toggle-switch"><input type="checkbox" data-prop="enableLyric" data-idx="' + idx + '"' + (el.enableLyric !== false ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('刷新', '<label class="toggle-switch"><input type="checkbox" data-prop="autoRefresh" data-idx="' + idx + '"' + (el.autoRefresh !== false ? ' checked' : '') + '><span class="toggle-slider"></span></label>');
    html += fieldHtml('歌词间隔', '<input type="number" value="' + (el.updateLyricInterval || 100) + '" data-prop="updateLyricInterval" data-idx="' + idx + '" min="50" max="5000"><span style="font-size:10px;color:var(--text3)">ms</span>');
  }
  html += '</div></div>';

  // ── Section: Transform & Effects ──
  html += '<div class="el-editor-section">';
  html += '<div class="el-editor-section-title">✨ 变换 & 效果</div>';
  html += '<div class="config-grid">';
  html += fieldHtml('旋转', '<div style="display:flex;gap:6px;align-items:center"><input type="range" min="0" max="360" value="' + (el.rotation || 0) + '" data-prop="rotation" data-idx="' + idx + '" style="flex:1"><span style="font-size:11px;color:var(--text3);min-width:30px;text-align:right">' + (el.rotation || 0) + '°</span></div>');
  html += fieldHtml('透明度', '<div style="display:flex;gap:6px;align-items:center"><input type="range" min="0" max="100" value="' + (el.opacity !== undefined ? el.opacity : 100) + '" data-prop="opacity" data-idx="' + idx + '" style="flex:1"><span style="font-size:11px;color:var(--text3);min-width:30px;text-align:right">' + (el.opacity !== undefined ? el.opacity : 100) + '%</span></div>');

  // Shadow (text only)
  if (el.type === 'text') {
    html += '<div class="field"><label>阴影</label><select data-prop="shadow" data-idx="' + idx + '">' +
      [{ v: 'none', l: '无' }, { v: 'light', l: '轻阴影' }, { v: 'dark', l: '深阴影' }, { v: 'glow', l: '发光' }].map(function (s) {
        return '<option value="' + s.v + '"' + ((el.shadow || 'none') === s.v ? ' selected' : '') + '>' + s.l + '</option>';
      }).join('') + '</select></div>';
  }
  // CSS Filters (image/video/rectangle)
  if (el.type === 'image' || el.type === 'video' || el.type === 'rectangle') {
    html += fieldHtml('亮度', '<input type="range" min="0" max="200" value="' + (el.brightness !== undefined ? el.brightness : 100) + '" data-prop="brightness" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.brightness !== undefined ? el.brightness : 100) + '%</span>');
    html += fieldHtml('饱和度', '<input type="range" min="0" max="200" value="' + (el.saturate !== undefined ? el.saturate : 100) + '" data-prop="saturate" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.saturate !== undefined ? el.saturate : 100) + '%</span>');
    html += fieldHtml('色相', '<input type="range" min="0" max="360" value="' + (el.hueRotate || 0) + '" data-prop="hueRotate" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.hueRotate || 0) + '°</span>');
  }
  html += '</div></div>';

  // ── Section: MAML 变量绑定 ──
  html += '<div class="el-editor-section">';
  html += '<div class="el-editor-section-title">🔗 MAML 变量绑定</div>';
  html += renderMamlVarBinding(el, idx);
  html += '</div>';

  // ── Color presets ──
  if (el.color !== undefined) {
    html += '<div class="el-editor-section">';
    html += '<div class="el-editor-section-title">🎨 颜色预设</div>';
    html += renderColorPresets('color', idx);
    html += '</div>';
  }

  // ── Quick Actions ──
  html += '<div class="el-editor-section">';
  html += '<div class="el-editor-section-title">⚡ 快捷操作</div>';
  html += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
  html += '<button class="el-btn" data-duplicate="' + idx + '" style="font-size:11px">📋 复制</button>';
  if (S.clipboard) html += '<button class="el-btn" data-paste-el style="font-size:11px">📌 粘贴</button>';
  html += '<button class="el-btn" data-copy-style="' + idx + '" style="font-size:11px">🎨 复制样式</button>';
  if (hasStyleClipboard()) html += '<button class="el-btn" data-paste-style="' + idx + '" style="font-size:11px">📌 粘贴样式</button>';
  html += '<button class="el-btn" data-del="' + idx + '" style="font-size:11px;color:var(--red)">🗑️ 删除</button>';
  html += '</div>';
  // Distribute & match size (conditional)
  if (S.elements.length >= 3) {
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">';
    html += '<button class="el-btn" data-distribute="horizontal" style="font-size:10px;padding:4px 8px">↔ 水平分布</button>';
    html += '<button class="el-btn" data-distribute="vertical" style="font-size:10px;padding:4px 8px">↕ 垂直分布</button>';
    html += '</div>';
  }
  if (S.elements.length >= 2) {
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">';
    html += '<button class="el-btn" data-match-size="width" style="font-size:10px;padding:4px 8px">📏 同宽</button>';
    html += '<button class="el-btn" data-match-size="height" style="font-size:10px;padding:4px 8px">📐 同高</button>';
    html += '<button class="el-btn" data-match-size="both" style="font-size:10px;padding:4px 8px">⬛ 同大小</button>';
    html += '</div>';
  }
  // Style presets
  html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">';
  html += '<button class="el-btn" data-save-style="' + idx + '" style="font-size:11px">💾 保存样式</button>';
  html += '<button class="el-btn" data-apply-styles style="font-size:11px">📦 应用样式</button>';
  html += '</div>';
  html += '</div>';

  // ── Design Tools ──
  html += renderDesignToolsInline(idx);

  html += '</div>';
  return html;
}

// ── MAML Variable Binding Panel ──
var MAML_VARS = [
  { var: '#step', desc: '步数', group: '健康' },
  { var: '#battery_level', desc: '电量百分比', group: '健康' },
  { var: '#battery_charging', desc: '是否充电', group: '健康' },
  { var: '#weather_temp', desc: '天气温度', group: '天气' },
  { var: '#weather_desc', desc: '天气描述', group: '天气' },
  { var: '#weather_humidity', desc: '湿度', group: '天气' },
  { var: '#weather_city', desc: '城市名', group: '天气' },
  { var: '#music_title', desc: '音乐标题', group: '音乐' },
  { var: '#music_artist', desc: '音乐歌手', group: '音乐' },
  { var: '#view_width', desc: '视图宽度', group: '系统' },
  { var: '#view_height', desc: '视图高度', group: '系统' },
  { var: '#marginL', desc: '左边距(摄像头)', group: '系统' },
  { var: '#hour', desc: '当前小时', group: '时间' },
  { var: '#minute', desc: '当前分钟', group: '时间' },
  { var: '#month', desc: '当前月份', group: '时间' },
  { var: '#day', desc: '当前日期', group: '时间' },
  { var: '#day_of_week', desc: '星期几', group: '时间' },
];

function renderMamlVarBinding(el, idx) {
  var html = '<div style="margin-bottom:6px"><input type="text" id="mamlVarSearch" placeholder="搜索变量..." style="width:100%;padding:5px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;outline:none"></div>';
  var groups = {};
  MAML_VARS.forEach(function (v) {
    if (!groups[v.group]) groups[v.group] = [];
    groups[v.group].push(v);
  });
  Object.keys(groups).forEach(function (g) {
    html += '<div style="margin-bottom:4px"><div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:2px">' + g + '</div>';
    html += '<div style="display:flex;gap:3px;flex-wrap:wrap">';
    groups[g].forEach(function (v) {
      html += '<button class="el-btn maml-var-btn" data-var-insert="' + v.var + '" data-var-idx="' + idx + '" style="font-size:10px;padding:3px 8px" title="' + v.desc + '">' + v.var + '</button>';
    });
    html += '</div></div>';
  });
  // Expression editor
  html += '<div style="margin-top:6px"><label style="font-size:10px;color:var(--text2)">表达式 (绑定到文字/宽度等)</label>';
  html += '<input type="text" value="' + esc(el.expression || '') + '" data-prop="expression" data-idx="' + idx + '" placeholder="如: #step 步 或 #weather_temp°" style="width:100%;padding:5px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;outline:none;margin-top:3px"></div>';
  return html;
}

// Helper: element type labels
function getElementTypeLabel(el) {
  var labels = { text: '文字', rectangle: '矩形', circle: '圆形', arc: '弧形', image: '图片', video: '视频', progress: '进度条', lottie: 'Lottie 动画', group: '容器组', layer: '材质层', musiccontrol: '音乐控件' };
  return labels[el.type] || el.type;
}

// Font options for the dropdown
var FONT_OPTIONS = [
  { id: 'default', name: '系统默认' },
  { id: 'mipro-normal', name: 'Mi Sans Regular' },
  { id: 'mipro-demibold', name: 'Mi Sans SemiBold' },
  { id: 'mipro-bold', name: 'Mi Sans Bold' },
  { id: 'mipro-light', name: 'Mi Sans Light' },
  { id: 'mibright', name: 'Mi Bright' },
  { id: 'noto-sans-sc', name: 'Noto Sans SC' },
  { id: 'roboto', name: 'Roboto' },
  { id: 'monospace', name: '等宽' },
];

// Helper: inline color field (small version for gradients)
function colorFieldHtml2(value, prop, idx) {
  return '<input type="color" value="' + (value || '#000000') + '" data-prop="' + prop + '" data-idx="' + idx + '" style="width:32px;height:28px;padding:2px;border-radius:4px;cursor:pointer;border:1px solid var(--border)">';
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
