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

// ─── 颜色工具 ────────────────────────────────────────────────────
function isDarkColor(hex) {
  if (!hex || hex.charAt(0) !== '#') return false;
  var c = hex.substring(1);
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  var r = parseInt(c.substring(0, 2), 16) || 0;
  var g = parseInt(c.substring(2, 4), 16) || 0;
  var b = parseInt(c.substring(4, 6), 16) || 0;
  // W3C 相对亮度公式
  var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.35;
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
  // 切换页面时清理预览中的视频元素，防止内存泄漏
  if (n !== 2) {
    var previewEl = document.getElementById('previewContent');
    if (previewEl) {
      previewEl.querySelectorAll('video').forEach(function (v) { v.pause(); v.src = ''; });
    }
  }
  if (n !== 1) {
    var cfgPreviewEl = document.getElementById('cfgPreviewContent');
    if (cfgPreviewEl) {
      cfgPreviewEl.querySelectorAll('video').forEach(function (v) { v.pause(); v.src = ''; });
    }
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

  // 清理旧模板的 blob URL
  Object.keys(JCM.uploadedFiles).forEach(function (k) {
    var f = JCM.uploadedFiles[k];
    if (f && f.dataUrl && f.dataUrl.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(f.dataUrl); } catch (e) {}
    }
  });

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
  var favs = JCM.getFavorites();
  var sorted = JCM.TEMPLATES.slice().sort(function (a, b) {
    var aFav = favs.indexOf(a.id) >= 0 ? 0 : 1;
    var bFav = favs.indexOf(b.id) >= 0 ? 0 : 1;
    return aFav - bFav;
  });
  document.getElementById('tplGrid').innerHTML = sorted.map(function (t) {
    var thumb = generateTplThumbnail(t);
    var isFav = favs.indexOf(t.id) >= 0;
    return '<div class="tpl-card' + (_tpl && _tpl.id === t.id ? ' active' : '') + '" data-tpl="' + t.id + '">' +
      '<button class="tpl-fav' + (isFav ? ' active' : '') + '" data-fav="' + t.id + '">' + (isFav ? '⭐' : '☆') + '</button>' +
      '<div class="tpl-thumb">' + thumb + '</div>' +
      '<div class="tpl-card-name">' + t.name + '</div>' +
      '<div class="tpl-card-desc">' + t.desc + '</div></div>';
  }).join('');
  renderTplCategories();
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
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 额外元素' + (_elements.length > 0 ? ' <span class="el-count-badge">' + _elements.length + '</span>' : '') + '</div>' +
    '<div class="el-toolbar">' +
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
    html += '<div class="el-item' + (_selIdx === i ? ' active' : '') + '" draggable="true" data-sel="' + i + '">' +
      '<span class="el-badge">' + el.type + '</span>' +
      '<span class="el-item-name">' + escH(label) + '</span>' +
      (inCam ? '<span title="在摄像头遮挡区内" style="color:#e17055;font-size:14px">⚠️</span>' : '') +
      '<button class="el-lock-btn" data-lock="' + i + '" title="锁定/解锁">' + (el.locked ? '🔒' : '🔓') + '</button>' +
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
    '<button class="el-btn" data-action="shareTemplate" style="color:var(--green)"><span class="el-btn-icon">🔗</span> 分享链接</button>' +
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
  autoSave();
}

