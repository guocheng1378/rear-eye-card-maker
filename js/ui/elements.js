// ─── Elements: 元素操作 ──────────────────────────────────────────
import * as S from '../state.js';
import { captureState } from '../history.js';
import { getDevice, cameraZoneWidth } from '../devices.js';
import { toast } from './toast.js';

export var ElementDefaults = {
  text: function () { return { type: 'text', text: '新文字', x: 10, y: 60, size: 24, color: '#ffffff', fontFamily: 'default', textAlign: 'left', bold: false, multiLine: false, w: 200, shadow: 'none', opacity: 100, rotation: 0, lineHeight: 1.4, textGradient: 'none', gradientColor2: '#ff6b6b', textStroke: 0, textStrokeColor: '#000000', locked: false }; },
  rectangle: function () { return { type: 'rectangle', x: 10, y: 60, w: 100, h: 40, color: '#333333', radius: 0, opacity: 100, rotation: 0, fillColor2: '', blur: 0, locked: false }; },
  circle: function () { return { type: 'circle', x: 50, y: 100, r: 30, color: '#6c5ce7', opacity: 100, rotation: 0, strokeWidth: 0, strokeColor: '#ffffff', locked: false }; },
  line: function () { return { type: 'rectangle', x: 10, y: 100, w: 200, h: 2, color: '#555555', radius: 1, opacity: 60, rotation: 0, _isLine: true, locked: false }; },
  arc: function () { return { type: 'arc', x: 50, y: 50, r: 40, startAngle: 0, endAngle: 270, color: '#6c5ce7', strokeWidth: 6, locked: false }; },
  progress: function () { return { type: 'progress', x: 10, y: 100, w: 200, h: 8, color: '#6c5ce7', bgColor: '#333333', value: 60, radius: 4, locked: false }; },
  lottie: function () { return { type: 'lottie', x: 50, y: 50, w: 120, h: 120, fileName: '', speed: 1, locked: false, _browserOnly: true }; },
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
    if (type === 'lottie') toast('⚠️ Lottie 仅浏览器预览可用，MAML 不支持此格式', 'warning');
    if (type === 'arc') toast('⚠️ 弧形在 MAML 中用圆形模拟，预览用 SVG 渲染', 'info');
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
