// ─── UI Index: 页面导航 + 配置渲染 + 事件 ─────────────────────────
// 拆分后的入口文件，导入子模块并暴露 JCM 全局接口
import * as S from '../state.js';
import { getDevice, generateAutoDetectMAML } from '../devices.js';
import { generateMAML, validateMAML, renderEl } from '../maml.js';
import { TEMPLATES } from '../templates/index.js';
import { renderTemplatePreview, PreviewRenderer } from '../live-preview.js';
import { captureState, undo, redo, undoTo, getHistoryLabels, resetHistory } from '../history.js';
import { initCanvas } from '../canvas.js';
import { debounce, fmtSize, addRecentColor } from '../utils.js';

import { toast, toastProgress } from './toast.js';
import { getStep, goStep, moveStepSlider, syncDeviceSelect } from './steps.js';
import { setupCodeEditor, updateCodeEditor, formatXML } from './code-editor.js';
import {
  ElementDefaults, getSelectedDevice, isInCameraZone,
  addElement, removeElement, alignElement, applyQuickSize, moveElementZ,
  distributeElements, matchSize, copyStyle, pasteStyle, hasStyleClipboard,
  getStylePresets, saveStylePreset, applyStylePreset, arrangeGrid, applyConstraint
} from './elements.js';
import {
  COLOR_PRESETS, renderTplGrid, filterTemplates, renderConfig,
  getActiveCategory, setActiveCategory, showUsageModal
} from './config-panel.js';
import { shareTemplate, checkShareURL, showDraftRecovery } from './share.js';
import { openLibraryModal } from './card-library-ui.js';
import { saveToLibrary } from '../card-library.js';
import { openMarketModal } from './template-market.js';
import { showQRModal } from './qr-share.js';
import { t, getLang, setLang, getAvailableLangs, applyI18n } from '../i18n.js';
import { openDesignTools } from './design-tools.js';
import { openSnippetsModal } from './snippets.js';
import { openBatchOpsModal, openSchemeImportModal } from './batch-ops.js';
import { openBindingWizard } from './binding-wizard.js';
import { openCommandPalette, isCommandPaletteOpen } from './command-palette.js';
import { lintMAML, showLintResults, analyzePerformance, showPerfResults, checkAccessibility, showA11yResults } from './linter-tools.js';
import { autoSnapshot, showSnapshotsModal } from './version-snapshots.js';
import { showADBPush, exportGIF, exportPDF } from './export-adb.js';
import { renderLayerPanel, toggleLayerPanel, isLayerPanelVisible, initLayerPanel } from './layer-panel.js';
import { initRuler, toggleRuler, isRulerEnabled } from './ruler.js';
import { pickColor } from './eyedropper.js';
import { isMockMode, toggleMockMode, openExprDebugger, closeExprDebugger, insertVar, evalExpr, insertExprPreset, openPerfDashboard, toggleTemplateCompare, cancelCompare, initDevTools } from './dev-tools.js';

// re-export from export.js, transcode.js, storage.js (loaded as ES modules)
import { exportZip, exportPNG, exportSVG, exportTemplateJSON, importTemplateJSON, importZip, exportRearEyeFormat, importRearEyeFormat, importMAML } from '../export.js';
import { needsTranscode, transcodeToH264, forceTranscodeAsset } from '../transcode.js';
import { saveDraft as _saveDraft, loadDraft as _loadDraft, clearDraft as _clearDraft } from '../storage.js';

// ─── Local State ──────────────────────────────────────────────────
var _zoomLevel = 100;
var _cfgZoomLevel = 100;

// ─── Template MAML Generator ──────────────────────────────────────
function getTemplateMAML(tpl, cfg) {
  if (tpl.rawXml) return tpl.rawXml(cfg);
  if (tpl.gen) return tpl.gen(cfg);
  return generateCustomMAML();
}

function generateCustomMAML() {
  var lines = [];
  lines.push(generateAutoDetectMAML());
  lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + S.cfg.bgColor + '" />');
  S.elements.forEach(function (el) {
    var xml = renderEl(el, S.uploadedFiles, '    ');
    if (xml) lines.push(xml);
  });
  return lines.join('\n');
}

// ─── Select Template ──────────────────────────────────────────────
function selectTemplate(id) {
  var tpl = TEMPLATES.find(function (t) { return t.id === id; });
  if (!tpl) return;

  // Cleanup old blob URLs
  Object.keys(S.uploadedFiles).forEach(function (k) {
    var f = S.uploadedFiles[k];
    if (f && f.dataUrl && f.dataUrl.indexOf('blob:') === 0) try { URL.revokeObjectURL(f.dataUrl); } catch (e) {}
  });

  S.setTpl(tpl);
  // Track recent templates
  try {
    var recent = JSON.parse(localStorage.getItem('jcm-recent') || '[]');
    recent = recent.filter(function(id) { return id !== tpl.id; });
    recent.unshift(tpl.id);
    if (recent.length > 5) recent = recent.slice(0, 5);
    localStorage.setItem('jcm-recent', JSON.stringify(recent));
  } catch(e) {}
  var newCfg = {};
  tpl.config.forEach(function (g) { g.fields.forEach(function (f) { newCfg[f.key] = f.default; }); });
  S.setCfg(newCfg);
  // Load template's editable elements, or default for custom
  if (tpl.elements) {
    S.setElements(tpl.elements(newCfg).map(function (el) { return JSON.parse(JSON.stringify(el)); }));
  } else if (id === 'custom') {
    S.setElements([{ type: 'text', text: 'Hello Card', x: 10, y: 60, size: 28, color: '#ffffff', textAlign: 'left', bold: false, multiLine: false, w: 200 }]);
  } else {
    S.setElements([]);
  }
  S.setSelIdx(-1);
  S.setDirty(true);
  S.setUploadedFiles({});
  resetHistory();

  renderTplGrid();
  goStep(1, stepCallbacks);
}

