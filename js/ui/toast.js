// ─── Toast: 通知系统 ──────────────────────────────────────────────

export function toast(msg, type, undoFn) {
  var el = document.getElementById('toast');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'toast-item toast-' + (type || 'info');
  var span = document.createElement('span');
  span.textContent = msg;
  div.appendChild(span);
  if (undoFn) {
    var btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = '撤销';
    btn.onclick = function () { undoFn(); div.remove(); };
    div.appendChild(btn);
  }
  el.appendChild(div);
  setTimeout(function () {
    div.classList.add('fade-out');
    setTimeout(function () { div.remove(); }, 300);
  }, 3000);
}

export function toastProgress(msg) {
  var el = document.getElementById('toast');
  if (!el) return { update: function () {}, close: function () {} };
  var div = document.createElement('div');
  div.className = 'toast-item toast-info';
  var span = document.createElement('span');
  span.textContent = msg;
  div.appendChild(span);
  el.appendChild(div);
  return {
    update: function (m) { div.querySelector('span').textContent = m; },
    close: function (m, t) {
      div.querySelector('span').textContent = m;
      div.className = 'toast-item toast-' + t;
      setTimeout(function () {
        div.classList.add('fade-out');
        setTimeout(function () { div.remove(); }, 300);
      }, 2000);
    }
  };
}
