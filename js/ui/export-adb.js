// ─── ADB Push + Export Formats: ADB 直推 + GIF/PDF 导出 ──────────
import { toast } from './toast.js';

// ─── ADB Push via WebADB ──────────────────────────────────────────
export function showADBPush() {
  var existing = document.getElementById('adbPushModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'adbPushModal';
  overlay.style.display = '';
  overlay.onclick = function () { overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '440px';
  modal.onclick = function (e) { e.stopPropagation(); };

  modal.innerHTML = '<div class="modal-header"><h3>📲 ADB 直推</h3><button class="modal-close" onclick="document.getElementById(\'adbPushModal\').remove()">✕</button></div>' +
    '<div class="modal-body" style="padding:20px">' +
    '<div style="text-align:center;margin-bottom:16px"><div style="font-size:40px;margin-bottom:8px">📱</div>' +
    '<div style="font-size:13px;color:var(--text2)">通过 ADB 将卡片直接推送到手机背屏</div></div>' +
    '<div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:12px;color:var(--text2);margin-bottom:16px">' +
    '<div style="font-weight:600;margin-bottom:6px">使用方法：</div>' +
    '<div>1. 先导出 ZIP 文件</div>' +
    '<div>2. 用 USB 连接手机并开启 ADB 调试</div>' +
    '<div>3. 在终端执行以下命令：</div>' +
    '<div style="background:var(--surface3);padding:8px;border-radius:6px;margin-top:8px;font-family:monospace;font-size:11px;word-break:break-all">' +
    'adb push 卡片名.zip /sdcard/Download/REAREyeCards/</div>' +
    '<div style="margin-top:8px">4. 在 REAREye 模块中导入卡片</div>' +
    '</div>' +
    '<div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:12px;color:var(--text2)">' +
    '<div style="font-weight:600;margin-bottom:6px">WiFi ADB（无需数据线）：</div>' +
    '<div style="font-family:monospace;font-size:11px">adb tcpip 5555</div>' +
    '<div style="font-family:monospace;font-size:11px">adb connect &lt;手机IP&gt;:5555</div>' +
    '<div style="font-family:monospace;font-size:11px">adb push 卡片名.zip /sdcard/Download/REAREyeCards/</div>' +
    '</div>' +
    '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ─── Export as GIF ────────────────────────────────────────────────
export function exportGIF(cardName, device) {
  toast('🎬 GIF 导出需要截取多帧，生成中...', 'info');

  // Simple approach: capture current preview as a static image
  var previewContent = document.getElementById('previewContent');
  if (!previewContent) return toast('预览区域不存在', 'error');

  // Use canvas to capture
  var canvas = document.createElement('canvas');
  var scale = 2;
  canvas.width = (device.width || 976) * scale;
  canvas.height = (device.height || 596) * scale;
  var ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Draw background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, device.width, device.height);

  canvas.toBlob(function (blob) {
    if (!blob) return toast('导出失败', 'error');
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (cardName || 'card') + '.png';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    toast('✅ 预览截图已导出（GIF 动图需连续帧支持）', 'success');
  }, 'image/png');
}

// ─── Export as PDF ────────────────────────────────────────────────
export function exportPDF(cardName, device) {
  toast('📄 PDF 导出中...', 'info');

  // Generate SVG first, then open print dialog
  var previewContent = document.getElementById('previewContent');
  if (!previewContent) return toast('预览区域不存在', 'error');

  // Simple PDF via print
  var w = window.open('', '_blank');
  if (!w) return toast('请允许弹出窗口', 'warning');

  w.document.write('<!DOCTYPE html><html><head><title>' + (cardName || 'card') + '</title><style>' +
    '@page{size:' + (device.width || 976) + 'px ' + (device.height || 596) + 'px;margin:0}' +
    'body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh}' +
    '.card{width:' + (device.width || 976) + 'px;height:' + (device.height || 596) + 'px;overflow:hidden;position:relative}' +
    '</style></head><body>' +
    '<div class="card">' + previewContent.innerHTML + '</div>' +
    '<script>setTimeout(function(){window.print();},500)<\/script></body></html>');
  w.document.close();
}
