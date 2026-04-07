// ─── MAML Snippets: 常用代码片段一键插入 ────────────────────────
import * as S from '../state.js';
import { toast } from './toast.js';
import { captureState } from '../history.js';

var _modal = null;

var SNIPPETS = [
  {
    id: 'countdown', icon: '⏳', name: '倒计时到日期', category: '时间',
    desc: '显示距离指定日期的天数',
    apply: function () {
      var date = prompt('目标日期 (MMDD, 如 1225 表示12月25日):', '0101');
      if (!date || !/^\d{4}$/.test(date)) return toast('格式错误，需要4位数字', 'error');
      captureState('插入倒计时');
      S.elements.push({ type: 'text', text: '', x: 10, y: 40, size: 72, color: '#ffffff', bold: true, textAlign: 'left', multiLine: false, w: 200, opacity: 100, fontFamily: 'default', _mamlSnippet: 'countdown_' + date });
      S.elements.push({ type: 'text', text: '天后', x: 10, y: 120, size: 20, color: '#888888', bold: false, textAlign: 'left', multiLine: false, w: 100, opacity: 153 });
      S.elements.push({ type: 'text', text: '距离目标', x: 10, y: 16, size: 14, color: '#888888', bold: false, textAlign: 'left', multiLine: false, w: 200, opacity: 153 });
      S.setSelIdx(S.elements.length - 3);
      S.setDirty(true);
      toast('⏳ 倒计时片段已插入（导出时自动转 MAML 变量）', 'success');
    },
    mamlCode: '<!-- 倒计时 -->\n<Var name="targetMM" type="number" expression="12" />\n<Var name="targetDD" type="number" expression="25" />\n<Var name="daysLeft" type="number" expression="..." />',
  },
  {
    id: 'progress_ring', icon: '⭕', name: '进度环', category: '进度',
    desc: '圆形进度条（步数/电量/自定义）',
    apply: function () {
      captureState('插入进度环');
      // Background ring
      S.elements.push({ type: 'circle', x: 100, y: 120, r: 60, color: '#222233', opacity: 100, strokeWidth: 0 });
      // Inner cutout
      S.elements.push({ type: 'circle', x: 100, y: 120, r: 48, color: '#0a0a1a', opacity: 100, strokeWidth: 0 });
      // Value text
      S.elements.push({ type: 'text', text: '75%', x: 60, y: 100, size: 36, color: '#ffffff', bold: true, textAlign: 'left', multiLine: false, w: 80 });
      // Label
      S.elements.push({ type: 'text', text: '步数', x: 76, y: 140, size: 12, color: '#888888', bold: false, textAlign: 'left', multiLine: false, w: 50, opacity: 153 });
      S.setSelIdx(S.elements.length - 4);
      S.setDirty(true);
      toast('⭕ 进度环已插入，修改颜色和文字自定义', 'success');
    },
  },
  {
    id: 'gradient_text', icon: '🌈', name: '渐变文字', category: '文字',
    desc: '双色渐变填充的文字',
    apply: function () {
      captureState('插入渐变文字');
      S.elements.push({ type: 'text', text: '渐变文字', x: 10, y: 80, size: 48, color: '#6c5ce7', bold: true, textAlign: 'left', multiLine: false, w: 300, textGradient: 'aurora', gradientColor2: '#00b894' });
      S.setSelIdx(S.elements.length - 1);
      S.setDirty(true);
      toast('🌈 渐变文字已插入', 'success');
    },
  },
  {
    id: 'divider', icon: '➖', name: '分割线', category: '装饰',
    desc: '水平分割线',
    apply: function () {
      captureState('插入分割线');
      S.elements.push({ type: 'rectangle', x: 10, y: 100, w: 200, h: 1, color: '#333333', radius: 0, opacity: 40 });
      S.setDirty(true);
      toast('➖ 分割线已插入', 'success');
    },
  },
  {
    id: 'accent_dot', icon: '●', name: '强调圆点', category: '装饰',
    desc: '小圆点标记',
    apply: function () {
      captureState('插入圆点');
      S.elements.push({ type: 'circle', x: 10, y: 70, r: 4, color: '#6c5ce7', opacity: 255 });
      S.setDirty(true);
      toast('● 圆点已插入', 'success');
    },
  },
  {
    id: 'vertical_bar', icon: '▮', name: '竖向强调条', category: '装饰',
    desc: '左侧竖条装饰',
    apply: function () {
      captureState('插入竖条');
      S.elements.push({ type: 'rectangle', x: 10, y: 20, w: 3, h: 200, color: '#6c5ce7', radius: 2, opacity: 80 });
      S.setDirty(true);
      toast('▮ 竖条已插入', 'success');
    },
  },
  {
    id: 'time_display', icon: '🕐', name: '大号时间', category: '时间',
    desc: '大字体时间显示元素',
    apply: function () {
      captureState('插入时间');
      S.elements.push({ type: 'text', text: '21:30', x: 10, y: 30, size: 72, color: '#ffffff', bold: true, textAlign: 'left', multiLine: false, w: 300, fontFamily: 'default' });
      S.elements.push({ type: 'text', text: '04/07 星期二', x: 10, y: 110, size: 16, color: '#888888', bold: false, textAlign: 'left', multiLine: false, w: 200, opacity: 153 });
      S.setDirty(true);
      toast('🕐 时间元素已插入', 'success');
    },
  },
  {
    id: 'blur_card', icon: '🔲', name: '毛玻璃卡片', category: '装饰',
    desc: '半透明模糊背景卡片',
    apply: function () {
      captureState('插入毛玻璃');
      S.elements.push({ type: 'rectangle', x: 20, y: 40, w: 200, h: 160, color: '#ffffff', radius: 16, opacity: 10, blur: 20 });
      S.setDirty(true);
      toast('🔲 毛玻璃卡片已插入', 'success');
    },
  },
  {
    id: 'battery_bar', icon: '🔋', name: '电量条', category: '进度',
    desc: '横向电量条',
    apply: function () {
      captureState('插入电量条');
      S.elements.push({ type: 'rectangle', x: 10, y: 100, w: 180, h: 10, color: '#333333', radius: 5, opacity: 100 });
      S.elements.push({ type: 'rectangle', x: 10, y: 100, w: 137, h: 10, color: '#00b894', radius: 5, opacity: 100 });
      S.elements.push({ type: 'text', text: '76%', x: 10, y: 78, size: 32, color: '#ffffff', bold: true, textAlign: 'left', multiLine: false, w: 100 });
      S.setDirty(true);
      toast('🔋 电量条已插入', 'success');
    },
  },
];

