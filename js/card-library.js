// ─── Card Library: 我的卡片库管理 ─────────────────────────────────
// 保存、加载、删除已导出的卡片配置，支持启用/禁用、备注

var STORAGE_KEY = 'rear-eye-card-library';

function _load() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function _save(lib) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch (e) {
    console.warn('Card library save failed:', e);
  }
}

// 保存当前卡片到库
export function saveToLibrary(cardName, tplId, tplName, icon, cfg, elements) {
  var lib = _load();
  var entry = {
    id: 'card_' + Date.now(),
    name: cardName || tplName || '未命名卡片',
    tplId: tplId,
    tplName: tplName || '',
    icon: icon || '📱',
    cfg: cfg || {},
    elements: elements || [],
    enabled: true,
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  lib.unshift(entry);
  _save(lib);
  return entry;
}

// 获取所有卡片
export function getAllCards() {
  return _load();
}

// 获取已启用的卡片
export function getEnabledCards() {
  return _load().filter(function (c) { return c.enabled; });
}

// 切换启用/禁用
export function toggleCardEnabled(cardId) {
  var lib = _load();
  var card = lib.find(function (c) { return c.id === cardId; });
  if (card) {
    card.enabled = !card.enabled;
    card.updatedAt = Date.now();
    _save(lib);
  }
  return card;
}

// 更新备注
export function updateCardNote(cardId, note) {
  var lib = _load();
  var card = lib.find(function (c) { return c.id === cardId; });
  if (card) {
    card.note = note;
    card.updatedAt = Date.now();
    _save(lib);
  }
  return card;
}

// 重命名卡片
export function renameCard(cardId, newName) {
  var lib = _load();
  var card = lib.find(function (c) { return c.id === cardId; });
  if (card) {
    card.name = newName;
    card.updatedAt = Date.now();
    _save(lib);
  }
  return card;
}

// 删除卡片
export function deleteCard(cardId) {
  var lib = _load();
  var idx = lib.findIndex(function (c) { return c.id === cardId; });
  if (idx >= 0) {
    lib.splice(idx, 1);
    _save(lib);
    return true;
  }
  return false;
}

// 拖拽排序
export function reorderCards(fromIdx, toIdx) {
  var lib = _load();
  if (fromIdx < 0 || fromIdx >= lib.length || toIdx < 0 || toIdx >= lib.length) return;
  var item = lib.splice(fromIdx, 1)[0];
  lib.splice(toIdx, 0, item);
  _save(lib);
}

// 获取单个卡片
export function getCard(cardId) {
  return _load().find(function (c) { return c.id === cardId; }) || null;
}

// 导出整个库为 JSON
export function exportLibrary() {
  var lib = _load();
  var json = JSON.stringify(lib, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'rear-eye-card-library-' + new Date().toISOString().slice(0, 10) + '.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 10000);
}

// 导入库 JSON
export function importLibrary(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('格式错误');
        var existing = _load();
        var existingIds = {};
        existing.forEach(function (c) { existingIds[c.id] = true; });
        var imported = 0;
        data.forEach(function (card) {
          if (card.id && card.name && !existingIds[card.id]) {
            existing.push(card);
            imported++;
          }
        });
        _save(existing);
        resolve(imported);
      } catch (e) {
        reject(new Error('导入失败: ' + e.message));
      }
    };
    reader.readAsText(file);
  });
}

// 统计信息
export function getLibraryStats() {
  var lib = _load();
  var enabled = 0;
  var tplCount = {};
  lib.forEach(function (c) {
    if (c.enabled) enabled++;
    var key = c.tplName || c.tplId || '未知';
    tplCount[key] = (tplCount[key] || 0) + 1;
  });
  return { total: lib.length, enabled: enabled, byTemplate: tplCount };
}
