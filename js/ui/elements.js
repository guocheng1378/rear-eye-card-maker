// ─── Elements: 元素操作 ──────────────────────────────────────────
import * as S from '../state.js';
import { captureState } from '../history.js';
import { getDevice, cameraZoneWidth } from '../devices.js';
import { toast } from './toast.js';

export var ElementDefaults = {
  text: function () { return { type: 'text', text: '新文字', x: Math.round(device.width * device.cameraZoneRatio) + 10, y: 60, size: 24, color: '#ffffff', fontFamily: 'default', textAlign: 'left', bold: false, underline: false, strikethrough: false, letterSpacing: 0, multiLine: false, w: 200, shadow: 'none', opacity: 100, rotation: 0, lineHeight: 1.4, textGradient: 'none', gradientColor2: '#ff6b6b', textStroke: 0, textStrokeColor: '#000000', expression: '', locked: false }; },
  rectangle: function () { return { type: 'rectangle', x: Math.round(device.width * device.cameraZoneRatio) + 10, y: 60, w: 100, h: 40, color: '#333333', radius: 0, opacity: 100, rotation: 0, fillColor2: '', blur: 0, strokeWidth: 0, strokeColor: '#ffffff', brightness: 100, saturate: 100, hueRotate: 0, locked: false }; },
  circle: function () { return { type: 'circle', x: 50, y: 100, r: 30, color: '#6c5ce7', opacity: 100, rotation: 0, strokeWidth: 0, strokeColor: '#ffffff', locked: false }; },
  line: function () { return { type: 'rectangle', x: 10, y: 100, w: 200, h: 2, color: '#555555', radius: 1, opacity: 60, rotation: 0, _isLine: true, locked: false }; },
  arc: function () { return { type: 'arc', x: 50, y: 50, r: 40, startAngle: 0, endAngle: 270, color: '#6c5ce7', strokeWidth: 6, locked: false }; },
  progress: function () { return { type: 'progress', x: 10, y: 100, w: 200, h: 8, color: '#6c5ce7', bgColor: '#333333', value: 60, radius: 4, locked: false }; },
  lottie: function () { return { type: 'lottie', x: 50, y: 50, w: 120, h: 120, fileName: '', src: '', name: '', align: 'center', autoplay: true, loop: 0, speed: 1, locked: false, _browserOnly: true }; },
  group: function () { return { type: 'group', x: 0, y: 0, w: 200, h: 200, name: 'group_' + Date.now(), alpha: 1, visibility: '', folmeMode: false, align: '', alignV: '', contentDescription: '', children: [], locked: false }; },
  layer: function () { return { type: 'layer', name: 'layer_' + Date.now(), alpha: 1, visibility: '', layerType: 'bottom', blurRadius: 0, blurColors: '', colorModes: 0, frameRate: -1, updatePosition: true, updateSize: true, updateTranslation: true, children: [], locked: false }; },
  musiccontrol: function () { return { type: 'musiccontrol', name: 'music_control', w: 0, h: 0, x: 0, y: 0, autoShow: false, autoRefresh: true, enableLyric: true, updateLyricInterval: 100, children: [], locked: false }; },
};

export function getSelectedDevice() {
  return getDevice(document.getElementById('deviceSelect').value);
}

export function isInCameraZone(el, device) {
  var zoneW = device.width * device.cameraZoneRatio;
  var elW = el.w || (el.r ? el.r * 2 : 0) || (el.size ? (el.text || '').length * el.size * 0.6 : 50);
  return el.x < zoneW && (el.x + elW) <= zoneW * 1.5;
}

export function addElement(type) {
  captureState('添加 ' + type);
  if (ElementDefaults[type]) {
    var newEl = JSON.parse(JSON.stringify(ElementDefaults[type]()));
    if (type === 'arc') toast('⚠️ 弧形在 MAML 中用圆形模拟，预览用 SVG 渲染', 'info');
    if (type === 'group') toast('📦 Group 容器：可以嵌套子元素', 'info');
    if (type === 'layer') toast('🎨 Layer 层：超级材质底层效果', 'info');
    if (type === 'musiccontrol') toast('🎵 MusicControl：音乐播放控件', 'info');
    S.elements.push(newEl);
    S.setSelIdx(S.elements.length - 1);
    S.setDirty(true);
    return true;
  }
  return false;
}

