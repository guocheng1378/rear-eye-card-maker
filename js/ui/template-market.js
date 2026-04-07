// ─── Template Market: 社区模板市场 ────────────────────────────────
// 浏览/导入社区分享的模板，使用 GitHub Gist 作为后端

import * as S from '../state.js';
import { TEMPLATES } from './templates/index.js';
import { resetHistory } from '../history.js';
import { toast } from './toast.js';
import { escHtml } from '../utils.js';

// Curated community templates (hardcoded popular ones)
var COMMUNITY_TEMPLATES = [
  {
    id: 'ct_cyberpunk_clock',
    name: '赛博朋克时钟',
    author: 'community',
    icon: '🌃',
    desc: '霓虹风格时钟，深紫背景 + 荧光绿时间',
    likes: 128,
    template: {
      tplId: 'clock',
      cfg: { cardName: '赛博朋克时钟', bgColor: '#0d0221', timeColor: '#39ff14', dateColor: '#ff00ff', timeSize: 56, dateFormat: 'MM/dd EEEE' },
    },
  },
  {
    id: 'ct_minimal_weather',
    name: '极简天气',
    author: 'community',
    icon: '🌤️',
    desc: '纯白背景，大字温度，极简风格',
    likes: 95,
    template: {
      tplId: 'weather',
      cfg: { cardName: '极简天气', bgColor: '#ffffff', tempColor: '#1a1a2e', tempSize: 64, descColor: '#888888', city: '北京' },
    },
  },
  {
    id: 'ct_sunset_gradient',
    name: '日落渐变',
    author: 'community',
    icon: '🌅',
    desc: '温暖日落色调渐变背景 + 励志文字',
    likes: 87,
    template: {
      tplId: 'gradient',
      cfg: { cardName: '日落渐变', bgColor1: '#e55039', bgColor2: '#f39c12', textColor: '#ffffff', textSize: 28, text: '每一天都是\n新的开始' },
    },
  },
  {
    id: 'ct_retro_battery',
    name: '复古电池',
    author: 'community',
    icon: '🔋',
    desc: '复古游戏机风格电池显示',
    likes: 72,
    template: {
      tplId: 'battery',
      cfg: { cardName: '复古电池', bgColor: '#1a1a1a', textColor: '#00ff00', barColor: '#00ff41', accentColor: '#ff6600', demoLevel: 78 },
    },
  },
  {
    id: 'ct_night_steps',
    name: '夜间步数',
    author: 'community',
    icon: '🌙',
    desc: '深蓝夜间主题步数卡片',
    likes: 63,
    template: {
      tplId: 'steps',
      cfg: { cardName: '夜间步数', bgColor: '#0a1628', textColor: '#e0e0e0', barColor: '#4ecdc4', accentColor: '#74b9ff', goal: '10000' },
    },
  },
  {
    id: 'ct_ocean_clock',
    name: '海洋时钟',
    author: 'community',
    icon: '🌊',
    desc: '海蓝色调 + 大号时间显示',
    likes: 58,
    template: {
      tplId: 'clock',
      cfg: { cardName: '海洋时钟', bgColor: '#0c2461', timeColor: '#48dbfb', dateColor: '#74b9ff', timeSize: 60, dateFormat: 'MM/dd EEEE' },
    },
  },
  {
    id: 'ct_golden_ring',
    name: '金色环形',
    author: 'community',
    icon: '🏆',
    desc: '金色环形进度 + 暗色背景',
    likes: 45,
    template: {
      tplId: 'ring',
      cfg: { cardName: '金色环形', bgColor: '#0a0a0a', ringColor: '#f39c12', trackColor: '#2a2a2a', textColor: '#ffffff', labelColor: '#888888', ringSize: 8, demoValue: 72, source: 'battery' },
    },
  },
  {
    id: 'ct_aurora_quote',
    name: '极光名言',
    author: 'community',
    icon: '✨',
    desc: '极光色渐变背景 + 励志名言',
    likes: 41,
    template: {
      tplId: 'quote',
      cfg: { cardName: '极光名言', bgColor: '#0a1628', textColor: '#ffffff', authorColor: '#a29bfe', accentColor: '#6c5ce7', textSize: 22, text: '万物皆有裂痕\n那是光照进来的地方', author: '— Leonard Cohen' },
    },
  },
];