function renderField(f) {
  var v = _cfg[f.key];
  switch (f.type) {
    case 'text':
      if (f.key === 'bgImage') {
        return '<div class="field"><label>' + f.label + '</label><div style="display:flex;gap:6px"><input type="text" value="' + escH(String(v)) + '" data-cfg="' + f.key + '" placeholder="https://... 或点击上传" style="flex:1"><button class="bg-upload-btn" data-bg-upload title="上传背景图">📁</button></div></div>';
      }
      return '<div class="field"><label>' + f.label + '</label><input type="text" value="' + escH(String(v)) + '" data-cfg="' + f.key + '"></div>';
    case 'textarea':
      return '<div class="field"><label>' + f.label + '</label><textarea rows="3" data-cfg="' + f.key + '">' + escH(String(v)) + '</textarea></div>';
    case 'color':
      var presets = JCM.COLOR_PRESETS || [];
      var recent = (JCM.getRecentColors && JCM.getRecentColors()) || [];
      var swatchHtml = '<div class="color-swatches">';
      recent.forEach(function (c) { swatchHtml += '<span class="color-dot" style="background:' + c + '" data-cfg-color="' + f.key + '" data-color="' + c + '"></span>'; });
      presets.forEach(function (c) { swatchHtml += '<span class="color-dot" style="background:' + c + '" data-cfg-color="' + f.key + '" data-color="' + c + '"></span>'; });
      swatchHtml += '</div>';
      return '<div class="field field-color"><label>' + f.label + '</label><input type="color" value="' + v + '" data-cfg="' + f.key + '"><span class="color-val">' + v + '</span>' + swatchHtml + '</div>';
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
  captureState('添加 ' + type);
  var defs = JCM.ElementDefaults;
  if (defs[type]) {
    var newEl = JSON.parse(JSON.stringify(defs[type]()));
    // 标记不支持 MAML 的元素类型
    if (type === 'lottie') {
      newEl._browserOnly = true;
      toast('⚠️ Lottie 仅浏览器预览可用，MAML 不支持此格式', 'warning');
    }
    if (type === 'arc') {
      newEl._approximate = true;
      toast('⚠️ 弧形在 MAML 中用圆形模拟，效果可能与预览不完全一致', 'info');
    }
    _elements.push(newEl);
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
  captureState('删除元素');
  var el = _elements[idx];
  if (el && el.fileName) {
    var stillUsed = _elements.some(function (e, i) { return i !== idx && e.fileName === el.fileName; });
    if (!stillUsed) {
      // 清理 blob URL，防止内存泄漏
      var fi = JCM.uploadedFiles[el.fileName];
      if (fi && fi.dataUrl && fi.dataUrl.indexOf('blob:') === 0) {
        try { URL.revokeObjectURL(fi.dataUrl); } catch (e) {}
      }
      delete JCM.uploadedFiles[el.fileName];
    }
  }
  _elements.splice(idx, 1);
  if (_selIdx >= _elements.length) _selIdx = _elements.length - 1;
  _dirty = true;
  renderConfig();
  toast('🗑️ 已删除', 'success', undo);
};

JCM.moveElementZ = function (idx, dir) {
  captureState('调整层级');
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
  captureState('对齐 ' + align);
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
  captureState('调整大小 ' + size);
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
  if (_cfg.bgImage) {
    html = '<div style="position:absolute;inset:0;background-image:url(\'' + _cfg.bgImage.replace(/'/g, "\\'") + '\');background-size:cover;background-position:center;z-index:-1"></div>' + html;
  }
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
      bgImage: _cfg.bgImage || '',
    });
  }
  document.getElementById('codeContent').value = maml;
  updateCodeEditor();
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
  if (_cfg.bgImage) {
    html = '<div style="position:absolute;inset:0;background-image:url(\'' + _cfg.bgImage.replace(/'/g, "\\'") + '\');background-size:cover;background-position:center;z-index:-1"></div>' + html;
  }
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
      case 'arc':
        // MAML 不支持 <Arc>，用 Circle 模拟（完整圆形，颜色匹配）
        lines.push('    <!-- Arc: MAML 不原生支持弧形，用圆形近似 -->');
        lines.push('    <Circle x="' + el.x + '" y="' + el.y + '" r="' + (el.r || 40) + '" fillColor="' + el.color + '" />');
        break;
      case 'progress':
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 200) + '" h="' + (el.h || 8) + '" fillColor="' + (el.bgColor || '#333333') + '" cornerRadius="' + (el.radius || 4) + '" />');
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + Math.round((el.w || 200) * (el.value || 60) / 100) + '" h="' + (el.h || 8) + '" fillColor="' + el.color + '" cornerRadius="' + (el.radius || 4) + '" />');
        break;
      case 'lottie':
        // MAML 不支持 Lottie，导出为注释
        lines.push('    <!-- Lottie 动画: MAML 引擎不支持，请替换为 Image 或 Video 元素 -->');
        break;
    }
    // 动画属性追加到当前元素（修改最后push的行）
    if (el.animationName && lines.length > 0) {
      var lastLine = lines[lines.length - 1];
      if (lastLine.indexOf('/>') > 0) {
        var anim = ' animationName="' + el.animationName + '" animationDuration="' + (el.animationDuration || 500) + '" animationDelay="' + (el.animationDelay || 0) + '" animationRepeat="' + (el.animationRepeat || 1) + '"';
        if (el.animationInfinite) anim += ' animationInfinite="true"';
        lines[lines.length - 1] = lastLine.replace(' />', anim + ' />');
      }
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
    bgImage: _cfg.bgImage || '',
  });

  // XML 校验
  var validation = JCM.validateMAML(maml);
  if (!validation.valid) {
    return toast('XML 校验失败: ' + validation.errors[0], 'error');
  }

  JCM.exportZip(maml, _cfg.cardName || 'card', _elements, JCM.uploadedFiles, _tpl.id === 'custom', _cfg.bgImage || '')
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

// ─── Code Editor ──────────────────────────────────────────────────
function highlightXML(code) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>')
    .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="tag">$2</span>')
    .replace(/([\w:.-]+)(=)(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g,
      '<span class="attr-name">$1</span>$2<span class="attr-val">$3</span>')
    .replace(/(&lt;[?!][^&]*?&gt;)/g, '<span class="entity">$1</span>')
    .replace(/(&lt;|&gt;|\/&gt;)/g, '<span class="bracket">$1</span>');
}

function updateCodeGutter() {
  var textarea = document.getElementById('codeContent');
  var gutter = document.getElementById('codeGutter');
  if (!textarea || !gutter) return;
  var lines = textarea.value.split('\n');
  var html = '';
  for (var i = 1; i <= lines.length; i++) html += '<span>' + i + '</span>';
  gutter.innerHTML = html;
}

function updateCodeHighlight() {
  var textarea = document.getElementById('codeContent');
  var highlight = document.getElementById('codeHighlight');
  if (!textarea || !highlight) return;
  highlight.innerHTML = highlightXML(textarea.value) + '\n';
}

function updateCodeEditor() {
  updateCodeGutter();
  updateCodeHighlight();
}

function syncCodeScroll() {
  var textarea = document.getElementById('codeContent');
  var highlight = document.getElementById('codeHighlight');
  var gutter = document.getElementById('codeGutter');
  var body = document.getElementById('codeEditor');
  if (!textarea || !highlight || !gutter || !body) return;
  // Scroll the body container
  body.querySelector('.code-body').scrollTop = textarea.scrollTop;
  body.querySelector('.code-body').scrollLeft = textarea.scrollLeft;
  highlight.style.transform = 'translate(' + (-textarea.scrollLeft) + 'px,' + (-textarea.scrollTop) + 'px)';
  gutter.style.transform = 'translateY(' + (-textarea.scrollTop) + 'px)';
}

JCM.formatXML = function () {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  var xml = textarea.value;
  if (!xml || xml.indexOf('<') < 0) return toast('没有可格式化的 XML', 'error');

  // Simple XML formatter
  var formatted = '';
  var indent = 0;
  var lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  lines.forEach(function (line) {
    line = line.trim();
    if (!line) return;
    if (line.indexOf('</') === 0 && indent > 0) indent--;
    formatted += '  '.repeat(indent) + line + '\n';
    if (line.indexOf('<') === 0 && line.indexOf('</') !== 0 &&
        line.indexOf('/>') < 0 && line.indexOf('<?') < 0 &&
        line.indexOf('<!--') < 0) {
      indent++;
    }
  });
  textarea.value = formatted.trim();
  updateCodeEditor();
  toast('🔧 XML 已格式化', 'success');
};

