// ─── State: 共享状态 ─────────────────────────────────────────────
// 所有模块引用同一份状态，避免全局变量污染

export let step = 0;
export let tpl = null;
export let cfg = {};
export let elements = [];
export let selIdx = -1;
export let dirty = true;
export let uploadedFiles = {};
export let pendingAdd = null;
export let pendingReplace = -1;
export const SNAP_GRID = 10;
export let clipboard = null;

export function setStep(v) { step = v; }
export function setTpl(v) { tpl = v; }
export function setCfg(v) { cfg = v; }
export function setElements(v) { elements = v; }
export function setSelIdx(v) { selIdx = v; }
export function setDirty(v) { dirty = v; }
export function setUploadedFiles(v) { uploadedFiles = v; }
export function setPendingAdd(v) { pendingAdd = v; }
export function setPendingReplace(v) { pendingReplace = v; }
export function setClipboard(v) { clipboard = v; }
