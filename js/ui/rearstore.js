// ─── RearStore: 社区组件商店（NekoStash + 发布 + 代理 + 更新检测）──
import * as S from '../state.js';
import { TEMPLATES } from '../templates/index.js';
import { resetHistory } from '../history.js';
import { toast, toastProgress } from './toast.js';
import { escHtml } from '../utils.js';
import { importZip, exportZip } from '../export.js';
import { generateMAML, validateMAML } from '../maml.js';
import { getDevice } from '../devices.js';

var INDEX_BASE = 'https://raw.githubusercontent.com/NekoStash/widgets-index/main';

var _modal = null;
var _cache = {};
var _updateMap = null; // id -> {localVer, remoteVer}

// ─── GitHub Proxy 配置 ────────────────────────────────────────────
var GITHUB_HOSTS = new Set([
  'github.com', 'raw.githubusercontent.com', 'objects.githubusercontent.com',
  'release-assets.githubusercontent.com', 'avatars.githubusercontent.com',
]);

function _getProxyPrefix() { return localStorage.getItem('jcm-gh-proxy-prefix') || ''; }
function _setProxyPrefix(v) { localStorage.setItem('jcm-gh-proxy-prefix', v); }
function _getHostOverride() { return localStorage.getItem('jcm-gh-host-override') || ''; }
function _setHostOverride(v) { localStorage.setItem('jcm-gh-host-override', v); }

function normalizeProxyPrefix(p) { p = (p || '').trim(); return p ? (p.endsWith('/') ? p : p + '/') : ''; }
function normalizeHostOverride(v) {
  v = (v || '').trim(); if (!v) return null;
  try { var u = v.indexOf('://') >= 0 ? new URL(v) : new URL('https://' + v); return { protocol: u.protocol, host: u.host }; }
  catch (e) { return null; }
}
function withGitHubProxy(url) {
  var p = normalizeProxyPrefix(_getProxyPrefix()); if (!p) return url;
  if (url.indexOf(p) === 0) return url;
  try { if (!GITHUB_HOSTS.has(new URL(url).hostname)) return url; } catch (e) { return url; }
  return p + url;
}
function rewriteGitHubHost(url) {
  var o = normalizeHostOverride(_getHostOverride()); if (!o) return url;
  try { var u = new URL(url); if (u.hostname !== 'github.com') return url; u.protocol = o.protocol; u.host = o.host; return u.toString(); }
  catch (e) { return url; }
}
function prepareDownloadUrl(url) {
  var r = rewriteGitHubHost(url);
  return normalizeHostOverride(_getHostOverride()) ? r : withGitHubProxy(r);
}

// ─── 已安装组件跟踪 ───────────────────────────────────────────────
function _getInstalled() {
  try { return JSON.parse(localStorage.getItem('jcm-installed-widgets') || '{}'); } catch (e) { return {}; }
}
function _setInstalled(map) { localStorage.setItem('jcm-installed-widgets', JSON.stringify(map)); }

function markInstalled(id, name, version, assetName) {
  var map = _getInstalled();
  map[id] = { name: name, version: version, assetName: assetName, installedAt: Date.now() };
  _setInstalled(map);
}

function getInstalledVersion(id) {
  var map = _getInstalled();
  return map[id] || null;
}

// ─── 已发布卡片跟踪 ───────────────────────────────────────────────
function _getPublished() {
  try { return JSON.parse(localStorage.getItem('jcm-published-cards') || '[]'); } catch (e) { return []; }
}
function _setPublished(arr) { localStorage.setItem('jcm-published-cards', JSON.stringify(arr)); }

function addPublished(entry) {
  var list = _getPublished();
  list.unshift(entry);
  if (list.length > 50) list = list.slice(0, 50);
  _setPublished(list);
}

// ─── API ──────────────────────────────────────────────────────────
function fetchJSON(url) {
  if (_cache[url]) return Promise.resolve(_cache[url]);
  return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { _cache[url] = d; return d; });
}
function getWidgets() { return fetchJSON(INDEX_BASE + '/indexes/widgets.json'); }
function getSummaries() { return fetchJSON(INDEX_BASE + '/indexes/component-summaries.json'); }
function getWidgetReleases(id) { return fetchJSON(INDEX_BASE + '/data/' + encodeURIComponent(id) + '/releases.json').catch(function () { return null; }); }

