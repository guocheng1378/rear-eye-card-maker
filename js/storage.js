// ─── Storage: IndexedDB 大容量存储 + localStorage 降级 ─────────────
// localStorage 上限约 5-10MB，base64 背景图/素材很容易超限。
// 改用 IndexedDB 存大文件（素材、草稿），localStorage 只存小配置。

JCM.Storage = (function () {
  var DB_NAME = 'janus-card-maker';
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

  // ─── 草稿保存（IndexedDB）─────────────────────────────────────────
  function saveDraft(tplId, cfg, elements, uploadedFiles) {
    // 将 uploadedFiles 中的 ArrayBuffer 分离出来
    var fileKeys = Object.keys(uploadedFiles || {});
    var fileMeta = {};
    var fileDataPromises = [];

    fileKeys.forEach(function (k) {
      var f = uploadedFiles[k];
      fileMeta[k] = { mimeType: f.mimeType, originalName: f.originalName };
      // 只保存非 blob URL 的 dataUrl（blob URL 刷新后失效）
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

  function loadDraft() {
    return get('draft').then(function (draft) {
      if (!draft) return null;
      // 恢复 uploadedFiles
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
                // 重新生成 blob URL
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

  function clearDraft() {
    return clear();
  }

  return {
    put: put,
    get: get,
    remove: remove,
    clear: clear,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
  };
})();
