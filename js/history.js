// ─── History: 撤销/重做 ──────────────────────────────────────────
import * as S from './state.js';

var history = [];
var redoStack = [];
var historyLabels = [];

function deepClone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof ArrayBuffer) return v.slice(0);
  if (v instanceof Uint8Array) return new Uint8Array(v);
  if (Array.isArray(v)) return v.map(deepClone);
  if (typeof structuredClone === 'function') {
    try { return structuredClone(v); } catch (e) { /* fallback */ }
  }
  var clone = {};
  for (var key in v) {
    if (v.hasOwnProperty(key)) clone[key] = deepClone(v[key]);
  }
  return clone;
}

export function captureState(label) {
  var filesSnapshot = {};
  Object.keys(S.uploadedFiles).forEach(function (k) {
    var f = S.uploadedFiles[k];
    filesSnapshot[k] = { mimeType: f.mimeType, originalName: f.originalName, fileName: f.fileName };
  });
  history.push({ cfg: deepClone(S.cfg), elements: deepClone(S.elements), files: filesSnapshot });
  historyLabels.push(label || '操作');
  redoStack = [];
  if (history.length > 50) { history.shift(); historyLabels.shift(); }
}

export function undo() {
  if (history.length === 0) return;
  redoStack.push({ cfg: deepClone(S.cfg), elements: deepClone(S.elements) });
  var state = history.pop();
  historyLabels.pop();
  S.setCfg(state.cfg);
  S.setElements(state.elements);
  S.setDirty(true);
  return { needsRerender: true, message: '↩ 已撤销' };
}

export function redo() {
  if (redoStack.length === 0) return;
  history.push({ cfg: deepClone(S.cfg), elements: deepClone(S.elements) });
  historyLabels.push('重做');
  var state = redoStack.pop();
  S.setCfg(state.cfg);
  S.setElements(state.elements);
  S.setDirty(true);
  return { needsRerender: true, message: '↪ 已重做' };
}

export function undoTo(idx) {
  var results = [];
  while (history.length > idx) {
    var r = undo();
    if (r) results.push(r);
  }
  return results;
}

export function getHistoryLabels() {
  return historyLabels.slice();
}

export function resetHistory() {
  history = [];
  redoStack = [];
  historyLabels = [];
}
