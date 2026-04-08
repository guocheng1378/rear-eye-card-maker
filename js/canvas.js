// ─── Canvas: 预览区拖拽 + 缩放 + 智能对齐 ────────────────────────
import * as S from './state.js';
import { getDevice } from './devices.js';

var dragging = null;
var resizing = null;
var rafPending = false;

function getPointerPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

// 动态选择设备：根据当前激活的预览容器
function getActiveDevice() {
  var cfgPage = document.getElementById('page1');
  var isCfgActive = cfgPage && cfgPage.classList.contains('active');
  var selId = isCfgActive ? 'cfgDeviceSelect' : 'deviceSelect';
  return getDevice(document.getElementById(selId).value);
}

// 获取当前活跃的 preview-screen 容器
function getActiveScreen() {
  var cfgPage = document.getElementById('page1');
  var isCfgActive = cfgPage && cfgPage.classList.contains('active');
  if (isCfgActive) {
    return document.querySelector('.config-live-right .preview-screen');
  }
  return document.querySelector('#page2 .preview-screen');
}

// ─── Smart Align ──────────────────────────────────────────────────
function applySmartAlign(nx, ny) {
  var el = S.elements[dragging.idx];
  var elW = el.w || (el.r ? el.r * 2 : 0) || 50;
  var elH = el.h || (el.r ? el.r * 2 : 0) || 30;
  var elCX = nx + elW / 2;
  var elCY = ny + elH / 2;
  var snapThreshold = 6;
  var device = dragging.device;
  var guides = [];

  if (Math.abs(elCX - device.width / 2) < snapThreshold) {
    nx = Math.round(device.width / 2 - elW / 2);
    guides.push({ type: 'v', pos: device.width / 2 });
  }
  if (Math.abs(elCY - device.height / 2) < snapThreshold) {
    ny = Math.round(device.height / 2 - elH / 2);
    guides.push({ type: 'h', pos: device.height / 2 });
  }

  for (var i = 0; i < S.elements.length; i++) {
    if (i === dragging.idx) continue;
    var other = S.elements[i];
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

// ─── Guide Lines ──────────────────────────────────────────────────
function renderGuideLines(guides, scale) {
  var screen = getActiveScreen();
  if (!screen) return;
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
  document.querySelectorAll('.align-guide').forEach(function (g) { g.remove(); });
}

// ─── Resize Handlers ──────────────────────────────────────────────
function onResizeMove(e) {
  if (!resizing) return;
  e.preventDefault();
  var pos = getPointerPos(e);
  var dx = (pos.clientX - resizing.startX) / resizing.scale;
  var dy = (pos.clientY - resizing.startY) / resizing.scale;
  var nw = Math.max(20, Math.round(resizing.origW + dx));
  var nh = Math.max(20, Math.round(resizing.origH + dy));

  var snap = document.getElementById('snapToggle');
  if (snap && snap.checked) {
    nw = Math.round(nw / S.SNAP_GRID) * S.SNAP_GRID;
    nh = Math.round(nh / S.SNAP_GRID) * S.SNAP_GRID;
  }

  S.elements[resizing.idx].w = nw;
  S.elements[resizing.idx].h = nh;

  if (resizing.onUpdate) resizing.onUpdate();

  var wInput = document.querySelector('[data-prop="w"][data-idx="' + resizing.idx + '"]');
  var hInput = document.querySelector('[data-prop="h"][data-idx="' + resizing.idx + '"]');
  if (wInput) wInput.value = nw;
  if (hInput) hInput.value = nh;
}

function onResizeUp() {
  resizing = null;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeUp);
  document.removeEventListener('touchmove', onResizeMove);
  document.removeEventListener('touchend', onResizeUp);
}

// ─── Drag Handlers ────────────────────────────────────────────────
function onPreviewMouseMove(e) {
  if (!dragging || rafPending) return;
  e.preventDefault();
  rafPending = true;
  requestAnimationFrame(function () {
    rafPending = false;
    if (!dragging) return;
    var pos = getPointerPos(e);
    var dx = (pos.clientX - dragging.startX) / dragging.scale;
    var dy = (pos.clientY - dragging.startY) / dragging.scale;

    var nx = Math.round(dragging.origX + dx);
    var ny = Math.round(dragging.origY + dy);

    var snap = document.getElementById('snapToggle');
    if (snap && snap.checked) {
      nx = Math.round(nx / S.SNAP_GRID) * S.SNAP_GRID;
      ny = Math.round(ny / S.SNAP_GRID) * S.SNAP_GRID;
    }

    var aligned = applySmartAlign(nx, ny);
    S.elements[dragging.idx].x = Math.max(0, Math.min(aligned.x, dragging.device.width - 10));
    S.elements[dragging.idx].y = Math.max(0, Math.min(aligned.y, dragging.device.height - 10));

    if (dragging.onUpdate) dragging.onUpdate();
    renderGuideLines(aligned.guides || [], dragging.scale);
  });
}

function onPreviewMouseUp() {
  dragging = null;
  clearGuideLines();
  document.querySelectorAll('.preview-content').forEach(function(c){ c.classList.remove('dragging'); });
  document.removeEventListener('mousemove', onPreviewMouseMove);
  document.removeEventListener('mouseup', onPreviewMouseUp);
  document.removeEventListener('touchmove', onPreviewMouseMove);
  document.removeEventListener('touchend', onPreviewMouseUp);
}

// ─── Pointer Down (entry point) ───────────────────────────────────
// callbacks: { captureState, renderPreview, renderConfig, renderLivePreview }
export function initCanvas(callbacks) {
  var previewContent = document.getElementById('previewContent');
  if (previewContent) bindCanvasEvents(previewContent, callbacks);

  var cfgPreviewContent = document.getElementById('cfgPreviewContent');
  if (cfgPreviewContent) bindCanvasEvents(cfgPreviewContent, callbacks);
}

function bindCanvasEvents(container, callbacks) {
  container.addEventListener('mousedown', function (e) {
    handlePointerDown(e, callbacks);
  });
  container.addEventListener('touchstart', function (e) {
    handlePointerDown(e, callbacks);
  }, { passive: false });
}

function handlePointerDown(e, callbacks) {
  var target = e.target;

  // Resize handle
  var rh = target.closest('[data-resize-idx]');
  if (rh) {
    var idx = parseInt(rh.dataset.resizeIdx, 10);
    if (!isNaN(idx) && idx < S.elements.length) {
      e.preventDefault();
      e.stopPropagation();
      var pos = getPointerPos(e);
      var device = getActiveDevice();
      var screen = getActiveScreen();
      var rect = screen.getBoundingClientRect();
      var scale = rect.width / device.width;
      resizing = {
        idx: idx,
        startX: pos.clientX,
        startY: pos.clientY,
        origW: S.elements[idx].w || 100,
        origH: S.elements[idx].h || 100,
        scale: scale,
        onUpdate: function () { triggerUpdate(callbacks); },
      };
      callbacks.captureState();
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
  if (isNaN(idx) || idx >= S.elements.length) return;
  if (S.elements[idx].locked) return;

  e.preventDefault();
  var pos2 = getPointerPos(e);
  var device2 = getActiveDevice();
  var screen2 = getActiveScreen();
  var rect2 = screen2.getBoundingClientRect();
  var scale2 = rect2.width / device2.width;

  // Alt+drag = duplicate
  if (e.altKey) {
    callbacks.captureState('复制并拖拽');
    var clone = JSON.parse(JSON.stringify(S.elements[idx]));
    clone.x += 10;
    clone.y += 10;
    S.elements.push(clone);
    idx = S.elements.length - 1;
    S.setSelIdx(idx);
    S.setDirty(true);
    callbacks.renderConfig();
  }

  dragging = {
    idx: idx,
    startX: pos2.clientX,
    startY: pos2.clientY,
    origX: S.elements[idx].x,
    origY: S.elements[idx].y,
    scale: scale2,
    device: device2,
    onUpdate: function () { triggerUpdate(callbacks); },
  };

  callbacks.captureState();
  S.setSelIdx(idx);
  S.setDirty(true);
  callbacks.renderConfig();

  // Add dragging cursor class
  var activeScreen = getActiveScreen();
  if (activeScreen) {
    var pc = activeScreen.querySelector('.preview-content');
    if (pc) pc.classList.add('dragging');
  }

  document.addEventListener('mousemove', onPreviewMouseMove);
  document.addEventListener('mouseup', onPreviewMouseUp);
  document.addEventListener('touchmove', onPreviewMouseMove, { passive: false });
  document.addEventListener('touchend', onPreviewMouseUp);
}

// 同时更新两个预览
function triggerUpdate(callbacks) {
  if (callbacks.renderPreview) callbacks.renderPreview();
  if (callbacks.renderLivePreview) callbacks.renderLivePreview();
}
