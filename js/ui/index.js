// ─── UI Index: 页面导航 + 配置渲染 + 事件 ─────────────────────────
// 拆分后的入口文件，导入子模块并暴露 JCM 全局接口
import * as S from '../state.js';
import { getDevice, generateAutoDetectMAML } from '../devices.js';
import { escXml, generateMAML, validateMAML } from '../maml.js';
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
  addElement, removeElement, alignElement, applyQuickSize, moveElementZ
} from './elements.js';
import {
  COLOR_PRESETS, renderTplGrid, filterTemplates, renderConfig,
  getActiveCategory, setActiveCategory
} from './config-panel.js';
import { shareTemplate, checkShareURL, showDraftRecovery } from './share.js';
import { openLibraryModal } from './card-library-ui.js';
import { saveToLibrary } from '../card-library.js';
import { openMarketModal } from './template-market.js';
import { showQRModal } from './qr-share.js';
import { t, getLang, setLang, getAvailableLangs } from '../i18n.js';
import { openDesignTools } from './design-tools.js';
import { openBindingWizard } from './binding-wizard.js';
import { openCommandPalette, isCommandPaletteOpen } from './command-palette.js';
import { lintMAML, showLintResults, analyzePerformance, showPerfResults, checkAccessibility, showA11yResults } from './linter-tools.js';
import { autoSnapshot, showSnapshotsModal } from './version-snapshots.js';
import { showADBPush, exportGIF, exportPDF } from './export-adb.js';
import { renderLayerPanel, toggleLayerPanel, isLayerPanelVisible, initLayerPanel } from './layer-panel.js';