var _marketModal = null;
var _sortBy = 'likes';

export function openMarketModal(stepCallbacks) {
  if (_marketModal) { _marketModal.remove(); _marketModal = null; }

  var templates = COMMUNITY_TEMPLATES.slice();
  if (_sortBy === 'likes') templates.sort(function (a, b) { return b.likes - a.likes; });
  else templates.sort(function (a, b) { return a.name.localeCompare(b.name); });

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeMarketModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '640px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header">' +
    '<h3>🏪 模板市场</h3>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<button class="lang-switch" data-sort="likes"' + (_sortBy === 'likes' ? ' style="border-color:var(--accent);color:var(--accent)"' : '') + '>🔥 最热</button>' +
    '<button class="lang-switch" data-sort="name"' + (_sortBy === 'name' ? ' style="border-color:var(--accent);color:var(--accent)"' : '') + '>🔤 名称</button>' +
    '<button class="modal-close" id="marketCloseBtn" aria-label="关闭">✕</button>' +
    '</div></div>';

  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto">';
  html += '<div style="display:flex;flex-direction:column;gap:10px">';

  templates.forEach(function (tpl) {
    html += '<div class="card-lib-item" style="cursor:pointer" data-market-import="' + tpl.id + '">' +
      '<div class="card-lib-icon" style="font-size:24px">' + tpl.icon + '</div>' +
      '<div class="card-lib-info">' +
      '<div class="card-lib-name">' + escHtml(tpl.name) + '</div>' +
      '<div class="card-lib-meta">' +
      '<span>' + escHtml(tpl.desc) + '</span>' +
      '</div>' +
      '<div class="card-lib-meta" style="margin-top:4px">' +
      '<span>🔥 ' + tpl.likes + '</span>' +
      '<span>·</span>' +
      '<span>by ' + escHtml(tpl.author) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="card-lib-actions">' +
      '<button class="card-lib-btn" data-market-import="' + tpl.id + '" title="导入此模板">📥</button>' +
      '</div>' +
      '</div>';
  });

  html += '</div></div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _marketModal = overlay;

  overlay.querySelector('#marketCloseBtn').onclick = function () { closeMarketModal(); };

  // Sort buttons
  overlay.querySelectorAll('[data-sort]').forEach(function (btn) {
    btn.onclick = function () {
      _sortBy = btn.dataset.sort;
      openMarketModal(stepCallbacks);
    };
  });

  // Import buttons
  overlay.querySelectorAll('[data-market-import]').forEach(function (btn) {
    btn.onclick = function () {
      var tpl = COMMUNITY_TEMPLATES.find(function (t) { return t.id === btn.dataset.marketImport; });
      if (!tpl) return;
      var targetTpl = TEMPLATES.find(function (t) { return t.id === tpl.template.tplId; });
      if (!targetTpl) return toast('找不到对应模板', 'error');

      S.setTpl(targetTpl);
      var newCfg = {};
      targetTpl.config.forEach(function (g) { g.fields.forEach(function (f) { newCfg[f.key] = tpl.template.cfg[f.key] !== undefined ? tpl.template.cfg[f.key] : f.default; }); });
      S.setCfg(newCfg);
      S.setElements([]);
      S.setUploadedFiles({});
      S.setSelIdx(-1);
      S.setDirty(true);
      resetHistory();
      if (stepCallbacks) {
        stepCallbacks.renderTplGrid();
        stepCallbacks.goStep(1);
      }
      closeMarketModal();
      toast('✅ 已导入: ' + tpl.name, 'success');
    };
  });
}

export function closeMarketModal() {
  if (_marketModal) { _marketModal.remove(); _marketModal = null; }
}
