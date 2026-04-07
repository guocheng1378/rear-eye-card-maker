// ─── Design Tools: 调色板 + 字体预览 + 渐变编辑器 + 动画编辑器 ───
import * as S from '../state.js';
import { toast } from './toast.js';
import { captureState } from '../history.js';

var _modal = null;
var _tab = 'palette';

// ─── Color Harmony Generator ──────────────────────────────────────
function hexToHSL(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substr(0, 2), 16) / 255;
  var g = parseInt(hex.substr(2, 2), 16) / 255;
  var b = parseInt(hex.substr(4, 2), 16) / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  var r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    var hue2rgb = function (p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return '#' + [r, g, b].map(function (x) { return Math.round(x * 255).toString(16).padStart(2, '0'); }).join('');
}

function generateHarmony(baseHex, type) {
  var hsl = hexToHSL(baseHex);
  var h = hsl[0], s = hsl[1], l = hsl[2];
  var colors = [baseHex];
  switch (type) {
    case 'complementary':
      colors.push(hslToHex((h + 180) % 360, s, l));
      break;
    case 'triadic':
      colors.push(hslToHex((h + 120) % 360, s, l));
      colors.push(hslToHex((h + 240) % 360, s, l));
      break;
    case 'split':
      colors.push(hslToHex((h + 150) % 360, s, l));
      colors.push(hslToHex((h + 210) % 360, s, l));
      break;
    case 'analogous':
      colors.push(hslToHex((h + 30) % 360, s, l));
      colors.push(hslToHex((h + 330) % 360, s, l));
      break;
    case 'monochromatic':
      colors.push(hslToHex(h, s, Math.min(l + 20, 95)));
      colors.push(hslToHex(h, s, Math.max(l - 20, 5)));
      colors.push(hslToHex(h, Math.max(s - 30, 10), l));
      break;
  }
  return colors;
}

// ─── Font List ────────────────────────────────────────────────────
var FONTS = [
  { id: 'default', name: '系统默认', family: '-apple-system, sans-serif' },
  { id: 'mipro-normal', name: 'Mi Sans Regular', family: 'MiSans, sans-serif' },
  { id: 'mipro-demibold', name: 'Mi Sans SemiBold', family: 'MiSans, sans-serif', weight: 600 },
  { id: 'mipro-bold', name: 'Mi Sans Bold', family: 'MiSans, sans-serif', weight: 700 },
  { id: 'mipro-light', name: 'Mi Sans Light', family: 'MiSans, sans-serif', weight: 300 },
  { id: 'mibright', name: 'Mi Bright', family: 'MiBright, serif' },
  { id: 'noto-sans-sc', name: 'Noto Sans SC', family: '"Noto Sans SC", sans-serif' },
  { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'monospace', name: '等宽', family: 'monospace' },
];

// ─── Tab Renderers ────────────────────────────────────────────────
function renderPaletteTab() {
  var base = S.selIdx >= 0 && S.elements[S.selIdx] && S.elements[S.selIdx].color ? S.elements[S.selIdx].color : '#6c5ce7';
  var types = ['complementary', 'triadic', 'split', 'analogous', 'monochromatic'];
  var typeNames = { complementary: '互补色', triadic: '三色', split: '分裂互补', analogous: '类似色', monochromatic: '单色' };
  var html = '<div style="padding:12px">';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;color:var(--text2)">基准色</label><div style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="color" id="paletteBase" value="' + base + '" style="width:40px;height:32px;border:none;cursor:pointer"><span style="font-family:monospace;font-size:13px" id="paletteBaseHex">' + base + '</span></div></div>';

  types.forEach(function (type) {
    var colors = generateHarmony(base, type);
    html += '<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text3);margin-bottom:6px">' + typeNames[type] + '</div><div style="display:flex;gap:4px">';
    colors.forEach(function (c) {
      html += '<div style="flex:1;height:36px;background:' + c + ';border-radius:6px;cursor:pointer;position:relative" class="palette-swatch" data-color="' + c + '" title="' + c + '"><span style="position:absolute;bottom:2px;left:4px;font-size:9px;color:' + (hexToHSL(c)[2] > 50 ? '#000' : '#fff') + ';font-family:monospace">' + c + '</span></div>';
    });
    html += '</div></div>';
  });

  html += '</div>';
  return html;
}

