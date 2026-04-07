// ─── Utils: 公共工具函数 ──────────────────────────────────────────

export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function debounce(fn, ms) {
  var timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

export function isDarkColor(hex) {
  if (!hex || hex.charAt(0) !== '#') return false;
  var c = hex.substring(1);
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  var r = parseInt(c.substring(0, 2), 16) || 0;
  var g = parseInt(c.substring(2, 4), 16) || 0;
  var b = parseInt(c.substring(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35;
}

export function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function getRecentColors() {
  try { return JSON.parse(localStorage.getItem('jcm-recent-colors') || '[]'); } catch (e) { return []; }
}

export function addRecentColor(color) {
  var recent = getRecentColors();
  var idx = recent.indexOf(color);
  if (idx >= 0) recent.splice(idx, 1);
  recent.unshift(color);
  if (recent.length > 12) recent = recent.slice(0, 12);
  try { localStorage.setItem('jcm-recent-colors', JSON.stringify(recent)); } catch (e) {}
}

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem('jcm-favorites') || '[]'); } catch (e) { return []; }
}

export function toggleFavorite(id) {
  var favs = getFavorites();
  var idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  try { localStorage.setItem('jcm-favorites', JSON.stringify(favs)); } catch (e) {}
  return favs.indexOf(id) >= 0;
}
