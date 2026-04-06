// ─── UI: 页面导航 + 配置渲染 + 拖拽 + 撤销 + 所有新功能 ───────────

// ─── State ────────────────────────────────────────────────────────
var _step = 0;
var _tpl = null;
var _cfg = {};
var _elements = [];
var _selIdx = -1;
var _dirty = true;
JCM.uploadedFiles = {};
var _pendingAdd = null;
var _pendingReplace = -1;
var SNAP_GRID = 10;
var _previewTimer = null;
var _clipboard = null; // Copy/paste buffer

// ─── Debounce ─────────────────────────────────────────────────────
function debounce(fn, ms) {
  var timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

// ─── MAML Generation Helper ───────────────────────────────────────
// 统一处理普通模板、rawXml 模板和自定义模板
function getTemplateMAML(tpl, cfg, device) {
  if (tpl.rawXml) return tpl.rawXml(cfg);
  if (tpl.gen) return tpl.gen(cfg);
  return generateCustomMAML(device);
}

// ─── Template Preview Helper ──────────────────────────────────────
function renderTemplatePreview(device, showCam, tpl, cfg) {
  // rawXml 模板显示占位预览
  if (tpl.rawXml) {
    return rRealPreview(device, showCam, tpl, cfg);
  }
  var r = new JCM.PreviewRenderer(device, showCam);
  switch (tpl.id) {
    case 'clock':      return r.renderClock(cfg);
    case 'quote':      return r.renderQuote(cfg);
    case 'battery':    return r.renderBattery(cfg);
    case 'status':     return r.renderStatus(cfg);
    case 'countdown':  return r.renderCountdown(cfg);
    case 'music':      return r.renderMusic(cfg);
    case 'gradient':   return r.renderGradient(cfg);
    case 'weather':    return r.renderWeather(cfg);
    case 'steps':      return r.renderSteps(cfg);
    case 'calendar':   return r.renderCalendar(cfg);
    case 'dualclock':  return r.renderDualclock(cfg);
    case 'dailyquote': return r.renderDailyquote(cfg);
    case 'ring':       return r.renderRing(cfg);
    case 'dashboard':  return r.renderDashboard(cfg);
    case 'image':      return r.renderImage(cfg);
    case 'custom':     return r.renderCustom(cfg);
    default:           return '';
  }
}

// ─── 真实设备模板预览 ─────────────────────────────────────────────
function rRealPreview(device, showCam, tpl, cfg) {
  var camW = showCam ? 420 * device.cameraZoneRatio : 0;
  var bg = cfg.bgColor || '#0a1628';
  var dc = cfg.descColor || '#888888';
  if (tpl.id === 'weather_real') {
    return '<div style="position:absolute;inset:0;background:' + bg + '"></div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:20px;font-size:40px;color:' + (cfg.timeColor || '#fff') + ';font-weight:700">09:41</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:68px;font-size:12px;color:' + dc + '">4月6日 星期日</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:88px;font-size:32px;color:' + (cfg.tempColor || '#fff') + ';font-weight:700">23°</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:128px;font-size:11px;color:' + dc + '">北京 · 晴</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:148px;font-size:9px;color:' + dc + ';opacity:0.5">最高 28° 最低 14°</div>' +
      '<div style="position:absolute;right:8px;bottom:6px;font-size:8px;color:' + dc + ';opacity:0.3">需真实设备数据</div>';
  }
  if (tpl.id === 'music_real') {
    return '<div style="position:absolute;inset:0;background:' + bg + '"></div>' +
      '<div style="position:absolute;left:' + (camW + 14) + 'px;top:18px;font-size:15px;color:' + (cfg.titleColor || '#fff') + ';font-weight:700">歌曲名称</div>' +
      '<div style="position:absolute;left:' + (camW + 14) + 'px;top:40px;font-size:10px;color:' + (cfg.artistColor || '#888') + '">歌手名称</div>' +
      '<div style="position:absolute;left:' + (camW + 14) + 'px;top:58px;right:14px;height:2px;background:#333;border-radius:1px"></div>' +
      '<div style="position:absolute;left:' + (camW + 14) + 'px;top:68px;font-size:9px;color:' + (cfg.accentColor || '#6c5ce7') + '">正在播放</div>' +
      '<div style="position:absolute;right:8px;bottom:6px;font-size:8px;color:' + dc + ';opacity:0.3">需真实设备数据</div>';
  }
  return '<div style="position:absolute;inset:0;background:' + bg + '"></div>';
}

// ─── Undo/Redo ────────────────────────────────────────────────────
var _history = [];
var _redoStack = [];
var _historyLabels = []; // 操作描述
var _deepClone = typeof structuredClone === 'function'
  ? function (v) { return structuredClone(v); }
  : function (v) { return JSON.parse(JSON.stringify(v)); };

function captureState(label) {
  var filesSnapshot = {};
  Object.keys(JCM.uploadedFiles).forEach(function (k) {
    var f = JCM.uploadedFiles[k];
    filesSnapshot[k] = { mimeType: f.mimeType, originalName: f.originalName, fileName: f.fileName };
  });
  _history.push({ cfg: _deepClone(_cfg), elements: _deepClone(_elements), files: filesSnapshot });
  _historyLabels.push(label || '操作');
  _redoStack = [];
  if (_history.length > 50) { _history.shift(); _historyLabels.shift(); }
}

function undo() {
  if (_history.length === 0) return;
  _redoStack.push({ cfg: _deepClone(_cfg), elements: _deepClone(_elements) });
  var state = _history.pop();
  _historyLabels.pop();
  _cfg = state.cfg;
  _elements = state.elements;
  _dirty = true;
  renderConfig();
  toast('↩ 已撤销', 'success');
}

function redo() {
  if (_redoStack.length === 0) return;
  _history.push({ cfg: _deepClone(_cfg), elements: _deepClone(_elements) });
  _historyLabels.push('重做');
  var state = _redoStack.pop();
  _cfg = state.cfg;
  _elements = state.elements;
  _dirty = true;
  renderConfig();
  toast('↪ 已重做', 'success');
}

JCM.undoTo = function (idx) {
  while (_history.length > idx) undo();
};

JCM.getHistory = function () {
  return _historyLabels.slice();
};

// ─── Step Navigation ──────────────────────────────────────────────
JCM.goStep = function (n) {
  if (n === 1 && !_tpl) return toast('请先选择一个模板', 'error');
  if (n === 2 && !_tpl) return toast('请先选择模板并配置', 'error');
  _step = n;

  // Update pages
  document.querySelectorAll('.page').forEach(function (p, i) { p.classList.toggle('active', i === n); });

  // Update tab states
  document.querySelectorAll('.step-tab').forEach(function (tab) {
    var s = Number(tab.dataset.step);
    tab.classList.remove('active', 'done');
    if (s === n) tab.classList.add('active');
    else if (s < n) tab.classList.add('done');
  });

  // Move slider
  moveStepSlider(n);

  document.getElementById('btnBack').style.display = n > 0 ? '' : 'none';
  var btnNext = document.getElementById('btnNext');
  if (n === 2) { btnNext.style.display = 'none'; }
  else {
    btnNext.style.display = '';
    btnNext.innerHTML = n === 0 ? '下一步 <span class="btn-icon">→</span>' : '预览 & 导出 <span class="btn-icon">→</span>';
  }

  if (n === 1) {
    renderConfig();
    // Sync device select from preview page to config page
    var devSel = document.getElementById('deviceSelect');
    var cfgDevSel = document.getElementById('cfgDeviceSelect');
    if (devSel && cfgDevSel) cfgDevSel.value = devSel.value;
    var showCam = document.getElementById('showCamera');
    var cfgShowCam = document.getElementById('cfgShowCamera');
    if (showCam && cfgShowCam) cfgShowCam.checked = showCam.checked;
    renderLivePreview();
  }
  if (n === 2) {
    // Sync device select from config page to preview page
    var cfgDevSel2 = document.getElementById('cfgDeviceSelect');
    var devSel2 = document.getElementById('deviceSelect');
    if (cfgDevSel2 && devSel2) devSel2.value = cfgDevSel2.value;
    var cfgShowCam2 = document.getElementById('cfgShowCamera');
    var showCam2 = document.getElementById('showCamera');
    if (cfgShowCam2 && showCam2) showCam2.checked = cfgShowCam2.checked;
    renderPreview();
  }
  // Auto-refresh for time-based templates
  clearInterval(_previewTimer);
  if (n >= 1 && _tpl && (_tpl.updater === 'DateTime.Minute' || _tpl.updater === 'DateTime.Day')) {
    _previewTimer = setInterval(function () {
      if (_step === 1) renderLivePreview();
      if (_step === 2) renderPreview();
    }, 1000);
  }
};

function moveStepSlider(n) {
  var slider = document.getElementById('stepSlider');
  var indicator = document.getElementById('stepIndicator');
  var tabs = indicator.querySelectorAll('.step-tab');
  if (!slider || !tabs[n]) return;
  var tab = tabs[n];
  var iRect = indicator.getBoundingClientRect();
  var tRect = tab.getBoundingClientRect();
  slider.style.left = (tRect.left - iRect.left) + 'px';
  slider.style.width = tRect.width + 'px';
}

JCM.nextStep = function () { JCM.goStep(_step + 1); };
JCM.prevStep = function () { JCM.goStep(_step - 1); };

// ─── Template Selection ───────────────────────────────────────────
JCM.selectTemplate = function (id) {
  var tpl = JCM.TEMPLATES.find(function (t) { return t.id === id; });
  if (!tpl) return;

  _tpl = tpl;
  _cfg = {};
  tpl.config.forEach(function (g) { g.fields.forEach(function (f) { _cfg[f.key] = f.default; }); });
  _elements = id === 'custom'
    ? [{ type: 'text', text: 'Hello Card', x: 10, y: 60, size: 28, color: '#ffffff', textAlign: 'left', bold: false, multiLine: false, w: 200 }]
    : [];
  _selIdx = -1;
  _dirty = true;
  _history = [];
  _redoStack = [];
  JCM.uploadedFiles = {};

  renderTplGrid();
  JCM.goStep(1);
};

// ─── Template Grid ────────────────────────────────────────────────
function renderTplGrid() {
  document.getElementById('tplGrid').innerHTML = JCM.TEMPLATES.map(function (t) {
    var thumb = generateTplThumbnail(t);
    return '<div class="tpl-card' + (_tpl && _tpl.id === t.id ? ' active' : '') + '" data-tpl="' + t.id + '">' +
      '<div class="tpl-thumb">' + thumb + '</div>' +
      '<div class="tpl-card-name">' + t.name + '</div>' +
      '<div class="tpl-card-desc">' + t.desc + '</div></div>';
  }).join('');
}

// ─── Template Thumbnails ──────────────────────────────────────────
function generateTplThumbnail(tpl) {
  var cfg = {};
  tpl.config.forEach(function (g) { g.fields.forEach(function (f) { cfg[f.key] = f.default; }); });
  var s = 0.22; // thumbnail scale
  var w = 420 * s, h = 252 * s;
  var bg = cfg.bgColor || '#000';
  var cx = cfg.cameraZoneRatio ? 0 : w * 0.3;
  var safeW = w - cx;

  try {
    var r = new JCM.PreviewRenderer({ width: 976, height: 596, cameraZoneRatio: 0.3 }, false);
    var html = renderTemplatePreview({ width: 976, height: 596, cameraZoneRatio: 0.3 }, false, tpl, cfg);
    // Scale down the thumbnail
    return '<div style="width:' + w + 'px;height:' + h + 'px;border-radius:6px;overflow:hidden;position:relative;transform:scale(1);flex-shrink:0">' +
      '<div style="position:absolute;left:0;top:0;width:' + (976 * s) + 'px;height:' + (596 * s) + 'px;transform-origin:top left;transform:scale(' + s + ')">' +
      html + '</div></div>';
  } catch (e) {
    return '<div class="tpl-thumb-fallback">' + tpl.icon + '</div>';
  }
}

// ─── Config Rendering ─────────────────────────────────────────────
function renderConfig() {
  if (!_tpl) return;
  var device = getSelectedDevice();

  document.getElementById('cfgIcon').textContent = _tpl.icon;
  document.getElementById('cfgTitle').textContent = _tpl.name;
  document.getElementById('cfgDesc').textContent = _tpl.desc;

  var html = '';

  _tpl.config.forEach(function (group) {
    html += '<div class="config-section"><div class="config-section-title"><span>▸</span> ' + group.group + '</div><div class="config-grid">';
    group.fields.forEach(function (f) { html += renderField(f); });
    html += '</div></div>';
  });

  // Custom elements section
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 额外元素</div>' +
    '<div class="el-toolbar">' +
    '<button class="el-btn" data-add="text"><span class="el-btn-icon">T</span> 文字</button>' +
    '<button class="el-btn" data-add="rectangle"><span class="el-btn-icon">▢</span> 矩形</button>' +
    '<button class="el-btn" data-add="circle"><span class="el-btn-icon">○</span> 圆形</button>' +
    '<button class="el-btn" data-add="line"><span class="el-btn-icon">─</span> 线条</button>' +
    '<button class="el-btn" data-pick="image"><span class="el-btn-icon">🖼</span> 图片</button>' +
    '<button class="el-btn" data-pick="video"><span class="el-btn-icon">🎬</span> 视频</button>' +
    '<button class="el-btn" data-action="importZip" title="导入 MAML ZIP"><span class="el-btn-icon">📦</span> 导入ZIP</button>' +
    '</div>';

  // Snap toggle
  html += '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center">' +
    '<label class="check-label"><input type="checkbox" id="snapToggle" checked> 吸附网格 (' + SNAP_GRID + 'px)</label>' +
    '</div>';

  // Element list
  html += '<div class="el-list">';

  _elements.forEach(function (el, i) {
    var label = el.type === 'text' ? (el.text || '')
      : el.type === 'image' ? '🖼 ' + (el.fileName || '图片')
      : el.type === 'video' ? '🎬 ' + (el.fileName || '视频')
      : (el.type === 'rectangle' && el.h <= 3 && el.radius >= 1) ? 'line'
      : el.type + ' #' + (i + 1);
    var inCam = JCM.isInCameraZone(el, device);
    html += '<div class="el-item' + (_selIdx === i ? ' active' : '') + '" data-sel="' + i + '">' +
      '<span class="el-badge">' + el.type + '</span>' +
      '<span class="el-item-name">' + escH(label) + '</span>' +
      (inCam ? '<span title="在摄像头遮挡区内" style="color:#e17055;font-size:14px">⚠️</span>' : '') +
      '<span class="el-z-btns">' +
      '<button class="el-z-btn" data-z="up" data-zi="' + i + '" title="上移一层">↑</button>' +
      '<button class="el-z-btn" data-z="down" data-zi="' + i + '" title="下移一层">↓</button>' +
      '</span>' +
      '<button class="el-item-del" data-del="' + i + '">✕</button></div>';
  });

  if (_elements.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">点击上方按钮添加元素</div>';
  }
  html += '</div>';

  if (_selIdx >= 0 && _selIdx < _elements.length) {
    html += JCM.renderElementEditor(_elements[_selIdx], _selIdx, device);

    // Quick alignment
    html += '<div class="config-section" style="margin-top:12px"><div class="config-section-title"><span>▸</span> 快速操作</div>' +
      '<div class="el-toolbar">' +
      '<button class="el-btn" data-align="left" data-ai="' + _selIdx + '">⬅ 左对齐</button>' +
      '<button class="el-btn" data-align="hcenter" data-ai="' + _selIdx + '">↔ 水平居中</button>' +
      '<button class="el-btn" data-align="right" data-ai="' + _selIdx + '">➡ 右对齐</button>' +
      '<button class="el-btn" data-align="top" data-ai="' + _selIdx + '">⬆ 顶对齐</button>' +
      '<button class="el-btn" data-align="vcenter" data-ai="' + _selIdx + '">↕ 垂直居中</button>' +
      '<button class="el-btn" data-align="bottom" data-ai="' + _selIdx + '">⬇ 底对齐</button>' +
      '</div>';

    // Quick sizes (only for rect/image/video)
    var selEl = _elements[_selIdx];
    if (selEl.type === 'rectangle' || selEl.type === 'image' || selEl.type === 'video') {
      html += '<div class="el-toolbar" style="margin-top:8px">' +
        '<button class="el-btn" data-qsize="full" data-qi="' + _selIdx + '">全屏</button>' +
        '<button class="el-btn" data-qsize="half" data-qi="' + _selIdx + '">半屏</button>' +
        '<button class="el-btn" data-qsize="quarter" data-qi="' + _selIdx + '">1/4</button>' +
        '</div>';
    }

    // Color presets (if element has color)
    if (selEl.color !== undefined) {
      html += JCM.renderColorPresets('color', _selIdx);
    }
    html += '</div>';
  }
  html += '</div>';

  // Template share buttons
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 模板分享</div>' +
    '<div class="el-toolbar">' +
    '<button class="el-btn" data-action="exportTemplate"><span class="el-btn-icon">💾</span> 导出配置</button>' +
    '<button class="el-btn" data-action="importTemplate"><span class="el-btn-icon">📂</span> 导入配置</button>' +
    '</div></div>';

  // Asset manager — show when there are uploaded files
  var fileKeys = Object.keys(JCM.uploadedFiles);
  if (fileKeys.length > 0) {
    html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 素材管理 (' + fileKeys.length + ')</div>';
    fileKeys.forEach(function (fname) {
      var fi = JCM.uploadedFiles[fname];
      var isVideo = fi.mimeType && fi.mimeType.indexOf('video/') === 0;
      var thumb = '';
      if (isVideo) {
        thumb = '<div style="width:48px;height:48px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🎬</div>';
      } else if (fi.dataUrl) {
        thumb = '<img class="media-picker-thumb" src="' + fi.dataUrl + '" alt="">';
      } else {
        thumb = '<div style="width:48px;height:48px;border-radius:8px;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🖼</div>';
      }
      var sz = fi.data ? (fi.data.size || fi.data.byteLength || 0) : 0;
      var sizeStr = fmtSize(sz);
      var useCount = _elements.filter(function (e) { return e.fileName === fname; }).length;
      var transcodeBtn = isVideo ? '<button class="media-picker-change" data-transcode-btn="' + fname + '" title="强制转码为 H.264 MP4">🔄 转码</button>' : '';
      html += '<div class="media-picker has-file" data-replace-asset="' + fname + '">' +
        thumb +
        '<div class="media-picker-info">' +
        '<div class="media-picker-name">' + escH(fi.originalName || fname) + '</div>' +
        '<div class="media-picker-hint">' + sizeStr + (useCount > 0 ? ' · 引用x' + useCount : '') + '</div>' +
        '</div>' +
        transcodeBtn +
        '<button class="media-picker-change" data-replace-btn="' + fname + '">替换</button>' +
        '</div>';
    });
    html += '</div>';
  }

  document.getElementById('cfgContent').innerHTML = html;

  document.querySelectorAll('.color-val').forEach(function (el) {
    var input = el.previousElementSibling;
    if (input) el.textContent = input.value;
  });

  // Trigger live preview update after config rebuild
  if (_step === 1) renderLivePreview();
}

function renderField(f) {
  var v = _cfg[f.key];
  switch (f.type) {
    case 'text':
      return '<div class="field"><label>' + f.label + '</label><input type="text" value="' + escH(String(v)) + '" data-cfg="' + f.key + '"></div>';
    case 'textarea':
      return '<div class="field"><label>' + f.label + '</label><textarea rows="3" data-cfg="' + f.key + '">' + escH(String(v)) + '</textarea></div>';
    case 'color':
      return '<div class="field field-color"><label>' + f.label + '</label><input type="color" value="' + v + '" data-cfg="' + f.key + '"><span class="color-val">' + v + '</span></div>';
    case 'range':
      return '<div class="field"><label>' + f.label + ': <strong>' + v + '</strong></label><input type="range" min="' + f.min + '" max="' + f.max + '" value="' + v + '" data-cfg="' + f.key + '"></div>';
    case 'select':
      return '<div class="field"><label>' + f.label + '</label><select data-cfg="' + f.key + '">' +
        f.options.map(function (o) { return '<option value="' + o.v + '"' + (v === o.v ? ' selected' : '') + '>' + o.l + '</option>'; }).join('') +
        '</select></div>';
    default: return '';
  }
}

// ─── Config Actions ───────────────────────────────────────────────
JCM.addElement = function (type) {
  captureState();
  var defs = JCM.ElementDefaults;
  if (defs[type]) {
    _elements.push(JSON.parse(JSON.stringify(defs[type]())));
    _selIdx = _elements.length - 1;
    _dirty = true;
    renderConfig();
  }
};

JCM.selectElement = function (idx) {
  _selIdx = idx;
  renderConfig();
};

JCM.removeElement = function (idx) {
  captureState();
  var el = _elements[idx];
  if (el && el.fileName) {
    var stillUsed = _elements.some(function (e, i) { return i !== idx && e.fileName === el.fileName; });
    if (!stillUsed) delete JCM.uploadedFiles[el.fileName];
  }
  _elements.splice(idx, 1);
  if (_selIdx >= _elements.length) _selIdx = _elements.length - 1;
  _dirty = true;
  renderConfig();
};

JCM.moveElementZ = function (idx, dir) {
  captureState();
  var newIdx = dir === 'up' ? idx + 1 : idx - 1;
  if (newIdx < 0 || newIdx >= _elements.length) return;
  var tmp = _elements[idx];
  _elements[idx] = _elements[newIdx];
  _elements[newIdx] = tmp;
  _selIdx = newIdx;
  _dirty = true;
  renderConfig();
};

JCM.alignElement = function (idx, align) {
  if (idx < 0 || idx >= _elements.length) return;
  captureState();
  var device = getSelectedDevice();
  var el = _elements[idx];
  var ew = el.w || (el.r ? el.r * 2 : 0) || 100;
  var eh = el.h || (el.r ? el.r * 2 : 0) || 30;
  var safeW = device.width * (1 - device.cameraZoneRatio);
  var marginL = Math.ceil(device.width * device.cameraZoneRatio);
  switch (align) {
    case 'left':    el.x = marginL + 10; break;
    case 'hcenter': el.x = marginL + Math.round((safeW - ew) / 2); break;
    case 'right':   el.x = marginL + safeW - ew - 10; break;
    case 'top':     el.y = 10; break;
    case 'vcenter': el.y = Math.round((device.height - eh) / 2); break;
    case 'bottom':  el.y = device.height - eh - 10; break;
  }
  _dirty = true;
  renderConfig();
};

JCM.applyQuickSize = function (idx, size) {
  if (idx < 0 || idx >= _elements.length) return;
  captureState();
  var device = getSelectedDevice();
  var el = _elements[idx];
  var safeW = device.width * (1 - device.cameraZoneRatio);
  switch (size) {
    case 'full':    el.w = Math.round(safeW - 20); el.h = device.height - 20; break;
    case 'half':    el.w = Math.round(safeW - 20); el.h = Math.round(device.height / 2 - 20); break;
    case 'quarter': el.w = Math.round(safeW / 2 - 20); el.h = Math.round(device.height / 2 - 20); break;
  }
  _dirty = true;
  renderConfig();
};

JCM.pickMedia = function (type) {
  _pendingAdd = type;
  _pendingReplace = -1;
  document.getElementById(type === 'image' ? 'fileImagePick' : 'fileVideoPick').click();
};

JCM.pickMediaReplace = function (idx) {
  var el = _elements[idx];
  if (!el) return;
  _pendingAdd = el.type;
  _pendingReplace = idx;
  document.getElementById(el.type === 'image' ? 'fileImagePick' : 'fileVideoPick').click();
};

// ─── Preview ──────────────────────────────────────────────────────
function getSelectedDevice() {
  return JCM.getDevice(document.getElementById('deviceSelect').value);
}

function renderPreview() {
  if (!_tpl) return;
  var device = getSelectedDevice();
  var showCam = document.getElementById('showCamera').checked;

  document.getElementById('deviceLabel').textContent = device.label;
  document.getElementById('previewCamera').style.width = showCam ? (device.cameraZoneRatio * 100) + '%' : '0';

  var html = renderTemplatePreview(device, showCam, _tpl, _cfg);
  html += new JCM.PreviewRenderer(device, showCam).renderElements(_elements, JCM.uploadedFiles, _selIdx);
  document.getElementById('previewContent').innerHTML = html;

  var innerXml = getTemplateMAML(_tpl, _cfg, device);
  var maml;
  if (_tpl.rawXml) {
    // rawXml 模板已经是完整 XML，直接使用
    maml = innerXml;
  } else {
    maml = JCM.generateMAML({
      cardName: _cfg.cardName || _tpl.name,
      device: device,
      innerXml: innerXml,
      updater: _tpl.updater,
      extraElements: _elements,
      uploadedFiles: JCM.uploadedFiles,
    });
  }
  document.getElementById('codeContent').value = maml;
  _dirty = false;
}

// ─── Live Preview (on config page) ────────────────────────────────
function getCfgDevice() {
  var sel = document.getElementById('cfgDeviceSelect');
  return sel ? JCM.getDevice(sel.value) : JCM.getDevice('p2');
}

function getCfgShowCamera() {
  var cb = document.getElementById('cfgShowCamera');
  return cb ? cb.checked : true;
}

function renderLivePreview() {
  if (!_tpl) return;
  var device = getCfgDevice();
  var showCam = getCfgShowCamera();

  var labelEl = document.getElementById('cfgDeviceLabel');
  if (labelEl) labelEl.textContent = device.label;
  var camEl = document.getElementById('cfgPreviewCamera');
  if (camEl) camEl.style.width = showCam ? (device.cameraZoneRatio * 100) + '%' : '0';

  var html = renderTemplatePreview(device, showCam, _tpl, _cfg);
  html += new JCM.PreviewRenderer(device, showCam).renderElements(_elements, JCM.uploadedFiles, _selIdx);
  var contentEl = document.getElementById('cfgPreviewContent');
  if (contentEl) contentEl.innerHTML = html;
}

function generateCustomMAML(device) {
  var lines = [];
  lines.push(JCM.generateAutoDetectMAML());
  lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + _cfg.bgColor + '" />');
  _elements.forEach(function (el) {
    switch (el.type) {
      case 'text': {
        var a = el.textAlign && el.textAlign !== 'left' ? ' textAlign="' + el.textAlign + '"' : '';
        var ml = el.multiLine ? ' multiLine="true"' : '';
        var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ' w="' + (el.w || 200) + '"' : '';
        var b = el.bold ? ' bold="true"' : '';
        var ff = el.fontFamily && el.fontFamily !== 'default' ? ' fontFamily="' + el.fontFamily + '"' : '';
        var tg = '';
        if (el.textGradient && el.textGradient !== 'none') {
          var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
          var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
          tg = ' gradientColors="' + gc + '" gradientOrientation="top_bottom"';
        }
        var ts = '';
        if (el.textStroke && el.textStroke > 0) {
          ts = ' stroke="' + el.textStroke + '" strokeColor="' + (el.textStrokeColor || '#000000') + '"';
        }
        lines.push('    <Text text="' + JCM.escXml(el.text || '') + '" x="' + el.x + '" y="' + el.y + '" size="' + el.size + '" color="' + el.color + '"' + w + a + ml + b + ff + tg + ts + ' />');
        break;
      }
      case 'rectangle':
        var rectFill = el.fillColor2 ? ' fillColor="' + el.color + '" fillColor2="' + el.fillColor2 + '"' : ' fillColor="' + el.color + '"';
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '"' + rectFill + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + ' />');
        break;
      case 'circle':
        lines.push('    <Circle x="' + el.x + '" y="' + el.y + '" r="' + el.r + '" fillColor="' + el.color + '" />');
        break;
      case 'image': {
        var imgSrc = el.src || el.fileName || '';
        var folder = imgSrc && JCM.uploadedFiles[imgSrc] && JCM.uploadedFiles[imgSrc].mimeType.indexOf('video/') === 0 ? 'videos' : 'images';
        lines.push('    <Image src="' + folder + '/' + JCM.escXml(imgSrc) + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '" />');
        break;
      }
      case 'video':
        lines.push('    <Video src="videos/' + JCM.escXml(el.src || el.fileName || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 240) + '" h="' + (el.h || 135) + '" autoPlay="true" loop="true" />');
        break;
    }
  });
  return lines.join('\n');
}

