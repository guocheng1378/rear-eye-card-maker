// ─── Element Editors: 共享工具函数 ──────────────────────────────────
import * as S from '../../state.js';
import { isInCameraZone } from '../elements.js';
import { cameraZoneWidth } from '../../devices.js';
import { escHtml } from '../../utils.js';

export function esc(s) { return escHtml(s); }

export function fieldHtml(label, input, full) {
  return '<div class="field"' + (full ? ' style="grid-column:1/-1"' : '') + '><label>' + label + '</label>' + input + '</div>';
}

export function colorFieldHtml(label, value, prop, idx) {
  var randBtn = (prop === 'color' || prop === 'fillColor2') ? '<button class="eyedropper-btn" data-rand-gradient="' + prop + '" data-idx="' + idx + '" title="随机渐变色">🎲</button>' : '';
  return '<div class="field field-color"><label>' + label + '</label>' +
    '<input type="color" value="' + value + '" data-prop="' + prop + '" data-idx="' + idx + '">' +
    '<span class="color-val">' + value + '</span>' +
    '<button class="eyedropper-btn" data-eyedropper="' + prop + '" data-eyedropper-idx="' + idx + '" title="取色器">🎨</button>' +
    randBtn +
    '</div>';
}

export function colorFieldHtml2(value, prop, idx) {
  return '<input type="color" value="' + (value || '#000000') + '" data-prop="' + prop + '" data-idx="' + idx + '" style="width:32px;height:28px;padding:2px;border-radius:4px;cursor:pointer;border:1px solid var(--border)">';
}

export var FONT_OPTIONS = [
  { id: 'default', name: '系统默认' },
  { id: 'mipro-normal', name: 'Mi Sans Regular' },
  { id: 'mipro-demibold', name: 'Mi Sans SemiBold' },
  { id: 'mipro-bold', name: 'Mi Sans Bold' },
  { id: 'mipro-light', name: 'Mi Sans Light' },
  { id: 'mibright', name: 'Mi Bright' },
  { id: 'noto-sans-sc', name: 'Noto Sans SC' },
  { id: 'roboto', name: 'Roboto' },
  { id: 'monospace', name: '等宽' },
];

export var LAYER_ICONS = {
  text: '🔤', rectangle: '⬜', circle: '⭕', image: '🖼️', video: '🎬',
  arc: '🌗', progress: '📊', lottie: '✨', group: '📦', layer: '🎨', musiccontrol: '🎵'
};

export var COLOR_PRESETS = [
  '#ffffff', '#e0e0e0', '#888888', '#333333', '#000000',
  '#ff6b6b', '#ee5a24', '#f0932b', '#fdcb6e', '#ffeaa7',
  '#00b894', '#55efc4', '#4ecdc4', '#0984e3', '#74b9ff',
  '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393', '#d63031',
];

export var THEME_PRESETS = [
  { name: '赛博朋克', colors: ['#ff00ff', '#00ffff', '#ff6600', '#0d0221', '#f706cf'] },
  { name: '莫兰迪',   colors: ['#b0a084', '#c9b8a8', '#8b7d6b', '#d5c4a1', '#a0522d'] },
  { name: '霓虹',     colors: ['#39ff14', '#ff073a', '#bc13fe', '#01ffff', '#ffff33'] },
  { name: '暗夜蓝',   colors: ['#0f1b2d', '#1a3a5c', '#2e86de', '#48dbfb', '#c8d6e5'] },
  { name: '日落',     colors: ['#e55039', '#f39c12', '#f8c291', '#78e08f', '#3d3d3d'] },
  { name: '极简',     colors: ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#ffffff'] },
  { name: '糖果',     colors: ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1'] },
  { name: '森林',     colors: ['#2d5016', '#4a7c23', '#6ab04c', '#badc58', '#f9ca24'] },
];

export function renderColorPresets(prop, idx) {
  var html = '<div class="color-presets">' +
    COLOR_PRESETS.map(function (c) {
      return '<div class="color-swatch" style="background:' + c + '" data-color="' + c + '" data-cprop="' + prop + '" data-cidx="' + idx + '" title="' + c + '"></div>';
    }).join('') + '</div>';
  html += '<div class="theme-presets">';
  THEME_PRESETS.forEach(function (theme) {
    html += '<div class="theme-preset" data-theme-cprop="' + prop + '" data-theme-cidx="' + idx + '" title="' + theme.name + '">' +
      theme.colors.map(function (c) { return '<div class="theme-dot" style="background:' + c + '"></div>'; }).join('') +
      '<span class="theme-name">' + theme.name + '</span></div>';
  });
  html += '</div>';
  return html;
}

// ── Camera zone warning ──
export function renderCameraWarning(el, idx, device) {
  if (!isInCameraZone(el, device)) return '';
  var safeX = cameraZoneWidth(device);
  return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:rgba(225,112,85,0.1);border:1px solid rgba(225,112,85,0.3);border-radius:8px;font-size:12px;color:#e17055"><span>⚠️</span> 此元素位于摄像头遮挡区内，建议将 X 调整到 ≥ ' + safeX + '</div>';
}

// ── Element type label ──
export function getElementTypeLabel(el) {
  var labels = {
    text: '文字', rectangle: '矩形', circle: '圆形', arc: '弧形',
    image: '图片', video: '视频', progress: '进度条', lottie: 'Lottie 动画',
    group: '容器组', layer: '材质层', musiccontrol: '音乐控件'
  };
  return labels[el.type] || el.type;
}
