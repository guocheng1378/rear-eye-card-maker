// ─── Share: URL 分享 + 草稿恢复 ──────────────────────────────────
import * as S from '../state.js';
import { TEMPLATES } from '../templates/index.js';
import { resetHistory } from '../history.js';
import { toast } from './toast.js';
import { escHtml } from '../utils.js';

export function shareTemplate() {
  if (!S.tpl) return toast('请先选择模板', 'error');
  var data = { t: S.tpl.id, c: S.cfg, e: S.tpl.id === 'custom' ? S.elements : undefined };
  var json = JSON.stringify(data);
  var encoded = btoa(unescape(encodeURIComponent(json)));
  var url = location.origin + location.pathname + '#share=' + encoded;
  if (url.length > 8000) return toast('⚠️ 模板数据过大，无法通过 URL 分享', 'warning');
  navigator.clipboard.writeText(url).then(function () {
    toast('📋 分享链接已复制！', 'success');
  }).catch(function () {
    toast('复制失败，请手动复制地址栏', 'error');
  });
}

export function checkShareURL(callbacks) {
  var hash = location.hash;
  if (hash.indexOf('#share=') !== 0) return;
  try {
    var encoded = hash.substring(7);
    var json = decodeURIComponent(escape(atob(encoded)));
    var data = JSON.parse(json);
    var tpl = TEMPLATES.find(function (t) { return t.id === data.t; });
    if (!tpl) return;
    S.setTpl(tpl);
    var newCfg = {};
    tpl.config.forEach(function (g) {
      g.fields.forEach(function (f) {
        newCfg[f.key] = data.c[f.key] !== undefined ? data.c[f.key] : f.default;
      });
    });
    S.setCfg(newCfg);
    if (data.e) S.setElements(data.e);
    S.setDirty(true);
    resetHistory();
    callbacks.renderTplGrid();
    callbacks.goStep(1);
    toast('✅ 已导入分享模板: ' + tpl.name, 'success');
    history.replaceState(null, '', location.pathname);
  } catch (e) {
    console.warn('Share URL parse failed:', e);
  }
}

export function showDraftRecovery(d, callbacks) {
  var tpl = TEMPLATES.find(function (t) { return t.id === d.tplId; });
  var name = tpl ? tpl.name : d.tplId;
  var timeStr = new Date(d.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  var div = document.createElement('div');
  div.className = 'draft-recovery';
  div.innerHTML = '<div class="draft-recovery-title">📄 发现未保存的草稿</div>' +
    '<div class="draft-recovery-desc">模板: ' + escHtml(name) + ' · ' + timeStr + '</div>' +
    '<div class="draft-recovery-btns"><button class="btn btn-primary" id="draftRecoverBtn">恢复</button>' +
    '<button class="btn btn-secondary" id="draftDiscardBtn">丢弃</button></div>';
  document.body.appendChild(div);

  document.getElementById('draftRecoverBtn').onclick = function () {
    var tpl2 = TEMPLATES.find(function (t) { return t.id === d.tplId; });
    if (!tpl2) { toast('找不到对应模板', 'error'); div.remove(); return; }
    S.setTpl(tpl2);
    S.setCfg(d.cfg || {});
    S.setElements(d.elements || []);
    if (d.uploadedFiles) S.setUploadedFiles(d.uploadedFiles);
    S.setDirty(true);
    resetHistory();
    callbacks.renderTplGrid();
    callbacks.goStep(1);
    toast('✅ 草稿已恢复', 'success');
    div.remove();
  };

  document.getElementById('draftDiscardBtn').onclick = function () {
    localStorage.removeItem('jcm-draft');
    div.remove();
  };
}