// ─── Export ────────────────────────────────────────────────────────
JCM.handleExport = function () {
  if (!_tpl) return toast('请先选择模板', 'error');
  var device = getSelectedDevice();
  var innerXml = getTemplateMAML(_tpl, _cfg, device);
  var maml = _tpl.rawXml ? innerXml : JCM.generateMAML({
    cardName: _cfg.cardName || _tpl.name,
    device: device,
    innerXml: innerXml,
    updater: _tpl.updater,
    extraElements: _elements,
    uploadedFiles: JCM.uploadedFiles,
  });

  // XML 校验
  var validation = JCM.validateMAML(maml);
  if (!validation.valid) {
    return toast('XML 校验失败: ' + validation.errors[0], 'error');
  }

  JCM.exportZip(maml, _cfg.cardName || 'card', _elements, JCM.uploadedFiles, _tpl.id === 'custom')
    .then(function () { toast('✅ ZIP 已导出', 'success'); })
    .catch(function (e) { toast('导出失败: ' + e.message, 'error'); });
};

JCM.handleExportPNG = function () {
  JCM.exportPNG(_cfg.cardName || 'card')
    .then(function () { toast('✅ PNG 已导出', 'success'); })
    .catch(function (e) { toast('导出失败: ' + e.message, 'error'); });
};