function setupCodeEditor() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;

  // Tab key = insert 2 spaces
  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      if (e.shiftKey) {
        // Outdent: remove 2 spaces before cursor line
        var lineStart = this.value.lastIndexOf('\n', start - 1) + 1;
        var lineText = this.value.substring(lineStart, start);
        if (lineText.indexOf('  ') === 0) {
          this.value = this.value.substring(0, lineStart) + this.value.substring(lineStart + 2);
          this.selectionStart = this.selectionEnd = Math.max(lineStart, start - 2);
        }
      } else {
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
      }
      updateCodeEditor();
    }
    // Auto-close tags: typing < adds >
    if (e.key === '<' && !e.ctrlKey && !e.metaKey) {
      // Don't auto-close if it looks like a closing tag
    }
    // Enter = auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      var pos = this.selectionStart;
      var before = this.value.substring(0, pos);
      var after = this.value.substring(pos);
      var currentLine = before.substring(before.lastIndexOf('\n') + 1);
      var currentIndent = currentLine.match(/^(\s*)/)[1];
      var extraIndent = '';
      // If previous char is > and next char is </, keep same indent
      var lastChar = before.trim().slice(-1);
      var nextChars = after.trim().substring(0, 2);
      if (lastChar === '>' && nextChars !== '</') {
        extraIndent = '  ';
      }
      this.value = before + '\n' + currentIndent + extraIndent + after;
      this.selectionStart = this.selectionEnd = pos + 1 + currentIndent.length + extraIndent.length;
      updateCodeEditor();
    }
  });

  textarea.addEventListener('input', updateCodeEditor);
  textarea.addEventListener('scroll', syncCodeScroll);

  // Initial render
  updateCodeEditor();
}

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

// ─── Token 编码/解码（避免明文存储）───────────────────────────────
function _encodeToken(t) { try { return btoa(unescape(encodeURIComponent(t))); } catch (e) { return ''; } }
function _decodeToken(t) { try { return decodeURIComponent(escape(atob(t))); } catch (e) { return ''; } }

// ─── Build APK via GitHub Actions ─────────────────────────────────
JCM.triggerBuild = function () {
  var raw = localStorage.getItem('jcm-gh-token');
  var token = raw ? _decodeToken(raw) : '';
  if (!token) {
    token = prompt('输入 GitHub Personal Access Token（需 repo 权限，仅保存在本地）：');
    if (!token) return;
    localStorage.setItem('jcm-gh-token', _encodeToken(token));
  }

  toast('🚀 正在触发 APK 构建...', 'info');

  fetch('https://api.github.com/repos/guocheng1378/janus-card-maker/actions/workflows/build.yml/dispatches', {
    method: 'POST',
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  }).then(function (res) {
    if (res.status === 204) {
      toast('✅ APK 构建已触发！查看 GitHub Actions 进度', 'success');
    } else if (res.status === 401) {
      localStorage.removeItem('jcm-gh-token');
      toast('❌ Token 无效或已过期，请重新输入', 'error');
    } else {
      toast('❌ 触发失败: HTTP ' + res.status, 'error');
    }
  }).catch(function (e) {
    toast('❌ 网络错误: ' + e.message, 'error');
  });
};

JCM.clearToken = function () {
  localStorage.removeItem('jcm-gh-token');
  toast('🔑 Token 已清除', 'success');
};

// ─── Template Sharing via URL ─────────────────────────────────────
JCM.shareTemplate = function () {
  if (!_tpl) return toast('请先选择模板', 'error');
  var data = {
    t: _tpl.id,
    c: _cfg,
    e: _tpl.id === 'custom' ? _elements : undefined,
  };
  var json = JSON.stringify(data);
  var encoded = btoa(unescape(encodeURIComponent(json)));
  var url = location.origin + location.pathname + '#share=' + encoded;

  if (url.length > 8000) {
    toast('⚠️ 模板数据过大，无法通过 URL 分享', 'warning');
    return;
  }

  navigator.clipboard.writeText(url).then(function () {
    toast('📋 分享链接已复制！发送给朋友即可导入', 'success');
  }).catch(function () {
    prompt('复制以下分享链接：', url);
  });
};