export function removeElement(idx) {
  captureState('删除元素');
  var el = S.elements[idx];
  if (el && el.fileName) {
    var stillUsed = S.elements.some(function (e, i) { return i !== idx && e.fileName === el.fileName; });
    if (!stillUsed) {
      var fi = S.uploadedFiles[el.fileName];
      if (fi && fi.dataUrl && fi.dataUrl.indexOf('blob:') === 0) try { URL.revokeObjectURL(fi.dataUrl); } catch (e) {}
      delete S.uploadedFiles[el.fileName];
    }
  }
  S.elements.splice(idx, 1);
  if (S.selIdx >= S.elements.length) S.setSelIdx(S.elements.length - 1);
  S.setDirty(true);
  toast('🗑️ 已删除', 'success');
}

export function alignElement(idx, align) {
  if (idx < 0 || idx >= S.elements.length) return;
  captureState('对齐 ' + align);
  var device = getSelectedDevice();
  var el = S.elements[idx];
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
  S.setDirty(true);
}

export function applyQuickSize(idx, size) {
  if (idx < 0 || idx >= S.elements.length) return;
  captureState('调整大小 ' + size);
  var device = getSelectedDevice();
  var el = S.elements[idx];
  var safeW = device.width * (1 - device.cameraZoneRatio);
  switch (size) {
    case 'full':    el.w = Math.round(safeW - 20); el.h = device.height - 20; break;
    case 'half':    el.w = Math.round(safeW - 20); el.h = Math.round(device.height / 2 - 20); break;
    case 'quarter': el.w = Math.round(safeW / 2 - 20); el.h = Math.round(device.height / 2 - 20); break;
  }
  S.setDirty(true);
}

export function moveElementZ(idx, dir) {
  captureState('调整层级');
  var newIdx = dir === 'up' ? idx + 1 : idx - 1;
  if (newIdx < 0 || newIdx >= S.elements.length) return;
  var tmp = S.elements[idx];
  S.elements[idx] = S.elements[newIdx];
  S.elements[newIdx] = tmp;
  S.setSelIdx(newIdx);
  S.setDirty(true);
}

// ── Distribute evenly (horizontal/vertical) ──
export function distributeElements(dir) {
  if (S.elements.length < 3) return;
  captureState('分布排列');
  var sorted = S.elements.map(function (el, i) { return { idx: i, el: el }; });
  if (dir === 'horizontal') {
    sorted.sort(function (a, b) { return a.el.x - b.el.x; });
    var first = sorted[0].el.x, last = sorted[sorted.length - 1].el.x;
    var totalSpace = last - first;
    var step = totalSpace / (sorted.length - 1);
    sorted.forEach(function (item, i) { if (i > 0 && i < sorted.length - 1) item.el.x = Math.round(first + step * i); });
  } else {
    sorted.sort(function (a, b) { return a.el.y - b.el.y; });
    var firstY = sorted[0].el.y, lastY = sorted[sorted.length - 1].el.y;
    var totalSpaceY = lastY - firstY;
    var stepY = totalSpaceY / (sorted.length - 1);
    sorted.forEach(function (item, i) { if (i > 0 && i < sorted.length - 1) item.el.y = Math.round(firstY + stepY * i); });
  }
  S.setDirty(true);
  toast('📐 已分布排列', 'success');
}

// ── Match size (width/height/both) ──
export function matchSize(prop) {
  if (S.selIdx < 0 || S.elements.length < 2) return;
  captureState('统一大小');
  var src = S.elements[S.selIdx];
  S.elements.forEach(function (el, i) {
    if (i === S.selIdx) return;
    if (prop === 'width' || prop === 'both') { if (el.w !== undefined && src.w !== undefined) el.w = src.w; }
    if (prop === 'height' || prop === 'both') { if (el.h !== undefined && src.h !== undefined) el.h = src.h; }
  });
  S.setDirty(true);
  toast('📐 已统一大小', 'success');
}