// ─── 更新检测 ─────────────────────────────────────────────────────
function checkUpdates(widgets) {
  var installed = _getInstalled();
  var updates = {};
  widgets.forEach(function (w) {
    var local = installed[w.id];
    if (!local) return;
    if (w.latestReleaseTag && w.latestReleaseTag !== local.version) {
      updates[w.id] = { localVer: local.version, remoteVer: w.latestReleaseTag, name: w.name };
    }
  });
  _updateMap = updates;
  return updates;
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
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<button class="btn btn-secondary" id="rsMyPubBtn" style="font-size:11px;padding:3px 10px">📤 我的发布</button>' +
    '<button class="btn btn-secondary" id="rsProxyBtn" style="font-size:11px;padding:3px 10px" title="GitHub 代理设置">🌐 代理</button>' +
    '<button class="modal-close" id="rsCloseBtn" aria-label="关闭">✕</button>' +
    '</div></div>';

  // Tab bar
  html += '<div style="display:flex;border-bottom:1px solid var(--border)">' +
    '<button class="rs-tab active" id="rsTabStore" data-rs-tab="store" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid var(--accent);color:var(--text);font-size:13px;cursor:pointer;font-weight:600">🏪 商店</button>' +
    '<button class="rs-tab" id="rsTabInstalled" data-rs-tab="installed" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text3);font-size:13px;cursor:pointer">📱 已安装</button>' +
    '</div>';

  html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)">' +
    '<input type="text" id="rsSearchInput" placeholder="🔍 搜索组件..." ' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);' +
    'border-radius:8px;color:var(--text);font-size:13px;outline:none">' +
    '</div>';

  html += '<div class="modal-body" id="rsBody" style="max-height:55vh;overflow-y:auto;padding:16px">' +
    '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 加载中...</div>' +
    '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  overlay.querySelector('#rsCloseBtn').onclick = function () { closeRearStoreModal(); };
  overlay.querySelector('#rsProxyBtn').onclick = function () { showProxySettings(); };
  overlay.querySelector('#rsMyPubBtn').onclick = function () { showMyPublished(stepCallbacks); };

  // Tab switching
  var currentTab = 'store';
  overlay.querySelectorAll('.rs-tab').forEach(function (tab) {
    tab.onclick = function () {
      currentTab = tab.dataset.rsTab;
      overlay.querySelectorAll('.rs-tab').forEach(function (t) {
        t.classList.remove('active');
        t.style.borderBottomColor = 'transparent';
        t.style.color = 'var(--text3)';
        t.style.fontWeight = '';
      });
      tab.classList.add('active');
      tab.style.borderBottomColor = 'var(--accent)';
      tab.style.color = 'var(--text)';
      tab.style.fontWeight = '600';
      if (currentTab === 'store') {
        renderWidgetList((overlay.querySelector('#rsSearchInput') || {}).value || '');
      } else {
        renderInstalledList();
      }
    };
  });

  var searchInput = overlay.querySelector('#rsSearchInput');
  var searchTimer = null;
  searchInput.addEventListener('input', function () {
    if (currentTab !== 'store') {
      currentTab = 'store';
      overlay.querySelector('#rsTabStore').click();
    }
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
          '<div style="font-size:48px;margin-bottom:16px">🏪</div><div>商店暂无组件</div></div>';
        return;
      }

      // Check updates
      var updates = checkUpdates(widgets);

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
          '<div style="font-size:36px;margin-bottom:12px">🔍</div><div>没有找到匹配的组件</div></div>';
        return;
      }

      var proxyActive = !!_getProxyPrefix() || !!_getHostOverride();
      var proxyBadge = proxyActive ? '<span style="color:var(--green)"> · 🌐 代理</span>' : '';
      var updateCount = Object.keys(updates).length;
      var updateBadge = updateCount > 0 ? '<span style="color:#f39c12"> · 🔄 ' + updateCount + ' 个更新</span>' : '';

      var html = '<div class="rs-widget-list">' +
        '<div style="font-size:11px;color:var(--text3);padding:0 2px;margin-bottom:4px">' +
        '共 ' + filtered.length + ' 个组件' + proxyBadge + updateBadge + '</div>';

      filtered.forEach(function (w) {
        var summary = summaries.components && summaries.components[w.id];
        var avatarUrl = summary && summary.author && summary.author.avatarUrl;
        var starsHtml = w.stars ? '<span style="color:#f39c12;margin-left:6px">⭐ ' + w.stars + '</span>' : '';
        var dateStr = w.latestReleasePublishedAt
          ? new Date(w.latestReleasePublishedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
          : '';
        var installed = getInstalledVersion(w.id);
        var hasUpdate = updates[w.id];

        var statusBadge = '';
        if (hasUpdate) {
          statusBadge = '<span style="font-size:11px;padding:1px 6px;background:rgba(243,156,18,0.15);color:#f39c12;border-radius:4px;margin-left:8px">🔄 有更新 ' + escHtml(hasUpdate.localVer) + ' → ' + escHtml(hasUpdate.remoteVer) + '</span>';
        } else if (installed) {
          statusBadge = '<span style="font-size:11px;padding:1px 6px;background:rgba(0,206,201,0.12);color:var(--green);border-radius:4px;margin-left:8px">✅ 已安装</span>';
        }

        html += '<div class="rs-widget-card">' +
          '<div class="rs-widget-header">' +
          (avatarUrl ? '<img class="rs-avatar" src="' + escHtml(avatarUrl) + '" alt="" loading="lazy">'
                     : '<div class="rs-avatar-placeholder">📦</div>') +
          '<div class="rs-widget-info">' +
          '<div class="rs-widget-name">' + escHtml(w.name) + starsHtml + statusBadge + '</div>' +
          '<div class="rs-widget-meta">' +
          '<span>@' + escHtml(w.authorName || 'unknown') + '</span>' +
          (w.latestReleaseTag ? '<span> · ' + escHtml(w.latestReleaseTag) + '</span>' : '') +
          (dateStr ? '<span> · ' + dateStr + '</span>' : '') +
          '</div></div></div>' +
          '<div class="rs-widget-desc">' + escHtml(w.description || '') + '</div>' +
          '<div class="rs-widget-actions">';

        if (hasUpdate) {
          html += '<button class="btn btn-secondary rs-install-btn" data-rs-install="' + escHtml(w.id) + '" style="font-size:12px;padding:4px 12px;color:#f39c12">🔄 更新</button>';
        }
        html += '<button class="btn btn-primary rs-install-btn" data-rs-install="' + escHtml(w.id) + '" style="font-size:12px;padding:4px 12px">' +
          (installed ? '📥 重新安装' : '📥 安装') + '</button>' +
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
        _cache = {}; renderWidgetList(query);
      };
    });
}