// 检查 URL 中的分享数据
JCM.checkShareURL = function () {
  var hash = location.hash;
  if (hash.indexOf('#share=') !== 0) return;
  try {
    var encoded = hash.substring(7);
    var json = decodeURIComponent(escape(atob(encoded)));
    var data = JSON.parse(json);
    var tpl = JCM.TEMPLATES.find(function (t) { return t.id === data.t; });
    if (!tpl) return;

    _tpl = tpl;
    _cfg = {};
    tpl.config.forEach(function (g) { g.fields.forEach(function (f) {
      _cfg[f.key] = data.c[f.key] !== undefined ? data.c[f.key] : f.default;
    }); });
    if (data.e) _elements = data.e;
    _dirty = true;
    _history = [];
    _redoStack = [];
    JCM.uploadedFiles = {};

    renderTplGrid();
    JCM.goStep(1);
    toast('✅ 已导入分享模板: ' + tpl.name, 'success');
    // Clear hash
    history.replaceState(null, '', location.pathname);
  } catch (e) {
    console.warn('Share URL parse failed:', e);
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

// ─── Config Page Zoom ────────────────────────────────────────────
var _cfgZoomLevel = 100;
JCM.cfgZoomIn = function () {
  _cfgZoomLevel = Math.min(_cfgZoomLevel + 25, 200);
  applyCfgZoom();
};
JCM.cfgZoomOut = function () {
  _cfgZoomLevel = Math.max(_cfgZoomLevel - 25, 50);
  applyCfgZoom();
};
JCM.cfgZoomReset = function () {
  _cfgZoomLevel = 100;
  applyCfgZoom();
};
function applyCfgZoom() {
  var phone = document.querySelector('.config-preview-phone');
  if (phone) phone.style.transform = 'scale(' + (_cfgZoomLevel / 100) + ')';
  var label = document.getElementById('cfgZoomLabel');
  if (label) label.textContent = _cfgZoomLevel + '%';
}

// ─── Batch Export ─────────────────────────────────────────────────
JCM.handleBatchExport = function () {
  if (!_tpl) return toast('请先选择模板', 'error');
  var deviceKeys = ['p2', 'q200', 'q100', 'ultra'];
  var errors = [];

  toast('📦 正在批量导出 4 个机型...', 'info');

  var promises = deviceKeys.map(function (dk) {
    var device = JCM.getDevice(dk);
    var innerXml = getTemplateMAML(_tpl, _cfg, device);
    var maml = _tpl.rawXml ? innerXml : JCM.generateMAML({
      cardName: (_cfg.cardName || _tpl.name) + '_' + dk,
      device: device,
      innerXml: innerXml,
      updater: _tpl.updater,
      extraElements: _elements,
      uploadedFiles: JCM.uploadedFiles,
      bgImage: _cfg.bgImage || '',
    });
    var validation = JCM.validateMAML(maml);
    if (!validation.valid) {
      errors.push(device.label + ': ' + validation.errors[0]);
      return Promise.resolve();
    }
    return JCM.exportZip(maml, (_cfg.cardName || 'card') + '_' + dk, _elements, JCM.uploadedFiles, _tpl.id === 'custom', _cfg.bgImage || '')
      .catch(function (e) { errors.push(device.label + ': ' + e.message); });
  });

  Promise.all(promises).then(function () {
    if (errors.length > 0) toast('部分导出失败: ' + errors.join(', '), 'error');
    else toast('✅ 全部 4 个机型已导出', 'success');
  });
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
    bgImage: _cfg.bgImage || '',
  });

  var validation = JCM.validateMAML(maml);
  if (!validation.valid) {
    return toast('XML 校验失败: ' + validation.errors[0], 'error');
  }

  JCM.exportZip(maml, (_cfg.cardName || 'card') + '_all', _elements, JCM.uploadedFiles, _tpl.id === 'custom', _cfg.bgImage || '')
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
    // 清理旧的 blob URL
    Object.keys(JCM.uploadedFiles).forEach(function (k) {
      var f = JCM.uploadedFiles[k];
      if (f && f.dataUrl && f.dataUrl.indexOf('blob:') === 0) {
        try { URL.revokeObjectURL(f.dataUrl); } catch (e) {}
      }
    });
    JCM.importZip(file).then(function (data) {
      // Switch to custom template
      _tpl = JCM.TEMPLATES.find(function (t) { return t.id === 'custom'; });
      _cfg = { cardName: data.cardName, bgColor: data.bgColor };
      if (data.bgImage) _cfg.bgImage = data.bgImage;
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
  if (_elements[idx].locked) return; // Locked elements cannot be dragged

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
  var guides = [];

  if (Math.abs(elCX - device.width / 2) < snapThreshold) {
    nx = Math.round(device.width / 2 - elW / 2);
    guides.push({ type: 'v', pos: device.width / 2 });
  }
  if (Math.abs(elCY - device.height / 2) < snapThreshold) {
    ny = Math.round(device.height / 2 - elH / 2);
    guides.push({ type: 'h', pos: device.height / 2 });
  }

  for (var i = 0; i < _elements.length; i++) {
    if (i === _dragging.idx) continue;
    var other = _elements[i];
    var oW = other.w || (other.r ? other.r * 2 : 0) || 50;
    var oH = other.h || (other.r ? other.r * 2 : 0) || 30;
    var oCX = other.x + oW / 2;
    var oCY = other.y + oH / 2;

    if (Math.abs(nx - other.x) < snapThreshold) { nx = other.x; guides.push({ type: 'v', pos: other.x }); }
    if (Math.abs(nx + elW - (other.x + oW)) < snapThreshold) { nx = other.x + oW - elW; guides.push({ type: 'v', pos: other.x + oW }); }
    if (Math.abs(elCX - oCX) < snapThreshold) { nx = Math.round(oCX - elW / 2); guides.push({ type: 'v', pos: oCX }); }
    if (Math.abs(ny - other.y) < snapThreshold) { ny = other.y; guides.push({ type: 'h', pos: other.y }); }
    if (Math.abs(ny + elH - (other.y + oH)) < snapThreshold) { ny = other.y + oH - elH; guides.push({ type: 'h', pos: other.y + oH }); }
    if (Math.abs(elCY - oCY) < snapThreshold) { ny = Math.round(oCY - elH / 2); guides.push({ type: 'h', pos: oCY }); }
  }
  return { x: nx, y: ny, guides: guides };
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
    // Render guide lines
    renderGuideLines(aligned.guides || [], _dragging.scale);
  });
}

function renderGuideLines(guides, scale) {
  var screen = document.querySelector('.preview-screen');
  if (!screen) return;
  // Remove old guides
  screen.querySelectorAll('.align-guide').forEach(function (g) { g.remove(); });
  guides.forEach(function (g) {
    var div = document.createElement('div');
    div.className = 'align-guide ' + (g.type === 'h' ? 'align-guide-h' : 'align-guide-v');
    if (g.type === 'h') div.style.top = (g.pos * scale) + 'px';
    else div.style.left = (g.pos * scale) + 'px';
    screen.appendChild(div);
  });
}

function clearGuideLines() {
  document.querySelectorAll('.align-guide').forEach(function (g) { g.remove() });
}

