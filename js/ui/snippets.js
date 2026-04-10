// ─── Snippets: MAML 代码片段库 ──────────────────────────────────
import * as S from '../state.js';
import { toast } from './toast.js';
import { captureState } from '../history.js';

var SNIPPETS = [
  {
    name: '日期 + 时间', icon: '📅', cat: '布局',
    desc: '大时间 + 小日期上下排列',
    elements: [
      { type: 'text', text: '14:30', expression: "formatDate('HH:mm', #time_sys)", x: 10, y: 30, size: 48, color: '#ffffff', bold: true, w: 200 },
      { type: 'text', text: '2026/04/10 周四', expression: "formatDate('yyyy/MM/dd EEEE', #time_sys)", x: 10, y: 90, size: 14, color: '#888888', w: 200 },
    ],
  },
  {
    name: '电量 + 步数', icon: '🔋', cat: '设备',
    desc: '电量百分比 + 步数组合',
    elements: [
      { type: 'text', text: '78%', expression: '#battery_level + "%"', x: 10, y: 30, size: 36, color: '#00ff41', bold: true, w: 120 },
      { type: 'text', text: '6542 步', expression: '#step_count + " 步"', x: 10, y: 80, size: 16, color: '#aaaaaa', w: 120 },
      { type: 'rectangle', x: 10, y: 105, w: 160, h: 4, color: '#00ff41', radius: 2, opacity: 40 },
    ],
  },
  {
    name: '天气面板', icon: '🌤️', cat: '设备',
    desc: '温度 + 描述 + 城市',
    elements: [
      { type: 'text', text: '23°', expression: '#weather_temp + "°"', x: 10, y: 20, size: 56, color: '#ffffff', bold: true, w: 150 },
      { type: 'text', text: '多云 · 北京', expression: '#weather_desc + " · " + #weather_city', x: 10, y: 90, size: 14, color: '#74b9ff', w: 200 },
    ],
  },
  {
    name: '分隔线', icon: '─', cat: '装饰',
    desc: '细线分隔',
    elements: [
      { type: 'rectangle', x: 0, y: 0, w: 200, h: 1, color: '#333333', opacity: 50 },
    ],
  },
  {
    name: '圆角卡片', icon: '▢', cat: '装饰',
    desc: '半透明圆角背景',
    elements: [
      { type: 'rectangle', x: 0, y: 0, w: 200, h: 80, color: '#ffffff', radius: 12, opacity: 10 },
      { type: 'text', text: '标题', x: 16, y: 20, size: 18, color: '#ffffff', bold: true, w: 170 },
      { type: 'text', text: '副标题描述文字', x: 16, y: 48, size: 12, color: '#888888', w: 170 },
    ],
  },
  {
    name: '心率显示', icon: '❤️', cat: '设备',
    desc: '心率数值 + BPM',
    elements: [
      { type: 'text', text: '72', expression: '#heart_rate', x: 10, y: 20, size: 48, color: '#ff6b6b', bold: true, w: 100 },
      { type: 'text', text: 'BPM', x: 10, y: 76, size: 12, color: '#ff6b6b', opacity: 60, w: 50 },
    ],
  },
  {
    name: '进度条 + 百分比', icon: '▰', cat: '装饰',
    desc: '带文字的进度条',
    elements: [
      { type: 'text', text: '65%', x: 10, y: 0, size: 14, color: '#ffffff', w: 60 },
      { type: 'progress', x: 10, y: 24, w: 200, h: 6, color: '#6c5ce7', bgColor: '#222222', value: 65, radius: 3 },
    ],
  },
  {
    name: '毛玻璃面板', icon: '🪟', cat: '装饰',
    desc: '磨砂玻璃效果背景',
    elements: [
      { type: 'rectangle', x: 0, y: 0, w: 220, h: 100, color: '#ffffff', radius: 16, opacity: 15, blur: 12 },
      { type: 'rectangle', x: 0, y: 0, w: 220, h: 100, color: '#ffffff', radius: 16, opacity: 5 },
    ],
  },
  {
    name: '极简数字时钟', icon: '🕐', cat: '时钟',
    desc: '超大号时间数字',
    elements: [
      { type: 'text', text: '14', expression: "formatDate('HH', #time_sys)", x: 10, y: 10, size: 80, color: '#ffffff', bold: true, w: 120 },
      { type: 'text', text: ':', x: 105, y: 10, size: 80, color: '#6c5ce7', bold: true, w: 30 },
      { type: 'text', text: '30', expression: "formatDate('mm', #time_sys)", x: 130, y: 10, size: 80, color: '#ffffff', bold: true, w: 120 },
    ],
  },
  {
    name: '血氧显示', icon: '🫁', cat: '设备',
    desc: '血氧百分比',
    elements: [
      { type: 'text', text: '98%', expression: '#blood_oxygen + "%"', x: 10, y: 20, size: 40, color: '#48dbfb', bold: true, w: 120 },
      { type: 'text', text: 'SpO₂', x: 10, y: 68, size: 12, color: '#48dbfb', opacity: 60, w: 50 },
    ],
  },
];