// ─── 已安装列表 ───────────────────────────────────────────────────
function renderInstalledList() {
  var bodyEl = _modal && _modal.querySelector('#rsBody');
  if (!bodyEl) return;

  var installed = _getInstalled();
  var ids = Object.keys(installed);

  if (ids.length === 0) {
    bodyEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">' +
      '<div style="font-size:48px;margin-bottom:16px">📱</div>' +
      '<div style="font-size:14px;margin-bottom:8px">暂无已安装组件</div>' +
      '<div style="font-size:12px">从商店安装的组件会出现在这里</div></div>';
    return;
  }

  var html = '<div class="rs-widget-list">';
  ids.forEach(function (id) {
    var info = installed[id];
    var dateStr = info.installedAt
      ? new Date(info.installedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';

    html += '<div class="rs-widget-card">' +
      '<div class="rs-widget-header">' +
      '<div class="rs-avatar-placeholder">📦</div>' +
      '<div class="rs-widget-info">' +
      '<div class="rs-widget-name">' + escHtml(info.name || id) + '</div>' +
      '<div class="rs-widget-meta">' +
      '<span>版本: ' + escHtml(info.version || '未知') + '</span>' +
      (dateStr ? '<span> · 安装于 ' + dateStr + '</span>' : '') +
      (info.assetName ? '<span> · ' + escHtml(info.assetName) + '</span>' : '') +
      '</div></div></div>' +
      '<div class="rs-widget-actions">' +
      '<button class="btn btn-secondary rs-uninstall-btn" data-rs-uninstall="' + escHtml(id) + '" style="font-size:12px;padding:4px 12px;color:var(--err)">🗑️ 移除记录</button>' +
      '</div></div>';
  });
  html += '</div>';

  bodyEl.innerHTML = html;
  bodyEl.querySelectorAll('[data-rs-uninstall]').forEach(function (btn) {
    btn.onclick = function () {
      var id = btn.dataset.rsUninstall;
      var map = _getInstalled();
      delete map[id];
      _setInstalled(map);
      toast('🗑️ 已移除安装记录', 'success');
      renderInstalledList();
    };
  });
}

// ─── 我的发布 ─────────────────────────────────────────────────────
function showMyPublished(stepCallbacks) {
  var bodyEl = _modal && _modal.querySelector('#rsBody');
  if (!bodyEl) return;

  // Switch to store tab visually but show published content
  _modal.querySelectorAll('.rs-tab').forEach(function (t) {
    t.classList.remove('active');
    t.style.borderBottomColor = 'transparent';
    t.style.color = 'var(--text3)';
    t.style.fontWeight = '';
  });

  var published = _getPublished();

  var html = '<div style="margin-bottom:12px">' +
    '<button class="btn btn-secondary" id="rsBackToList" style="font-size:12px;padding:4px 12px">← 返回商店</button>' +
    '<button class="btn btn-primary" id="rsPublishBtn" style="font-size:12px;padding:4px 12px;margin-left:8px">📤 发布当前卡片</button>' +
    '</div>';

  if (published.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text3)">' +
      '<div style="font-size:48px;margin-bottom:16px">📤</div>' +
      '<div style="font-size:14px;margin-bottom:8px">还没有发布过卡片</div>' +
      '<div style="font-size:12px;line-height:1.5">配置好卡片后点击「📤 发布当前卡片」<br>会生成一个 GitHub Gist 分享链接</div></div>';
  } else {
    html += '<div class="rs-widget-list">';
    published.forEach(function (p, i) {
      var dateStr = p.publishedAt
        ? new Date(p.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      html += '<div class="rs-widget-card">' +
        '<div class="rs-widget-header">' +
        '<div class="rs-avatar-placeholder">' + escHtml(p.icon || '📱') + '</div>' +
        '<div class="rs-widget-info">' +
        '<div class="rs-widget-name">' + escHtml(p.name) + '</div>' +
        '<div class="rs-widget-meta">' +
        '<span>' + escHtml(p.template || '自定义') + '</span>' +
        (dateStr ? '<span> · ' + dateStr + '</span>' : '') +
        (p.version ? '<span> · v' + escHtml(p.version) + '</span>' : '') +
        '</div></div></div>';

      if (p.gistUrl) {
        html += '<div style="margin-top:8px;font-size:12px">' +
          '<a href="' + escHtml(p.gistUrl) + '" target="_blank" style="color:var(--accent);word-break:break-all">' +
          escHtml(p.gistUrl) + '</a></div>';
      }

      html += '<div class="rs-widget-actions" style="margin-top:8px">' +
        (p.gistUrl ? '<button class="btn btn-secondary rs-copy-link-btn" data-rs-link="' + escHtml(p.gistUrl) + '" style="font-size:11px;padding:3px 10px">📋 复制链接</button>' : '') +
        '<button class="btn btn-secondary rs-repub-btn" data-rs-repub="' + i + '" style="font-size:11px;padding:3px 10px">🔄 更新发布</button>' +
        '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px;color:var(--err)" onclick="this.closest(\'.rs-widget-card\').remove()">🗑️</button>' +
        '</div></div>';
    });
    html += '</div>';
  }

  bodyEl.innerHTML = html;

  bodyEl.querySelector('#rsBackToList').onclick = function () {
    _modal.querySelector('#rsTabStore').click();
  };

  var pubBtn = bodyEl.querySelector('#rsPublishBtn');
  if (pubBtn) {
    pubBtn.onclick = function () { showPublishDialog(stepCallbacks); };
  }

  bodyEl.querySelectorAll('.rs-copy-link-btn').forEach(function (btn) {
    btn.onclick = function () {
      navigator.clipboard.writeText(btn.dataset.rsLink).then(function () {
        toast('📋 链接已复制', 'success');
      });
    };
  });

  bodyEl.querySelectorAll('.rs-repub-btn').forEach(function (btn) {
    btn.onclick = function () {
      var idx = Number(btn.dataset.rsRepub);
      var entry = published[idx];
      if (entry) showPublishDialog(stepCallbacks, entry);
    };
  });
}

// ─── 发布对话框 ───────────────────────────────────────────────────
function showPublishDialog(stepCallbacks, existingEntry) {
  if (!S.tpl) return toast('请先选择一个模板', 'error');

  var existing = document.getElementById('rsPublishModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'rsPublishModal';
  overlay.style.display = '';
  overlay.onclick = function () { overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '500px';
  modal.onclick = function (e) { e.stopPropagation(); };

  var curName = existingEntry ? existingEntry.name : (S.cfg.cardName || S.tpl.name);
  var curDesc = existingEntry ? (existingEntry.description || '') : '';
  var curVer = existingEntry ? (existingEntry.version || '1.0') : '1.0';
  var isUpdate = !!existingEntry;

  var html = '<div class="modal-header">' +
    '<h3>' + (isUpdate ? '🔄 更新发布' : '📤 发布卡片') + '</h3>' +
    '<button class="modal-close" onclick="document.getElementById(\'rsPublishModal\').remove()">✕</button>' +
    '</div>' +
    '<div class="modal-body" style="padding:16px">' +

    '<div style="margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px">卡片名称</div>' +
    '<input type="text" id="pubName" value="' + escHtml(curName) + '" ' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none">' +
    '</div>' +

    '<div style="margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px">描述</div>' +
    '<textarea id="pubDesc" rows="2" placeholder="简要描述这个卡片的功能和特色..."' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;resize:vertical">' +
    escHtml(curDesc) + '</textarea>' +
    '</div>' +

    '<div style="margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px">版本号</div>' +
    '<input type="text" id="pubVersion" value="' + escHtml(curVer) + '" placeholder="1.0" ' +
    'style="width:120px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none">' +
    '</div>' +

    '<div style="padding:10px;background:rgba(108,92,231,0.06);border-radius:8px;font-size:11px;color:var(--text3);line-height:1.6;margin-bottom:16px">' +
    '📤 发布后会创建一个公开 GitHub Gist，包含卡片的 MAML XML + 配置。<br>' +
    '🔗 分享链接给其他人，他们可以在 RearStore 中通过 Gist 导入。<br>' +
    '⚠️ 需要配置 GitHub Token（首次发布时会提示）' +
    '</div>' +

    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'rsPublishModal\').remove()" style="font-size:12px;padding:6px 14px">取消</button>' +
    '<button class="btn btn-primary" id="pubConfirmBtn" style="font-size:12px;padding:6px 14px">' +
    (isUpdate ? '🔄 更新发布' : '📤 确认发布') + '</button>' +
    '</div></div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.querySelector('#pubConfirmBtn').onclick = function () {
    var name = overlay.querySelector('#pubName').value.trim();
    var desc = overlay.querySelector('#pubDesc').value.trim();
    var version = overlay.querySelector('#pubVersion').value.trim() || '1.0';
    if (!name) return toast('请输入卡片名称', 'warning');
    overlay.remove();
    publishCard(name, desc, version, stepCallbacks, isUpdate ? existingEntry : null);
  };
}

function publishCard(name, description, version, stepCallbacks, existingEntry) {
  // Check GitHub token
  var token = _getGHToken();
  if (!token) {
    showTokenInput(function (t) {
      _setGHToken(t);
      publishCard(name, description, version, stepCallbacks, existingEntry);
    });
    return;
  }

  var p = toastProgress('正在生成 MAML...');

  // Generate MAML
  var device = getDevice('p2');
  var innerXml;
  if (S.tpl.rawXml) {
    innerXml = S.tpl.rawXml(S.cfg);
  } else if (S.tpl.gen) {
    innerXml = S.tpl.gen(S.cfg);
  } else {
    innerXml = S.elements.map(function (el) {
      // Simple element rendering for publish
      if (el.type === 'text') {
        return '    <Text text="' + (el.text || '') + '" x="' + (el.x || 0) + '" y="' + (el.y || 0) + '" size="' + (el.size || 24) + '" color="' + (el.color || '#ffffff') + '" />';
      }
      if (el.type === 'rect') {
        return '    <Rectangle x="' + (el.x || 0) + '" y="' + (el.y || 0) + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '" fillColor="' + (el.color || '#333333') + '" />';
      }
      return '';
    }).filter(Boolean).join('\n');
  }

  var maml = generateMAML({
    cardName: name, device: device, innerXml: innerXml,
    updater: S.tpl.updater, extraElements: S.elements,
    uploadedFiles: S.uploadedFiles, bgImage: S.cfg.bgImage || '',
  });

  p.update('正在创建 Gist...');

  // Build gist content
  var gistData = {
    name: name,
    description: description,
    version: version,
    template: S.tpl.name,
    templateId: S.tpl.id,
    icon: S.tpl.icon || '📱',
    config: S.cfg,
    maml: maml,
    publishedAt: new Date().toISOString(),
  };

  var gistBody = {
    description: 'REAREye 卡片: ' + name + ' v' + version,
    public: true,
    files: {}
  };
  gistBody.files['card.json'] = { content: JSON.stringify(gistData, null, 2) };
  gistBody.files['card.xml'] = { content: maml };

  if (existingEntry && existingEntry.gistId) {
    // Update existing gist
    fetch('https://api.github.com/gists/' + existingEntry.gistId, {
      method: 'PATCH',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(gistBody),
    })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (gist) {
      // Update published entry
      var list = _getPublished();
      var idx = list.findIndex(function (e) { return e.gistId === existingEntry.gistId; });
      if (idx >= 0) {
        list[idx].version = version;
        list[idx].description = description;
        list[idx].name = name;
        list[idx].updatedAt = Date.now();
        _setPublished(list);
      }
      p.close('✅ 已更新: ' + gist.html_url, 'success');
      showMyPublished(stepCallbacks);
    })
    .catch(function (err) {
      if (err.message.indexOf('401') >= 0 || err.message.indexOf('403') >= 0) {
        _setGHToken('');
        p.close('❌ Token 过期，请重新配置', 'error');
      } else {
        p.close('❌ 发布失败: ' + err.message, 'error');
      }
    });
  } else {
    // Create new gist
    fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(gistBody),
    })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (gist) {
      addPublished({
        name: name, description: description, version: version,
        template: S.tpl.name, templateId: S.tpl.id, icon: S.tpl.icon || '📱',
        gistId: gist.id, gistUrl: gist.html_url,
        publishedAt: Date.now(),
      });
      p.close('✅ 已发布: ' + gist.html_url, 'success');
      showMyPublished(stepCallbacks);
    })
    .catch(function (err) {
      if (err.message.indexOf('401') >= 0 || err.message.indexOf('403') >= 0) {
        _setGHToken('');
        p.close('❌ Token 过期，请重新配置', 'error');
      } else {
        p.close('❌ 发布失败: ' + err.message, 'error');
      }
    });
  }
}