// ─── Copy XML ─────────────────────────────────────────────────────
JCM.copyXML = function () {
  var textarea = document.getElementById('codeContent');
  var text = textarea ? textarea.value : '';
  if (!text || text.indexOf('<Widget') < 0) return toast('请先生成预览', 'error');
  navigator.clipboard.writeText(text).then(function () {
    toast('📋 XML 已复制到剪贴板', 'success');
  }).catch(function () {
    // Fallback
    textarea.select();
    document.execCommand('copy');
    toast('📋 XML 已复制', 'success');
  });
};

// ─── Fullscreen Preview ───────────────────────────────────────────
JCM.toggleFullscreen = function () {
  var el = document.querySelector('#page2 .preview-phone');
  if (!el) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    el.requestFullscreen().catch(function () {
      toast('浏览器不支持全屏', 'error');
    });
  }
};

// ─── Zoom Controls ────────────────────────────────────────────────
var _zoomLevel = 100;

JCM.zoomIn = function () {
  _zoomLevel = Math.min(_zoomLevel + 25, 200);
  applyZoom();
};
JCM.zoomOut = function () {
  _zoomLevel = Math.max(_zoomLevel - 25, 50);
  applyZoom();
};
JCM.zoomReset = function () {
  _zoomLevel = 100;
  applyZoom();
};