// re-export from export.js, transcode.js, storage.js (loaded as ES modules)
import { exportZip, exportPNG, exportSVG, exportTemplateJSON, importTemplateJSON, importZip } from '../export.js';
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
    switch (el.type) {
      case 'text': {
        var a = el.textAlign && el.textAlign !== 'left' ? ' textAlign="' + el.textAlign + '"' : '';
        var ml = el.multiLine ? ' multiLine="true"' : '';
        var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ' w="' + (el.w || 200) + '"' : '';
        var b = el.bold ? ' bold="true"' : '';
        var ff = el.fontFamily && el.fontFamily !== 'default' ? ' fontFamily="' + el.fontFamily + '"' : '';
        var alpha = (el.opacity !== undefined && el.opacity !== 100) ? ' alpha="' + (el.opacity / 100).toFixed(2) + '"' : '';
        var sh = '';
        if (el.shadow === 'light') sh = ' shadow="1" shadowColor="#000000"';
        else if (el.shadow === 'dark') sh = ' shadow="3" shadowColor="#000000"';
        else if (el.shadow === 'glow') sh = ' shadow="4" shadowColor="' + (el.color || '#ffffff') + '"';
        var tg = '';
        if (el.textGradient && el.textGradient !== 'none') {
          var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
          var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
          tg = ' gradientColors="' + gc + '" gradientOrientation="top_bottom"';
        }
        var ts = '';
        if (el.textStroke && el.textStroke > 0) ts = ' stroke="' + el.textStroke + '" strokeColor="' + (el.textStrokeColor || '#000000') + '"';
        var rot = el.rotation ? ' rotation="' + el.rotation + '"' : '';
        var lh = el.multiLine && el.lineHeight && el.lineHeight !== 1.4 ? ' lineHeight="' + el.lineHeight + '"' : '';
        lines.push('    <Text text="' + escXml(el.text || '') + '" x="' + el.x + '" y="' + el.y + '" size="' + el.size + '" color="' + el.color + '"' + w + a + ml + b + ff + alpha + sh + tg + ts + rot + lh + ' />');
        break;
      }
      case 'rectangle': {
        var rectAlpha = (el.opacity !== undefined && el.opacity !== 100) ? ' alpha="' + (el.opacity / 100).toFixed(2) + '"' : '';
        var rectFill = el.fillColor2 ? ' fillColor="' + el.color + '" fillColor2="' + el.fillColor2 + '"' : ' fillColor="' + el.color + '"';
        var rectRot = el.rotation ? ' rotation="' + el.rotation + '"' : '';
        var rectBlur = el.blur ? ' blur="' + el.blur + '"' : '';
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '"' + rectFill + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + rectAlpha + rectRot + rectBlur + ' />');
        break;
      }
      case 'circle': {
        var circAlpha = (el.opacity !== undefined && el.opacity !== 100) ? ' alpha="' + (el.opacity / 100).toFixed(2) + '"' : '';
        var circStroke = el.strokeWidth > 0 ? ' stroke="' + el.strokeWidth + '" strokeColor="' + (el.strokeColor || '#ffffff') + '"' : '';
        lines.push('    <Circle x="' + el.x + '" y="' + el.y + '" r="' + el.r + '" fillColor="' + el.color + '"' + circAlpha + circStroke + (el.rotation ? ' rotation="' + el.rotation + '"' : '') + ' />');
        break;
      }
      case 'image': {
        var imgSrc = el.src || el.fileName || '';
        var folder = imgSrc && S.uploadedFiles[imgSrc] && S.uploadedFiles[imgSrc].mimeType.indexOf('video/') === 0 ? 'videos' : 'images';
        lines.push('    <Image src="' + folder + '/' + escXml(imgSrc) + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '" />');
        break;
      }
      case 'video':
        lines.push('    <Video src="videos/' + escXml(el.src || el.fileName || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 240) + '" h="' + (el.h || 135) + '" autoPlay="true" loop="true" />');
        break;
      case 'arc':
        lines.push('    <!-- Arc: MAML 不原生支持弧形，用圆形近似 -->');
        lines.push('    <Circle x="' + el.x + '" y="' + el.y + '" r="' + (el.r || 40) + '" fillColor="transparent" stroke="' + (el.strokeWidth || 6) + '" strokeColor="' + el.color + '" />');
        break;
      case 'progress':
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 200) + '" h="' + (el.h || 8) + '" fillColor="' + (el.bgColor || '#333333') + '" cornerRadius="' + (el.radius || 4) + '" />');
        lines.push('    <Rectangle x="' + el.x + '" y="' + el.y + '" w="' + Math.round((el.w || 200) * (el.value || 60) / 100) + '" h="' + (el.h || 8) + '" fillColor="' + el.color + '" cornerRadius="' + (el.radius || 4) + '" />');
        break;
      case 'lottie':
        lines.push('    <!-- ⚠️ Lottie 动画: MAML 引擎不支持此格式，请替换为 Image 或 Video 元素 -->');
        break;
    }
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
  var newCfg = {};
  tpl.config.forEach(function (g) { g.fields.forEach(function (f) { newCfg[f.key] = f.default; }); });
  S.setCfg(newCfg);
  S.setElements(id === 'custom'
    ? [{ type: 'text', text: 'Hello Card', x: 10, y: 60, size: 28, color: '#ffffff', textAlign: 'left', bold: false, multiLine: false, w: 200 }]
    : []);
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

  var html = renderTemplatePreview(device, showCam, S.tpl, S.cfg);
  html += new PreviewRenderer(device, showCam).renderElements(S.elements, S.uploadedFiles, S.selIdx);
  if (S.cfg.bgImage) {
    html = '<div style="position:absolute;inset:0;background-image:url(\'' + S.cfg.bgImage.replace(/'/g, "\\'") + '\');background-size:cover;background-position:center;z-index:-1"></div>' + html;
  }
  document.getElementById('previewContent').innerHTML = html;

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

  var html = renderTemplatePreview(device, showCam, S.tpl, S.cfg);
  html += new PreviewRenderer(device, showCam).renderElements(S.elements, S.uploadedFiles, S.selIdx);
  if (S.cfg.bgImage) {
    html = '<div style="position:absolute;inset:0;background-image:url(\'' + S.cfg.bgImage.replace(/'/g, "\\'") + '\');background-size:cover;background-position:center;z-index:-1"></div>' + html;
  }
  var contentEl = document.getElementById('cfgPreviewContent');
  if (contentEl) contentEl.innerHTML = html;
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
  var p = toastProgress('正在打包 ZIP...');
  exportZip(maml, S.cfg.cardName || 'card', S.elements, S.uploadedFiles, S.tpl.id === 'custom', S.cfg.bgImage || '')
    .then(function () { p.close('✅ ZIP 已导出', 'success'); })
    .catch(function (e) { p.close('导出失败: ' + e.message, 'error'); });
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
  if (phone) phone.style.transform = 'scale(' + (_zoomLevel / 100) + ')';
  var label = document.getElementById('zoomLabel');
  if (label) label.textContent = _zoomLevel + '%';
}

function applyCfgZoom() {
  var phone = document.querySelector('.config-preview-phone');
  if (phone) phone.style.transform = 'scale(' + (_cfgZoomLevel / 100) + ')';
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
function _encodeToken(t) { try { return btoa(unescape(encodeURIComponent(t))); } catch (e) { return ''; } }
function _decodeToken(t) { try { return decodeURIComponent(escape(atob(t))); } catch (e) { return ''; } }

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
}, 300);