function renderFontTab() {
  var html = '<div style="padding:12px">';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">点击应用到当前选中元素</div>';
  FONTS.forEach(function (f) {
    var isActive = S.selIdx >= 0 && S.elements[S.selIdx] && S.elements[S.selIdx].fontFamily === f.id;
    html += '<div class="font-preview-item' + (isActive ? ' active' : '') + '" data-font-apply="' + f.id + '" style="padding:10px 12px;margin-bottom:4px;border-radius:8px;cursor:pointer;border:1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)') + ';background:' + (isActive ? 'var(--accent-glow)' : 'var(--surface2)') + '">' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">' + f.name + '</div>' +
      '<div style="font-family:' + f.family + ';font-size:18px;' + (f.weight ? 'font-weight:' + f.weight + ';' : '') + '">小米背屏卡片 123 ABC</div>' +
      '</div>';
  });
  html += '</div>';
  return html;
}

function renderGradientTab() {
  var el = S.selIdx >= 0 ? S.elements[S.selIdx] : null;
  var gradColor1 = (el && el.color) ? el.color : '#6c5ce7';
  var gradColor2 = (el && el.gradientColor2) ? el.gradientColor2 : '#00b894';

  var html = '<div style="padding:12px">';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">拖拽色标编辑渐变，点击预设快速应用</div>';

  // Live preview bar
  html += '<div id="gradPreviewBar" style="height:48px;border-radius:10px;background:linear-gradient(135deg,' + gradColor1 + ',' + gradColor2 + ');margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4)">预览</div>';

  // Color inputs
  html += '<div style="display:flex;gap:12px;margin-bottom:16px">';
  html += '<div style="flex:1"><label style="font-size:11px;color:var(--text3)">起始色</label><div style="display:flex;gap:6px;align-items:center;margin-top:4px"><input type="color" id="gradColor1" value="' + gradColor1 + '" style="width:32px;height:28px;border:none;cursor:pointer"><span style="font-family:monospace;font-size:11px">' + gradColor1 + '</span></div></div>';
  html += '<div style="flex:1"><label style="font-size:11px;color:var(--text3)">结束色</label><div style="display:flex;gap:6px;align-items:center;margin-top:4px"><input type="color" id="gradColor2" value="' + gradColor2 + '" style="width:32px;height:28px;border:none;cursor:pointer"><span style="font-family:monospace;font-size:11px">' + gradColor2 + '</span></div></div>';
  html += '</div>';

  // Direction
  var directions = [
    { v: 'top_bottom', l: '↓ 下', css: 'to bottom' },
    { v: 'left_right', l: '→ 右', css: 'to right' },
    { v: 'diagonal', l: '↘ 右下', css: 'to bottom right' },
    { v: 'radial', l: '◉ 径向', css: 'radial-gradient' },
  ];
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:6px">方向</div><div style="display:flex;gap:6px;margin-bottom:16px">';
  directions.forEach(function (d) {
    html += '<button class="el-btn" data-grad-dir="' + d.v + '" style="flex:1;font-size:11px">' + d.l + '</button>';
  });
  html += '</div>';

  // Presets
  var presets = [
    { name: '赛博朋克', c1: '#ff00ff', c2: '#00ffff' },
    { name: '日落', c1: '#e55039', c2: '#f39c12' },
    { name: '海洋', c1: '#0984e3', c2: '#00cec9' },
    { name: '森林', c1: '#2d5016', c2: '#6ab04c' },
    { name: '极光', c1: '#6c5ce7', c2: '#00b894' },
    { name: '霓虹', c1: '#ff00ff', c2: '#39ff14' },
    { name: '暗金', c1: '#2c3e50', c2: '#f39c12' },
    { name: '玫瑰', c1: '#e84393', c2: '#fd79a8' },
  ];
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:6px">预设</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
  presets.forEach(function (p) {
    html += '<div class="grad-preset" data-gp-c1="' + p.c1 + '" data-gp-c2="' + p.c2 + '" style="height:32px;border-radius:6px;background:linear-gradient(135deg,' + p.c1 + ',' + p.c2 + ');cursor:pointer;position:relative" title="' + p.name + '"><span style="position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:8px;color:rgba(255,255,255,.8);text-shadow:0 1px 2px rgba(0,0,0,.5)">' + p.name + '</span></div>';
  });
  html += '</div>';

  // Apply button
  html += '<button class="btn btn-primary" id="gradApplyBtn" style="width:100%;margin-top:16px;font-size:12px">应用到选中元素</button>';

  html += '</div>';
  return html;
}