function onPreviewMouseUp() {
  _dragging = null;
  clearGuideLines();
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

  // Category tabs
  var catContainer = document.getElementById('tplCategories');
  if (catContainer) {
    catContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.tpl-cat');
      if (!btn) return;
      _activeCategory = btn.dataset.cat;
      document.querySelectorAll('.tpl-cat').forEach(function (b) { b.classList.toggle('active', b === btn); });
      JCM.filterTemplates(document.getElementById('tplSearch').value);
    });
  }

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
    autoSave();
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
    // Toggle switch (checkbox) for boolean element props
    if (t.dataset.prop && t.type === 'checkbox' && t.dataset.idx) {
      var cidx = Number(t.dataset.idx);
      _elements[cidx][t.dataset.prop] = t.checked;
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
    var lockBtn = e.target.closest('[data-lock]');
    if (lockBtn) {
      e.stopPropagation();
      var lockIdx = Number(lockBtn.dataset.lock);
      if (lockIdx >= 0 && lockIdx < _elements.length) {
        _elements[lockIdx].locked = !_elements[lockIdx].locked;
        renderConfig();
        toast(_elements[lockIdx].locked ? '🔒 已锁定' : '🔓 已解锁', 'info');
      }
      return;
    }
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
      else if (a === 'shareTemplate') JCM.shareTemplate();
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
    // 方向键移动元素
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) >= 0 && _selIdx >= 0 && _selIdx < _elements.length && !_elements[_selIdx].locked) {
      e.preventDefault();
      var step = e.shiftKey ? 10 : 1;
      var el = _elements[_selIdx];
      captureState('移动 ' + el.type);
      if (e.key === 'ArrowUp') el.y = Math.max(0, el.y - step);
      if (e.key === 'ArrowDown') el.y += step;
      if (e.key === 'ArrowLeft') el.x = Math.max(0, el.x - step);
      if (e.key === 'ArrowRight') el.x += step;
      _dirty = true;
      renderConfig();
      if (_step === 2) renderPreview();
    }
  });

  // Drag & Drop file upload
  var content = document.querySelector('.content');
  content.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); });
  content.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    var files = e.dataTransfer.files;
    if (!files.length) return;
    var file = files[0];
    if (file.type.indexOf('image/') === 0) {
      var dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('fileImagePick').files = dt.files;
      _pendingAdd = 'image'; _pendingReplace = -1;
      document.getElementById('fileImagePick').dispatchEvent(new Event('change'));
    } else if (file.type.indexOf('video/') === 0) {
      var dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('fileVideoPick').files = dt.files;
      _pendingAdd = 'video'; _pendingReplace = -1;
      document.getElementById('fileVideoPick').dispatchEvent(new Event('change'));
    }
  });

  // ── 右键菜单 ──
  var ctxMenu = document.getElementById('contextMenu');
  var ctxIdx = -1;
  document.getElementById('previewContent').addEventListener('contextmenu', function(e) {
    var elTarget = e.target.closest('[data-el-idx]');
    if (!elTarget) return;
    e.preventDefault();
    ctxIdx = parseInt(elTarget.dataset.elIdx, 10);
    if (isNaN(ctxIdx)) return;
    _selIdx = ctxIdx;
    renderConfig();
    ctxMenu.style.display = '';
    ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
    ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 250) + 'px';
  });
  document.addEventListener('click', function() { ctxMenu.style.display = 'none'; });
  ctxMenu.addEventListener('click', function(e) {
    var item = e.target.closest('.ctx-item');
    if (!item || ctxIdx < 0) return;
    var action = item.dataset.ctx;
    ctxMenu.style.display = 'none';
    switch(action) {
      case 'duplicate':
        captureState();
        var clone = JSON.parse(JSON.stringify(_elements[ctxIdx]));
        clone.x += 10; clone.y += 10;
        _elements.push(clone); _selIdx = _elements.length - 1;
        _dirty = true; renderConfig();
        toast('✅ 已复制元素', 'success'); break;
      case 'delete': JCM.removeElement(ctxIdx); break;
      case 'lock':
        _elements[ctxIdx].locked = !_elements[ctxIdx].locked;
        renderConfig();
        toast(_elements[ctxIdx].locked ? '🔒 已锁定' : '🔓 已解锁', 'info'); break;
      case 'front':
        captureState();
        var el = _elements.splice(ctxIdx, 1)[0];
        _elements.push(el); _selIdx = _elements.length - 1;
        _dirty = true; renderConfig(); break;
      case 'back':
        captureState();
        var el2 = _elements.splice(ctxIdx, 1)[0];
        _elements.unshift(el2); _selIdx = 0;
        _dirty = true; renderConfig(); break;
      case 'align-left': JCM.alignElement(ctxIdx, 'left'); break;
      case 'align-center': JCM.alignElement(ctxIdx, 'hcenter'); break;
      case 'align-right': JCM.alignElement(ctxIdx, 'right'); break;
    }
  });

  // ── 颜色面板点击 ──
  document.getElementById('cfgContent').addEventListener('click', function(e) {
    var colorDot = e.target.closest('.color-dot');
    if (colorDot) {
      var key = colorDot.dataset.cfgColor;
      var color = colorDot.dataset.color;
      _cfg[key] = color;
      JCM.addRecentColor(color);
      var input = document.querySelector('input[type="color"][data-cfg="' + key + '"]');
      if (input) { input.value = color; var cv = input.nextElementSibling; if (cv) cv.textContent = color; }
      _dirty = true; _autoPreview();
      return;
    }
    // 模板收藏
    var favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      var favId = favBtn.dataset.fav;
      var isFav = JCM.toggleFavorite(favId);
      favBtn.textContent = isFav ? '⭐' : '☆';
      favBtn.classList.toggle('active', isFav);
      toast(isFav ? '⭐ 已收藏' : '已取消收藏', 'info');
      return;
    }
    // 背景图上传
    var bgBtn = e.target.closest('[data-bg-upload]');
    if (bgBtn) {
      e.stopPropagation();
      var bgInput = document.createElement('input');
      bgInput.type = 'file'; bgInput.accept = 'image/*';
      bgInput.onchange = function () {
        var file = bgInput.files && bgInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          _cfg.bgImage = ev.target.result;
          var textInput = document.querySelector('[data-cfg="bgImage"]');
          if (textInput) textInput.value = '(本地图片: ' + file.name + ')';
          _dirty = true; _autoPreview();
          toast('🖼️ 背景图已设置', 'success');
        };
        reader.readAsDataURL(file);
      };
      bgInput.click();
      return;
    }
    // 配置区折叠
    var sectionTitle = e.target.closest('.config-section-title');
    if (sectionTitle) {
      var section = sectionTitle.parentElement;
      var grid = section.querySelector('.config-grid');
      if (grid) {
        var collapsed = grid.style.display === 'none';
        grid.style.display = collapsed ? '' : 'none';
        sectionTitle.classList.toggle('collapsed', !collapsed);
      }
    }
  });

  // ── 元素列表拖拽排序 ──
  var _dragSortIdx = -1;
  document.getElementById('cfgContent').addEventListener('mousedown', function(e) {
    var item = e.target.closest('.el-item');
    if (!item || e.target.closest('.el-item-del') || e.target.closest('.el-z-btn') || e.target.closest('.el-lock-btn')) return;
    _dragSortIdx = parseInt(item.dataset.sel, 10);
  });
  document.getElementById('cfgContent').addEventListener('dragover', function(e) {
    e.preventDefault();
    var item = e.target.closest('.el-item');
    if (item) {
      document.querySelectorAll('.el-item').forEach(function(el) { el.classList.remove('drag-over'); });
      item.classList.add('drag-over');
    }
  });
  document.getElementById('cfgContent').addEventListener('drop', function(e) {
    e.preventDefault();
    document.querySelectorAll('.el-item').forEach(function(el) { el.classList.remove('drag-over'); });
    var item = e.target.closest('.el-item');
    if (!item || _dragSortIdx < 0) return;
    var dropIdx = parseInt(item.dataset.sel, 10);
    if (dropIdx === _dragSortIdx) return;
    captureState();
    var moved = _elements.splice(_dragSortIdx, 1)[0];
    _elements.splice(dropIdx, 0, moved);
    _selIdx = dropIdx; _dirty = true;
    renderConfig();
    toast('📐 已调整顺序', 'success');
    _dragSortIdx = -1;
  });
}

