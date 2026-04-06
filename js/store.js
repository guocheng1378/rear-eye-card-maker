// ─── Store: 简易响应式状态 + 公共工具 ────────────────────────────────

window.JCM = window.JCM || {};

// 统一的 HTML 转义
JCM.escHtml = function (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ─── 颜色预设 ──────────────────────────────────────────────────────
JCM.COLOR_PRESETS = [
  '#ffffff','#f5f5f5','#e0e0e0','#9e9e9e','#616161','#212121','#000000',
  '#f44336','#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#03a9f4',
  '#00bcd4','#009688','#4caf50','#8bc34a','#cddc39','#ffeb3b','#ffc107',
  '#ff9800','#ff5722','#795548','#607d8b'
];
JCM.getRecentColors = function () {
  try { return JSON.parse(localStorage.getItem('jcm-recent-colors') || '[]'); } catch (e) { return []; }
};
JCM.addRecentColor = function (color) {
  var recent = JCM.getRecentColors();
  var idx = recent.indexOf(color);
  if (idx >= 0) recent.splice(idx, 1);
  recent.unshift(color);
  if (recent.length > 12) recent = recent.slice(0, 12);
  try { localStorage.setItem('jcm-recent-colors', JSON.stringify(recent)); } catch (e) {}
};

// ─── 模板分类 ──────────────────────────────────────────────────────
JCM.TPL_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'time', label: '⏰ 时间' },
  { id: 'info', label: '📊 信息' },
  { id: 'media', label: '🎨 媒体' },
  { id: 'device', label: '📱 设备' },
  { id: 'custom', label: '🛠️ 自定义' },
];
JCM.TPL_CATEGORY_MAP = {
  clock: 'time', dualclock: 'time', countdown: 'time',
  quote: 'info', status: 'info', weather: 'info', steps: 'info',
  calendar: 'info', dailyquote: 'info', dashboard: 'info',
  battery: 'info', ring: 'info',
  music: 'media', gradient: 'media', image: 'media',
  custom: 'custom',
  weather_real: 'device', music_real: 'device',
};

// ─── 模板收藏 ──────────────────────────────────────────────────────
JCM.getFavorites = function () {
  try { return JSON.parse(localStorage.getItem('jcm-favorites') || '[]'); } catch (e) { return []; }
};
JCM.toggleFavorite = function (id) {
  var favs = JCM.getFavorites();
  var idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  try { localStorage.setItem('jcm-favorites', JSON.stringify(favs)); } catch (e) {}
  return favs.indexOf(id) >= 0;
};

JCM.createStore = function (init) {
  var s = JSON.parse(JSON.stringify(init));
  var subs = {};
  return {
    get: function (k) { return k ? s[k] : Object.assign({}, s); },
    set: function (k, v) {
      s[k] = v;
      (subs[k] || []).forEach(function (fn) { fn(v); });
    },
    on: function (k, fn) {
      (subs[k] = subs[k] || []).push(fn);
    }
  };
};