function renderAnimationTab() {
  var el = S.selIdx >= 0 ? S.elements[S.selIdx] : null;
  if (!el) return '<div style="padding:40px;text-align:center;color:var(--text3)">请先选中一个元素</div>';

  var animations = [
    { v: 'none', l: '无动画' },
    { v: 'fadeIn', l: '淡入' },
    { v: 'fadeOut', l: '淡出' },
    { v: 'slideInLeft', l: '从左滑入' },
    { v: 'slideInRight', l: '从右滑入' },
    { v: 'slideInUp', l: '从下滑入' },
    { v: 'slideInDown', l: '从上滑入' },
    { v: 'zoomIn', l: '放大进入' },
    { v: 'zoomOut', l: '缩小退出' },
    { v: 'bounce', l: '弹跳' },
    { v: 'pulse', l: '脉冲' },
    { v: 'shake', l: '抖动' },
    { v: 'rotate', l: '旋转' },
    { v: 'blink', l: '闪烁' },
  ];

  var html = '<div style="padding:12px">';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">为「' + el.type + '」元素添加动画</div>';

  // Animation type
  html += '<div class="field"><label>动画类型</label><select id="animName" style="width:100%">';
  animations.forEach(function (a) {
    html += '<option value="' + a.v + '"' + (el.animationName === a.v ? ' selected' : '') + '>' + a.l + '</option>';
  });
  html += '</select></div>';

  // Duration
  html += '<div class="field"><label>持续时间 (ms): <strong id="animDurVal">' + (el.animationDuration || 500) + '</strong></label><input type="range" id="animDuration" min="100" max="5000" step="100" value="' + (el.animationDuration || 500) + '" style="width:100%"></div>';

  // Delay
  html += '<div class="field"><label>延迟 (ms): <strong id="animDelayVal">' + (el.animationDelay || 0) + '</strong></label><input type="range" id="animDelay" min="0" max="3000" step="100" value="' + (el.animationDelay || 0) + '" style="width:100%"></div>';

  // Repeat
  html += '<div class="field"><label>重复次数</label><div style="display:flex;gap:8px;align-items:center"><input type="number" id="animRepeat" min="1" max="99" value="' + (el.animationRepeat || 1) + '" style="width:60px"><label class="toggle-switch" style="margin-left:auto"><input type="checkbox" id="animInfinite"' + (el.animationInfinite ? ' checked' : '') + '><span class="toggle-slider"></span></label><span style="font-size:11px;color:var(--text3)">无限循环</span></div></div>';

  // Apply
  html += '<button class="btn btn-primary" id="animApplyBtn" style="width:100%;margin-top:12px;font-size:12px">应用动画</button>';

  html += '</div>';
  return html;
}