// ─── GitHub Token 管理 ────────────────────────────────────────────
function _getGHToken() {
  try {
    var raw = localStorage.getItem('jcm-gh-token');
    if (!raw) return '';
    var key = navigator.userAgent.length + '_' + screen.width + 'x' + screen.height;
    var bin = atob(raw);
    var decoded = '';
    for (var i = 0; i < bin.length; i++) decoded += String.fromCharCode(bin.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    return decoded;
  } catch (e) { return ''; }
}
function _setGHToken(token) {
  try {
    var key = navigator.userAgent.length + '_' + screen.width + 'x' + screen.height;
    var encoded = '';
    for (var i = 0; i < token.length; i++) encoded += String.fromCharCode(token.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    localStorage.setItem('jcm-gh-token', btoa(encoded));
  } catch (e) {}
}

function showTokenInput(callback) {
  var existing = document.getElementById('rsTokenModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'rsTokenModal';
  overlay.style.display = '';
  overlay.onclick = function () { overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';
  modal.onclick = function (e) { e.stopPropagation(); };

  modal.innerHTML = '<div class="modal-header">' +
    '<h3>🔑 配置 GitHub Token</h3>' +
    '<button class="modal-close" onclick="document.getElementById(\'rsTokenModal\').remove()">✕</button>' +
    '</div>' +
    '<div class="modal-body" style="padding:16px">' +
    '<div style="font-size:13px;margin-bottom:12px;line-height:1.5">发布卡片需要 GitHub Personal Access Token（需 <code style="background:var(--surface2);padding:1px 4px;border-radius:3px">gist</code> 权限）。</div>' +
    '<div style="font-size:12px;margin-bottom:12px"><a href="https://github.com/settings/tokens/new?scopes=gist&description=REAREye+Card+Maker" target="_blank" style="color:var(--accent)">→ 创建 Token（自动勾选 gist 权限）</a></div>' +
    '<input type="password" id="rsTokenInput" placeholder="ghp_xxxxxxxxxxxx" ' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;font-family:monospace">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:8px">Token 经过混淆存储在本地，不会上传到任何服务器</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'rsTokenModal\').remove()" style="font-size:12px;padding:6px 14px">取消</button>' +
    '<button class="btn btn-primary" id="rsTokenSave" style="font-size:12px;padding:6px 14px">💾 保存</button>' +
    '</div></div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.querySelector('#rsTokenSave').onclick = function () {
    var token = overlay.querySelector('#rsTokenInput').value.trim();
    if (!token) return toast('请输入 Token', 'warning');
    overlay.remove();
    callback(token);
  };
}

// ─── Gist 导入 ────────────────────────────────────────────────────
function importFromGist(gistId, stepCallbacks) {
  var p = toastProgress('正在从 Gist 导入...');
  fetch('https://api.github.com/gists/' + gistId)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (gist) {
      var cardFile = gist.files && (gist.files['card.json'] || gist.files['card.xml']);
      if (!cardFile) throw new Error('Gist 中没有找到卡片数据');

      // Try JSON format first
      if (gist.files['card.json']) {
        var data = JSON.parse(gist.files['card.json'].content);
        S.setTpl(TEMPLATES.find(function (t) { return t.id === (data.templateId || 'custom'); }) || TEMPLATES.find(function (t) { return t.id === 'custom'; }));
        S.setCfg(data.config || { cardName: data.name });
        S.setElements([]);
        S.setUploadedFiles({});
        S.setSelIdx(-1); S.setDirty(true);
        resetHistory();
        if (stepCallbacks) { stepCallbacks.renderTplGrid(); stepCallbacks.goStep(1); }
        closeRearStoreModal();
        p.close('✅ 已导入: ' + data.name, 'success');
      } else {
        // XML format - use MAML import
        p.close('⚠️ 请使用「导入 MAML XML」功能导入此卡片', 'warning');
      }
    })
    .catch(function (err) { p.close('❌ 导入失败: ' + err.message, 'error'); });
}

// ─── Proxy Settings ───────────────────────────────────────────────
function showProxySettings() {
  var existing = document.getElementById('rsProxyModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'rsProxyModal';
  overlay.style.display = '';
  overlay.onclick = function () { overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '520px';
  modal.onclick = function (e) { e.stopPropagation(); };

  var curPrefix = _getProxyPrefix();
  var curHost = _getHostOverride();

  modal.innerHTML = '<div class="modal-header">' +
    '<h3>🌐 GitHub 代理设置</h3>' +
    '<button class="modal-close" onclick="document.getElementById(\'rsProxyModal\').remove()">✕</button>' +
    '</div>' +
    '<div class="modal-body" style="padding:16px">' +
    '<div style="margin-bottom:16px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:6px">代理前缀 (CDN 加速)</div>' +
    '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;line-height:1.5">' +
    '在 GitHub 下载链接前加代理前缀。<br>例：<code style="background:var(--surface2);padding:1px 4px;border-radius:3px">https://ghproxy.com/</code></div>' +
    '<input type="text" id="rsProxyPrefix" value="' + escHtml(curPrefix) + '" placeholder="https://your-proxy.com/" ' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;font-family:monospace">' +
    '</div>' +
    '<div style="margin-bottom:16px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:6px">Host 覆写</div>' +
    '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;line-height:1.5">' +
    '将 <code style="background:var(--surface2);padding:1px 4px;border-radius:3px">github.com</code> 替换为镜像地址。</div>' +
    '<input type="text" id="rsHostOverride" value="' + escHtml(curHost) + '" placeholder="留空不启用" ' +
    'style="width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;font-family:monospace">' +
    '</div>' +
    '<div style="padding:10px;background:rgba(108,92,231,0.06);border-radius:8px;font-size:11px;color:var(--text3);line-height:1.6;margin-bottom:16px">' +
    '<div style="font-weight:600;margin-bottom:4px">💡 常用代理服务</div>' +
    '• <a href="https://gh-proxy.com" target="_blank" style="color:var(--accent)">gh-proxy.com</a> — 免费 GitHub 代理<br>' +
    '• 自建 Cloudflare Worker — 参考 NekoStash 的 esa-edge-function.js<br>' +
    '• 两项都填时 Host 覆写优先' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'rsProxyModal\').remove()" style="font-size:12px;padding:6px 14px">取消</button>' +
    '<button class="btn btn-secondary" id="rsProxyClear" style="font-size:12px;padding:6px 14px;color:var(--err)">🗑️ 清除</button>' +
    '<button class="btn btn-primary" id="rsProxySave" style="font-size:12px;padding:6px 14px">💾 保存</button>' +
    '</div></div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.querySelector('#rsProxySave').onclick = function () {
    _setProxyPrefix(overlay.querySelector('#rsProxyPrefix').value.trim());
    _setHostOverride(overlay.querySelector('#rsHostOverride').value.trim());
    overlay.remove();
    toast('✅ 代理设置已保存', 'success');
    if (_modal) renderWidgetList((_modal.querySelector('#rsSearchInput') || {}).value || '');
  };

  overlay.querySelector('#rsProxyClear').onclick = function () {
    _setProxyPrefix(''); _setHostOverride('');
    overlay.remove();
    toast('🗑️ 代理设置已清除', 'success');
    if (_modal) renderWidgetList((_modal.querySelector('#rsSearchInput') || {}).value || '');
  };
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
    downloadAndImport(id, latest.tagName, asset.downloadUrl, asset.name, stepCallbacks);
  }).catch(function (e) {
    toast('获取版本信息失败: ' + e.message, 'error');
  });
}

function downloadAndImport(widgetId, version, url, fileName, stepCallbacks) {
  var proxyUrl = prepareDownloadUrl(url);
  var proxyActive = proxyUrl !== url;
  var p = toastProgress((proxyActive ? '通过代理下载 ' : '正在下载 ') + fileName + '...');

  function doImport(blob) {
    p.update('正在导入...');
    var file = new File([blob], fileName, { type: 'application/zip' });
    if (fileName.endsWith('.zip')) {
      return importZip(file).then(function (data) {
        S.setTpl(TEMPLATES.find(function (t) { return t.id === 'custom'; }));
        S.setCfg({ cardName: data.cardName, bgColor: data.bgColor, bgImage: data.bgImage || '' });
        S.setElements(data.elements);
        S.setUploadedFiles(data.files || {});
        S.setSelIdx(-1); S.setDirty(true);
        resetHistory();
        // Mark as installed
        markInstalled(widgetId, data.cardName || widgetId, version, fileName);
        if (stepCallbacks) { stepCallbacks.renderTplGrid(); stepCallbacks.goStep(1); }
        closeRearStoreModal();
        p.close('✅ 已导入: ' + fileName, 'success');
      });
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
    URL.revokeObjectURL(a.href);
    markInstalled(widgetId, widgetId, version, fileName);
    p.close('✅ 已下载: ' + fileName, 'success');
  }

  fetch(proxyUrl)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then(doImport)
    .catch(function (err) {
      if (proxyActive) {
        p.update('代理失败，尝试直连...');
        fetch(url)
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
          .then(doImport)
          .catch(function () { p.close('❌ 代理和直连均失败', 'error'); });
      } else {
        p.close('❌ ' + err.message, 'error');
      }
    });
}

// ─── Helpers ──────────────────────────────────────────────────────
export function closeRearStoreModal() {
  if (_modal) { _modal.remove(); _modal = null; }
}