function applyZoom() {
  var phone = document.querySelector('#page2 .preview-phone');
  if (phone) phone.style.transform = 'scale(' + (_zoomLevel / 100) + ')';
  var label = document.getElementById('zoomLabel');
  if (label) label.textContent = _zoomLevel + '%';
}

// ─── Batch Export ─────────────────────────────────────────────────
JCM.handleBatchExport = function () {
  if (!_tpl) return toast('请先选择模板', 'error');
  var deviceKeys = ['p2', 'q200', 'q100', 'ultra'];
  var count = 0;
  var errors = [];

  function exportNext() {
    if (count >= deviceKeys.length) {
      if (errors.length > 0) toast('部分导出失败: ' + errors.join(', '), 'error');
      else toast('✅ 全部 ' + count + ' 个机型已导出', 'success');
      return;
    }
    var dk = deviceKeys[count];
    var device = JCM.getDevice(dk);
    var innerXml = getTemplateMAML(_tpl, _cfg, device);
    var maml = _tpl.rawXml ? innerXml : JCM.generateMAML({
      cardName: (_cfg.cardName || _tpl.name) + '_' + dk,
      device: device,
      innerXml: innerXml,
      updater: _tpl.updater,
      extraElements: _elements,
      uploadedFiles: JCM.uploadedFiles,
    });
    var validation = JCM.validateMAML(maml);
    if (!validation.valid) {
      errors.push(device.label);
      count++;
      exportNext();
      return;
    }
    JCM.exportZip(maml, (_cfg.cardName || 'card') + '_' + dk, _elements, JCM.uploadedFiles, _tpl.id === 'custom')
      .then(function () { count++; setTimeout(exportNext, 500); })
      .catch(function () { errors.push(device.label); count++; setTimeout(exportNext, 500); });
  }
  exportNext();
};