function setupEvents() {
  // Template grid click
  document.getElementById('tplGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.tpl-card');
    if (card) selectTemplate(card.dataset.tpl);
  });

  // Category tabs
  var catContainer = document.getElementById('tplCategories');
  if (catContainer) catContainer.addEventListener('click', function (e) {
    var btn = e.target.closest('.tpl-cat');
    if (!btn) return;
    setActiveCategory(btn.dataset.cat);
    document.querySelectorAll('.tpl-cat').forEach(function (b) { b.classList.toggle('active', b === btn); });
    filterTemplates(document.getElementById('tplSearch').value);
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
      if (t.type === 'number' || t.type === 'range') S.elements[idx][prop] = Number(t.value);
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
      else if (a === 'shareTemplate') shareTemplate();
      else if (a === 'shareQR') JCM.showQR();
      else if (a === 'exportTemplate') { exportTemplateJSON(S.tpl ? S.tpl.id : 'custom', S.cfg, S.elements); toast('✅ 配置已导出', 'success'); }
      return;
    }
    var alignBtn = e.target.closest('[data-align]');
    if (alignBtn) { alignElement(Number(alignBtn.dataset.ai), alignBtn.dataset.align); renderConfig(getTemplateMAML); return; }
    var sizeBtn = e.target.closest('[data-qsize]');
    if (sizeBtn) { applyQuickSize(Number(sizeBtn.dataset.qi), sizeBtn.dataset.qsize); renderConfig(getTemplateMAML); return; }
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
  });

  // File inputs
  document.getElementById('fileImagePick').addEventListener('change', handleFilePicked);
  document.getElementById('fileVideoPick').addEventListener('change', handleFilePicked);

  // Device selects
  document.getElementById('deviceSelect').addEventListener('change', function () { renderPreview(); });
  document.getElementById('showCamera').addEventListener('change', function () { renderPreview(); });
  document.getElementById('cfgDeviceSelect').addEventListener('change', function () { syncDeviceSelect('toPreview'); renderLivePreview(); });
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
    if (e.key === 'Delete' && S.selIdx >= 0) { e.preventDefault(); removeElement(S.selIdx); renderConfig(getTemplateMAML); }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); toggleLayerPanel(); return; }
    if (e.ctrlKey && e.key === 'd' && S.selIdx >= 0) {
      e.preventDefault(); captureState();
      var clone = JSON.parse(JSON.stringify(S.elements[S.selIdx])); clone.x += 10; clone.y += 10;
      S.elements.push(clone); S.setSelIdx(S.elements.length - 1); S.setDirty(true);
      renderConfig(getTemplateMAML); toast('✅ 已复制元素', 'success');
    }
    if (e.ctrlKey && e.key === 'c' && S.selIdx >= 0) { e.preventDefault(); S.setClipboard(JSON.parse(JSON.stringify(S.elements[S.selIdx]))); toast('📋 已复制', 'success'); }
    if (e.ctrlKey && e.key === 'v' && S.clipboard) {
      e.preventDefault(); captureState();
      var paste = JSON.parse(JSON.stringify(S.clipboard)); paste.x += 10; paste.y += 10;
      S.elements.push(paste); S.setSelIdx(S.elements.length - 1); S.setDirty(true);
      renderConfig(getTemplateMAML); toast('📋 已粘贴', 'success');
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0 && S.selIdx >= 0 && !S.elements[S.selIdx].locked) {
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
  setupEvents();
  setupCodeEditor();

  // Init canvas drag
  initCanvas({
    captureState: captureState,
    renderPreview: renderPreview,
    renderConfig: function () { renderConfig(getTemplateMAML); },
  });

  // Init layer panel
  initLayerPanel({
    renderConfig: function () { renderConfig(getTemplateMAML); },
    renderPreview: renderPreview,
    renderLivePreview: renderLivePreview,
  });

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
// Close on outside click
document.addEventListener('click', function(e) {
  var menu = document.getElementById('moreMenu');
  var btn = document.getElementById('moreMenuBtn');
  if (menu && btn && !menu.contains(e.target) && e.target !== btn) menu.style.display = 'none';
});

Object.assign(window.JCM, {
  toggleLayerPanel: toggleLayerPanel,
  toggleMoreMenu: toggleMoreMenu,
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
  zoomIn: function () { _zoomLevel = Math.min(_zoomLevel + 25, 200); applyZoom(); },
  zoomOut: function () { _zoomLevel = Math.max(_zoomLevel - 25, 50); applyZoom(); },
  zoomReset: function () { _zoomLevel = 100; applyZoom(); },
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
  handleImportTemplate: function () {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = function () {
      var file = input.files[0]; if (!file) return;
      importTemplateJSON(file).then(function (data) {
        if (data.templateId) {
          var tpl = TEMPLATES.find(function (t) { return t.id === data.templateId; }) || TEMPLATES.find(function (t) { return t.id === 'custom'; });
          S.setTpl(tpl);
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
  elements: S.elements,
});
