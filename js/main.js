// ─── Main Entry Point ─────────────────────────────────────────────
import { initUI } from './ui/index.js';

// Global error handling
window.addEventListener('error', function (e) {
  console.error('[JCM Error]', e.error || e.message);
  var el = document.getElementById('offlineIndicator');
  if (el) {
    el.textContent = '⚠️ 发生错误，请刷新页面';
    el.style.display = '';
    el.style.background = 'rgba(231, 76, 60, 0.9)';
  }
});
window.addEventListener('unhandledrejection', function (e) {
  console.error('[JCM Promise]', e.reason);
});

document.addEventListener('DOMContentLoaded', function () {
  try {
    initUI();
  } catch (e) {
    console.error('[JCM Init Error]', e);
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-size:18px;text-align:center;padding:20px"><div>⚠️ 初始化失败<br><small style="opacity:0.6">' + (e.message || '未知错误') + '</small><br><br><button onclick="location.reload()" style="padding:8px 24px;border-radius:8px;border:none;background:#6c5ce7;color:#fff;font-size:16px;cursor:pointer">刷新页面</button></div></div>';
  }

  // Offline detection
  var offlineEl = document.getElementById('offlineIndicator');
  function updateOnlineStatus() {
    if (offlineEl) {
      offlineEl.textContent = navigator.onLine ? '' : '📴 离线模式';
      offlineEl.style.display = navigator.onLine ? 'none' : '';
      offlineEl.style.background = 'rgba(255, 152, 0, 0.9)';
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
