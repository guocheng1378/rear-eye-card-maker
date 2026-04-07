// ─── Storage: IndexedDB 大容量存储 + localStorage 降级 — ES Module ─

var DB_NAME = 'rear-eye-card-maker';
var DB_VERSION = 1;
var STORE_NAME = 'blobs';
var db = null;

function open() {
  if (db) return Promise.resolve(db);
  if (!window.indexedDB) return Promise.reject(new Error('IndexedDB 不可用'));
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function (e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = function (e) {
      db = e.target.result;
      resolve(db);
    };
    req.onerror = function () { reject(new Error('IndexedDB 打开失败')); };
  });
}

function put(key, value) {
  return open().then(function (d) {
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(new Error('写入失败: ' + key)); };
    });
  });
}

function get(key) {
  return open().then(function (d) {
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(STORE_NAME, 'readonly');
      var req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(new Error('读取失败: ' + key)); };
    });
  });
}

function remove(key) {
  return open().then(function (d) {
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(new Error('删除失败: ' + key)); };
    });
  });
}

function clear() {
  return open().then(function (d) {
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(new Error('清空失败')); };
    });
  });
}

export function saveDraft(tplId, cfg, elements, uploadedFiles) {
  var fileKeys = Object.keys(uploadedFiles || {});
  var fileMeta = {};
  var fileDataPromises = [];

  fileKeys.forEach(function (k) {
    var f = uploadedFiles[k];
    fileMeta[k] = { mimeType: f.mimeType, originalName: f.originalName };
    if (f.dataUrl && f.dataUrl.indexOf('blob:') !== 0) {
      fileMeta[k].dataUrl = f.dataUrl;
    }
    if (f.data) {
      fileDataPromises.push(
        put('file_' + k, f.data).then(function () {
          fileMeta[k].hasData = true;
        }).catch(function () { /* 大文件写入失败，忽略 */ })
      );
    }
  });

  var draft = {
    tplId: tplId,
    cfg: cfg,
    elements: elements,
    fileMeta: fileMeta,
    timestamp: Date.now()
  };

  return Promise.all(fileDataPromises).then(function () {
    return put('draft', draft);
  });
}

export function loadDraft() {
  return get('draft').then(function (draft) {
    if (!draft) return null;
    var fileMeta = draft.fileMeta || {};
    var fileKeys = Object.keys(fileMeta);
    var restorePromises = [];

    draft.uploadedFiles = {};

    fileKeys.forEach(function (k) {
      var meta = fileMeta[k];
      var entry = { mimeType: meta.mimeType, originalName: meta.originalName, dataUrl: meta.dataUrl || '' };

      if (meta.hasData) {
        restorePromises.push(
          get('file_' + k).then(function (buf) {
            if (buf) {
              entry.data = buf;
              if (!entry.dataUrl || entry.dataUrl.indexOf('blob:') === 0) {
                var blob = new Blob([buf], { type: meta.mimeType });
                entry.dataUrl = URL.createObjectURL(blob);
              }
            }
            draft.uploadedFiles[k] = entry;
          }).catch(function () { /* 读取失败，跳过 */ })
        );
      } else {
        draft.uploadedFiles[k] = entry;
      }
    });

    return Promise.all(restorePromises).then(function () { return draft; });
  });
}

export function clearDraft() {
  return clear();
}