// ─── Universal Export (one card fits all) ─────────────────────────
JCM.handleUniversalExport = function () {
  if (!_tpl) return toast('请先选择模板', 'error');

  // Use Pro Max as base, auto-detect handles the rest
  var baseDevice = JCM.getDevice('p2');
  var innerXml = getTemplateMAML(_tpl, _cfg, baseDevice);

  var maml = _tpl.rawXml ? innerXml : JCM.generateMAML({
    cardName: _cfg.cardName || _tpl.name,
    device: baseDevice,
    innerXml: innerXml,
    updater: _tpl.updater,
    extraElements: _elements,
    uploadedFiles: JCM.uploadedFiles,
  });

  var validation = JCM.validateMAML(maml);
  if (!validation.valid) {
    return toast('XML 校验失败: ' + validation.errors[0], 'error');
  }

  JCM.exportZip(maml, (_cfg.cardName || 'card') + '_all', _elements, JCM.uploadedFiles, _tpl.id === 'custom')
    .then(function () { toast('✅ 通用卡片已导出（适配所有机型）', 'success'); })
    .catch(function (e) { toast('导出失败: ' + e.message, 'error'); });
};

// ─── Import ───────────────────────────────────────────────────────
JCM.handleImportZip = function () {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip';
  input.onchange = function () {
    var file = input.files[0];
    if (!file) return;
    JCM.importZip(file).then(function (data) {
      // Switch to custom template
      _tpl = JCM.TEMPLATES.find(function (t) { return t.id === 'custom'; });
      _cfg = { cardName: data.cardName, bgColor: data.bgColor };
      // GIF 动图转视频元素
      _elements = data.elements.map(function(el) {
        if (el.type === 'image' && el.fileName) {
          var fi = data.files[el.fileName];
          if (fi && fi.mimeType === 'image/gif') {
            fi.mimeType = 'video/gif';
            el.type = 'video';
          }
        }
        return el;
      });
      JCM.uploadedFiles = data.files;
      _selIdx = -1;
      _dirty = true;
      _history = [];
      _redoStack = [];
      renderTplGrid();
      JCM.goStep(1);
      toast('✅ ZIP 已导入', 'success');
    }).catch(function (e) { toast('导入失败: ' + e.message, 'error'); });
  };
  input.click();
};

JCM.handleExportTemplate = function () {
  JCM.exportTemplateJSON(_tpl ? _tpl.id : 'custom', _cfg, _elements);
  toast('✅ 配置已导出', 'success');
};

JCM.handleImportTemplate = function () {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function () {
    var file = input.files[0];
    if (!file) return;
    JCM.importTemplateJSON(file).then(function (data) {
      var tpl = JCM.TEMPLATES.find(function (t) { return t.id === data.templateId; });
      if (!tpl) return toast('找不到对应模板', 'error');
      _tpl = tpl;
      // Merge config values
      tpl.config.forEach(function (g) {
        g.fields.forEach(function (f) {
          if (data.config[f.key] !== undefined) _cfg[f.key] = data.config[f.key];
          else _cfg[f.key] = f.default;
        });
      });
      // Restore elements if present
      if (Array.isArray(data.elements)) {
        _elements = data.elements;
      }
      _dirty = true;
      _history = [];
      _redoStack = [];
      renderTplGrid();
      renderConfig();
      toast('✅ 配置已导入', 'success');
    }).catch(function (e) { toast('导入失败: ' + e.message, 'error'); });
  };
  input.click();
};

// ─── Asset Replacement ────────────────────────────────────────────
JCM._pendingReplaceAsset = null;