// ─── Auto-save (debounced) ────────────────────────────────────────
var _autoSaveTimer = null;
function autoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(function () {
    var el = document.getElementById('autosaveIndicator');

    // 优先使用 IndexedDB（支持大容量素材）
    if (JCM.Storage) {
      JCM.Storage.saveDraft(
        _tpl ? _tpl.id : null,
        _cfg,
        _elements,
        JCM.uploadedFiles
      ).then(function () {
        if (el) { el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 1500); }
      }).catch(function () {
        // IndexedDB 失败，降级到 localStorage（不含素材）
        try {
          var draft = { tplId: _tpl ? _tpl.id : null, cfg: _cfg, elements: _elements, timestamp: Date.now() };
          localStorage.setItem('jcm-draft', JSON.stringify(draft));
          if (el) { el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 1500); }
        } catch (e) {}
      });
    } else {
      try {
        var draft = { tplId: _tpl ? _tpl.id : null, cfg: _cfg, elements: _elements, timestamp: Date.now() };
        localStorage.setItem('jcm-draft', JSON.stringify(draft));
        if (el) { el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 1500); }
      } catch (e) {}
    }
  }, 2000);
}

function showDraftRecovery(d) {
  var tpl = JCM.TEMPLATES.find(function (t) { return t.id === d.tplId; });
  var name = tpl ? tpl.name : d.tplId;
  var date = new Date(d.timestamp);
  var timeStr = date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  var div = document.createElement('div');
  div.className = 'draft-recovery';
  div.innerHTML = '<div class="draft-recovery-title">📄 发现未保存的草稿</div>' +
    '<div class="draft-recovery-desc">模板: ' + escH(name) + ' · ' + timeStr + '</div>' +
    '<div class="draft-recovery-btns">' +
    '<button class="btn btn-primary" id="draftRecoverBtn">恢复</button>' +
    '<button class="btn btn-secondary" id="draftDiscardBtn">丢弃</button>' +
    '</div>';
  document.body.appendChild(div);

  document.getElementById('draftRecoverBtn').onclick = function () {
    var _tpl2 = JCM.TEMPLATES.find(function (t) { return t.id === d.tplId; });
    if (!_tpl2) { toast('找不到对应模板', 'error'); div.remove(); return; }
    _tpl = _tpl2;
    _cfg = d.cfg || {};
    _elements = d.elements || [];
    // 恢复 uploadedFiles（来自 IndexedDB）
    if (d.uploadedFiles) {
      JCM.uploadedFiles = d.uploadedFiles;
    }
    _dirty = true;
    _history = [];
    _redoStack = [];
    renderTplGrid();
    JCM.goStep(1);
    toast('✅ 草稿已恢复', 'success');
    div.remove();
  };
  document.getElementById('draftDiscardBtn').onclick = function () {
    localStorage.removeItem('jcm-draft');
    if (JCM.Storage) JCM.Storage.clearDraft().catch(function () {});
    div.remove();
  };
}

// ─── History Panel ────────────────────────────────────────────────
JCM.toggleHistory = function () {
  var modal = document.getElementById('historyModal');
  if (!modal) return;
  if (modal.style.display === 'none') {
    var list = document.getElementById('historyList');
    var labels = JCM.getHistory();
    if (labels.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">暂无操作历史</div>';
    } else {
      list.innerHTML = '<div class="shortcut-list">' + labels.map(function (l, i) {
        return '<div class="shortcut-item" style="cursor:pointer" onclick="JCM.undoTo(' + (labels.length - i) + ');JCM.toggleHistory()"><span>' + (i + 1) + '.</span><span>' + escH(l) + '</span></div>';
      }).join('') + '</div>';
    }
    modal.style.display = '';
  } else {
    modal.style.display = 'none';
  }
};

