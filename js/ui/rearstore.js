// ─── RearStore: 社区组件商店（接入 NekoStash widgets-index）────────
import * as S from '../state.js';
import { TEMPLATES } from '../templates/index.js';
import { resetHistory } from '../history.js';
import { toast, toastProgress } from './toast.js';
import { escHtml } from '../utils.js';
import { importZip } from '../export.js';

var INDEX_BASE = 'https://raw.githubusercontent.com/NekoStash/widgets-index/main';

var _modal = null;
var _cache = {};

// ─── API ──────────────────────────────────────────────────────────
function fetchJSON(url) {
  if (_cache[url]) return Promise.resolve(_cache[url]);
  return fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      _cache[url] = data;
      return data;
    });
}

function getWidgets() {
  return fetchJSON(INDEX_BASE + '/indexes/widgets.json');
}

function getSummaries() {
  return fetchJSON(INDEX_BASE + '/indexes/component-summaries.json');
}

function getWidgetReleases(id) {
  return fetchJSON(INDEX_BASE + '/data/' + encodeURIComponent(id) + '/releases.json').catch(function () { return null; });
}

// ─── Modal ────────────────────────────────────────────────────────
export function openRearStoreModal(stepCallbacks) {
  if (_modal) { _modal.remove(); _modal = null; }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeRearStoreModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '720px';
  modal.style.maxHeight = '85vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header">' +
    '<h3>🛒 RearStore 组件商店</h3>' +
    '<button class="modal-close" id="rsCloseBtn" aria-label="关闭">✕</button>' +
    '</div>';

  html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)">' +
    '<input type="text" id="rsSearchInput" placeholder="🔍 搜索组件..." ' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);' +
    'border-radius:8px;color:var(--text);font-size:13px;outline:none">' +
    '</div>';

  html += '<div class="modal-body" id="rsBody" style="max-height:60vh;overflow-y:auto;padding:16px">' +
    '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 加载中...</div>' +
    '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  overlay.querySelector('#rsCloseBtn').onclick = function () { closeRearStoreModal(); };

  var searchInput = overlay.querySelector('#rsSearchInput');
  var searchTimer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { renderWidgetList(searchInput.value.trim()); }, 300);
  });

  searchInput.focus();
  renderWidgetList('');
}