JCM.replaceAssetPrompt = function (fname) {
  JCM._pendingReplaceAsset = fname;
  var fi = JCM.uploadedFiles[fname];
  var isVideo = fi && fi.mimeType && fi.mimeType.indexOf('video/') === 0;
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = isVideo ? 'video/*' : 'image/*';
  input.onchange = function () {
    var file = input.files && input.files[0];
    if (!file) return;
    var oldName = JCM._pendingReplaceAsset;
    JCM._pendingReplaceAsset = null;

    function replaceDone(info) {
      captureState();
      JCM.uploadedFiles[oldName] = info;
      _dirty = true;
      renderConfig();
      toast('✅ 已替换: ' + file.name, 'success');
    }

    var isGifReplace = file.type === 'image/gif';
    var needTranscodeReplace = (isVideo || isGifReplace) && JCM.needsTranscode && JCM.needsTranscode(file);

    function doReplace(workingFile) {
      var finalIsVideo = workingFile.type.indexOf('video/') === 0 || isGifReplace;
      if (finalIsVideo) {
        var reader2 = new FileReader();
        reader2.onload = function (ev) {
          var buf = ev.target.result;
          var storeMime = isGifReplace ? 'video/gif' : workingFile.type;
          var blobUrl = URL.createObjectURL(new Blob([buf], { type: workingFile.type }));
          replaceDone({ data: buf, mimeType: storeMime, dataUrl: blobUrl, originalName: workingFile.name });
        };
        reader2.readAsArrayBuffer(workingFile);
      } else {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var dataUrl = ev.target.result;
        var base64 = dataUrl.split(',')[1];
        var bin = atob(base64);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        replaceDone({ data: arr.buffer, mimeType: file.type, dataUrl: dataUrl, originalName: file.name });
      };
      reader.readAsDataURL(file);
      }
    }

    if (needTranscodeReplace) {
      toast('🔄 正在转码为 MP4 (H.264)...', 'info');
      JCM.transcodeToH264(file).then(function (transcodedFile) {
        toast('✅ 转码完成', 'success');
        doReplace(transcodedFile);
      }).catch(function (err) {
        toast('⚠️ 转码失败，使用原始文件: ' + err.message, 'warning');
        doReplace(file);
      });
    } else {
      doReplace(file);
    }
  };
  input.click();
};

// ─── File Handling ────────────────────────────────────────────────
function handleFilePicked(e) {
  var input = e.target;
  var file = input.files && input.files[0];
  if (!file) return;

  var type = _pendingAdd;
  var replaceIdx = _pendingReplace;
  _pendingAdd = null;
  _pendingReplace = -1;

  // GIF 动图自动转为视频元素（MAML <Image> 不支持动图播放）
  var isGif = file.type === 'image/gif';
  if (isGif) type = 'video';

  var isVideo = file.type.indexOf('video/') === 0 || isGif;

  // 视频格式提示
  if (isVideo && !isGif && file.type !== 'video/mp4') {
    toast('⚠️ 正在检测视频格式...', 'info');
  }

  // 需要转码的视频/GIF：先转码再存储
  var needTranscode = isVideo && JCM.needsTranscode && JCM.needsTranscode(file);

  function doStore(workingFile) {
    var finalIsVideo = workingFile.type.indexOf('video/') === 0 || isGif;
    var ext = workingFile.name.split('.').pop() || (type === 'image' ? 'png' : 'mp4');
    var safeName = 'media_' + Date.now() + '.' + ext;

    if (finalIsVideo || type === 'video') {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var buf = ev.target.result;
        var storeMime = isGif ? 'video/gif' : workingFile.type;
        var blobUrl = URL.createObjectURL(new Blob([buf], { type: workingFile.type }));
        JCM.uploadedFiles[safeName] = { data: buf, mimeType: storeMime, dataUrl: blobUrl, originalName: workingFile.name };
        captureState();
        if (replaceIdx >= 0 && replaceIdx < _elements.length) {
          _elements[replaceIdx].fileName = safeName;
          _elements[replaceIdx].src = safeName;
        } else {
          _elements.push({ type: 'video', fileName: safeName, src: safeName, x: 10, y: 60, w: 240, h: 135 });
          _selIdx = _elements.length - 1;
        }
        _dirty = true;
        renderConfig();
        toast(workingFile.name + ' 已添加', 'success');
      };
      reader.onerror = function () { toast('文件读取失败', 'error'); };
      reader.readAsArrayBuffer(workingFile);
    } else {
      var reader2 = new FileReader();
      reader2.onload = function (ev) {
        var dataUrl = ev.target.result;
        var base64 = dataUrl.split(',')[1];
        var bin = atob(base64);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        JCM.uploadedFiles[safeName] = { data: arr.buffer, mimeType: workingFile.type, dataUrl: dataUrl, originalName: workingFile.name };
        captureState();
        if (replaceIdx >= 0 && replaceIdx < _elements.length) {
          _elements[replaceIdx].fileName = safeName;
          _elements[replaceIdx].src = safeName;
        } else {
          _elements.push({ type: type, fileName: safeName, src: safeName, x: 10, y: 60, w: 200, h: 200 });
          _selIdx = _elements.length - 1;
        }
        _dirty = true;
        renderConfig();
        toast(workingFile.name + ' 已添加', 'success');
      };
      reader2.readAsDataURL(workingFile);
    }
  }

  if (needTranscode) {
    toast('🔄 正在转码为 MP4 (H.264)...', 'info');
    JCM.transcodeToH264(file, function (pct) {
      toast('🔄 转码中 ' + pct + '%...', 'info');
    }).then(function (transcodedFile) {
      toast('✅ 转码完成', 'success');
      doStore(transcodedFile);
    }).catch(function (err) {
      toast('⚠️ 转码失败，使用原始文件: ' + err.message, 'warning');
      doStore(file);
    });
  } else {
    doStore(file);
  }
}

// ─── Drag & Drop in Preview (rAF throttled + touch support) ──────
var _dragging = null;
var _resizing = null;
var _rafPending = false;

function getPointerPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

function onPreviewPointerDown(e) {
  var target = e.target;

  // Resize handle
  var rh = target.closest('[data-resize-idx]');
  if (rh) {
    var idx = parseInt(rh.dataset.resizeIdx, 10);
    if (!isNaN(idx) && idx < _elements.length) {
      e.preventDefault();
      e.stopPropagation();
      var pos = getPointerPos(e);
      var device = getSelectedDevice();
      var screen = document.querySelector('.preview-screen');
      var rect = screen.getBoundingClientRect();
      var scale = rect.width / device.width;
      _resizing = {
        idx: idx,
        startX: pos.clientX,
        startY: pos.clientY,
        origW: _elements[idx].w || 100,
        origH: _elements[idx].h || 100,
        scale: scale
      };
      captureState();
      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);
      document.addEventListener('touchmove', onResizeMove, { passive: false });
      document.addEventListener('touchend', onResizeUp);
      return;
    }
  }

  // Element drag
  var el = target.closest('[data-el-idx]');
  if (!el) return;
  var idx = parseInt(el.dataset.elIdx, 10);
  if (isNaN(idx) || idx >= _elements.length) return;

  e.preventDefault();
  var pos = getPointerPos(e);
  var device = getSelectedDevice();
  var screen = document.querySelector('.preview-screen');
  var rect = screen.getBoundingClientRect();
  var scale = rect.width / device.width;

  _dragging = {
    idx: idx,
    startX: pos.clientX,
    startY: pos.clientY,
    origX: _elements[idx].x,
    origY: _elements[idx].y,
    scale: scale,
    device: device
  };

  captureState();
  _selIdx = idx;
  _dirty = true;
  renderConfig();

  document.addEventListener('mousemove', onPreviewMouseMove);
  document.addEventListener('mouseup', onPreviewMouseUp);
  document.addEventListener('touchmove', onPreviewMouseMove, { passive: false });
  document.addEventListener('touchend', onPreviewMouseUp);
}

