// ─── Layer Panel: 图层管理面板 ─────────────────────────────────────
import * as S from '../state.js';
import { captureState } from '../history.js';
import { removeElement, moveElementZ, isInCameraZone } from './elements.js';
import { getDevice } from '../devices.js';
import { toast } from './toast.js';

var _panelVisible = false;
var _dragSrcIdx = -1;

var TYPE_ICONS = {
  text: '🔤', rectangle: '⬜', circle: '⭕', image: '🖼️', video: '🎬',
  arc: '🌗', progress: '📊', lottie: '✨',
};

var TYPE_LABELS = {
  text: '文字', rectangle: '矩形', circle: '圆形', image: '图片', video: '视频',
  arc: '弧形', progress: '进度条', lottie: 'Lottie',
};

function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getElementLabel(el, idx) {
  if (el.type === 'text') return el.text || '空文字';
  if (el.type === 'image' || el.type === 'video') return el.originalName || el.fileName || TYPE_LABELS[el.type];
  if (el.type === 'rectangle' && el._isLine) return '线条';
  if (el.type === 'rectangle') return '矩形 #' + (idx + 1);
  return TYPE_LABELS[el.type] || el.type;
}

export function renderLayerPanel(deviceOverride) {
  var container = document.getElementById('layerPanelList');
  if (!container) return;

  var elements = S.elements;
  if (elements.length === 0) {
    container.innerHTML = '<div class="layer-empty">暂无元素<br><small>点击 + 添加元素</small></div>';
    return;
  }

  // Get device for camera zone check
  var deviceSelect = document.getElementById('deviceSelect');
  var device = deviceOverride || (deviceSelect ? getDevice(deviceSelect.value) : null);

  // Render in reverse order (top layer first)
  var html = '';
  for (var i = elements.length - 1; i >= 0; i--) {
    var el = elements[i];
    var isSelected = i === S.selIdx;
    var isHidden = el.visible === false;
    var isLocked = el.locked === true;
    var icon = TYPE_ICONS[el.type] || '❓';
    var label = getElementLabel(el, i);
    var inCam = device ? isInCameraZone(el, device) : false;

    html += '<div class="layer-item' + (isSelected ? ' selected' : '') + (isHidden ? ' hidden-el' : '') + '" ' +
      'data-layer-idx="' + i + '" draggable="true">' +
      '<span class="layer-drag-handle" title="拖拽排序">⠿</span>' +
      '<span class="layer-icon">' + icon + '</span>' +
      '<span class="layer-type-badge">' + el.type + '</span>' +
      '<span class="layer-label" title="' + esc(label) + '">' + esc(label) + '</span>' +
      (inCam ? '<span class="layer-cam-warn" title="在摄像头遮挡区内">⚠️</span>' : '') +
      '<span class="layer-actions">' +
        '<button class="layer-btn' + (isHidden ? ' active' : '') + '" data-layer-vis="' + i + '" title="' + (isHidden ? '显示' : '隐藏') + '">' + (isHidden ? '🙈' : '👁️') + '</button>' +
        '<button class="layer-btn' + (isLocked ? ' active' : '') + '" data-layer-lock="' + i + '" title="' + (isLocked ? '解锁' : '锁定') + '">' + (isLocked ? '🔒' : '🔓') + '</button>' +
        '<button class="layer-btn layer-del-btn" data-layer-del="' + i + '" title="删除">🗑️</button>' +
      '</span>' +
    '</div>';
  }
  container.innerHTML = html;
}

export function toggleLayerPanel() {
  _panelVisible = !_panelVisible;
  var panel = document.getElementById('layerPanel');
  var btn = document.getElementById('layerPanelToggle');
  if (panel) panel.classList.toggle('show', _panelVisible);
  if (btn) btn.classList.toggle('active', _panelVisible);
  if (_panelVisible) renderLayerPanel();
}

export function isLayerPanelVisible() {
  return _panelVisible;
}

export function initLayerPanel(callbacks) {
  var container = document.getElementById('layerPanelList');
  if (!container) return;

  // Click handlers
  container.addEventListener('click', function (e) {
    var visBtn = e.target.closest('[data-layer-vis]');
    if (visBtn) {
      e.stopPropagation();
      var vi = Number(visBtn.dataset.layerVis);
      if (vi >= 0 && vi < S.elements.length) {
        S.elements[vi].visible = S.elements[vi].visible === false ? true : false;
        S.setDirty(true);
        renderLayerPanel();
        if (callbacks.renderPreview) callbacks.renderPreview();
        if (callbacks.renderLivePreview) callbacks.renderLivePreview();
        toast(S.elements[vi].visible === false ? '🙈 已隐藏' : '👁️ 已显示', 'info');
      }
      return;
    }

    var lockBtn = e.target.closest('[data-layer-lock]');
    if (lockBtn) {
      e.stopPropagation();
      var li = Number(lockBtn.dataset.layerLock);
      if (li >= 0 && li < S.elements.length) {
        S.elements[li].locked = !S.elements[li].locked;
        S.setDirty(true);
        renderLayerPanel();
        toast(S.elements[li].locked ? '🔒 已锁定' : '🔓 已解锁', 'info');
      }
      return;
    }

    var delBtn = e.target.closest('[data-layer-del]');
    if (delBtn) {
      e.stopPropagation();
      var di = Number(delBtn.dataset.layerDel);
      removeElement(di);
      renderLayerPanel();
      if (callbacks.renderConfig) callbacks.renderConfig();
      if (callbacks.renderPreview) callbacks.renderPreview();
      return;
    }

    // Select element
    var item = e.target.closest('.layer-item');
    if (item) {
      var idx = Number(item.dataset.layerIdx);
      S.setSelIdx(idx);
      renderLayerPanel();
      if (callbacks.renderConfig) callbacks.renderConfig();
    }
  });

  // Drag to reorder
  container.addEventListener('dragstart', function (e) {
    var item = e.target.closest('.layer-item');
    if (!item) return;
    _dragSrcIdx = Number(item.dataset.layerIdx);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(_dragSrcIdx));
  });

  container.addEventListener('dragend', function (e) {
    var item = e.target.closest('.layer-item');
    if (item) item.classList.remove('dragging');
    container.querySelectorAll('.layer-item').forEach(function (el) {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    _dragSrcIdx = -1;
  });

  container.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var item = e.target.closest('.layer-item');
    if (!item) return;
    var rect = item.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    container.querySelectorAll('.layer-item').forEach(function (el) {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    item.classList.add(e.clientY < midY ? 'drag-over-top' : 'drag-over-bottom');
  });

  container.addEventListener('drop', function (e) {
    e.preventDefault();
    var targetItem = e.target.closest('.layer-item');
    if (!targetItem || _dragSrcIdx < 0) return;

    var targetIdx = Number(targetItem.dataset.layerIdx);
    if (_dragSrcIdx === targetIdx) return;

    captureState('图层排序');

    // The panel shows reverse order, so we need to map correctly
    // Panel index 0 = elements[elements.length-1] (top layer)
    // We're moving _dragSrcIdx in the elements array
    var el = S.elements.splice(_dragSrcIdx, 1)[0];
    S.elements.splice(targetIdx, 0, el);
    S.setSelIdx(targetIdx);
    S.setDirty(true);

    renderLayerPanel();
    if (callbacks.renderConfig) callbacks.renderConfig();
    if (callbacks.renderPreview) callbacks.renderPreview();
    toast('📐 图层已调整', 'success');
  });
}