function renderWidgetList(query) {
  var bodyEl = _modal && _modal.querySelector('#rsBody');
  if (!bodyEl) return;

  Promise.all([getWidgets(), getSummaries()])
    .then(function (results) {
      var widgets = results[0];
      var summaries = results[1];

      if (!Array.isArray(widgets) || widgets.length === 0) {
        bodyEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">' +
          '<div style="font-size:48px;margin-bottom:16px">🏪</div>' +
          '<div>商店暂无组件</div></div>';
        return;
      }

      var filtered = widgets;
      if (query) {
        var q = query.toLowerCase();
        filtered = widgets.filter(function (w) {
          return (w.name || '').toLowerCase().indexOf(q) >= 0 ||
                 (w.description || '').toLowerCase().indexOf(q) >= 0 ||
                 (w.authorName || '').toLowerCase().indexOf(q) >= 0;
        });
      }

      if (filtered.length === 0) {
        bodyEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">' +
          '<div style="font-size:36px;margin-bottom:12px">🔍</div>' +
          '<div>没有找到匹配的组件</div></div>';
        return;
      }

      var html = '<div class="rs-widget-list">';
      filtered.forEach(function (w) {
        var summary = summaries.components && summaries.components[w.id];
        var avatarUrl = summary && summary.author && summary.author.avatarUrl;
        var starsHtml = w.stars ? '<span style="color:#f39c12;margin-left:6px">⭐ ' + w.stars + '</span>' : '';
        var dateStr = w.latestReleasePublishedAt
          ? new Date(w.latestReleasePublishedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
          : '';

        html += '<div class="rs-widget-card" data-rs-id="' + escHtml(w.id) + '">' +
          '<div class="rs-widget-header">' +
          (avatarUrl ? '<img class="rs-avatar" src="' + escHtml(avatarUrl) + '" alt="" loading="lazy">'
                     : '<div class="rs-avatar-placeholder">📦</div>') +
          '<div class="rs-widget-info">' +
          '<div class="rs-widget-name">' + escHtml(w.name) + starsHtml + '</div>' +
          '<div class="rs-widget-meta">' +
          '<span>@' + escHtml(w.authorName || 'unknown') + '</span>' +
          (w.latestReleaseTag ? '<span> · ' + escHtml(w.latestReleaseTag) + '</span>' : '') +
          (dateStr ? '<span> · ' + dateStr + '</span>' : '') +
          '</div></div></div>' +
          '<div class="rs-widget-desc">' + escHtml(w.description || '') + '</div>' +
          '<div class="rs-widget-actions">' +
          '<button class="btn btn-primary rs-install-btn" data-rs-install="' + escHtml(w.id) + '" style="font-size:12px;padding:4px 12px">📥 安装最新版</button>' +
          '</div></div>';
      });
      html += '</div>';

      bodyEl.innerHTML = html;

      bodyEl.querySelectorAll('[data-rs-install]').forEach(function (btn) {
        btn.onclick = function () { installWidget(btn.dataset.rsInstall, stepCallbacks); };
      });
    })
    .catch(function (err) {
      bodyEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--err)">' +
        '<div style="font-size:36px;margin-bottom:12px">❌</div>' +
        '<div>加载失败: ' + escHtml(err.message) + '</div>' +
        '<button class="btn btn-secondary" id="rsRetryBtn" style="margin-top:12px;font-size:12px">🔄 重试</button></div>';
      bodyEl.querySelector('#rsRetryBtn').onclick = function () {
        bodyEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 重试中...</div>';
        _cache = {};
        renderWidgetList(query);
      };
    });
}

// ─── Install ──────────────────────────────────────────────────────
function installWidget(id, stepCallbacks) {
  getWidgetReleases(id).then(function (releases) {
    if (!releases || !releases.releases || releases.releases.length === 0) {
      return toast('该组件暂无发布版本', 'warning');
    }
    var latest = releases.releases[0];
    if (!latest.assets || latest.assets.length === 0) {
      return toast('该版本无可用文件', 'warning');
    }
    var asset = latest.assets[0];
    downloadAndImport(asset.downloadUrl, asset.name, stepCallbacks);
  }).catch(function (e) {
    toast('获取版本信息失败: ' + e.message, 'error');
  });
}

function downloadAndImport(url, fileName, stepCallbacks) {
  var p = toastProgress('正在下载 ' + fileName + '...');

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('下载失败 HTTP ' + r.status);
      return r.blob();
    })
    .then(function (blob) {
      p.update('正在导入...');
      var file = new File([blob], fileName, { type: 'application/zip' });

      if (fileName.endsWith('.zip')) {
        return importZip(file).then(function (data) {
          S.setTpl(TEMPLATES.find(function (t) { return t.id === 'custom'; }));
          S.setCfg({ cardName: data.cardName, bgColor: data.bgColor, bgImage: data.bgImage || '' });
          S.setElements(data.elements);
          S.setUploadedFiles(data.files || {});
          S.setSelIdx(-1);
          S.setDirty(true);
          resetHistory();
          if (stepCallbacks) {
            stepCallbacks.renderTplGrid();
            stepCallbacks.goStep(1);
          }
          closeRearStoreModal();
          p.close('✅ 已导入: ' + fileName, 'success');
        });
      }

      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      p.close('✅ 已下载: ' + fileName, 'success');
    })
    .catch(function (err) {
      p.close('❌ ' + err.message, 'error');
    });
}

// ─── Helpers ──────────────────────────────────────────────────────
export function closeRearStoreModal() {
  if (_modal) { _modal.remove(); _modal = null; }
}