// ─── Preview ──────────────────────────────────────────────────────
function renderPreview() {
  if (!S.tpl) return;
  var device = getSelectedDevice();
  var showCam = document.getElementById('showCamera').checked;

  document.getElementById('deviceLabel').textContent = device.label;
  document.getElementById('previewCamera').style.width = showCam ? (device.cameraZoneRatio * 100) + '%' : '0';

  // Device switch animation
  var phoneEl = document.querySelector('#page2 .preview-phone');
  if (phoneEl) { phoneEl.classList.remove('device-switching'); void phoneEl.offsetWidth; phoneEl.classList.add('device-switching'); }

  var html = renderTemplatePreview(device, showCam, S.tpl, S.cfg);
  html += new PreviewRenderer(device, showCam).renderElements(S.elements, S.uploadedFiles, S.selIdx);
  if (S.cfg.bgImage) {
    html = '<div style="position:absolute;inset:0;background-image:url(\'' + S.cfg.bgImage.replace(/'/g, "\\'") + '\');background-size:cover;background-position:center;z-index:-1"></div>' + html;
  }
  requestAnimationFrame(function () {
    document.getElementById('previewContent').innerHTML = html;
  });

  var innerXml = getTemplateMAML(S.tpl, S.cfg);
  var maml;
  if (S.tpl.rawXml) {
    maml = innerXml;
  } else {
    maml = generateMAML({
      cardName: S.cfg.cardName || S.tpl.name,
      device: device,
      innerXml: innerXml,
      updater: S.tpl.updater,
      extraElements: S.elements,
      uploadedFiles: S.uploadedFiles,
      bgImage: S.cfg.bgImage || '',
    });
  }
  document.getElementById('codeContent').value = maml;
  updateCodeEditor();
  S.setDirty(false);
}

function renderLivePreview() {
  if (!S.tpl) return;
  var device = getCfgDevice();
  var showCam = getCfgShowCamera();

  var labelEl = document.getElementById('cfgDeviceLabel');
  if (labelEl) labelEl.textContent = device.label;
  var camEl = document.getElementById('cfgPreviewCamera');
  if (camEl) camEl.style.width = showCam ? (device.cameraZoneRatio * 100) + '%' : '0';

  // Device switch animation
  var phoneEl = document.querySelector('#page1 .config-preview-phone');
  if (phoneEl) { phoneEl.classList.remove('device-switching'); void phoneEl.offsetWidth; phoneEl.classList.add('device-switching'); }

  var html = renderTemplatePreview(device, showCam, S.tpl, S.cfg);
  html += new PreviewRenderer(device, showCam).renderElements(S.elements, S.uploadedFiles, S.selIdx);
  if (S.cfg.bgImage) {
    html = '<div style="position:absolute;inset:0;background-image:url(\'' + S.cfg.bgImage.replace(/'/g, "\\'") + '\');background-size:cover;background-position:center;z-index:-1"></div>' + html;
  }
  var contentEl = document.getElementById('cfgPreviewContent');
  if (contentEl) {
    requestAnimationFrame(function () { contentEl.innerHTML = html; });
  }
}

function getCfgDevice() {
  var sel = document.getElementById('cfgDeviceSelect');
  return sel ? getDevice(sel.value) : getDevice('p2');
}

function getCfgShowCamera() {
  var cb = document.getElementById('cfgShowCamera');
  return cb ? cb.checked : true;
}

// ─── Step Callbacks (for sub-modules that need to trigger re-renders) ──
var stepCallbacks = {
  renderConfig: function () { renderConfig(getTemplateMAML); },
  renderPreview: renderPreview,
  renderLivePreview: renderLivePreview,
  renderTplGrid: renderTplGrid,
  goStep: function (n) { goStep(n, stepCallbacks); },
};

// ─── Export Handlers ──────────────────────────────────────────────
function handleExport() {
  if (!S.tpl) return toast('请先选择模板', 'error');
  var device = getSelectedDevice();
  var innerXml = getTemplateMAML(S.tpl, S.cfg);
  var maml = S.tpl.rawXml ? innerXml : generateMAML({
    cardName: S.cfg.cardName || S.tpl.name, device: device, innerXml: innerXml,
    updater: S.tpl.updater, extraElements: S.elements, uploadedFiles: S.uploadedFiles, bgImage: S.cfg.bgImage || '',
  });
  var validation = validateMAML(maml);
  if (!validation.valid) return toast('XML 校验失败: ' + validation.errors[0], 'error');

  autoSnapshot('导出 ZIP');
  var exportBtn = document.querySelector('.btn-export');
  if (exportBtn) exportBtn.classList.add('btn-export-loading');
  var p = toastProgress('正在打包 ZIP...');
  exportZip(maml, S.cfg.cardName || 'card', S.elements, S.uploadedFiles, S.tpl.id === 'custom', S.cfg.bgImage || '')
    .then(function () {
      p.close('✅ ZIP 已导出', 'success');
      if (exportBtn) { exportBtn.classList.remove('btn-export-loading'); exportBtn.classList.remove('btn-export-success'); void exportBtn.offsetWidth; exportBtn.classList.add('btn-export-success'); setTimeout(function(){ exportBtn.classList.remove('btn-export-success'); }, 800); }
    })
    .catch(function (e) {
      p.close('导出失败: ' + e.message, 'error');
      if (exportBtn) exportBtn.classList.remove('btn-export-loading');
    });
}

function handleExportPNG() {
  var p = toastProgress('正在导出 PNG...');
  exportPNG(S.cfg.cardName || 'card', S.cfg, S.elements, S.tpl, S.uploadedFiles, getSelectedDevice)
    .then(function () { p.close('✅ PNG 已导出', 'success'); })
    .catch(function (e) { p.close('导出失败: ' + e.message, 'error'); });
}

function handleExportSVG() {
  exportSVG(S.cfg.cardName || 'card', S.cfg, S.elements, S.uploadedFiles, getSelectedDevice)
    .then(function () { toast('✅ SVG 已导出', 'success'); })
    .catch(function (e) { toast('导出失败: ' + e.message, 'error'); });
}

function handleBatchExport() {
  if (!S.tpl) return toast('请先选择模板', 'error');
  var deviceKeys = ['p2', 'q200', 'q100', 'ultra'];
  var errors = [];
  toast('📦 正在批量导出 4 个机型...', 'info');
  var promises = deviceKeys.map(function (dk) {
    var device = getDevice(dk);
    var innerXml = getTemplateMAML(S.tpl, S.cfg);
    var maml = S.tpl.rawXml ? innerXml : generateMAML({
      cardName: (S.cfg.cardName || S.tpl.name) + '_' + dk, device: device, innerXml: innerXml,
      updater: S.tpl.updater, extraElements: S.elements, uploadedFiles: S.uploadedFiles, bgImage: S.cfg.bgImage || '',
    });
    var validation = validateMAML(maml);
    if (!validation.valid) { errors.push(device.label + ': ' + validation.errors[0]); return Promise.resolve(); }
    return exportZip(maml, (S.cfg.cardName || 'card') + '_' + dk, S.elements, S.uploadedFiles, S.tpl.id === 'custom', S.cfg.bgImage || '')
      .catch(function (e) { errors.push(device.label + ': ' + e.message); });
  });
  Promise.all(promises).then(function () {
    if (errors.length > 0) toast('部分导出失败: ' + errors.join(', '), 'error');
    else toast('✅ 全部 4 个机型已导出', 'success');
  }).catch(function (e) { toast('批量导出异常: ' + e.message, 'error'); });
}

function handleUniversalExport() {
  if (!S.tpl) return toast('请先选择模板', 'error');
  var baseDevice = getDevice('p2');
  var innerXml = getTemplateMAML(S.tpl, S.cfg);
  var maml = S.tpl.rawXml ? innerXml : generateMAML({
    cardName: S.cfg.cardName || S.tpl.name, device: baseDevice, innerXml: innerXml,
    updater: S.tpl.updater, extraElements: S.elements, uploadedFiles: S.uploadedFiles, bgImage: S.cfg.bgImage || '',
  });
  var validation = validateMAML(maml);
  if (!validation.valid) return toast('XML 校验失败: ' + validation.errors[0], 'error');
  exportZip(maml, (S.cfg.cardName || 'card') + '_all', S.elements, S.uploadedFiles, S.tpl.id === 'custom', S.cfg.bgImage || '')
    .then(function () { toast('✅ 通用卡片已导出（适配所有机型）', 'success'); })
    .catch(function (e) { toast('导出失败: ' + e.message, 'error'); });
}

function handleImportZip() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.zip';
  input.onchange = function () {
    var file = input.files[0]; if (!file) return;
    Object.keys(S.uploadedFiles).forEach(function (k) {
      var f = S.uploadedFiles[k];
      if (f && f.dataUrl && f.dataUrl.indexOf('blob:') === 0) try { URL.revokeObjectURL(f.dataUrl); } catch (e) {}
    });
    importZip(file).then(function (data) {
      S.setTpl(TEMPLATES.find(function (t) { return t.id === 'custom'; }));
      var newCfg = { cardName: data.cardName, bgColor: data.bgColor };
      if (data.bgImage) newCfg.bgImage = data.bgImage;
      S.setCfg(newCfg);
      S.setElements(data.elements.map(function (el) {
        if (el.type === 'image' && el.fileName && data.files[el.fileName] && data.files[el.fileName].mimeType === 'image/gif') {
          data.files[el.fileName].mimeType = 'video/gif';
          el.type = 'video';
        }
        return el;
      }));
      S.setUploadedFiles(data.files);
      S.setSelIdx(-1); S.setDirty(true);
      resetHistory();
      renderTplGrid(); goStep(1, stepCallbacks);
      toast('✅ ZIP 已导入', 'success');
    }).catch(function (e) { toast('导入失败: ' + e.message, 'error'); });
  };
  input.click();
}

// ─── MAML XML 导入 ─────────────────────────────────────────
function importMAMLFromXml(xmlString) {
  var data = importMAML(xmlString);
  S.setTpl(TEMPLATES.find(function (t) { return t.id === 'custom'; }));
  S.setCfg({ cardName: data.cardName, bgColor: data.bgColor });
  S.setElements(data.elements);
  S.setUploadedFiles({});
  S.setSelIdx(-1);
  S.setDirty(true);
  resetHistory();
  renderTplGrid();
  goStep(1, stepCallbacks);
  toast('✅ MAML 已导入 (' + data.elements.length + ' 个元素)', 'success');
}

// ─── File Handling ────────────────────────────────────────────────
function handleFilePicked(e) {
  var input = e.target;
  var file = input.files && input.files[0];
  if (!file) return;

  var type = S.pendingAdd;
  var replaceIdx = S.pendingReplace;
  S.setPendingAdd(null);
  S.setPendingReplace(-1);

  var isGif = file.type === 'image/gif';
  if (isGif) type = 'video';
  var isVideo = file.type.indexOf('video/') === 0 || isGif;
  var needTranscode = isVideo && needsTranscode(file);

  function doStore(workingFile) {
    var finalIsVideo = workingFile.type.indexOf('video/') === 0 || isGif;
    var ext = workingFile.name.split('.').pop() || (type === 'image' ? 'png' : 'mp4');
    var safeName = 'media_' + Date.now() + '.' + ext;

    if (finalIsVideo || type === 'video') {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var buf = ev.target.result;
        var blobUrl = URL.createObjectURL(new Blob([buf], { type: workingFile.type }));
        S.uploadedFiles[safeName] = { data: buf, mimeType: isGif ? 'video/gif' : workingFile.type, dataUrl: blobUrl, originalName: workingFile.name };
        captureState();
        if (replaceIdx >= 0 && replaceIdx < S.elements.length) {
          var oldName = S.elements[replaceIdx].fileName;
          if (oldName && S.uploadedFiles[oldName] && S.uploadedFiles[oldName].dataUrl && S.uploadedFiles[oldName].dataUrl.indexOf('blob:') === 0) try { URL.revokeObjectURL(S.uploadedFiles[oldName].dataUrl); } catch(e) {}
          S.elements[replaceIdx].fileName = safeName; S.elements[replaceIdx].src = safeName;
        } else {
          S.elements.push({ type: 'video', fileName: safeName, src: safeName, x: 10, y: 60, w: 240, h: 135 });
          S.setSelIdx(S.elements.length - 1);
        }
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast(workingFile.name + ' 已添加', 'success');
      };
      reader.readAsArrayBuffer(workingFile);
    } else {
      var reader2 = new FileReader();
      reader2.onload = function (ev) {
        var dataUrl = ev.target.result;
        var base64 = dataUrl.split(',')[1];
        var bin = atob(base64);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        S.uploadedFiles[safeName] = { data: arr.buffer, mimeType: workingFile.type, dataUrl: dataUrl, originalName: workingFile.name };
        captureState();
        if (replaceIdx >= 0 && replaceIdx < S.elements.length) {
          var oldName = S.elements[replaceIdx].fileName;
          if (oldName && S.uploadedFiles[oldName] && S.uploadedFiles[oldName].dataUrl && S.uploadedFiles[oldName].dataUrl.indexOf('blob:') === 0) try { URL.revokeObjectURL(S.uploadedFiles[oldName].dataUrl); } catch(e) {}
          S.elements[replaceIdx].fileName = safeName; S.elements[replaceIdx].src = safeName;
        } else {
          S.elements.push({ type: type, fileName: safeName, src: safeName, x: 10, y: 60, w: 200, h: 200 });
          S.setSelIdx(S.elements.length - 1);
        }
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast(workingFile.name + ' 已添加', 'success');
      };
      reader2.readAsDataURL(workingFile);
    }
  }

  if (needTranscode) {
    var tp = toastProgress('正在转码为 MP4 (H.264)...');
    transcodeToH264(file).then(function (transcodedFile) {
      tp.close('✅ 转码完成', 'success'); doStore(transcodedFile);
    }).catch(function (err) {
      tp.close('⚠️ 转码失败，使用原始文件', 'warning'); doStore(file);
    });
  } else {
    doStore(file);
  }
}

// ─── Zoom ─────────────────────────────────────────────────────────
function applyZoom() {
  var phone = document.querySelector('#page2 .preview-phone');
  if (phone) phone.style.transform = 'perspective(800px) rotateY(-2deg) rotateX(1deg) scale(' + (_zoomLevel / 100) + ')';
  var label = document.getElementById('zoomLabel');
  if (label) label.textContent = _zoomLevel + '%';
}