// ─── Changelog ───────────────────────────────────────────────────
var CHANGELOG = [
  {
    version: 'v4.5',
    date: '2026-04-06',
    items: [
      '📁 背景图上传按钮 — 点击选择本地图片作为卡片背景',
      '📏 智能对齐线 — 拖拽时显示中心/边缘参考线',
      '↩️ Toast 撤销 — 删除操作后可一键恢复',
      '📂 配置区折叠 — 点击标题收起/展开配置分组',
      '🔘 Toggle 开关 — 是/否选项改为滑动开关',
      '💾 自动保存提示 — 右下角显示保存状态',
      '🏷️ 模板分类标签 — 按时间/信息/媒体/设备/自定义筛选',
      '🖼️ 背景图 URL — 每个模板支持自定义背景图',
    ],
  },
  {
    version: 'v4.4',
    date: '2026-04-06',
    items: [
      '⌨️ 方向键移动元素 — ↑↓←→ 移动 1px，Shift+方向键 10px',
      '📝 操作历史描述 — 撤销面板显示具体操作名称',
      '🔢 元素数量徽标 — 配置页显示元素计数',
      '🔍 配置页缩放 — 实时预览区域可缩放 50%~200%',
      '🌗 双主题对比 — 并排显示暗色/亮色效果',
    ],
  },
  {
    version: 'v4.3',
    date: '2026-04-06',
    items: [
      '🎬 元素动画 — 7 种 MAML 动画（淡入淡出/滑入/缩放/旋转）',
      '🎨 颜色面板 — 24 色预设 + 最近使用颜色',
      '📋 右键菜单 — 复制/删除/锁定/置顶置底/对齐',
      '📐 列表拖拽排序 — 元素支持拖拽调整 z-index',
      '📏 尺寸标注 — 选中元素显示 x/y/宽/高',
      '🎭 Lottie 动画 — 新增 Lottie JSON 动画元素',
      '⭐ 模板收藏 — 收藏常用模板置顶显示',
    ],
  },
  {
    version: 'v4.2',
    date: '2026-04-06',
    items: [
      '🎨 XML 代码编辑器 — 语法高亮/行号/Tab缩进/格式化',
    ],
  },
  {
    version: 'v4.1',
    date: '2026-04-06',
    items: [
      '📂 拖拽上传 — 图片/视频直接拖入页面',
      '💾 自动保存草稿 — localStorage 定时保存',
      '📜 撤销历史面板 — 查看和跳转到任意操作步骤',
      '📐 网格叠加层 — 预览区可显示参考网格',
      '◠ 弧形/▰ 进度条元素 — 新增 Arc 和 Progress 类型',
      '🔒 元素锁定 — 锁定后防止误拖拽',
      '🔍 模板搜索 — 按名称/描述过滤模板',
    ],
  },
  {
    version: 'v4.0',
    date: '2026-04-05',
    items: [
      '🌤️🎵 真实设备模板 — 天气/音乐卡片绑定系统数据',
      '🔤 字体选择 — 8 种字体',
      '🌈 文字渐变 — 6 种预设 + 自定义双色渐变',
      '✏️ 文字描边 — 可调粗细和颜色',
      '📝 XML 直接编辑 — textarea 可手动修改 MAML 代码',
      '📱 通用卡片导出 — 一份 MAML 自动适配 4 款机型',
      '📲 PWA 离线支持 — 安装到桌面 + 断网可用',
      '🤖 APK 在线构建 — 网页触发 GitHub Actions',
      '🔗 模板分享 — URL 编码分享',
      '🔄 视频强制转码 — MP4 编码不兼容时可转为 H.264',
      '📐 矩形模糊 — backdrop blur 效果',
    ],
  },
];

JCM.toggleChangelog = function () {
  var modal = document.getElementById('changelogModal');
  if (!modal) return;
  if (modal.style.display === 'none') {
    var list = document.getElementById('changelogList');
    list.innerHTML = CHANGELOG.map(function (v) {
      return '<div class="changelog-version">' +
        '<div class="changelog-header"><span class="changelog-ver">' + v.version + '</span><span class="changelog-date">' + v.date + '</span></div>' +
        '<ul class="changelog-items">' + v.items.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }).join('');
    modal.style.display = '';
  } else {
    modal.style.display = 'none';
  }
};

// ─── Grid Overlay Toggle ─────────────────────────────────────────
JCM.toggleGrid = function () {
  var cb = document.getElementById('showGrid');
  var overlay = document.getElementById('previewGridOverlay');
  if (cb && overlay) overlay.style.display = cb.checked ? '' : 'none';
};

// ─── Theme Compare (dark/light side-by-side) ─────────────────────
var _themeCompareHtml = null;
JCM.toggleThemeCompare = function () {
  var cb = document.getElementById('showThemeCompare');
  var wrap = document.querySelector('#page2 .preview-phone-wrap');
  if (!wrap || !cb) return;

  if (cb.checked) {
    // Save current preview and show side-by-side
    _themeCompareHtml = wrap.innerHTML;
    if (!_tpl) return toast('请先选择模板并配置', 'error');
    var device = getSelectedDevice();
    var showCam = document.getElementById('showCamera').checked;

    // Generate dark preview
    var darkHtml = renderTemplatePreview(device, showCam, _tpl, _cfg);
    darkHtml += new JCM.PreviewRenderer(device, showCam).renderElements(_elements, JCM.uploadedFiles, _selIdx);

    // Generate light preview (swap colors for bg elements)
    var lightCfg = JSON.parse(JSON.stringify(_cfg));
    // 完整的暗→亮颜色映射
    var darkToLight = {
      '#000000': '#ffffff', '#0a0a0a': '#f5f5f5', '#0a0a1a': '#f0f0f5',
      '#0d1117': '#e8ecf0', '#0f0f1a': '#ebebf0', '#0f1b2d': '#dce6f0',
      '#1a1a2e': '#e0e0ee', '#1a0a2e': '#eadef0', '#0a1628': '#d0e4f0',
      '#2d3436': '#d5d8da', '#000': '#fff'
    };
    var bgLower = (lightCfg.bgColor || '').toLowerCase();
    if (darkToLight[bgLower]) {
      lightCfg.bgColor = darkToLight[bgLower];
    } else if (isDarkColor(lightCfg.bgColor)) {
      lightCfg.bgColor = '#f0f0f0';
    }
    // 交换文字/前景色
    var textColors = ['timeColor', 'tempColor', 'dayColor', 'titleColor', 'textColor'];
    textColors.forEach(function (k) {
      if (lightCfg[k] && lightCfg[k].toLowerCase() === '#ffffff') lightCfg[k] = '#1a1a1a';
      if (lightCfg[k] && lightCfg[k].toLowerCase() === '#e0e0e0') lightCfg[k] = '#333333';
      if (lightCfg[k] && lightCfg[k].toLowerCase() === '#cccccc') lightCfg[k] = '#444444';
    });
    // dimColor / dateColor 等次要色
    if (lightCfg.dimColor && isDarkColor(lightCfg.dimColor)) lightCfg.dimColor = '#888888';
    if (lightCfg.dateColor && isDarkColor(lightCfg.dateColor)) lightCfg.dateColor = '#666666';
    if (lightCfg.descColor && isDarkColor(lightCfg.descColor)) lightCfg.descColor = '#556677';
    var lightHtml = renderTemplatePreview(device, showCam, _tpl, lightCfg);
    lightHtml += new JCM.PreviewRenderer(device, showCam).renderElements(_elements, JCM.uploadedFiles, _selIdx);

    var camW = showCam ? (device.cameraZoneRatio * 100) + '%' : '0';
    wrap.innerHTML =
      '<div class="theme-compare">' +
        '<div class="theme-compare-pane" style="background:#000">' +
          '<div class="theme-compare-label">🌙 暗色</div>' +
          '<div class="preview-screen" style="width:180px;height:' + Math.round(180 * device.height / device.width) + 'px">' +
            '<div class="preview-camera" style="width:' + camW + '"></div>' +
            '<div class="preview-content">' + darkHtml + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="theme-compare-pane" style="background:#fff">' +
          '<div class="theme-compare-label">☀️ 亮色</div>' +
          '<div class="preview-screen" style="width:180px;height:' + Math.round(180 * device.height / device.width) + 'px">' +
            '<div class="preview-camera" style="width:' + camW + '"></div>' +
            '<div class="preview-content">' + lightHtml + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  } else {
    // Restore original preview
    if (_themeCompareHtml) {
      wrap.innerHTML = _themeCompareHtml;
      _themeCompareHtml = null;
      renderPreview();
    }
  }
};