export function openSnippetsModal(callbacks) {
  if (_modal) { _modal.remove(); _modal = null; }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeSnippetsModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '560px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header"><h3>🧩 MAML 代码片段</h3><button class="modal-close" id="snipCloseBtn">✕</button></div>';
  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto">';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">点击插入常用元素组合到当前卡片</div>';

  var categories = {};
  SNIPPETS.forEach(function (s) {
    if (!categories[s.category]) categories[s.category] = [];
    categories[s.category].push(s);
  });

  Object.keys(categories).forEach(function (cat) {
    html += '<div style="font-size:11px;font-weight:600;color:var(--text3);margin:12px 0 6px;text-transform:uppercase">' + cat + '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
    categories[cat].forEach(function (s) {
      html += '<div class="card-lib-item" style="cursor:pointer;flex-direction:column;align-items:center;text-align:center;padding:12px 8px" data-snip-insert="' + s.id + '">' +
        '<div style="font-size:24px;margin-bottom:6px">' + s.icon + '</div>' +
        '<div style="font-size:12px;font-weight:600">' + s.name + '</div>' +
        '<div style="font-size:10px;color:var(--text3);margin-top:2px">' + s.desc + '</div>' +
        '</div>';
    });
    html += '</div>';
  });

  html += '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  overlay.querySelector('#snipCloseBtn').onclick = function () { closeSnippetsModal(); };

  overlay.querySelectorAll('[data-snip-insert]').forEach(function (btn) {
    btn.onclick = function () {
      var snippet = SNIPPETS.find(function (s) { return s.id === btn.dataset.snipInsert; });
      if (snippet) {
        snippet.apply();
        if (callbacks && callbacks.renderConfig) callbacks.renderConfig();
        if (callbacks && callbacks.renderLivePreview) callbacks.renderLivePreview();
      }
    };
  });
}

export function closeSnippetsModal() {
  if (_modal) { _modal.remove(); _modal = null; }
}
