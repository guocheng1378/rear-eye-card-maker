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

// ─── Undo/Redo ────────────────────────────────────────────────────
var _history = [];
var _redoStack = [];

function captureState() {
  _history.push({ cfg: JSON.parse(JSON.stringify(_cfg)), elements: JSON.parse(JSON.stringify(_elements)) });
  _redoStack = [];
  if (_history.length > 50) _history.shift();
}

function undo() {
  if (_history.length === 0) return;
  _redoStack.push({ cfg: JSON.parse(JSON.stringify(_cfg)), elements: JSON.parse(JSON.stringify(_elements)) });
  var state = _history.pop();
  _cfg = state.cfg;
  _elements = state.elements;
  _dirty = true;
  renderConfig();
  toast('↩ 已撤销', 'success');
}

function redo() {
  if (_redoStack.length === 0) return;
  _history.push({ cfg: JSON.parse(JSON.stringify(_cfg)), elements: JSON.parse(JSON.stringify(_elements)) });
  var state = _redoStack.pop();
  _cfg = state.cfg;
  _elements = state.elements;
  _dirty = true;
  renderConfig();
  toast('↪ 已重做', 'success');
}

// ─── Step Navigation ──────────────────────────────────────────────
JCM.goStep = function (n) {
  if (n === 1 && !_tpl) return toast('请先选择一个模板', 'error');
  if (n === 2 && !_tpl) return toast('请先选择模板并配置', 'error');
  _step = n;

  document.querySelectorAll('.page').forEach(function (p, i) { p.classList.toggle('active', i === n); });
  document.querySelectorAll('.step-dot').forEach(function (d, i) {
    d.classList.remove('active', 'done');
    if (i === n) d.classList.add('active');
    else if (i < n) d.classList.add('done');
  });
  document.querySelectorAll('.step-line').forEach(function (l, i) { l.classList.toggle('done', i < n); });

  document.getElementById('btnBack').style.display = n > 0 ? '' : 'none';
  var btnNext = document.getElementById('btnNext');
  if (n === 2) { btnNext.style.display = 'none'; }
  else {
    btnNext.style.display = '';
    btnNext.innerHTML = n === 0 ? '下一步 <span class="btn-icon">→</span>' : '预览 & 导出 <span class="btn-icon">→</span>';
  }

  if (n === 1) renderConfig();
  if (n === 2 && _dirty) renderPreview();
};

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
    return '<div class="tpl-card' + (_tpl && _tpl.id === t.id ? ' active' : '') + '" data-tpl="' + t.id + '">' +
      '<span class="tpl-icon">' + t.icon + '</span>' +
      '<div class="tpl-card-name">' + t.name + '</div>' +
      '<div class="tpl-card-desc">' + t.desc + '</div></div>';
  }).join('');
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
  }
  html += '</div>';

  // Template share buttons
  html += '<div class="config-section"><div class="config-section-title"><span>▸</span> 模板分享</div>' +
    '<div class="el-toolbar">' +
    '<button class="el-btn" data-action="exportTemplate"><span class="el-btn-icon">💾</span> 导出配置</button>' +
    '<button class="el-btn" data-action="importTemplate"><span class="el-btn-icon">📂</span> 导入配置</button>' +
    '</div></div>';

  document.getElementById('cfgContent').innerHTML = html;

  document.querySelectorAll('.color-val').forEach(function (el) {
    var input = el.previousElementSibling;
    if (input) el.textContent = input.value;
  });
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
  document.getElementById('previewCamera').style.width = showCam ? '30%' : '0';

  var r = new JCM.PreviewRenderer(device, showCam);
  var html = '';
  switch (_tpl.id) {
    case 'clock':     html = r.renderClock(_cfg); break;
    case 'quote':     html = r.renderQuote(_cfg); break;
    case 'battery':   html = r.renderBattery(_cfg); break;
    case 'status':    html = r.renderStatus(_cfg); break;
    case 'countdown': html = r.renderCountdown(_cfg); break;
    case 'music':     html = r.renderMusic(_cfg); break;
    case 'gradient':  html = r.renderGradient(_cfg); break;
    case 'weather':   html = r.renderCustom(_cfg); break;
    case 'steps':     html = r.renderCustom(_cfg); break;
    case 'calendar':  html = r.renderCustom(_cfg); break;
    case 'custom':    html = r.renderCustom(_cfg); break;
  }
  html += r.renderElements(_elements, JCM.uploadedFiles, _selIdx);
  document.getElementById('previewContent').innerHTML = html;

  var innerXml = _tpl.gen ? _tpl.gen(_cfg) : generateCustomMAML(device);
  var maml = JCM.generateMAML({
    cardName: _cfg.cardName || _tpl.name,
    device: device,
    innerXml: innerXml,
    updater: _tpl.updater,
    extraElements: _elements,
    uploadedFiles: JCM.uploadedFiles,
  });
  document.getElementById('codeContent').textContent = maml;
  _dirty = false;
}