// ─── Template Filter ─────────────────────────────────────────────
// ─── Template Categories ─────────────────────────────────────────
var _activeCategory = 'all';

function renderTplCategories() {
  var container = document.getElementById('tplCategories');
  if (!container || !JCM.TPL_CATEGORIES) return;
  container.innerHTML = JCM.TPL_CATEGORIES.map(function (cat) {
    return '<button class="tpl-cat' + (_activeCategory === cat.id ? ' active' : '') + '" data-cat="' + cat.id + '">' + cat.label + '</button>';
  }).join('');
}

// 搜索防抖包装
var _filterTimer = null;
JCM.filterTemplates = function (query) {
  clearTimeout(_filterTimer);
  _filterTimer = setTimeout(function () {
    JCM._doFilterTemplates(query);
  }, 150);
};

JCM._doFilterTemplates = function (query) {
  var cards = document.querySelectorAll('.tpl-card');
  query = (query || '').toLowerCase();
  cards.forEach(function (card) {
    var tplId = card.dataset.tpl;
    var nameEl = card.querySelector('.tpl-card-name');
    var descEl = card.querySelector('.tpl-card-desc');
    var name = nameEl ? nameEl.textContent.toLowerCase() : '';
    var desc = descEl ? descEl.textContent.toLowerCase() : '';
    var catMatch = _activeCategory === 'all' || (JCM.TPL_CATEGORY_MAP && JCM.TPL_CATEGORY_MAP[tplId] === _activeCategory);
    var searchMatch = !query || name.indexOf(query) >= 0 || desc.indexOf(query) >= 0;
    card.style.display = (catMatch && searchMatch) ? '' : 'none';
  });
};

// ─── Toast (queue, supports multiple simultaneous) ────────────────
var _toastQueue = [];
var _toastId = 0;

function toast(msg, type, undoFn) {
  var id = 'toast-' + (++_toastId);
  var el = document.createElement('div');
  el.id = id;
  el.className = 'toast ' + (type || 'success');
  if (undoFn) {
    el.innerHTML = '<span>' + escH(msg) + '</span> <button class="toast-undo" onclick="this.parentElement._undo()">↩ 撤销</button>';
    el._undo = function () {
      undoFn();
      el.classList.remove('show');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
      _toastQueue = _toastQueue.filter(function (t) { return t !== id; });
      repositionToasts();
    };
  } else {
    el.textContent = msg;
  }
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
      repositionToasts();
    }, 300);
  }, undoFn ? 5000 : 2500);
}

function repositionToasts() {
  _toastQueue.forEach(function (tid, i) {
    var t = document.getElementById(tid);
    if (t) t.style.bottom = (80 + i * 52) + 'px';
  });
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
  setupCodeEditor();
  // 检查 URL 分享
  JCM.checkShareURL();
  // Init slider position after layout
  requestAnimationFrame(function () { moveStepSlider(0); });
  window.addEventListener('resize', function () { moveStepSlider(_step); });
  // Save draft on page unload + 清理资源
  window.addEventListener('beforeunload', function () {
    // 暂停所有视频
    document.querySelectorAll('video').forEach(function (v) { v.pause(); v.src = ''; });
    // 同步保存到 localStorage（IndexedDB 在 beforeunload 中来不及）
    try {
      var draft = {
        tplId: _tpl ? _tpl.id : null,
        cfg: _cfg,
        elements: _elements,
        timestamp: Date.now()
      };
      localStorage.setItem('jcm-draft', JSON.stringify(draft));
    } catch (e) { }
  });
  // Check for unsaved draft (优先 IndexedDB)
  if (JCM.Storage) {
    JCM.Storage.loadDraft().then(function (d) {
      if (d && d.tplId) showDraftRecovery(d);
    }).catch(function () {
      // 降级检查 localStorage
      try {
        var draft = localStorage.getItem('jcm-draft');
        if (draft) {
          var d = JSON.parse(draft);
          if (d.tplId) showDraftRecovery(d);
        }
      } catch (e) {}
    });
  } else {
    try {
      var draft = localStorage.getItem('jcm-draft');
      if (draft) {
        var d = JSON.parse(draft);
        if (d.tplId) showDraftRecovery(d);
      }
    } catch (e) {}
  }
};

// Expose internal helpers for inline use
JCM.renderPreview = renderPreview;
JCM.renderLivePreview = renderLivePreview;
JCM.getSelectedDevice = getSelectedDevice;