function applyCfgZoom() {
  var phone = document.querySelector('.config-preview-phone');
  if (phone) phone.style.transform = 'perspective(800px) rotateY(-1.5deg) rotateX(1deg) scale(' + (_cfgZoomLevel / 100) + ')';
  var label = document.getElementById('cfgZoomLabel');
  if (label) label.textContent = _cfgZoomLevel + '%';
}

// ─── Auto-save ────────────────────────────────────────────────────
var _autoSaveTimer = null;
function autoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(function () {
    var el = document.getElementById('autosaveIndicator');
    _saveDraft(S.tpl ? S.tpl.id : null, S.cfg, S.elements, S.uploadedFiles)
      .then(function () { if (el) { el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 1500); } })
      .catch(function () { saveDraftLocal(); });
  }, 2000);
}

function saveDraftLocal() {
  try {
    localStorage.setItem('jcm-draft', JSON.stringify({ tplId: S.tpl ? S.tpl.id : null, cfg: S.cfg, elements: S.elements, timestamp: Date.now() }));
    var el = document.getElementById('autosaveIndicator');
    if (el) { el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 1500); }
  } catch (e) {}
}

// ─── Build APK ────────────────────────────────────────────────────
// Simple XOR obfuscation (not real crypto, but prevents casual localStorage snooping)
var _TOKEN_KEY = navigator.userAgent.length + '_' + screen.width + 'x' + screen.height;
function _encodeToken(t) {
  try {
    var encoded = '';
    for (var i = 0; i < t.length; i++) {
      encoded += String.fromCharCode(t.charCodeAt(i) ^ _TOKEN_KEY.charCodeAt(i % _TOKEN_KEY.length));
    }
    return btoa(encoded);
  } catch (e) { return ''; }
}
function _decodeToken(t) {
  try {
    var decoded = atob(t);
    var result = '';
    for (var i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ _TOKEN_KEY.charCodeAt(i % _TOKEN_KEY.length));
    }
    return result;
  } catch (e) { return ''; }
}

function triggerBuild() {
  var raw = localStorage.getItem('jcm-gh-token');
  var token = raw ? _decodeToken(raw) : '';
  if (!token) {
    token = prompt('⚠️ Token 将以 Base64 明文存入浏览器（非加密）。\n仅用于个人设备，公共电脑请勿保存。\n\n输入 GitHub Personal Access Token（需 repo 权限）：');
    if (!token) return;
    localStorage.setItem('jcm-gh-token', _encodeToken(token));
  }
  toast('🚀 正在触发 APK 构建...', 'info');
  fetch('https://api.github.com/repos/guocheng1378/rear-eye-card-maker/actions/workflows/build.yml/dispatches', {
    method: 'POST',
    headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main' }),
  }).then(function (res) {
    if (res.status === 204) toast('✅ APK 构建已触发！', 'success');
    else if (res.status === 401) { localStorage.removeItem('jcm-gh-token'); toast('❌ Token 无效，请重新输入', 'error'); }
    else if (res.status === 403) toast('❌ 权限不足，Token 需要 repo 和 actions 权限', 'error');
    else if (res.status === 429) toast('❌ 请求过于频繁，请稍后重试', 'error');
    else toast('❌ 触发失败: HTTP ' + res.status, 'error');
  }).catch(function (e) { toast('❌ 网络错误: ' + e.message, 'error'); });
}

// ─── Event Setup ──────────────────────────────────────────────────
var _autoPreview = debounce(function () {
  if (isLayerPanelVisible()) renderLayerPanel();
  S.setDirty(true);
  if (getStep() === 1) renderLivePreview();
  if (getStep() === 2) renderPreview();
  // Pulse the generate preview button when dirty
  var genBtn = document.querySelector('.preview-actions .btn-secondary');
  if (genBtn && getStep() === 2) {
    genBtn.style.boxShadow = '0 0 0 2px var(--accent)';
    setTimeout(function() { genBtn.style.boxShadow = ''; }, 1500);
  }
}, 300);

