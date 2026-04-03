// ─── Editor: 自定义元素编辑 ──────────────────────────────────────

JCM.ElementDefaults = {
  text: function () { return { type: 'text', text: '新文字', x: 10, y: 60, size: 24, color: '#ffffff', textAlign: 'left', bold: false, multiLine: false, w: 200 }; },
  rectangle: function () { return { type: 'rectangle', x: 10, y: 60, w: 100, h: 40, color: '#333333', radius: 0 }; },
  circle: function () { return { type: 'circle', x: 50, y: 100, r: 30, color: '#6c5ce7' }; },
};

JCM.isInCameraZone = function (el, device) {
  var zoneW = device.width * device.cameraZoneRatio;
  var elW = el.w || (el.r ? el.r * 2 : 0) || (el.size ? (el.text || '').length * el.size * 0.6 : 50);
  return el.x < zoneW && (el.x + elW) <= zoneW * 1.5;
};

JCM.renderElementEditor = function (el, idx, device) {
  var html = '<div class="el-detail">';

  if (JCM.isInCameraZone(el, device)) {
    var safeX = JCM.cameraZoneWidth(device);
    html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:rgba(225,112,85,0.1);border:1px solid rgba(225,112,85,0.3);border-radius:8px;font-size:12px;color:#e17055">' +
      '<span>⚠️</span> 此元素位于摄像头遮挡区内，建议将 X 调整到 ≥ ' + safeX + '</div>';
  }

  if (el.type === 'image' || el.type === 'video') {
    var isImg = el.type === 'image';
    var fi = el.fileName ? JCM.uploadedFiles[el.fileName] : null;
    var has = !!fi;

    html += '<div class="media-picker ' + (has ? 'has-file' : '') + '" onclick="JCM.pickMediaReplace(' + idx + ')">';
    if (has && isImg) {
      html += '<img class="media-picker-thumb" src="' + fi.dataUrl + '" alt="">';
    } else {
      html += '<span class="media-picker-icon">' + (isImg ? '🖼' : '🎬') + '</span>';
    }
    html += '<div class="media-picker-info"><div class="media-picker-name">' + (has ? esc(fi.originalName) : (isImg ? '点击选择图片' : '点击选择视频')) + '</div>' +
      '<div class="media-picker-hint">' + (has ? fmtSize(fi.data.byteLength) + ' · 点击更换' : (isImg ? '支持 JPG / PNG / GIF / WebP' : '支持 MP4 / WebM / 3GP')) + '</div></div>';
    if (has) html += '<button class="media-picker-change" onclick="event.stopPropagation();JCM.pickMediaReplace(' + idx + ')">更换</button>';
    html += '</div>';

    html += '<div class="config-grid">' +
      field('X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">') +
      field('Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">') +
      field('宽', '<input type="number" value="' + (el.w || 100) + '" data-prop="w" data-idx="' + idx + '">') +
      field('高', '<input type="number" value="' + (el.h || 100) + '" data-prop="h" data-idx="' + idx + '">') +
      '</div>';
  } else if (el.type === 'text') {
    html += '<div class="config-grid">' +
      field('文字', '<input type="text" value="' + esc(el.text || '') + '" data-prop="text" data-idx="' + idx + '">', true) +
      field('字号', '<input type="number" value="' + el.size + '" data-prop="size" data-idx="' + idx + '">') +
      colorField('颜色', el.color || '#ffffff', 'color', idx) +
      field('对齐', '<select data-prop="textAlign" data-idx="' + idx + '">' +
        '<option value="left"' + (el.textAlign === 'left' ? ' selected' : '') + '>左对齐</option>' +
        '<option value="center"' + (el.textAlign === 'center' ? ' selected' : '') + '>居中</option>' +
        '<option value="right"' + (el.textAlign === 'right' ? ' selected' : '') + '>右对齐</option></select>') +
      field('加粗', '<select data-prop="bold" data-idx="' + idx + '">' +
        '<option value="false"' + (!el.bold ? ' selected' : '') + '>否</option>' +
        '<option value="true"' + (el.bold ? ' selected' : '') + '>是</option></select>') +
      field('多行', '<select data-prop="multiLine" data-idx="' + idx + '">' +
        '<option value="false"' + (!el.multiLine ? ' selected' : '') + '>否</option>' +
        '<option value="true"' + (el.multiLine ? ' selected' : '') + '>是</option></select>') +
      field('宽度', '<input type="number" value="' + (el.w || 200) + '" data-prop="w" data-idx="' + idx + '">') +
      field('阴影', '<select data-prop="shadow" data-idx="' + idx + '">' +
        '<option value="none"' + (!el.shadow || el.shadow === 'none' ? ' selected' : '') + '>无</option>' +
        '<option value="light"' + (el.shadow === 'light' ? ' selected' : '') + '>浅色</option>' +
        '<option value="dark"' + (el.shadow === 'dark' ? ' selected' : '') + '>深色</option>' +
        '<option value="glow"' + (el.shadow === 'glow' ? ' selected' : '') + '>发光</option></select>') +
      field('透明度', '<input type="range" min="0" max="100" value="' + (el.opacity !== undefined ? el.opacity : 100) + '" data-prop="opacity" data-idx="' + idx + '">') +
      field('X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">') +
      field('Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">') +
      '</div>';
  } else if (el.type === 'rectangle') {
    html += '<div class="config-grid">' +
      field('X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">') +
      field('Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">') +
      field('宽', '<input type="number" value="' + el.w + '" data-prop="w" data-idx="' + idx + '">') +
      field('高', '<input type="number" value="' + el.h + '" data-prop="h" data-idx="' + idx + '">') +
      colorField('颜色', el.color || '#333333', 'color', idx) +
      field('圆角', '<input type="number" value="' + (el.radius || 0) + '" data-prop="radius" data-idx="' + idx + '">') +
      field('透明度', '<input type="range" min="0" max="100" value="' + (el.opacity !== undefined ? el.opacity : 100) + '" data-prop="opacity" data-idx="' + idx + '">') +
      '</div>';
  } else if (el.type === 'circle') {
    html += '<div class="config-grid">' +
      field('中心 X', '<input type="number" value="' + el.x + '" data-prop="x" data-idx="' + idx + '">') +
      field('中心 Y', '<input type="number" value="' + el.y + '" data-prop="y" data-idx="' + idx + '">') +
      field('半径', '<input type="number" value="' + el.r + '" data-prop="r" data-idx="' + idx + '">') +
      colorField('颜色', el.color || '#6c5ce7', 'color', idx) +
      field('透明度', '<input type="range" min="0" max="100" value="' + (el.opacity !== undefined ? el.opacity : 100) + '" data-prop="opacity" data-idx="' + idx + '">') +
      '</div>';
  }

  html += '</div>';
  return html;
};

function field(label, input, full) {
  return '<div class="field"' + (full ? ' style="grid-column:1/-1"' : '') + '><label>' + label + '</label>' + input + '</div>';
}

function colorField(label, value, prop, idx) {
  return '<div class="field field-color"><label>' + label + '</label>' +
    '<input type="color" value="' + value + '" data-prop="' + prop + '" data-idx="' + idx + '">' +
    '<span class="color-val">' + value + '</span></div>';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