// ─── Main Modal ───────────────────────────────────────────────────
export function openDesignTools(tab) {
  if (_modal) { _modal.remove(); _modal = null; }
  _tab = tab || _tab;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeDesignTools(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '520px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var tabs = [
    { id: 'palette', icon: '🎨', label: '调色板' },
    { id: 'font', icon: '🔤', label: '字体预览' },
    { id: 'gradient', icon: '🌈', label: '渐变编辑' },
    { id: 'animation', icon: '✨', label: '动画编辑' },
  ];

  var html = '<div class="modal-header"><h3>🎨 设计工具</h3><button class="modal-close" id="dtCloseBtn">✕</button></div>';

  // Tab bar
  html += '<div style="display:flex;border-bottom:1px solid var(--border)">';
  tabs.forEach(function (t) {
    html += '<button class="design-tool-tab' + (_tab === t.id ? ' active' : '') + '" data-dt-tab="' + t.id + '" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid ' + (_tab === t.id ? 'var(--accent)' : 'transparent') + ';color:' + (_tab === t.id ? 'var(--accent)' : 'var(--text3)') + ';font-size:12px;cursor:pointer">' + t.icon + ' ' + t.label + '</button>';
  });
  html += '</div>';

  // Tab content
  html += '<div class="modal-body" style="max-height:55vh;overflow-y:auto;padding:0" id="dtContent">';
  switch (_tab) {
    case 'palette': html += renderPaletteTab(); break;
    case 'font': html += renderFontTab(); break;
    case 'gradient': html += renderGradientTab(); break;
    case 'animation': html += renderAnimationTab(); break;
  }
  html += '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  // Events
  overlay.querySelector('#dtCloseBtn').onclick = function () { closeDesignTools(); };

  overlay.querySelectorAll('[data-dt-tab]').forEach(function (btn) {
    btn.onclick = function () { openDesignTools(btn.dataset.dtTab); };
  });

  // Palette events
  var baseInput = overlay.querySelector('#paletteBase');
  if (baseInput) {
    baseInput.oninput = function () {
      document.getElementById('paletteBaseHex').textContent = this.value;
      openDesignTools('palette'); // re-render
    };
  }
  overlay.querySelectorAll('.palette-swatch').forEach(function (sw) {
    sw.onclick = function () {
      if (S.selIdx >= 0) {
        captureState('应用颜色');
        S.elements[S.selIdx].color = sw.dataset.color;
        S.setDirty(true);
        toast('🎨 已应用 ' + sw.dataset.color, 'success');
      } else {
        navigator.clipboard.writeText(sw.dataset.color);
        toast('📋 已复制 ' + sw.dataset.color, 'success');
      }
    };
  });

  // Font events
  overlay.querySelectorAll('[data-font-apply]').forEach(function (item) {
    item.onclick = function () {
      if (S.selIdx < 0) return toast('请先选中一个文字元素', 'warning');
      if (S.elements[S.selIdx].type !== 'text') return toast('只能对文字元素应用字体', 'warning');
      captureState('更改字体');
      S.elements[S.selIdx].fontFamily = item.dataset.fontApply;
      S.setDirty(true);
      openDesignTools('font');
      toast('🔤 字体已应用', 'success');
    };
  });

  // Gradient events
  var gc1 = overlay.querySelector('#gradColor1');
  var gc2 = overlay.querySelector('#gradColor2');
  if (gc1 && gc2) {
    var updateGrad = function () {
      var bar = document.getElementById('gradPreviewBar');
      if (bar) bar.style.background = 'linear-gradient(135deg,' + gc1.value + ',' + gc2.value + ')';
    };
    gc1.oninput = updateGrad;
    gc2.oninput = updateGrad;
  }
  overlay.querySelectorAll('.grad-preset').forEach(function (p) {
    p.onclick = function () {
      if (gc1) gc1.value = p.dataset.gpC1;
      if (gc2) gc2.value = p.dataset.gpC2;
      var bar = document.getElementById('gradPreviewBar');
      if (bar) bar.style.background = 'linear-gradient(135deg,' + p.dataset.gpC1 + ',' + p.dataset.gpC2 + ')';
    };
  });
  var gradApply = overlay.querySelector('#gradApplyBtn');
  if (gradApply) {
    gradApply.onclick = function () {
      if (S.selIdx < 0) return toast('请先选中一个元素', 'warning');
      captureState('应用渐变');
      S.elements[S.selIdx].color = gc1.value;
      S.elements[S.selIdx].fillColor2 = gc2.value;
      S.elements[S.selIdx].textGradient = 'custom';
      S.elements[S.selIdx].gradientColor2 = gc2.value;
      S.setDirty(true);
      toast('🌈 渐变已应用', 'success');
    };
  }

  // Animation events
  var animDur = overlay.querySelector('#animDuration');
  if (animDur) animDur.oninput = function () { document.getElementById('animDurVal').textContent = this.value; };
  var animDelay = overlay.querySelector('#animDelay');
  if (animDelay) animDelay.oninput = function () { document.getElementById('animDelayVal').textContent = this.value; };
  var animApply = overlay.querySelector('#animApplyBtn');
  if (animApply) {
    animApply.onclick = function () {
      if (S.selIdx < 0) return toast('请先选中一个元素', 'warning');
      captureState('应用动画');
      var name = document.getElementById('animName').value;
      S.elements[S.selIdx].animationName = name === 'none' ? '' : name;
      S.elements[S.selIdx].animationDuration = Number(document.getElementById('animDuration').value);
      S.elements[S.selIdx].animationDelay = Number(document.getElementById('animDelay').value);
      S.elements[S.selIdx].animationRepeat = Number(document.getElementById('animRepeat').value);
      S.elements[S.selIdx].animationInfinite = document.getElementById('animInfinite').checked;
      S.setDirty(true);
      toast('✨ 动画已应用', 'success');
    };
  }
}

export function closeDesignTools() {
  if (_modal) { _modal.remove(); _modal = null; }
}