function setupEvents() {
  // Template grid click + drag reorder
  document.getElementById('tplGrid').addEventListener('click', function (e) {
    // Usage info button
    var usageBtn = e.target.closest('[data-usage]');
    if (usageBtn) {
      e.stopPropagation();
      showUsageModal(usageBtn.dataset.usage);
      return;
    }
    var card = e.target.closest('.tpl-card');
    if (card) selectTemplate(card.dataset.tpl);
  });

  // Template card drag reorder
  var _tplDragIdx = -1;
  document.getElementById('tplGrid').addEventListener('dragstart', function (e) {
    var card = e.target.closest('.tpl-card');
    if (!card) return;
    _tplDragIdx = Array.from(card.parentElement.children).indexOf(card);
    card.classList.add('dragging-el');
    e.dataTransfer.effectAllowed = 'move';
  });
  document.getElementById('tplGrid').addEventListener('dragover', function (e) {
    e.preventDefault();
    var card = e.target.closest('.tpl-card');
    if (!card) return;
    e.dataTransfer.dropEffect = 'move';
  });
  document.getElementById('tplGrid').addEventListener('drop', function (e) {
    e.preventDefault();
    var targetCard = e.target.closest('.tpl-card');
    if (!targetCard || _tplDragIdx < 0) return;
    var targetIdx = Array.from(targetCard.parentElement.children).indexOf(targetCard);
    if (_tplDragIdx === targetIdx) return;
    // Save order
    var cards = Array.from(document.querySelectorAll('.tpl-card'));
    var order = cards.map(function (c) { return c.dataset.tpl; });
    var moved = order.splice(_tplDragIdx, 1)[0];
    order.splice(targetIdx, 0, moved);
    try { localStorage.setItem('jcm-tpl-order', JSON.stringify(order)); } catch(ex) {}
    renderTplGrid();
    _tplDragIdx = -1;
  });
  document.getElementById('tplGrid').addEventListener('dragend', function () {
    document.querySelectorAll('.tpl-card').forEach(function (c) { c.classList.remove('dragging-el'); });
    _tplDragIdx = -1;
  });

  // Category tabs
  var catContainer = document.getElementById('tplCategories');
  if (catContainer) catContainer.addEventListener('click', function (e) {
    var btn = e.target.closest('.tpl-cat');
    if (!btn) return;
    setActiveCategory(btn.dataset.cat);
    document.querySelectorAll('.tpl-cat').forEach(function (b) { b.classList.toggle('active', b === btn); });
    filterTemplates('');
  });

  // Template search input
  var searchInput = document.getElementById('tplSearchInput');
  if (searchInput) searchInput.addEventListener('input', function () {
    filterTemplates(this.value);
  });

  // Config content events (delegated)
  var _cfgChangeTimer = null;
  document.getElementById('cfgContent').addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.cfg) {
      if (!_cfgChangeTimer) captureState('修改配置');
      clearTimeout(_cfgChangeTimer);
      _cfgChangeTimer = setTimeout(function () { _cfgChangeTimer = null; }, 1000);
      var key = t.dataset.cfg;
      if (t.type === 'range') { S.cfg[key] = Number(t.value); t.previousElementSibling.querySelector('strong').textContent = t.value; }
      else if (t.type === 'color') { S.cfg[key] = t.value; var cv = t.nextElementSibling; if (cv && cv.classList.contains('color-val')) cv.textContent = t.value; }
      else S.cfg[key] = t.value;
      S.setDirty(true);
    }
    if (t.dataset.prop) {
      if (!_cfgChangeTimer) captureState('修改元素');
      clearTimeout(_cfgChangeTimer);
      _cfgChangeTimer = setTimeout(function () { _cfgChangeTimer = null; }, 1000);
      var idx = Number(t.dataset.idx), prop = t.dataset.prop;
      if (t.type === 'number') S.elements[idx][prop] = Number(t.value);
      else if (t.type === 'range') {
        var rawVal = Number(t.value);
        // lineHeight stored as float (range * 10)
        if (prop === 'lineHeight') { rawVal = rawVal / 10; S.elements[idx][prop] = rawVal; }
        // speed stored as float (range * 10)
        else if (prop === 'speed') { rawVal = rawVal / 10; S.elements[idx][prop] = rawVal; }
        else { S.elements[idx][prop] = rawVal; }
        // Update adjacent value display span
        var valSpan = t.parentElement.querySelector('span') || t.nextElementSibling;
        if (valSpan && valSpan.tagName === 'SPAN') {
          if (prop === 'rotation') valSpan.textContent = rawVal + '°';
          else if (prop === 'opacity') valSpan.textContent = rawVal + '%';
          else if (prop === 'lineHeight') valSpan.textContent = rawVal.toFixed(1);
          else if (prop === 'speed') valSpan.textContent = rawVal.toFixed(1) + 'x';
          else if (prop === 'blur') valSpan.textContent = rawVal + 'px';
          else valSpan.textContent = rawVal;
        }
      }
      else if (t.type === 'color') { S.elements[idx][prop] = t.value; var cv2 = t.nextElementSibling; if (cv2 && cv2.classList.contains('color-val')) cv2.textContent = t.value; }
      else S.elements[idx][prop] = t.value;
      S.setDirty(true);
    }
    _autoPreview(); autoSave();
  });

  document.getElementById('cfgContent').addEventListener('change', function (e) {
    var t = e.target;
    var changed = false;
    if (t.dataset.cfg && t.tagName === 'SELECT') { S.cfg[t.dataset.cfg] = t.value; S.setDirty(true); changed = true; }
    if (t.dataset.prop && t.tagName === 'SELECT') {
      var idx = Number(t.dataset.idx), val = t.value;
      if (val === 'true') val = true; else if (val === 'false') val = false;
      S.elements[idx][t.dataset.prop] = val; S.setDirty(true); changed = true;
      renderConfig(getTemplateMAML);
    }
    if (t.dataset.prop && t.type === 'checkbox' && t.dataset.idx) {
      S.elements[Number(t.dataset.idx)][t.dataset.prop] = t.checked; S.setDirty(true); changed = true;
      renderConfig(getTemplateMAML);
    }
    if (changed) { _autoPreview(); autoSave(); }
  });

  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var item = e.target.closest('.el-item');
    if (item && !e.target.closest('.el-item-del') && !e.target.closest('.el-z-btn') && !e.target.closest('.el-lock-btn')) {
      S.setSelIdx(Number(item.dataset.sel));
      renderConfig(getTemplateMAML);
      return;
    }
    var del = e.target.closest('.el-item-del');
    if (del) { e.stopPropagation(); removeElement(Number(del.dataset.del)); renderConfig(getTemplateMAML); return; }
    var zBtn = e.target.closest('.el-z-btn');
    if (zBtn) { e.stopPropagation(); moveElementZ(Number(zBtn.dataset.zi), zBtn.dataset.z); renderConfig(getTemplateMAML); return; }
    var visBtn = e.target.closest('[data-vis]');
    if (visBtn) {
      e.stopPropagation();
      var vi = Number(visBtn.dataset.vis);
      if (vi >= 0 && vi < S.elements.length) {
        S.elements[vi].visible = S.elements[vi].visible === false ? true : false;
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast(S.elements[vi].visible === false ? '🙈 已隐藏' : '👁️ 已显示', 'info');
      }
      return;
    }
    var lockBtn = e.target.closest('[data-lock]');
    if (lockBtn) {
      e.stopPropagation();
      var li = Number(lockBtn.dataset.lock);
      if (li >= 0 && li < S.elements.length) {
        S.elements[li].locked = !S.elements[li].locked;
        renderConfig(getTemplateMAML);
        toast(S.elements[li].locked ? '🔒 已锁定' : '🔓 已解锁', 'info');
      }
      return;
    }

    // Position nudge (+/-) buttons
    var nudgeBtn = e.target.closest('[data-nudge-prop]');
    if (nudgeBtn) {
      e.stopPropagation();
      var ni = Number(nudgeBtn.dataset.nudgeIdx);
      var np = nudgeBtn.dataset.nudgeProp;
      var nd = Number(nudgeBtn.dataset.nudgeDelta);
      if (ni >= 0 && ni < S.elements.length) {
        captureState('微调 ' + np.toUpperCase());
        S.elements[ni][np] = Math.max(0, (S.elements[ni][np] || 0) + nd);
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        _autoPreview();
      }
      return;
    }

    // Quick rotation buttons
    var rotBtn = e.target.closest('[data-set-rotation]');
    if (rotBtn) {
      e.stopPropagation();
      var ri = Number(rotBtn.dataset.idx);
      var rv = Number(rotBtn.dataset.setRotation);
      if (ri >= 0 && ri < S.elements.length) {
        captureState('设置旋转 ' + rv + '°');
        S.elements[ri].rotation = rv;
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        _autoPreview();
      }
      return;
    }

    // Constraint layout buttons
    var conBtn = e.target.closest('[data-constraint]');
    if (conBtn) {
      e.stopPropagation();
      var ci = Number(conBtn.dataset.ci);
      var cv = conBtn.dataset.constraint;
      if (ci >= 0 && ci < S.elements.length) {
        captureState('设置约束');
        S.elements[ci].constraint = cv;
        if (cv) {
          applyConstraint(S.elements[ci], getSelectedDevice());
        }
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        _autoPreview();
        toast(cv ? '🎯 约束已设置: ' + cv : '🔓 已取消约束', 'info');
      }
      return;
    }

    // Reset to defaults
    var resetBtn = e.target.closest('[data-reset-defaults]');
    if (resetBtn) {
      e.stopPropagation();
      if (confirm('确定恢复所有参数为默认值？')) {
        var newCfg = {};
        S.tpl.config.forEach(function (g) { g.fields.forEach(function (f) { newCfg[f.key] = f.default; }); });
        S.setCfg(newCfg);
        S.setDirty(true);
        captureState('恢复默认');
        renderConfig(getTemplateMAML);
        _autoPreview();
        toast('✅ 已恢复默认设置', 'success');
      }
      return;
    }
    var addBtn = e.target.closest('[data-add]');
    if (addBtn) { if (addElement(addBtn.dataset.add)) renderConfig(getTemplateMAML); return; }
    var pickBtn = e.target.closest('[data-pick]');
    if (pickBtn) {
      S.setPendingAdd(pickBtn.dataset.pick); S.setPendingReplace(-1);
      document.getElementById(pickBtn.dataset.pick === 'image' ? 'fileImagePick' : 'fileVideoPick').click();
      return;
    }
    var actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      var a = actionBtn.dataset.action;
      if (a === 'importZip') handleImportZip();
      else if (a === 'importMAML') { /* handled by separate listener below */ }
      else if (a === 'shareTemplate') shareTemplate();
      else if (a === 'shareQR') JCM.showQR();
      else if (a === 'exportTemplate') { exportTemplateJSON(S.tpl ? S.tpl.id : 'custom', S.cfg, S.elements); toast('✅ 配置已导出', 'success'); }
      return;
    }
    var alignBtn = e.target.closest('[data-align]');
    if (alignBtn) { alignElement(Number(alignBtn.dataset.ai), alignBtn.dataset.align); renderConfig(getTemplateMAML); return; }
    var sizeBtn = e.target.closest('[data-qsize]');
    if (sizeBtn) { applyQuickSize(Number(sizeBtn.dataset.qi), sizeBtn.dataset.qsize); renderConfig(getTemplateMAML); return; }
    // Text alignment buttons (data-val on data-prop buttons)
    var valBtn = e.target.closest('[data-val][data-prop]');
    if (valBtn) {
      e.stopPropagation();
      captureState('修改对齐');
      var vi = Number(valBtn.dataset.idx);
      var vp = valBtn.dataset.prop;
      var vv = valBtn.dataset.val;
      if (vi >= 0 && vi < S.elements.length) {
        S.elements[vi][vp] = vv;
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        _autoPreview();
      }
      return;
    }
    // Clear gradient (fillColor2)
    var clearGrad = e.target.closest('[data-clear-fill2]');
    if (clearGrad) {
      e.stopPropagation();
      captureState('清除渐变');
      var ci = Number(clearGrad.dataset.idx);
      if (ci >= 0 && ci < S.elements.length) {
        S.elements[ci].fillColor2 = '';
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        _autoPreview();
      }
      return;
    }
    // MAML variable insert
    var varBtn = e.target.closest('[data-var-insert]');
    if (varBtn) {
      e.stopPropagation();
      var vi2 = Number(varBtn.dataset.varIdx);
      if (vi2 >= 0 && vi2 < S.elements.length && S.elements[vi2].type === 'text') {
        captureState('插入变量');
        S.elements[vi2].text = (S.elements[vi2].text || '') + varBtn.dataset.varInsert;
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast('🔗 已插入 ' + varBtn.dataset.varInsert, 'info');
      }
      return;
    }
    // Save style preset
    var saveStyleBtn = e.target.closest('[data-save-style]');
    if (saveStyleBtn) {
      e.stopPropagation();
      var ssi = Number(saveStyleBtn.dataset.saveStyle);
      var presetName = prompt('预设名称:');
      if (presetName) saveStylePreset(presetName, ssi);
      return;
    }
    // Apply style preset
    var applyStyleBtn = e.target.closest('[data-apply-styles]');
    if (applyStyleBtn) {
      e.stopPropagation();
      var presets = getStylePresets();
      if (presets.length === 0) { toast('暂无保存的样式预设', 'info'); return; }
      // Show preset picker
      var presetHtml = '<div style="display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto">';
      presets.forEach(function (p, pi) {
        var colorDots = '';
        if (p.color) colorDots += '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + p.color + ';margin-left:4px"></span>';
        if (p.fillColor2) colorDots += '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + p.fillColor2 + ';margin-left:2px"></span>';
        presetHtml += '<div class="el-btn" data-apply-preset="' + pi + '" style="width:100%;justify-content:flex-start;font-size:11px;padding:8px 12px">' +
          '<span style="flex:1">' + esc(p.name) + '</span>' +
          '<span style="font-size:9px;color:var(--text3)">' + p.type + '</span>' + colorDots + '</div>';
      });
      presetHtml += '</div>';
      // Render in a temp modal-ish way using the design tools area
      var presetContainer = document.getElementById('presetPicker');
      if (presetContainer) presetContainer.remove();
      var div = document.createElement('div');
      div.id = 'presetPicker';
      div.style.cssText = 'margin-top:8px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px';
      div.innerHTML = '<div style="font-size:11px;font-weight:600;margin-bottom:6px">选择预设样式</div>' + presetHtml;
      applyStyleBtn.parentElement.appendChild(div);
      return;
    }
    // Apply specific preset
    var applyPresetBtn = e.target.closest('[data-apply-preset]');
    if (applyPresetBtn) {
      e.stopPropagation();
      var presets2 = getStylePresets();
      var pi2 = Number(applyPresetBtn.dataset.applyPreset);
      if (presets2[pi2] && S.selIdx >= 0) {
        applyStylePreset(S.selIdx, presets2[pi2]);
        renderConfig(getTemplateMAML);
        _autoPreview();
        var picker = document.getElementById('presetPicker');
        if (picker) picker.remove();
      }
      return;
    }
    // Distribute elements (with optional gap)
    var distBtn = e.target.closest('[data-distribute]');
    if (distBtn) {
      e.stopPropagation();
      var distDir = distBtn.dataset.distribute;
      if (distBtn.dataset.gap !== undefined) {
        distributeElements(distDir, Number(distBtn.dataset.gap));
      } else {
        distributeElements(distDir);
      }
      renderConfig(getTemplateMAML);
      _autoPreview();
      return;
    }
    // Grid arrange
    var gridBtn = e.target.closest('[data-grid-arrange]');
    if (gridBtn) {
      e.stopPropagation();
      var gCols = Number(gridBtn.dataset.gridCols) || 2;
      var gGapH = Number(gridBtn.dataset.gridGapH) || 10;
      var gGapV = Number(gridBtn.dataset.gridGapV) || 10;
      arrangeGrid(gCols, gGapH, gGapV);
      renderConfig(getTemplateMAML);
      _autoPreview();
      return;
    }
    // Eyedropper
    var eyeBtn = e.target.closest('[data-eyedropper]');
    if (eyeBtn) {
      e.stopPropagation();
      var eyeIdx = Number(eyeBtn.dataset.eyedropperIdx);
      var eyeProp = eyeBtn.dataset.eyedropper;
      pickColor(function (color) {
        if (eyeIdx >= 0 && eyeIdx < S.elements.length) {
          captureState('取色');
          S.elements[eyeIdx][eyeProp] = color;
          S.setDirty(true);
          renderConfig(getTemplateMAML);
          _autoPreview();
          toast('🎨 已取色: ' + color, 'success');
        } else if (eyeProp.startsWith('cfg:')) {
          var cfgKey = eyeProp.replace('cfg:', '');
          S.cfg[cfgKey] = color;
          S.setDirty(true);
          _autoPreview();
          toast('🎨 已取色: ' + color, 'success');
        }
      });
      return;
    }
    // Match size
    var matchBtn = e.target.closest('[data-match-size]');
    if (matchBtn) {
      e.stopPropagation();
      matchSize(matchBtn.dataset.matchSize);
      renderConfig(getTemplateMAML);
      _autoPreview();
      return;
    }
    // Copy style
    var copyStyleBtn = e.target.closest('[data-copy-style]');
    if (copyStyleBtn) {
      e.stopPropagation();
      copyStyle(Number(copyStyleBtn.dataset.copyStyle));
      return;
    }
    // Paste style
    var pasteStyleBtn = e.target.closest('[data-paste-style]');
    if (pasteStyleBtn) {
      e.stopPropagation();
      pasteStyle(Number(pasteStyleBtn.dataset.pasteStyle));
      renderConfig(getTemplateMAML);
      _autoPreview();
      return;
    }
    var swatch = e.target.closest('.color-swatch');
    if (swatch) { captureState(); S.elements[Number(swatch.dataset.cidx)][swatch.dataset.cprop] = swatch.dataset.color; S.setDirty(true); renderConfig(getTemplateMAML); return; }
    var colorDot = e.target.closest('.color-dot');
    if (colorDot) { S.cfg[colorDot.dataset.cfgColor] = colorDot.dataset.color; addRecentColor(colorDot.dataset.color); S.setDirty(true); _autoPreview(); return; }
    var favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      var isFav = toggleFavorite(favBtn.dataset.fav);
      favBtn.textContent = isFav ? '⭐' : '☆';
      favBtn.classList.toggle('active', isFav);
      return;
    }
    // Design tools: palette swatch
    var palSwatch = e.target.closest('.palette-swatch[data-apply-to]');
    if (palSwatch) {
      var pi = Number(palSwatch.dataset.applyTo);
      if (pi >= 0 && pi < S.elements.length) {
        captureState('应用色彩搭配');
        S.elements[pi].color = palSwatch.dataset.color;
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast('🎨 已应用 ' + palSwatch.dataset.color, 'success');
      }
      return;
    }
    // Design tools: font apply
    var fontItem = e.target.closest('[data-font-apply][data-font-idx]');
    if (fontItem) {
      var fi = Number(fontItem.dataset.fontIdx);
      if (fi >= 0 && fi < S.elements.length && S.elements[fi].type === 'text') {
        captureState('更改字体');
        S.elements[fi].fontFamily = fontItem.dataset.fontApply;
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast('🔤 字体已应用', 'success');
      }
      return;
    }
    // Design tools: gradient preset
    var gradItem = e.target.closest('.grad-preset[data-gp-idx]');
    if (gradItem) {
      var gi = Number(gradItem.dataset.gpIdx);
      if (gi >= 0 && gi < S.elements.length) {
        captureState('应用渐变');
        S.elements[gi].color = gradItem.dataset.gpC1;
        if (gradItem.dataset.gpType === 'text') {
          S.elements[gi].textGradient = 'custom';
          S.elements[gi].gradientColor2 = gradItem.dataset.gpC2;
        } else {
          S.elements[gi].fillColor2 = gradItem.dataset.gpC2;
        }
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast('🌈 渐变已应用', 'success');
      }
      return;
    }
  });

  // Section collapse toggle
  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle-section]');
    if (!toggle) return;
    var key = toggle.dataset.toggleSection;
    var section = toggle.parentElement;
    var isCollapsed = section.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed', isCollapsed);
    var state = {};
    try { state = JSON.parse(localStorage.getItem('jcm-collapsed') || '{}'); } catch(e2) {}
    state[key] = isCollapsed;
    try { localStorage.setItem('jcm-collapsed', JSON.stringify(state)); } catch(e2) {}
  });

  // Element toolbar "⋯ 更多" toggle
  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var moreToggle = e.target.closest('[data-elmore-toggle]');
    if (!moreToggle) return;
    e.stopPropagation();
    var menu = moreToggle.nextElementSibling;
    if (menu) menu.style.display = menu.style.display === 'none' ? '' : 'none';
  });
  // Close el-more on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-elmore-toggle]') && !e.target.closest('[data-elmore-menu]')) {
      document.querySelectorAll('[data-elmore-menu]').forEach(function (m) { m.style.display = 'none'; });
    }
  });

  // Duplicate element button
  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var dupBtn = e.target.closest('[data-duplicate]');
    if (!dupBtn) return;
    var idx = Number(dupBtn.dataset.duplicate);
    if (idx >= 0 && idx < S.elements.length) {
      captureState('复制元素');
      S.setClipboard(JSON.parse(JSON.stringify(S.elements[idx])));
      var clone = JSON.parse(JSON.stringify(S.elements[idx]));
      clone.x += 10; clone.y += 10;
      S.elements.push(clone);
      S.setSelIdx(S.elements.length - 1);
      S.setDirty(true);
      renderConfig(getTemplateMAML);
      toast('📋 已复制元素', 'success');
    }
  });

  // Paste element button
  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var pasteBtn = e.target.closest('[data-paste-el]');
    if (!pasteBtn) return;
    if (S.clipboard) {
      captureState('粘贴元素');
      var paste = JSON.parse(JSON.stringify(S.clipboard));
      paste.x += 10; paste.y += 10;
      S.elements.push(paste);
      S.setSelIdx(S.elements.length - 1);
      S.setDirty(true);
      renderConfig(getTemplateMAML);
      toast('📌 已粘贴', 'success');
    }
  });

  // Group/Layer/MusicControl 子元素管理
  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-add-child]');
    if (addBtn) {
      var parentIdx = Number(addBtn.dataset.addChild);
      var childType = addBtn.dataset.childType;
      if (parentIdx >= 0 && parentIdx < S.elements.length && ElementDefaults[childType]) {
        captureState('添加子元素');
        var parent = S.elements[parentIdx];
        if (!parent.children) parent.children = [];
        var newChild = JSON.parse(JSON.stringify(ElementDefaults[childType]()));
        newChild.x = 0;
        newChild.y = parent.children.length * 30;
        parent.children.push(newChild);
        S.setDirty(true);
        renderConfig(getTemplateMAML);
        toast('📦 已添加子元素: ' + childType, 'success');
      }
      return;
    }
    var removeBtn = e.target.closest('[data-remove-child]');
    if (removeBtn) {
      var pIdx = Number(removeBtn.dataset.removeChild);
      var cIdx = Number(removeBtn.dataset.childIdx);
      if (pIdx >= 0 && pIdx < S.elements.length) {
        var par = S.elements[pIdx];
        if (par.children && cIdx >= 0 && cIdx < par.children.length) {
          captureState('删除子元素');
          par.children.splice(cIdx, 1);
          S.setDirty(true);
          renderConfig(getTemplateMAML);
          toast('🗑️ 已删除子元素', 'success');
        }
      }
      return;
    }
  });

  // MAML 导入
  document.getElementById('cfgContent').addEventListener('click', function (e) {
    var importBtn = e.target.closest('[data-action="importMAML"]');
    if (!importBtn) return;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = function () {
      if (!input.files || !input.files[0]) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          importMAMLFromXml(reader.result);
        } catch (err) {
          toast('❌ 导入失败: ' + err.message, 'error');
        }
      };
      reader.readAsText(input.files[0]);
    };
    input.click();
  });

  // Element list drag reorder
  var _dragReorderIdx = -1;
  document.getElementById('cfgContent').addEventListener('dragstart', function (e) {
    var item = e.target.closest('[data-drag-idx]');
    if (!item) return;
    _dragReorderIdx = Number(item.dataset.dragIdx);
    item.classList.add('dragging-el');
    e.dataTransfer.effectAllowed = 'move';
  });
  document.getElementById('cfgContent').addEventListener('dragover', function (e) {
    var item = e.target.closest('[data-drag-idx]');
    if (!item || _dragReorderIdx < 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Clear all drag indicators
    document.querySelectorAll('.el-item').forEach(function (el) {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    var rect = item.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    if (e.clientY < midY) item.classList.add('drag-over-top');
    else item.classList.add('drag-over-bottom');
  });
  document.getElementById('cfgContent').addEventListener('dragend', function () {
    document.querySelectorAll('.el-item').forEach(function (el) {
      el.classList.remove('dragging-el', 'drag-over-top', 'drag-over-bottom');
    });
    _dragReorderIdx = -1;
  });
  document.getElementById('cfgContent').addEventListener('drop', function (e) {
    var item = e.target.closest('[data-drag-idx]');
    if (!item || _dragReorderIdx < 0) return;
    e.preventDefault();
    var targetIdx = Number(item.dataset.dragIdx);
    if (targetIdx === _dragReorderIdx) return;
    captureState('调整层级');
    var el = S.elements.splice(_dragReorderIdx, 1)[0];
    var rect = item.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    var insertIdx = e.clientY < midY ? targetIdx : targetIdx + 1;
    if (_dragReorderIdx < targetIdx) insertIdx--;
    S.elements.splice(Math.max(0, insertIdx), 0, el);
    S.setDirty(true);
    _dragReorderIdx = -1;
    renderConfig(getTemplateMAML);
    toast('↕ 已调整顺序', 'success');
  });


  // Double-click element in preview to scroll to editor
  document.getElementById('previewContent').addEventListener('dblclick', function(e) {
    var elTarget = e.target.closest('[data-el-idx]');
    if (elTarget) {
      var idx = parseInt(elTarget.dataset.elIdx, 10);
      if (!isNaN(idx) && idx < S.elements.length) {
        S.setSelIdx(idx);
        renderConfig(getTemplateMAML);
        // Scroll to element detail section
        var detail = document.querySelector('.el-detail');
        if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  document.getElementById('cfgPreviewContent').addEventListener('dblclick', function(e) {
    var elTarget = e.target.closest('[data-el-idx]');
    if (elTarget) {
      var idx = parseInt(elTarget.dataset.elIdx, 10);
      if (!isNaN(idx) && idx < S.elements.length) {
        S.setSelIdx(idx);
        renderConfig(getTemplateMAML);
        var detail = document.querySelector('.el-detail');
        if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // File inputs
  document.getElementById('fileImagePick').addEventListener('change', handleFilePicked);
  document.getElementById('fileVideoPick').addEventListener('change', handleFilePicked);

  // Device selects
  document.getElementById('deviceSelect').addEventListener('change', function () { 
    try { sessionStorage.setItem('jcm-device', this.value); } catch(e) {}
    // Apply constraints for new device
    var device = getSelectedDevice();
    S.elements.forEach(function (el) { if (el.constraint) applyConstraint(el, device); });
    renderPreview(); 
    if (isLayerPanelVisible()) renderLayerPanel();
  });
  document.getElementById('showCamera').addEventListener('change', function () { renderPreview(); });
  document.getElementById('cfgDeviceSelect').addEventListener('change', function () {
    syncDeviceSelect('toPreview');
    // Apply constraints for new device
    var cfgDevice = getCfgDevice();
    S.elements.forEach(function (el) { if (el.constraint) applyConstraint(el, cfgDevice); });
    renderLivePreview();
  });
  document.getElementById('cfgShowCamera').addEventListener('change', function () { document.getElementById('showCamera').checked = this.checked; renderLivePreview(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Ctrl+K = Command palette (works everywhere)
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      if (isCommandPaletteOpen()) return;
      openCommandPalette(JCM);
      return;
    }
    if (e.key === 'Escape' && isCommandPaletteOpen()) return; // let command palette handle it

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    var isInCodeEditor = e.target.id === 'codeContent';
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey && !isInCodeEditor) { e.preventDefault(); var r = undo(); if (r && r.needsRerender) { renderConfig(getTemplateMAML); toast(r.message, 'success'); } }
    if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isInCodeEditor) { e.preventDefault(); var r2 = redo(); if (r2 && r2.needsRerender) { renderConfig(getTemplateMAML); toast(r2.message, 'success'); } }


    // N = Add text element (when not in input)
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      if (addElement('text')) {
        renderConfig(getTemplateMAML);
        _autoPreview();
        toast('📝 已添加文字元素', 'success', 1500);
      }
      return;
    }

    // Shift+Tab = cycle selected element (when not in input)
    if (e.key === 'Tab' && e.shiftKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT' && e.target.id !== 'codeContent') {
      e.preventDefault();
      if (S.elements.length > 0) {
        var nextIdx = (S.selIdx + 1) % S.elements.length;
        S.setSelIdx(nextIdx);
        renderConfig(getTemplateMAML);
        if (getStep() === 2) renderPreview();
        if (getStep() === 1) renderLivePreview();
      }
      return;
    }
    // Escape = deselect element
    if (e.key === 'Escape' && S.selIdx >= 0 && !isCommandPaletteOpen()) {
      S.setSelIdx(-1);
      renderConfig(getTemplateMAML);
      if (getStep() === 2) renderPreview();
      if (getStep() === 1) renderLivePreview();
      return;
    }

    // Ctrl+S = Export ZIP
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (getStep() === 2 && S.tpl) handleExport();
      else if (S.tpl) { goStep(2, stepCallbacks); setTimeout(function() { handleExport(); }, 400); }
      return;
    }
    if (e.key === 'Delete' && S.selIdx >= 0) { e.preventDefault(); removeElement(S.selIdx); renderConfig(getTemplateMAML); }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); toggleLayerPanel(); return; }
    if (e.ctrlKey && e.key === 'd' && S.selIdx >= 0) {
      e.preventDefault(); captureState();
      var clone = JSON.parse(JSON.stringify(S.elements[S.selIdx])); clone.x += 10; clone.y += 10;
      S.elements.push(clone); S.setSelIdx(S.elements.length - 1); S.setDirty(true);
      renderConfig(getTemplateMAML);
      renderPreview(); renderLivePreview();
      // Flash effect on duplicated element
      setTimeout(function(){
        document.querySelectorAll('[data-el-idx="' + (S.elements.length - 1) + '"]').forEach(function(el){
          el.classList.add('dup-flash'); setTimeout(function(){ el.classList.remove('dup-flash'); }, 500);
        });
      }, 50);
      toast('✅ 已复制元素', 'success');
    }
    if (e.ctrlKey && e.key === 'c' && S.selIdx >= 0) { e.preventDefault(); S.setClipboard(JSON.parse(JSON.stringify(S.elements[S.selIdx]))); toast('📋 已复制', 'success'); }
    if (e.ctrlKey && e.key === 'v' && S.clipboard) {
      e.preventDefault(); captureState();
      var paste = JSON.parse(JSON.stringify(S.clipboard)); paste.x += 10; paste.y += 10;
      S.elements.push(paste); S.setSelIdx(S.elements.length - 1); S.setDirty(true);
      renderConfig(getTemplateMAML); toast('📋 已粘贴', 'success');
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0 && S.selIdx >= 0 && !S.elements[S.selIdx].locked && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
      e.preventDefault(); var step = e.shiftKey ? 10 : 1; var el = S.elements[S.selIdx];
      captureState('移动');
      if (e.key === 'ArrowUp') el.y = Math.max(0, el.y - step);
      if (e.key === 'ArrowDown') el.y += step;
      if (e.key === 'ArrowLeft') el.x = Math.max(0, el.x - step);
      if (e.key === 'ArrowRight') el.x += step;
      S.setDirty(true);
      renderConfig(getTemplateMAML);
      if (getStep() === 2) renderPreview();
    }
  });

  // Drag & drop files
  document.querySelector('.content').addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation();
    var files = e.dataTransfer.files; if (!files.length) return;
    var file = files[0];
    if (file.type.indexOf('image/') === 0) {
      var dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('fileImagePick').files = dt.files;
      S.setPendingAdd('image'); S.setPendingReplace(-1);
      document.getElementById('fileImagePick').dispatchEvent(new Event('change'));
    } else if (file.type.indexOf('video/') === 0) {
      var dt2 = new DataTransfer(); dt2.items.add(file);
      document.getElementById('fileVideoPick').files = dt2.files;
      S.setPendingAdd('video'); S.setPendingReplace(-1);
      document.getElementById('fileVideoPick').dispatchEvent(new Event('change'));
    }
  });
  document.querySelector('.content').addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });

  // ── Right-click Context Menu ──
  var ctxMenu = document.getElementById('contextMenu');
  if (ctxMenu) {
    document.addEventListener('contextmenu', function (e) {
      var elTarget = e.target.closest('[data-el-idx]');
      if (!elTarget) { ctxMenu.style.display = 'none'; return; }
      var ci = parseInt(elTarget.dataset.elIdx, 10);
      if (isNaN(ci) || ci >= S.elements.length) return;
      e.preventDefault();
      S.setSelIdx(ci);
      renderConfig(getTemplateMAML);
      ctxMenu.style.display = '';
      ctxMenu.style.left = e.clientX + 'px';
      ctxMenu.style.top = e.clientY + 'px';
    });
    ctxMenu.addEventListener('click', function (e) {
      var item = e.target.closest('.ctx-item');
      if (!item) return;
      var action = item.dataset.ctx;
      var ci = S.selIdx;
      if (ci < 0 || ci >= S.elements.length) return;
      switch (action) {
        case 'duplicate':
          captureState('复制元素');
          var clone = JSON.parse(JSON.stringify(S.elements[ci]));
          clone.x += 10; clone.y += 10;
          S.elements.push(clone); S.setSelIdx(S.elements.length - 1); S.setDirty(true);
          toast('📋 已复制', 'success'); break;
        case 'delete':
          removeElement(ci); break;
        case 'lock':
          S.elements[ci].locked = !S.elements[ci].locked;
          toast(S.elements[ci].locked ? '🔒 已锁定' : '🔓 已解锁', 'info'); break;
        case 'front':
          captureState('置顶');
          var frontEl = S.elements.splice(ci, 1)[0];
          S.elements.push(frontEl); S.setSelIdx(S.elements.length - 1); S.setDirty(true);
          toast('⬆ 已置顶', 'success'); break;
        case 'back':
          captureState('置底');
          var backEl = S.elements.splice(ci, 1)[0];
          S.elements.unshift(backEl); S.setSelIdx(0); S.setDirty(true);
          toast('⬇ 已置底', 'success'); break;
        case 'align-left': alignElement(ci, 'left'); break;
        case 'align-center': alignElement(ci, 'hcenter'); break;
        case 'align-right': alignElement(ci, 'right'); break;
        case 'copy-style': copyStyle(ci); break;
        case 'paste-style': pasteStyle(ci); break;
      }
      renderConfig(getTemplateMAML);
      if (getStep() === 2) renderPreview();
      ctxMenu.style.display = 'none';
    });
    document.addEventListener('click', function () { ctxMenu.style.display = 'none'; });
  }
}