// ── Copy/Paste element style ──
var _styleClipboard = null;
export function copyStyle(idx) {
  if (idx < 0 || idx >= S.elements.length) return;
  var el = S.elements[idx];
  _styleClipboard = {};
  var styleProps = ['color', 'fillColor2', 'opacity', 'shadow', 'fontFamily', 'bold', 'underline', 'strikethrough', 'letterSpacing', 'textGradient', 'gradientColor2', 'textStroke', 'textStrokeColor', 'radius', 'blur', 'strokeWidth', 'strokeColor', 'brightness', 'saturate', 'hueRotate', 'fit', 'rotation'];
  styleProps.forEach(function (p) { if (el[p] !== undefined) _styleClipboard[p] = el[p]; });
  toast('📋 样式已复制', 'success');
}
export function pasteStyle(idx) {
  if (!_styleClipboard || idx < 0 || idx >= S.elements.length) return;
  captureState('粘贴样式');
  var el = S.elements[idx];
  Object.keys(_styleClipboard).forEach(function (p) {
    // Only paste properties that make sense for the target element type
    if (p === 'fontFamily' || p === 'bold' || p === 'underline' || p === 'strikethrough' || p === 'letterSpacing' || p === 'textGradient' || p === 'gradientColor2' || p === 'textStroke' || p === 'textStrokeColor' || p === 'shadow') {
      if (el.type === 'text') el[p] = _styleClipboard[p];
    } else if (p === 'fillColor2' || p === 'blur') {
      if (el.type === 'rectangle') el[p] = _styleClipboard[p];
    } else if (p === 'fit') {
      if (el.type === 'image' || el.type === 'video') el[p] = _styleClipboard[p];
    } else {
      if (el[p] !== undefined) el[p] = _styleClipboard[p];
    }
  });
  S.setDirty(true);
  toast('📌 样式已粘贴', 'success');
}
export function hasStyleClipboard() { return !!_styleClipboard; }

// ── Element style presets (localStorage) ──
var STYLE_PRESET_KEY = 'jcm-style-presets';
export function getStylePresets() {
  try { return JSON.parse(localStorage.getItem(STYLE_PRESET_KEY) || '[]'); } catch(e) { return []; }
}
export function saveStylePreset(name, idx) {
  if (idx < 0 || idx >= S.elements.length) return;
  var el = S.elements[idx];
  var preset = { name: name, type: el.type, timestamp: Date.now() };
  var styleProps = ['color', 'fillColor2', 'opacity', 'shadow', 'fontFamily', 'size', 'bold', 'underline', 'strikethrough', 'letterSpacing', 'textGradient', 'gradientColor2', 'textStroke', 'textStrokeColor', 'radius', 'blur', 'strokeWidth', 'strokeColor', 'brightness', 'saturate', 'hueRotate', 'fit', 'w', 'h', 'rotation'];
  styleProps.forEach(function (p) { if (el[p] !== undefined) preset[p] = el[p]; });
  var presets = getStylePresets();
  presets.unshift(preset);
  if (presets.length > 20) presets = presets.slice(0, 20);
  try { localStorage.setItem(STYLE_PRESET_KEY, JSON.stringify(presets)); } catch(e) {}
  toast('💾 样式已保存: ' + name, 'success');
}
export function applyStylePreset(idx, preset) {
  if (idx < 0 || idx >= S.elements.length || !preset) return;
  captureState('应用预设样式');
  var el = S.elements[idx];
  Object.keys(preset).forEach(function (p) {
    if (p === 'name' || p === 'type' || p === 'timestamp') return;
    if (el[p] !== undefined) el[p] = preset[p];
  });
  S.setDirty(true);
  toast('📦 已应用: ' + preset.name, 'success');
}