var _modal = null;

export function openSnippetsModal(stepCallbacks) {
  if (_modal) { _modal.remove(); _modal = null; }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeSnippetsModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '600px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var cats = ['全部', '布局', '设备', '装饰', '时钟'];
  var activeCat = '全部';

  function render() {
    var filtered = activeCat === '全部' ? SNIPPETS : SNIPPETS.filter(function (s) { return s.cat === activeCat; });
    var html = '<div class="modal-header"><h3>🧩 代码片段库</h3><button class="modal-close" id="snipClose">✕</button></div>';
    // Category tabs
    html += '<div style="display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap">';
    cats.forEach(function (cat) {
      var isActive = activeCat === cat;
      html += '<button data-snip-cat="' + cat + '" style="padding:4px 10px;border-radius:12px;border:1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)') + ';background:' + (isActive ? 'var(--accent)' : 'transparent') + ';color:' + (isActive ? '#fff' : 'var(--text3)') + ';font-size:11px;cursor:pointer">' + cat + '</button>';
    });
    html += '</div>';
    // Snippet list
    html += '<div class="modal-body" style="max-height:55vh;overflow-y:auto;padding:12px 16px">';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">';
    filtered.forEach(function (snip, si) {
      html += '<div data-snip-apply="' + SNIPPETS.indexOf(snip) + '" style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;transition:border-color .15s" onmouseenter="this.style.borderColor=\'var(--accent)\'" onmouseleave="this.style.borderColor=\'var(--border)\'">' +
        '<div style="font-size:24px;margin-bottom:6px">' + snip.icon + '</div>' +
        '<div style="font-size:13px;font-weight:600;color:var(--text1)">' + snip.name + '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + snip.desc + '</div>' +
        '<div style="font-size:10px;color:var(--accent);margin-top:4px">' + snip.elements.length + ' 个元素</div>' +
        '</div>';
    });
    html += '</div></div>';
    modal.innerHTML = html;

    // Events
    modal.querySelector('#snipClose').onclick = closeSnippetsModal;
    modal.querySelectorAll('[data-snip-cat]').forEach(function (btn) {
      btn.onclick = function () { activeCat = btn.dataset.snipCat; render(); };
    });
    modal.querySelectorAll('[data-snip-apply]').forEach(function (el) {
      el.onclick = function () {
        var idx = Number(el.dataset.snipApply);
        var snip = SNIPPETS[idx];
        if (!snip) return;
        captureState('插入片段: ' + snip.name);
        snip.elements.forEach(function (tpl) {
          var newEl = JSON.parse(JSON.stringify(tpl));
          S.elements.push(newEl);
        });
        S.setDirty(true);
        S.setSelIdx(S.elements.length - 1);
        closeSnippetsModal();
        if (stepCallbacks) stepCallbacks.renderConfig();
        toast('🧩 已插入: ' + snip.name, 'success');
      };
    });
  }

  render();
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;
}

export function closeSnippetsModal() {
  if (_modal) { _modal.remove(); _modal = null; }
}