function generateCustomMAML(device) {
  var lines = [
    '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />',
    '  <Rectangle w="#view_width" h="#view_height" fillColor="' + _cfg.bgColor + '" />',
    '  <Group x="#marginL" y="0">',
  ];
  _elements.forEach(function (el) {
    switch (el.type) {
      case 'text': {
        var a = el.textAlign && el.textAlign !== 'left' ? ' textAlign="' + el.textAlign + '"' : '';
        var ml = el.multiLine ? ' multiLine="true"' : '';
        var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ' w="' + (el.w || 200) + '"' : '';
        var b = el.bold ? ' bold="true"' : '';
        lines.push('    <Text text="' + JCM.escXml(el.text || '') + '" x="' + el.x + '" y="' + el.y + '" size="' + el.size + '" color="' + el.color + '"' + w + a + ml + b + ' />');
        break;
      }
      case 'rectangle':
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '"' + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + ' />');
        break;
      case 'circle':
        lines.push('    <Circle x="' + el.x + '" y="' + el.y + '" r="' + el.r + '" fillColor="' + el.color + '" />');
        break;
      case 'image': {
        var folder = el.src && JCM.uploadedFiles[el.src] && JCM.uploadedFiles[el.src].mimeType.indexOf('video/') === 0 ? 'videos' : 'images';
        lines.push('    <Image src="' + folder + '/' + (el.src || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '" />');
        break;
      }
      case 'video':
        lines.push('    <Video src="videos/' + (el.src || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 240) + '" h="' + (el.h || 135) + '" autoPlay="true" loop="true" />');
        break;
    }
  });
  lines.push('  </Group>');
  return lines.join('\n');
}

// ─── Export ────────────────────────────────────────────────────────
JCM.handleExport = function () {
  if (!_tpl) return toast('请先选择模板', 'error');
  var device = getSelectedDevice();
  var innerXml = _tpl.gen ? _tpl.gen(_cfg) : generateCustomMAML(device);
  var maml = JCM.generateMAML({
    cardName: _cfg.cardName || _tpl.name,
    device: device,
    innerXml: innerXml,
    updater: _tpl.updater,
    extraElements: _elements,
    uploadedFiles: JCM.uploadedFiles,
  });

  JCM.exportZip(maml, _cfg.cardName || 'card', _elements, JCM.uploadedFiles, _tpl.id === 'custom')
    .then(function () { toast('✅ ZIP 已导出', 'success'); })
    .catch(function (e) { toast('导出失败: ' + e.message, 'error'); });
};

