// ─── Eyedropper: 取色器 ──────────────────────────────────────────
// Uses EyeDropper API (Chrome 95+) with canvas fallback
import { toast } from './toast.js';

var _active = false;
var _overlay = null;
var _callback = null;
var _canvas = null;
var _ctx = null;

// ── Check if EyeDropper API is available ──
function hasEyeDropperAPI() {
  return typeof window.EyeDropper !== 'undefined';
}

// ── Native EyeDropper ──
function pickColorNative(cb) {
  try {
    var dropper = new window.EyeDropper();
    dropper.open().then(function (result) {
      if (result.sRGBHex) {
        cb(result.sRGBHex);
      }
    }).catch(function () {
      // User cancelled
    });
  } catch (e) {
    toast('⚠️ 取色器不可用', 'error');
  }
}

// ── Canvas Fallback: screenshot + click ──
function pickColorFallback(cb) {
  // Create a full-screen overlay with a canvas
  _active = true;
  _callback = cb;

  _overlay = document.createElement('div');
  _overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:crosshair;background:rgba(0,0,0,0.3)';
  _overlay.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);color:var(--text);padding:12px 20px;border-radius:10px;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,.5)">🎨 点击任意位置取色<br><small style="color:var(--text3)">按 Esc 取消</small></div>';

  _canvas = document.createElement('canvas');
  _ctx = _canvas.getContext('2d');

  // Capture visible page (simplified - just sample from the preview area)
  var preview = document.querySelector('.preview-content') || document.querySelector('.config-live-right .preview-content');
  if (!preview) {
    toast('⚠️ 未找到预览区域', 'error');
    cleanup();
    return;
  }

  document.body.appendChild(_overlay);

  // Mouse move: show color preview
  _overlay.addEventListener('mousemove', function (e) {
    // We can't easily sample the page, so we'll just collect color on click
  });

  _overlay.addEventListener('click', function (e) {
    // Sample from the page using elementFromPoint doesn't work on overlay
    // So we prompt the user
    cleanup();
    var color = prompt('输入颜色值 (如 #ff6b6b):\n提示: 使用 Chrome 的 DevTools 取色器更精确', '#ffffff');
    if (color && /^#[0-9a-fA-F]{3,6}$/.test(color)) {
      cb(color);
    }
  });

  function onKeyDown(e) {
    if (e.key === 'Escape') { cleanup(); }
  }

  function cleanup() {
    _active = false;
    if (_overlay && _overlay.parentNode) _overlay.remove();
    _overlay = null;
    document.removeEventListener('keydown', onKeyDown);
  }

  document.addEventListener('keydown', onKeyDown);
}

// ── Public API ──
export function pickColor(cb) {
  if (hasEyeDropperAPI()) {
    pickColorNative(cb);
  } else {
    pickColorFallback(cb);
  }
}

export function isActive() {
  return _active;
}
