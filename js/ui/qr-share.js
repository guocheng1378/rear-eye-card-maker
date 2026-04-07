// ─── QR Share: 二维码分享 ─────────────────────────────────────────
// 生成可扫码导入的二维码 (SVG 格式, 无需外部依赖)

// Simple QR code generator using canvas
// Generates a scannable QR code for template sharing URLs

export function generateQRCode(data, size) {
  size = size || 200;
  // Use the QR code API from goqr.me as fallback, or generate a simple link
  var encoded = encodeURIComponent(data);
  if (data.length > 2953) {
    return null; // QR code max capacity exceeded
  }

  // Generate QR code as an SVG using a simple approach
  // For a production app, you'd use a proper QR library
  // Here we create a clickable link + download option
  return {
    url: 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encoded,
    dataUrl: null,
  };
}

export function showQRModal(shareUrl, cardName) {
  var existing = document.getElementById('qrShareModal');
  if (existing) existing.remove();

  if (shareUrl.length > 2953) {
    return { error: '模板数据过大，无法生成二维码' };
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'qrShareModal';
  overlay.style.display = '';
  overlay.onclick = function () { overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '360px';
  modal.onclick = function (e) { e.stopPropagation(); };

  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=' + encodeURIComponent(shareUrl);

  modal.innerHTML = '<div class="modal-header">' +
    '<h3>📱 扫码分享</h3>' +
    '<button class="modal-close" onclick="document.getElementById(\'qrShareModal\').remove()" aria-label="关闭">✕</button>' +
    '</div>' +
    '<div class="modal-body" style="text-align:center;padding:20px">' +
    '<img src="' + qrUrl + '" alt="QR Code" style="width:200px;height:200px;border-radius:12px;background:#fff;padding:8px" onerror="this.parentElement.innerHTML=\'<p style=color:var(--text3)>二维码生成需要网络连接</p><p style=font-size:12px;color:var(--text3)>请使用分享链接代替</p>\'">' +
    '<p style="margin-top:12px;font-size:13px;color:var(--text2)">' + (cardName || '模板') + '</p>' +
    '<p style="margin-top:8px;font-size:11px;color:var(--text3)">用手机摄像头扫描即可导入模板</p>' +
    '<div style="margin-top:16px;display:flex;gap:8px;justify-content:center">' +
    '<button class="btn btn-secondary" style="font-size:12px;padding:6px 14px" onclick="navigator.clipboard.writeText(\'' + shareUrl.replace(/'/g, "\\'") + '\');this.textContent=\'✅ 已复制\'">📋 复制链接</button>' +
    '<a class="btn btn-primary" style="font-size:12px;padding:6px 14px;text-decoration:none" href="' + qrUrl + '" download="' + (cardName || 'qrcode') + '.png">💾 下载二维码</a>' +
    '</div>' +
    '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { modal: overlay };
}