JCM.handleExportPNG = function () {
  JCM.exportPNG(_cfg.cardName || 'card')
    .then(function () { toast('✅ PNG 已导出', 'success'); })
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
      _elements = data.elements;
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
  JCM.exportTemplateJSON(_tpl ? _tpl.id : 'custom', _cfg);
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
      _dirty = true;
      renderTplGrid();
      renderConfig();
      toast('✅ 配置已导入', 'success');
    }).catch(function (e) { toast('导入失败: ' + e.message, 'error'); });
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

  var ext = file.name.split('.').pop() || (type === 'image' ? 'png' : 'mp4');
  var safeName = 'media_' + Date.now() + '.' + ext;

  var reader = new FileReader();
  reader.onload = function (ev) {
    var dataUrl = ev.target.result;
    var base64 = dataUrl.split(',')[1];
    var bin = atob(base64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);

    JCM.uploadedFiles[safeName] = { data: arr.buffer, mimeType: file.type, dataUrl: dataUrl, originalName: file.name };

    captureState();
    if (replaceIdx >= 0 && replaceIdx < _elements.length) {
      _elements[replaceIdx].fileName = safeName;
      _elements[replaceIdx].src = safeName;
    } else {
      _elements.push({ type: type, fileName: safeName, src: safeName, x: 10, y: 60, w: type === 'image' ? 200 : 240, h: type === 'image' ? 200 : 135 });
      _selIdx = _elements.length - 1;
    }

    _dirty = true;
    renderConfig();
    toast(file.name + ' 已添加', 'success');
  };
  reader.readAsDataURL(file);
}

// ─── Drag & Drop in Preview ───────────────────────────────────────
var _dragging = null;

function onPreviewMouseDown(e) {
  var el = e.target.closest('[data-el-idx]');
  if (!el) return;
  var idx = parseInt(el.dataset.elIdx, 10);
  if (isNaN(idx) || idx >= _elements.length) return;

  e.preventDefault();
  var device = getSelectedDevice();
  var screen = document.querySelector('.preview-screen');
  var rect = screen.getBoundingClientRect();
  var scale = rect.width / device.width;

  _dragging = {
    idx: idx,
    startX: e.clientX,
    startY: e.clientY,
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
}

function onPreviewMouseMove(e) {
  if (!_dragging) return;
  var dx = (e.clientX - _dragging.startX) / _dragging.scale;
  var dy = (e.clientY - _dragging.startY) / _dragging.scale;

  var nx = Math.round(_dragging.origX + dx);
  var ny = Math.round(_dragging.origY + dy);

  // Snap to grid
  var snap = document.getElementById('snapToggle');
  if (snap && snap.checked) {
    nx = Math.round(nx / SNAP_GRID) * SNAP_GRID;
    ny = Math.round(ny / SNAP_GRID) * SNAP_GRID;
  }

  _elements[_dragging.idx].x = Math.max(0, Math.min(nx, _dragging.device.width - 10));
  _elements[_dragging.idx].y = Math.max(0, Math.min(ny, _dragging.device.height - 10));

  renderPreview();
}

function onPreviewMouseUp() {
  _dragging = null;
  document.removeEventListener('mousemove', onPreviewMouseMove);
  document.removeEventListener('mouseup', onPreviewMouseUp);
}

// ─── Event Delegation ─────────────────────────────────────────────
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
      if (t.type === 'number') _elements[idx][prop] = Number(t.value);
      else if (t.type === 'color') {
        _elements[idx][prop] = t.value;
        var cv2 = t.nextElementSibling;
        if (cv2 && cv2.classList.contains('color-val')) cv2.textContent = t.value;
      }
      else _elements[idx][prop] = t.value;
      _dirty = true;
    }
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
  });

  // File inputs
  document.getElementById('fileImagePick').addEventListener('change', handleFilePicked);
  document.getElementById('fileVideoPick').addEventListener('change', handleFilePicked);

  // Preview drag
  document.getElementById('previewContent').addEventListener('mousedown', onPreviewMouseDown);

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

// ─── Toast ────────────────────────────────────────────────────────
function toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + (type || 'success');
  requestAnimationFrame(function () { el.classList.add('show'); });
  setTimeout(function () { el.classList.remove('show'); }, 2500);
}

function escH(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ─── Init ─────────────────────────────────────────────────────────
JCM.initUI = function () {
  renderTplGrid();
  setupEvents();
};