function onResizeMove(e) {
  if (!_resizing) return;
  e.preventDefault();
  var pos = getPointerPos(e);
  var dx = (pos.clientX - _resizing.startX) / _resizing.scale;
  var dy = (pos.clientY - _resizing.startY) / _resizing.scale;
  var nw = Math.max(20, Math.round(_resizing.origW + dx));
  var nh = Math.max(20, Math.round(_resizing.origH + dy));

  var snap = document.getElementById('snapToggle');
  if (snap && snap.checked) {
    nw = Math.round(nw / SNAP_GRID) * SNAP_GRID;
    nh = Math.round(nh / SNAP_GRID) * SNAP_GRID;
  }

  _elements[_resizing.idx].w = nw;
  _elements[_resizing.idx].h = nh;
  renderPreview();
  var wInput = document.querySelector('[data-prop="w"][data-idx="' + _resizing.idx + '"]');
  var hInput = document.querySelector('[data-prop="h"][data-idx="' + _resizing.idx + '"]');
  if (wInput) wInput.value = nw;
  if (hInput) hInput.value = nh;
}

function onResizeUp() {
  _resizing = null;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeUp);
  document.removeEventListener('touchmove', onResizeMove);
  document.removeEventListener('touchend', onResizeUp);
  renderConfig();
}

function applySmartAlign(nx, ny) {
  var el = _elements[_dragging.idx];
  var elW = el.w || (el.r ? el.r * 2 : 0) || 50;
  var elH = el.h || (el.r ? el.r * 2 : 0) || 30;
  var elCX = nx + elW / 2;
  var elCY = ny + elH / 2;
  var snapThreshold = 6;
  var device = _dragging.device;

  if (Math.abs(elCX - device.width / 2) < snapThreshold) nx = Math.round(device.width / 2 - elW / 2);
  if (Math.abs(elCY - device.height / 2) < snapThreshold) ny = Math.round(device.height / 2 - elH / 2);

  for (var i = 0; i < _elements.length; i++) {
    if (i === _dragging.idx) continue;
    var other = _elements[i];
    var oW = other.w || (other.r ? other.r * 2 : 0) || 50;
    var oH = other.h || (other.r ? other.r * 2 : 0) || 30;
    var oCX = other.x + oW / 2;
    var oCY = other.y + oH / 2;

    if (Math.abs(nx - other.x) < snapThreshold) nx = other.x;
    if (Math.abs(nx + elW - (other.x + oW)) < snapThreshold) nx = other.x + oW - elW;
    if (Math.abs(elCX - oCX) < snapThreshold) nx = Math.round(oCX - elW / 2);
    if (Math.abs(ny - other.y) < snapThreshold) ny = other.y;
    if (Math.abs(ny + elH - (other.y + oH)) < snapThreshold) ny = other.y + oH - elH;
    if (Math.abs(elCY - oCY) < snapThreshold) ny = Math.round(oCY - elH / 2);
  }
  return { x: nx, y: ny };
}

function onPreviewMouseMove(e) {
  if (!_dragging || _rafPending) return;
  e.preventDefault();
  _rafPending = true;
  requestAnimationFrame(function () {
    _rafPending = false;
    if (!_dragging) return;
    var pos = getPointerPos(e);
    var dx = (pos.clientX - _dragging.startX) / _dragging.scale;
    var dy = (pos.clientY - _dragging.startY) / _dragging.scale;

    var nx = Math.round(_dragging.origX + dx);
    var ny = Math.round(_dragging.origY + dy);

    var snap = document.getElementById('snapToggle');
    if (snap && snap.checked) {
      nx = Math.round(nx / SNAP_GRID) * SNAP_GRID;
      ny = Math.round(ny / SNAP_GRID) * SNAP_GRID;
    }

    var aligned = applySmartAlign(nx, ny);
    _elements[_dragging.idx].x = Math.max(0, Math.min(aligned.x, _dragging.device.width - 10));
    _elements[_dragging.idx].y = Math.max(0, Math.min(aligned.y, _dragging.device.height - 10));
    renderPreview();
  });
}

function onPreviewMouseUp() {
  _dragging = null;
  document.removeEventListener('mousemove', onPreviewMouseMove);
  document.removeEventListener('mouseup', onPreviewMouseUp);
  document.removeEventListener('touchmove', onPreviewMouseMove);
  document.removeEventListener('touchend', onPreviewMouseUp);
}

// ─── Event Delegation ─────────────────────────────────────────────
var _autoPreview = debounce(function () {
  _dirty = true;
  if (_step === 1) renderLivePreview();
  if (_step === 2) renderPreview();
}, 300);

