// ─── Config Panel: 配置渲染 + 字段渲染 + 缩略图 ─────────────────
import * as S from '../state.js';
import { getDevice, cameraZoneWidth } from '../devices.js';
import { TEMPLATES, TPL_CATEGORIES, TPL_CATEGORY_MAP } from '../templates/index.js';
import { renderTemplatePreview, PreviewRenderer } from '../live-preview.js';
import { escHtml, getRecentColors, addRecentColor, getFavorites, toggleFavorite } from '../utils.js';
import { isInCameraZone } from './elements.js';
import { renderElementEditor } from './editors/index.js';
import { COLOR_PRESETS, THEME_PRESETS, LAYER_ICONS, renderColorPresets } from './editors/common.js';
import { TPL_USAGE } from '../templates/usage.js';
export { COLOR_PRESETS };

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
      (TPL_USAGE[t.id] ? '<button class="tpl-info-btn" data-usage="' + t.id + '" title="使用说明">❓</button>' : '') +
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
    '<button class="el-btn" data-action="importZip"><span class="el-btn-icon">📦</span> 导入ZIP</button>' +
    '<button class="el-btn" data-action="importMAML"><span class="el-btn-icon">📄</span> 导入MAML</button>';

  var elementSectionInner = '<div class="el-toolbar">' + coreAddBtns +
    '<div class="el-toolbar-more-wrap">' +
    '<button class="el-btn" data-elmore-toggle>⋯ 更多</button>' +
    '<div class="el-toolbar-more-menu" style="display:none" data-elmore-menu>' + extraAddBtns + '</div>' +
    '</div></div>' +
    '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center">' +
    '<label class="check-label"><input type="checkbox" id="snapToggle" checked> 吸附网格 (' + S.SNAP_GRID + 'px)</label>' +
    '</div>';

  // Element list with layer-panel style: drag reorder, visibility, lock, delete, camera warning
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
    html += renderElementEditor(S.elements[S.selIdx], S.selIdx, device);

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
function getSelectedDevice() {
  return getDevice(document.getElementById('deviceSelect').value);
}

// ─── 模板使用说明弹窗 ───────────────────────────────────────────
var _usageModal = null;

export function showUsageModal(tplId) {
  var usage = TPL_USAGE[tplId];
  if (!usage) return;

  if (_usageModal) { _usageModal.remove(); _usageModal = null; }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeUsageModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '520px';
  modal.style.maxHeight = '75vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header">';
  html += '<h3>' + esc(usage.title) + '</h3>';
  html += '<button class="modal-close" id="usageCloseBtn">✕</button>';
  html += '</div>';
  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto;padding:16px 20px">';

  // 使用步骤
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">📋 使用步骤</div>';
  html += '<ol style="margin:0;padding-left:20px;color:var(--text2);font-size:13px;line-height:1.8">';
  usage.steps.forEach(function (s) {
    html += '<li>' + esc(s) + '</li>';
  });
  html += '</ol></div>';

  // 使用技巧
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">💡 使用技巧</div>';
  html += '<ul style="margin:0;padding-left:20px;color:var(--text2);font-size:13px;line-height:1.8">';
  usage.tips.forEach(function (t) {
    html += '<li>' + esc(t) + '</li>';
  });
  html += '</ul></div>';

  // 导出说明
  if (usage.export) {
    html += '<div style="background:var(--surface2);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--text3)">';
    html += '📦 <strong>导出说明：</strong>' + esc(usage.export);
    html += '</div>';
  }

  html += '</div>';

  // 底部按钮
  html += '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">';
  html += '<button class="btn" id="usageOkBtn" style="background:var(--accent);color:#fff;border:none;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:13px">知道了</button>';
  html += '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _usageModal = overlay;

  overlay.querySelector('#usageCloseBtn').onclick = closeUsageModal;
  overlay.querySelector('#usageOkBtn').onclick = closeUsageModal;
}

export function closeUsageModal() {
  if (_usageModal) { _usageModal.remove(); _usageModal = null; }
}
