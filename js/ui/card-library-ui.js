// ─── Card Library UI: 卡片库管理界面 ──────────────────────────────
import * as S from '../state.js';
import { TEMPLATES } from '../templates/index.js';
import { resetHistory } from '../history.js';
import { toast } from './toast.js';
import { escHtml } from '../utils.js';
import {
  getAllCards, saveToLibrary, deleteCard, toggleCardEnabled,
  renameCard, updateCardNote, reorderCards, getCard,
  exportLibrary, importLibrary, getLibraryStats
} from '../card-library.js';

var _libraryModal = null;
var _dragFromIdx = -1;

export function openLibraryModal(stepCallbacks) {
  if (_libraryModal) { _libraryModal.remove(); _libraryModal = null; }

  var stats = getLibraryStats();
  var cards = getAllCards();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeLibraryModal(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '680px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header">' +
    '<h3>📚 我的卡片库</h3>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<span style="font-size:12px;color:var(--text3)">' + stats.total + ' 弇卡片 · ' + stats.enabled + ' 弇已启用</span>' +
    '<button class="modal-close" id="libCloseBtn" aria-label="关闭">✕</button>' +
    '</div>' +
    '</div>';

  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto">';

  if (cards.length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--text3)">' +
      '<div style="font-size:48px;margin-bottom:16px">📚</div>' +
      '<div style="font-size:14px;margin-bottom:8px">卡片库为空</div>' +
      '<div style="font-size:12px">导出卡片时会自动保存到库中，或点击下方按钮导入</div>' +
      '</div>';
  } else {
    html += '<div class="card-library-list">';
    cards.forEach(function (card, i) {
      var timeStr = new Date(card.updatedAt || card.createdAt).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      html += '<div class="card-lib-item' + (!card.enabled ? ' disabled' : '') + '" data-card-id="' + card.id + '" draggable="true" data-lib-idx="' + i + '">' +
        '<div class="card-lib-drag-handle" title="拖拽排序">⠿</div>' +
        '<div class="card-lib-icon">' + (card.icon || '📱') + '</div>' +
        '<div class="card-lib-info">' +
        '<div class="card-lib-name">' + escHtml(card.name) + '</div>' +
        '<div class="card-lib-meta">' +
        '<span>' + escHtml(card.tplName || '自定义') + '</span>' +
        '<span>·</span>' +
        '<span>' + timeStr + '</span>' +
        (card.note ? '<span>·</span><span style="color:var(--accent)">' + escHtml(card.note) + '</span>' : '') +
        '</div>' +
        '</div>' +
        '<div class="card-lib-actions">' +
        '<button class="card-lib-btn" data-lib-load="' + card.id + '" title="加载到编辑器">📂</button>' +
        '<button class="card-lib-btn" data-lib-toggle="' + card.id + '" title="' + (card.enabled ? '禁用' : '启用') + '">' + (card.enabled ? '✅' : '⬜') + '</button>' +
        '<button class="card-lib-btn" data-lib-rename="' + card.id + '" title="重命名">✏️</button>' +
        '<button class="card-lib-btn" data-lib-note="' + card.id + '" title="备注">📝</button>' +
        '<button class="card-lib-btn" data-lib-delete="' + card.id + '" title="删除" style="color:#e17055">🗑️</button>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
  }

  html += '</div>';

  // Footer
  html += '<div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border);justify-content:space-between">' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-secondary" id="libExportBtn" style="font-size:12px;padding:6px 12px"><span class="btn-icon">💾</span> 导出库</button>' +
    '<button class="btn btn-secondary" id="libImportBtn" style="font-size:12px;padding:6px 12px"><span class="btn-icon">📂</span> 导入库</button>' +
    '</div>' +
    '<button class="btn btn-primary" id="libSaveCurrentBtn" style="font-size:12px;padding:6px 12px"><span class="btn-icon">➕</span> 保存当前卡片</button>' +
    '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _libraryModal = overlay;

  // Events
  overlay.querySelector('#libCloseBtn').onclick = function () { closeLibraryModal(); };

  overlay.querySelector('#libExportBtn').onclick = function () {
    exportLibrary();
    toast('💾 卡片库已导出', 'success');
  };

  overlay.querySelector('#libImportBtn').onclick = function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function () {
      var file = input.files[0];
      if (!file) return;
      importLibrary(file).then(function (count) {
        toast('✅ 已导入 ' + count + ' 弇卡片', 'success');
        openLibraryModal(stepCallbacks); // Refresh
      }).catch(function (e) { toast(e.message, 'error'); });
    };
    input.click();
  };

  overlay.querySelector('#libSaveCurrentBtn').onclick = function () {
    if (!S.tpl) return toast('请先选择一个模板', 'error');
    var entry = saveToLibrary(
      S.cfg.cardName || S.tpl.name,
      S.tpl.id,
      S.tpl.name,
      S.tpl.icon,
      S.cfg,
      S.elements
    );
    toast('✅ 已保存到卡片库: ' + entry.name, 'success');
    openLibraryModal(stepCallbacks); // Refresh
  };

  // Card actions (delegated)
  var listEl = overlay.querySelector('.card-library-list');
  if (listEl) {
    listEl.addEventListener('click', function (e) {
      var loadBtn = e.target.closest('[data-lib-load]');
      if (loadBtn) {
        var card = getCard(loadBtn.dataset.libLoad);
        if (!card) return toast('找不到卡片', 'error');
        var tpl = TEMPLATES.find(function (t) { return t.id === card.tplId; }) || TEMPLATES.find(function (t) { return t.id === 'custom'; });
        S.setTpl(tpl);
        var newCfg = {};
        tpl.config.forEach(function (g) { g.fields.forEach(function (f) { newCfg[f.key] = card.cfg[f.key] !== undefined ? card.cfg[f.key] : f.default; }); });
        S.setCfg(newCfg);
        S.setElements(card.elements || []);
        S.setUploadedFiles({});
        S.setSelIdx(-1);
        S.setDirty(true);
        resetHistory();
        if (stepCallbacks) {
          stepCallbacks.renderTplGrid();
          stepCallbacks.goStep(1);
        }
        closeLibraryModal();
        toast('📂 已加载: ' + card.name, 'success');
        return;
      }

      var toggleBtn = e.target.closest('[data-lib-toggle]');
      if (toggleBtn) {
        var toggled = toggleCardEnabled(toggleBtn.dataset.libToggle);
        if (toggled) openLibraryModal(stepCallbacks);
        return;
      }

      var renameBtn = e.target.closest('[data-lib-rename]');
      if (renameBtn) {
        var cardId = renameBtn.dataset.libRename;
        var currentName = (getCard(cardId) || {}).name || '';
        var newName = prompt('重命名卡片:', currentName);
        if (newName && newName.trim()) {
          renameCard(cardId, newName.trim());
          openLibraryModal(stepCallbacks);
          toast('✏️ 已重命名', 'success');
        }
        return;
      }

      var noteBtn = e.target.closest('[data-lib-note]');
      if (noteBtn) {
        var cardId2 = noteBtn.dataset.libNote;
        var currentNote = (getCard(cardId2) || {}).note || '';
        var newNote = prompt('卡片备注:', currentNote);
        if (newNote !== null) {
          updateCardNote(cardId2, newNote);
          openLibraryModal(stepCallbacks);
          toast('📝 备注已更新', 'success');
        }
        return;
      }

      var delBtn = e.target.closest('[data-lib-delete]');
      if (delBtn) {
        var cardId3 = delBtn.dataset.libDelete;
        var cardData = getCard(cardId3);
        if (confirm('确定删除「' + (cardData ? cardData.name : '') + '」？')) {
          deleteCard(cardId3);
          openLibraryModal(stepCallbacks);
          toast('🗑️ 已删除', 'success');
        }
        return;
      }
    });

    // Drag and drop reorder
    listEl.addEventListener('dragstart', function (e) {
      var item = e.target.closest('.card-lib-item');
      if (!item) return;
      _dragFromIdx = Number(item.dataset.libIdx);
      item.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });

    listEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var item = e.target.closest('.card-lib-item');
      if (item) item.style.borderTop = '2px solid var(--accent)';
    });

    listEl.addEventListener('dragleave', function (e) {
      var item = e.target.closest('.card-lib-item');
      if (item) item.style.borderTop = '';
    });

    listEl.addEventListener('drop', function (e) {
      e.preventDefault();
      var item = e.target.closest('.card-lib-item');
      if (!item) return;
      item.style.borderTop = '';
      var toIdx = Number(item.dataset.libIdx);
      if (_dragFromIdx >= 0 && _dragFromIdx !== toIdx) {
        reorderCards(_dragFromIdx, toIdx);
        openLibraryModal(stepCallbacks);
      }
      _dragFromIdx = -1;
    });

    listEl.addEventListener('dragend', function (e) {
      var item = e.target.closest('.card-lib-item');
      if (item) item.style.opacity = '';
      _dragFromIdx = -1;
    });
  }
}

export function closeLibraryModal() {
  if (_libraryModal) { _libraryModal.remove(); _libraryModal = null; }
}

export function getLibraryModalOpen() {
  return !!_libraryModal;
}