function setupEvents() {
  // Template grid
  document.getElementById('tplGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.tpl-card');
    if (card) JCM.selectTemplate(card.dataset.tpl);
  });

  // Config content
  document.getElementById('cfgContent').addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.cfg) {
      var key = t.dataset.cfg;
      if (t.type === 'range') {
        _cfg[key] = Number(t.value);
        t.previousElementSibling.querySelector('strong').textContent = t.value;
      } else if (t.type === 'color') {
        _cfg[key] = t.value;
        var cv = t.nextElementSibling;
        if (cv && cv.classList.contains('color-val')) cv.textContent = t.value;
      } else { _cfg[key] = t.value; }
      _dirty = true;
    }
    if (t.dataset.prop) {
      var idx = Number(t.dataset.idx);
      var prop = t.dataset.prop;
      if (t.type === 'number' || t.type === 'range') _elements[idx][prop] = Number(t.value);
      else if (t.type === 'color') {
        _elements[idx][prop] = t.value;
        var cv2 = t.nextElementSibling;
        if (cv2 && cv2.classList.contains('color-val')) cv2.textContent = t.value;
      }
      else _elements[idx][prop] = t.value;
      _dirty = true;
    }
    _autoPreview();
  });

  document.getElementById('cfgContent').addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.cfg && t.tagName === 'SELECT') { _cfg[t.dataset.cfg] = t.value; _dirty = true; }
    if (t.dataset.prop && t.tagName === 'SELECT') {
      var idx = Number(t.dataset.idx);
      var val = t.value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      _elements[idx][t.dataset.prop] = val;
      _dirty = true;
      renderConfig();
    }
    _autoPreview();
  });

  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var item = e.target.closest('.el-item');
    if (item && !e.target.closest('.el-item-del') && !e.target.closest('.el-z-btn')) {
      JCM.selectElement(Number(item.dataset.sel));
      return;
    }
    var del = e.target.closest('.el-item-del');
    if (del) { e.stopPropagation(); JCM.removeElement(Number(del.dataset.del)); return; }
    var zBtn = e.target.closest('.el-z-btn');
    if (zBtn) { e.stopPropagation(); JCM.moveElementZ(Number(zBtn.dataset.zi), zBtn.dataset.z); return; }
    var addBtn = e.target.closest('[data-add]');
    if (addBtn) { JCM.addElement(addBtn.dataset.add); return; }
    var pickBtn = e.target.closest('[data-pick]');
    if (pickBtn) { JCM.pickMedia(pickBtn.dataset.pick); return; }
    var actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      var a = actionBtn.dataset.action;
      if (a === 'importZip') JCM.handleImportZip();
      else if (a === 'exportTemplate') JCM.handleExportTemplate();
      else if (a === 'importTemplate') JCM.handleImportTemplate();
      return;
    }
    // Replace asset
    var replaceBtn = e.target.closest('[data-replace-btn]');
    if (replaceBtn) { e.stopPropagation(); JCM.replaceAssetPrompt(replaceBtn.dataset.replaceBtn); return; }
    // Force transcode video asset
    var transcodeBtn = e.target.closest('[data-transcode-btn]');
    if (transcodeBtn) {
      e.stopPropagation();
      var tFname = transcodeBtn.dataset.transcodeBtn;
      JCM.forceTranscodeAsset(tFname).then(function () { renderConfig(); });
      return;
    }
    // Alignment
    var alignBtn = e.target.closest('[data-align]');
    if (alignBtn) { JCM.alignElement(Number(alignBtn.dataset.ai), alignBtn.dataset.align); return; }
    // Quick size
    var sizeBtn = e.target.closest('[data-qsize]');
    if (sizeBtn) { JCM.applyQuickSize(Number(sizeBtn.dataset.qi), sizeBtn.dataset.qsize); return; }
    // Color preset
    var swatch = e.target.closest('.color-swatch');
    if (swatch) {
      var cidx = Number(swatch.dataset.cidx);
      var cprop = swatch.dataset.cprop;
      if (cidx >= 0 && cidx < _elements.length) {
        captureState();
        _elements[cidx][cprop] = swatch.dataset.color;
        _dirty = true;
        renderConfig();
      }
      return;
    }
    // Theme preset (click first dot to apply as element color)
    var themeBtn = e.target.closest('.theme-preset');
    if (themeBtn) {
      var tcidx = Number(themeBtn.dataset.themeCidx);
      var tcprop = themeBtn.dataset.themeCprop;
      if (tcidx >= 0 && tcidx < _elements.length) {
        var dots = themeBtn.querySelectorAll('.theme-dot');
        if (dots.length > 0) {
          captureState();
          _elements[tcidx][tcprop] = dots[0].style.background || dots[0].style.backgroundColor;
          _dirty = true;
          renderConfig();
          toast('🎨 已应用主题色', 'success');
        }
      }
      return;
    }
  });

  // File inputs
  document.getElementById('fileImagePick').addEventListener('change', handleFilePicked);
  document.getElementById('fileVideoPick').addEventListener('change', handleFilePicked);

  // Device select
  document.getElementById('deviceSelect').addEventListener('change', function () { renderPreview(); });
  document.getElementById('showCamera').addEventListener('change', function () { renderPreview(); });

  // Config page live preview: device & camera
  document.getElementById('cfgDeviceSelect').addEventListener('change', function () {
    // Sync to preview page
    var devSel = document.getElementById('deviceSelect');
    if (devSel) devSel.value = this.value;
    renderLivePreview();
  });
  document.getElementById('cfgShowCamera').addEventListener('change', function () {
    var showCam = document.getElementById('showCamera');
    if (showCam) showCam.checked = this.checked;
    renderLivePreview();
  });

  // Preview drag (mouse + touch)
  document.getElementById('previewContent').addEventListener('mousedown', onPreviewPointerDown);
  document.getElementById('previewContent').addEventListener('touchstart', onPreviewPointerDown, { passive: false });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Don't trigger in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === 'Delete' && _selIdx >= 0 && _selIdx < _elements.length) {
      e.preventDefault();
      JCM.removeElement(_selIdx);
    }
    if (e.ctrlKey && e.key === 'd' && _selIdx >= 0 && _selIdx < _elements.length) {
      e.preventDefault();
      captureState();
      var clone = JSON.parse(JSON.stringify(_elements[_selIdx]));
      clone.x += 10;
      clone.y += 10;
      _elements.push(clone);
      _selIdx = _elements.length - 1;
      _dirty = true;
      renderConfig();
      toast('✅ 已复制元素', 'success');
    }
    if (e.ctrlKey && e.key === 'c' && _selIdx >= 0 && _selIdx < _elements.length) {
      e.preventDefault();
      _clipboard = JSON.parse(JSON.stringify(_elements[_selIdx]));
      toast('📋 已复制到剪贴板', 'success');
    }
    if (e.ctrlKey && e.key === 'v' && _clipboard) {
      e.preventDefault();
      captureState();
      var paste = JSON.parse(JSON.stringify(_clipboard));
      paste.x += 10;
      paste.y += 10;
      _elements.push(paste);
      _selIdx = _elements.length - 1;
      _dirty = true;
      renderConfig();
      toast('📋 已粘贴', 'success');
    }
  });
}

// ─── Toast (queue, supports multiple simultaneous) ────────────────
var _toastQueue = [];
var _toastId = 0;

function toast(msg, type) {
  var id = 'toast-' + (++_toastId);
  var el = document.createElement('div');
  el.id = id;
  el.className = 'toast ' + (type || 'success');
  el.textContent = msg;
  document.body.appendChild(el);

  var offset = _toastQueue.length * 52;
  _toastQueue.push(id);
  el.style.bottom = (80 + offset) + 'px';

  requestAnimationFrame(function () { el.classList.add('show'); });
  setTimeout(function () {
    el.classList.remove('show');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      _toastQueue = _toastQueue.filter(function (t) { return t !== id; });
      // Reposition remaining toasts
      _toastQueue.forEach(function (tid, i) {
        var t = document.getElementById(tid);
        if (t) t.style.bottom = (80 + i * 52) + 'px';
      });
    }, 300);
  }, 2500);
}

function escH(s) { return JCM.escHtml(s); }

// ─── Init ─────────────────────────────────────────────────────────
// Expose internal state for editor.js
JCM._elements = null; // set dynamically
JCM._captureState = captureState;

Object.defineProperty(JCM, 'elements', { get: function () { return _elements; } });

// ─── Help Modal ───────────────────────────────────────────────────
JCM.toggleHelp = function () {
  var modal = document.getElementById('helpModal');
  if (modal) modal.style.display = modal.style.display === 'none' ? '' : 'none';
};

// ─── Theme ────────────────────────────────────────────────────────
JCM.toggleTheme = function () {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  try { localStorage.setItem('jcm-theme', next); } catch(e) {}
  var btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'dark' ? '🌙' : '☀️';
};

function initTheme() {
  try {
    var saved = localStorage.getItem('jcm-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      var btn = document.getElementById('themeToggle');
      if (btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';
    }
  } catch(e) {}
}

JCM.initUI = function () {
  initTheme();
  renderTplGrid();
  setupEvents();
  // Init slider position after layout
  requestAnimationFrame(function () { moveStepSlider(0); });
  window.addEventListener('resize', function () { moveStepSlider(_step); });
};

// Expose internal helpers for inline use
JCM.renderPreview = renderPreview;
JCM.renderLivePreview = renderLivePreview;
JCM.getSelectedDevice = getSelectedDevice;