// ─── Init ─────────────────────────────────────────────────────────
export function initUI() {
  // Store templates reference for snapshots
  window.__jcm_templates = TEMPLATES;

  // Theme
  try {
    var saved = localStorage.getItem('jcm-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      var btn = document.getElementById('themeToggle');
      if (btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';
    }
  } catch (e) {}

  renderTplGrid();
  applyI18n();
  setupEvents();
  setupCodeEditor();
  initSimpleMode();
  updateUndoRedoState();

  // Init canvas drag
  initCanvas({
    captureState: captureState,
    renderPreview: renderPreview,
    renderLivePreview: renderLivePreview,
    renderConfig: function () { renderConfig(getTemplateMAML); },
  });

  // Init layer panel
  initLayerPanel({
    renderConfig: function () { renderConfig(getTemplateMAML); },
    renderPreview: renderPreview,
    renderLivePreview: renderLivePreview,
  });

  // Init ruler + coordinate display
  initRuler();

  // Init dev tools
  initDevTools();

  checkShareURL(stepCallbacks);
  requestAnimationFrame(function () { moveStepSlider(0); });
  window.addEventListener('resize', function () { moveStepSlider(getStep()); });

  // Save on unload
  window.addEventListener('beforeunload', function () {
    document.querySelectorAll('video').forEach(function (v) { v.pause(); v.src = ''; });
    try { localStorage.setItem('jcm-draft', JSON.stringify({ tplId: S.tpl ? S.tpl.id : null, cfg: S.cfg, elements: S.elements, timestamp: Date.now() })); } catch (e) {}
  });

  // Draft recovery
  _loadDraft().then(function (d) {
    if (d && d.tplId) showDraftRecovery(d, stepCallbacks);
  }).catch(function () { checkLocalDraft(); });
}

function checkLocalDraft() {
  try {
    var draft = localStorage.getItem('jcm-draft');
    if (draft) { var d = JSON.parse(draft); if (d.tplId) showDraftRecovery(d, stepCallbacks); }
  } catch (e) {}
}

// ─── Expose to JCM global (for HTML onclick handlers) ─────────────
window.JCM = window.JCM || {};
// ─── More Menu ──────────────────────────────────────────────────
function toggleMoreMenu() {
  var menu = document.getElementById('moreMenu');
  if (menu) menu.style.display = menu.style.display === 'none' ? '' : 'none';
}
// ─── Undo/Redo State Update ──────────────────────────────────────
function updateUndoRedoState() {
  var labels = getHistoryLabels();
  var btnUndo = document.getElementById('btnUndo');
  var btnRedo = document.getElementById('btnRedo');
  // We can't easily know current position, so enable undo if there are labels
  if (btnUndo) btnUndo.disabled = labels.length === 0;
  // Redo is harder to track without position; keep enabled if user has undone
  // For now, just enable both when there's history
  if (btnRedo) btnRedo.disabled = labels.length === 0;
}

// ─── Simple Mode Toggle ──────────────────────────────────────────
function toggleSimpleMode() {
  var app = document.querySelector('.app');
  var btn = document.getElementById('modeToggleBtn');
  var moreBtn = document.getElementById('moreActionsBtn');
  var isSimple = app.classList.toggle('simple-mode');
  if (btn) {
    btn.textContent = isSimple ? '简洁' : '完整';
    btn.classList.toggle('active', isSimple);
  }
  // Show/hide expand button in simple mode
  if (moreBtn) moreBtn.style.display = isSimple ? '' : 'none';
  // Reset expanded state when switching modes
  if (isSimple) {
    document.querySelectorAll('.preview-actions-extra, .batch-export-bar').forEach(function(el) {
      el.classList.remove('show');
    });
    if (moreBtn) moreBtn.textContent = '⋯ 展开更多操作';
  }
  try { localStorage.setItem('jcm-simple-mode', isSimple ? '1' : '0'); } catch(e) {}
}
function toggleMoreActions() {
  var extras = document.querySelectorAll('.preview-actions-extra, .batch-export-bar');
  var btn = document.getElementById('moreActionsBtn');
  var anyVisible = false;
  extras.forEach(function(el) { if (el.classList.contains('show')) anyVisible = true; });
  extras.forEach(function(el) { el.classList.toggle('show', !anyVisible); });
  if (btn) btn.textContent = anyVisible ? '⋯ 展开更多操作' : '⋯ 收起';
}
function initSimpleMode() {
  var saved = null;
  try { saved = localStorage.getItem('jcm-simple-mode'); } catch(e) {}
  // Default to simple on mobile
  var isSimple = saved !== null ? saved === '1' : true;
  if (isSimple) {
    var app = document.querySelector('.app');
    var btn = document.getElementById('modeToggleBtn');
    var moreBtn = document.getElementById('moreActionsBtn');
    if (app) app.classList.add('simple-mode');
    if (btn) { btn.textContent = '简洁'; btn.classList.add('active'); }
    if (moreBtn) moreBtn.style.display = '';
  }
}
// Close on outside click
document.addEventListener('click', function(e) {
  var menu = document.getElementById('moreMenu');
  var btn = document.getElementById('moreMenuBtn');
  if (menu && btn && !menu.contains(e.target) && e.target !== btn) menu.style.display = 'none';

});

Object.assign(window.JCM, {
  toggleLayerPanel: toggleLayerPanel,
  toggleRuler: function () {
    var on = toggleRuler();
    toast(on ? '📏 标尺已开启' : '📏 标尺已关闭', 'info');
  },
  pickColor: pickColor,
  arrangeGrid: function (cols, gapH, gapV) { arrangeGrid(cols, gapH, gapV); renderConfig(getTemplateMAML); },
  renderConfig: function () { renderConfig(getTemplateMAML); },
  toggleMoreMenu: toggleMoreMenu,
  undo: function () {
    var r = undo();
    if (r && r.needsRerender) { renderConfig(getTemplateMAML); toast(r.message, 'success'); }
    updateUndoRedoState();
  },
  redo: function () {
    var r = redo();
    if (r && r.needsRerender) { renderConfig(getTemplateMAML); toast(r.message, 'success'); }
    updateUndoRedoState();
  },
  renderLayerPanel: renderLayerPanel,
  goStep: function (n) { goStep(n, stepCallbacks); },
  nextStep: function () { goStep(getStep() + 1, stepCallbacks); },
  prevStep: function () { goStep(getStep() - 1, stepCallbacks); },
  selectTemplate: selectTemplate,
  filterTemplates: filterTemplates,
  addElement: function (type) { if (addElement(type)) renderConfig(getTemplateMAML); },
  removeElement: function (idx) { removeElement(idx); renderConfig(getTemplateMAML); },
  selectElement: function (idx) { S.setSelIdx(idx); renderConfig(getTemplateMAML); },
  moveElementZ: function (idx, dir) { moveElementZ(idx, dir); renderConfig(getTemplateMAML); },
  alignElement: function (idx, align) { alignElement(idx, align); renderConfig(getTemplateMAML); },
  applyQuickSize: function (idx, size) { applyQuickSize(idx, size); renderConfig(getTemplateMAML); },
  renderPreview: renderPreview,
  renderLivePreview: renderLivePreview,
  getSelectedDevice: getSelectedDevice,
  handleExport: handleExport,
  handleExportPNG: handleExportPNG,
  handleExportSVG: handleExportSVG,
  handleBatchExport: handleBatchExport,
  handleUniversalExport: handleUniversalExport,
  handleImportZip: handleImportZip,
  shareTemplate: shareTemplate,
  triggerBuild: triggerBuild,
  openLibrary: function () { openLibraryModal(stepCallbacks); },
  saveToLibrary: function () {
    if (!S.tpl) return toast('请先选择模板', 'error');
    var entry = saveToLibrary(S.cfg.cardName || S.tpl.name, S.tpl.id, S.tpl.name, S.tpl.icon, S.cfg, S.elements);
    toast('✅ 已保存到卡片库: ' + entry.name, 'success');
  },
  openMarket: function () { openMarketModal(stepCallbacks); },
  showQR: function () {
    if (!S.tpl) return toast('请先选择模板', 'error');
    var data = { t: S.tpl.id, c: S.cfg, e: S.tpl.id === 'custom' ? S.elements : undefined };
    var json = JSON.stringify(data);
    var encoded = btoa(unescape(encodeURIComponent(json)));
    var url = location.origin + location.pathname + '#share=' + encoded;
    if (url.length > 2953) return toast('⚠️ 模板数据过大，无法生成二维码', 'warning');
    showQRModal(url, S.cfg.cardName || S.tpl.name);
  },
  switchLang: function () {
    var next = getLang() === 'zh' ? 'en' : 'zh';
    setLang(next);
    toast(next === 'zh' ? '已切换到中文' : 'Switched to English', 'success');
    applyI18n();
    // Update language button text
    var langBtn = document.getElementById('langSwitchBtn');
    if (langBtn) langBtn.textContent = next === 'zh' ? 'EN' : '中';
  },
  handleBatchTemplateExport: function () {
    if (!S.tpl) return toast('请先选择模板', 'error');
    toast('📦 正在批量导出所有机型模板...', 'info');
    var deviceKeys = ['p2', 'q200', 'q100', 'ultra'];
    var errors = [];
    var promises = deviceKeys.map(function (dk) {
      var device = getDevice(dk);
      var innerXml = getTemplateMAML(S.tpl, S.cfg);
      var maml = S.tpl.rawXml ? innerXml : generateMAML({
        cardName: (S.cfg.cardName || S.tpl.name) + '_' + dk, device: device, innerXml: innerXml,
        updater: S.tpl.updater, extraElements: S.elements, uploadedFiles: S.uploadedFiles, bgImage: S.cfg.bgImage || '',
      });
      var validation = validateMAML(maml);
      if (!validation.valid) { errors.push(device.label + ': ' + validation.errors[0]); return Promise.resolve(); }
      return exportZip(maml, (S.cfg.cardName || 'card') + '_' + dk, S.elements, S.uploadedFiles, S.tpl.id === 'custom', S.cfg.bgImage || '')
        .catch(function (e) { errors.push(device.label + ': ' + e.message); });
    });
    Promise.all(promises).then(function () {
      if (errors.length > 0) toast('部分导出失败: ' + errors.join(', '), 'error');
      else toast('✅ 全部机型模板已导出', 'success');
    });
  },
  openDesignTools: function (tab) { openDesignTools(tab); },
  openSnippets: function () { openSnippetsModal(stepCallbacks); },
  openBatchOps: function () { openBatchOpsModal(stepCallbacks); },
  openSchemeImport: function () { openSchemeImportModal(stepCallbacks); },
  openBindingWizard: function () { openBindingWizard(); },
  openCommandPalette: function () { openCommandPalette(JCM); },
  runMamlLint: function () {
    var textarea = document.getElementById('codeContent');
    var xml = textarea ? textarea.value : '';
    var issues = lintMAML(xml);
    showLintResults(issues);
  },
  runPerfCheck: function () {
    var textarea = document.getElementById('codeContent');
    var xml = textarea ? textarea.value : '';
    var warnings = analyzePerformance(S.elements, xml);
    showPerfResults(warnings);
  },
  runA11yCheck: function () {
    var issues = checkAccessibility(S.elements);
    showA11yResults(issues);
  },
  showSnapshots: function () { showSnapshotsModal(stepCallbacks); },
  showADBPush: function () { showADBPush(); },
  exportGIF: function () {
    var device = getSelectedDevice();
    exportGIF(S.cfg.cardName || 'card', device);
  },
  exportPDF: function () {
    var device = getSelectedDevice();
    exportPDF(S.cfg.cardName || 'card', device);
  },
  copyXML: function () {
    var textarea = document.getElementById('codeContent');
    var text = textarea ? textarea.value : '';
    if (!text || text.indexOf('<Widget') < 0) return toast('请先生成预览', 'error');
    navigator.clipboard.writeText(text).then(function () { toast('📋 XML 已复制到剪贴板', 'success'); }).catch(function () { toast('复制失败，请手动选择复制', 'error'); });
  },
  formatXML: function () { formatXML(); toast('🔧 XML 已格式化', 'success'); },
  toggleFullscreen: function () {
    var el = document.querySelector('#page2 .preview-phone');
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen().catch(function () { toast('浏览器不支持全屏', 'error'); });
  },
  toggleHelp: function () {
    var modal = document.getElementById('helpModal');
    if (modal) modal.style.display = modal.style.display === 'none' ? '' : 'none';
  },
  toggleTheme: function () {
    var html = document.documentElement;
    var next = (html.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('jcm-theme', next); } catch (e) {}
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = next === 'dark' ? '🌙' : '☀️';
  },
  toggleGrid: function () {
    var cb = document.getElementById('showGrid');
    var overlay = document.getElementById('previewGridOverlay');
    if (cb && overlay) overlay.style.display = cb.checked ? '' : 'none';
  },
  toggleThemeCompare: function () {
    var cb = document.getElementById('showThemeCompare');
    var side = document.querySelector('.preview-side');
    if (!cb) return;
    if (cb.checked) {
      if (!S.tpl) { cb.checked = false; return toast('请先选择模板', 'warning'); }
      var device = getSelectedDevice();
      var showCam = document.getElementById('showCamera').checked;
      // Build dark version
      var darkHtml = renderTemplatePreview(device, showCam, S.tpl, S.cfg);
      darkHtml += new PreviewRenderer(device, showCam).renderElements(S.elements, S.uploadedFiles, -1);
      // Build light version with light bg
      var lightCfg = Object.assign({}, S.cfg);
      if (lightCfg.bgColor === '#000000' || lightCfg.bgColor === '#0a0a0a' || lightCfg.bgColor === '#08080d' || lightCfg.bgColor === '#0a0e1a' || lightCfg.bgColor === '#0f0f1a' || lightCfg.bgColor === '#0a1628' || lightCfg.bgColor === '#0d1117') {
        lightCfg.bgColor = '#f0f2f5';
      }
      var lightHtml = renderTemplatePreview(device, showCam, S.tpl, lightCfg);
      lightHtml += new PreviewRenderer(device, showCam).renderElements(S.elements, S.uploadedFiles, -1);
      // Create comparison container
      var wrap = document.querySelector('.preview-phone-wrap');
      if (wrap) {
        var compareDiv = document.createElement('div');
        compareDiv.id = 'themeCompareContainer';
        compareDiv.className = 'theme-compare-wrap';
        compareDiv.innerHTML =
          '<div><div class="theme-compare-label">🌙 暗色</div>' +
          '<div class="preview-phone theme-compare-phone"><div class="preview-screen"><div class="preview-content">' + darkHtml + '</div></div></div></div>' +
          '<div><div class="theme-compare-label">☀️ 亮色</div>' +
          '<div class="preview-phone theme-compare-phone" style="background:#f0f2f5"><div class="preview-screen" style="background:#f0f2f5"><div class="preview-content">' + lightHtml + '</div></div></div></div>';
        wrap.style.display = 'none';
        wrap.parentNode.insertBefore(compareDiv, wrap.nextSibling);
      }
    } else {
      var existing = document.getElementById('themeCompareContainer');
      if (existing) existing.remove();
      var wrap2 = document.querySelector('.preview-phone-wrap');
      if (wrap2) wrap2.style.display = '';
    }
  },
  zoomIn: function () { _zoomLevel = Math.min(_zoomLevel + 25, 200); applyZoom(); try { sessionStorage.setItem('jcm-zoom', _zoomLevel); } catch(e) {} },
  zoomOut: function () { _zoomLevel = Math.max(_zoomLevel - 25, 50); applyZoom(); try { sessionStorage.setItem('jcm-zoom', _zoomLevel); } catch(e) {} },
  zoomReset: function () { _zoomLevel = 100; applyZoom(); try { sessionStorage.setItem('jcm-zoom', 100); } catch(e) {} },
  cfgZoomIn: function () { _cfgZoomLevel = Math.min(_cfgZoomLevel + 25, 200); applyCfgZoom(); },
  cfgZoomOut: function () { _cfgZoomLevel = Math.max(_cfgZoomLevel - 25, 50); applyCfgZoom(); },
  cfgZoomReset: function () { _cfgZoomLevel = 100; applyCfgZoom(); },
  toggleHistory: function () {
    var modal = document.getElementById('historyModal');
    if (!modal) return;
    if (modal.style.display === 'none') {
      var list = document.getElementById('historyList');
      var labels = getHistoryLabels();
      if (labels.length === 0) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">暂无操作历史</div>';
      else list.innerHTML = '<div class="shortcut-list">' + labels.map(function (l, i) {
        return '<div class="shortcut-item" style="cursor:pointer" onclick="JCM.undoTo(' + (labels.length - i) + ');JCM.toggleHistory()"><span>' + (i + 1) + '.</span><span>' + l + '</span></div>';
      }).join('') + '</div>';
      modal.style.display = '';
    } else { modal.style.display = 'none'; }
  },
  undoTo: function (idx) { undoTo(idx); renderConfig(getTemplateMAML); },
  toggleChangelog: function () {
    var modal = document.getElementById('changelogModal');
    if (modal) modal.style.display = modal.style.display === 'none' ? '' : 'none';
  },
  initUI: initUI,
  pickMedia: function (type) { S.setPendingAdd(type); S.setPendingReplace(-1); document.getElementById(type === 'image' ? 'fileImagePick' : 'fileVideoPick').click(); },
  pickMediaReplace: function (idx) {
    var el = S.elements[idx]; if (!el) return;
    S.setPendingAdd(el.type); S.setPendingReplace(idx);
    document.getElementById(el.type === 'image' ? 'fileImagePick' : 'fileVideoPick').click();
  },
  forceTranscodeAsset: forceTranscodeAsset,
  handleExportTemplate: function () { exportTemplateJSON(S.tpl ? S.tpl.id : 'custom', S.cfg, S.elements); toast('✅ 配置已导出', 'success'); },
  exportRearEye: function () {
    if (!S.tpl) return toast('请先选择模板', 'error');
    exportRearEyeFormat(S.tpl.id, S.cfg, S.elements, S.uploadedFiles);
    toast('✅ .rear-eye 已导出', 'success');
  },
  importRearEye: function () {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.rear-eye,.json';
    input.onchange = function () {
      var file = input.files[0]; if (!file) return;
      importRearEyeFormat(file).then(function (data) {
        var TPLS = window.__jcm_templates;
        var tpl = TPLS.find(function (t) { return t.id === data.templateId; }) || TPLS.find(function (t) { return t.id === 'custom'; });
        S.setTpl(tpl);
  // Track recent templates
  try {
    var recent = JSON.parse(localStorage.getItem('jcm-recent') || '[]');
    recent = recent.filter(function(id) { return id !== tpl.id; });
    recent.unshift(tpl.id);
    if (recent.length > 5) recent = recent.slice(0, 5);
    localStorage.setItem('jcm-recent', JSON.stringify(recent));
  } catch(e) {}
        S.setCfg(data.config || {});
        S.setElements(data.elements || []);
        S.setDirty(true);
        resetHistory();
        renderTplGrid(); goStep(1, stepCallbacks);
        toast('✅ .rear-eye 已导入', 'success');
      }).catch(function (e) { toast(e.message, 'error'); });
    };
    input.click();
  },
  handleImportTemplate: function () {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = function () {
      var file = input.files[0]; if (!file) return;
      importTemplateJSON(file).then(function (data) {
        if (data.templateId) {
          var tpl = TEMPLATES.find(function (t) { return t.id === data.templateId; }) || TEMPLATES.find(function (t) { return t.id === 'custom'; });
          S.setTpl(tpl);
  // Track recent templates
  try {
    var recent = JSON.parse(localStorage.getItem('jcm-recent') || '[]');
    recent = recent.filter(function(id) { return id !== tpl.id; });
    recent.unshift(tpl.id);
    if (recent.length > 5) recent = recent.slice(0, 5);
    localStorage.setItem('jcm-recent', JSON.stringify(recent));
  } catch(e) {}
          S.setCfg(data.config || {});
          S.setElements(data.elements || []);
          S.setDirty(true); resetHistory();
          renderTplGrid(); goStep(1, stepCallbacks);
          toast('✅ 配置已导入', 'success');
        }
      }).catch(function (e) { toast('导入失败: ' + e.message, 'error'); });
    };
    input.click();
  },
  checkShareURL: function () { checkShareURL(stepCallbacks); },
  fmtSize: fmtSize,
  isInCameraZone: isInCameraZone,
  clearToken: function () { localStorage.removeItem('jcm-gh-token'); toast('🔑 Token 已清除', 'success'); },
  hasToken: function () { return !!_getGH(); },
  elements: S.elements,
  // Dev tools
  toggleMockMode: function () {
    toggleMockMode();
    try { renderPreview(); } catch (e) {}
    try { renderLivePreview(); } catch (e) {}
  },
  openExprDebugger: openExprDebugger,
  closeExprDebugger: closeExprDebugger,
  insertVar: insertVar,
  evalExpr: evalExpr,
  insertExprPreset: insertExprPreset,
  openPerfDashboard: openPerfDashboard,
  toggleTemplateCompare: toggleTemplateCompare,
  cancelCompare: cancelCompare,
});
