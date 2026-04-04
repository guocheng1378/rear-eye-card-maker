// ─── Export: ZIP 打包 / 导入 / PNG 导出 ────────────────────────────

JCM.exportZip = function (maml, cardName, elements, files, isCustom) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载');

  var zip = new JSZip();
  zip.file('manifest.xml', maml);

  if (!isCustom) {
    zip.file('var_config.xml',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<WidgetConfig version="1">\n' +
      '  <OnOff name="isDisplayDefaultBg" displayTitle="显示默认背景" default="0"/>\n' +
      '</WidgetConfig>'
    );
  }

  var usedFiles = {};
  elements.forEach(function (el) {
    var fname = el.fileName || el.src;
    if ((el.type === 'image' || el.type === 'video') && fname && files[fname]) {
      usedFiles[fname] = files[fname];
    }
  });

  var keys = Object.keys(usedFiles);

  function buildZipWithData() {
    if (keys.length > 0) {
      var imgFolder = zip.folder('images');
      var vidFolder = zip.folder('videos');
      keys.forEach(function (fname) {
        var info = usedFiles[fname];
        var data = info.data;
        if (info.mimeType.indexOf('video/') === 0) {
          vidFolder.file(fname, data);
        } else {
          imgFolder.file(fname, data);
        }
      });
    }

    var fileName = (cardName || 'card') + '.zip';

    return zip.generateAsync({ type: 'blob' }).then(function (blob) {
      if (typeof AndroidBridge !== 'undefined') {
        var reader = new FileReader();
        reader.onload = function () {
          AndroidBridge.saveZip(reader.result.split(',')[1], fileName);
        };
        reader.readAsDataURL(blob);
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return buildZipWithData();
};

// ─── Import ZIP ────────────────────────────────────────────────────
JCM.importZip = function (file) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载');

  return JSZip.loadAsync(file).then(function (zip) {
    var result = { cardName: '导入的卡片', bgColor: '#000000', elements: [], files: {} };

    // Read manifest
    var manifestFile = zip.file('manifest.xml');
    if (!manifestFile) throw new Error('ZIP 中没有 manifest.xml');

    return manifestFile.async('string').then(function (xml) {
      // Extract card name
      var nameMatch = xml.match(/name="([^"]*)"/);
      if (nameMatch) result.cardName = nameMatch[1];

      // Extract background color
      var bgMatch = xml.match(/fillColor="(#[0-9a-fA-F]{6})"/);
      if (bgMatch) result.bgColor = bgMatch[1];

      // Parse elements from XML (simple regex-based)
      var elRegex = /<(Text|Rectangle|Circle|Image|Video)\s+([^/]*)\/?>(?:<\/\1>)?/g;
      var match;
      while ((match = elRegex.exec(xml)) !== null) {
        var tag = match[1].toLowerCase();
        var attrs = parseXmlAttrs(match[2]);
        if (tag === 'text') {
          result.elements.push({
            type: 'text', text: attrs.text || '', x: Number(attrs.x) || 0, y: Number(attrs.y) || 0,
            size: Number(attrs.size) || 24, color: attrs.color || '#ffffff',
            textAlign: attrs.textAlign || 'left', bold: attrs.bold === 'true',
            multiLine: attrs.multiLine === 'true', w: Number(attrs.w) || 200
          });
        } else if (tag === 'rectangle') {
          result.elements.push({
            type: 'rectangle', x: Number(attrs.x) || 0, y: Number(attrs.y) || 0,
            w: Number(attrs.w) || 100, h: Number(attrs.h) || 40,
            color: attrs.fillColor || '#333333', radius: Number(attrs.cornerRadius) || 0
          });
        } else if (tag === 'circle') {
          result.elements.push({
            type: 'circle', x: Number(attrs.x) || 0, y: Number(attrs.y) || 0,
            r: Number(attrs.r) || 30, color: attrs.fillColor || '#6c5ce7'
          });
        } else if (tag === 'image') {
          var imgSrc = (attrs.src || '').replace(/^images\//, '');
          result.elements.push({
            type: 'image', x: Number(attrs.x) || 0, y: Number(attrs.y) || 0,
            w: Number(attrs.w) || 100, h: Number(attrs.h) || 100,
            fileName: imgSrc, src: imgSrc
          });
        } else if (tag === 'video') {
          var vidSrc = (attrs.src || '').replace(/^videos\//, '');
          result.elements.push({
            type: 'video', x: Number(attrs.x) || 0, y: Number(attrs.y) || 0,
            w: Number(attrs.w) || 240, h: Number(attrs.h) || 135,
            fileName: vidSrc, src: vidSrc
          });
        }
      }

      // Load media files
      var promises = [];
      zip.forEach(function (path, entry) {
        if (path === 'manifest.xml' || path === 'var_config.xml') return;
        if (path.match(/^(images|videos)\//) && !entry.dir) {
          promises.push(entry.async('arraybuffer').then(function (buf) {
            var fname = path.replace(/^(images|videos)\//, '');
            var ext = fname.split('.').pop().toLowerCase();
            var isVideo = ['mp4', 'webm', '3gp', 'mkv', 'mov', 'avi', 'ts', 'flv'].indexOf(ext) >= 0;
            var mime = isVideo ? 'video/' + ext : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
            // Create data URL for preview
            var bytes = new Uint8Array(buf);
            var binary = '';
            for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            result.files[fname] = {
              data: buf, mimeType: mime,
              dataUrl: 'data:' + mime + ';base64,' + btoa(binary),
              originalName: fname
            };
          }));
        }
      });

      return Promise.all(promises).then(function () { return result; });
    });
  });
};

function parseXmlAttrs(str) {
  var attrs = {};
  var re = /(\w+)="([^"]*)"/g;
  var m;
  while ((m = re.exec(str)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

// ─── Export PNG (Canvas-based, no external CSS dependency) ─────────
JCM.exportPNG = function (cardName) {
  var el = document.querySelector('.preview-screen');
  if (!el) return Promise.reject(new Error('预览区域不存在'));

  var device = getSelectedDevice ? getSelectedDevice() : { width: 420, height: 252 };
  var scale = 2;
  var canvas = document.createElement('canvas');
  canvas.width = device.width * scale;
  canvas.height = device.height * scale;
  var ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Draw background
  var bgColor = _cfg.bgColor || '#000000';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, device.width, device.height);

  // Draw background patterns for custom template
  if (_tpl && _tpl.id === 'custom') {
    var pat = _cfg.bgPattern || 'solid';
    if (pat === 'dots') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (var dx = 10; dx < device.width; dx += 20) {
        for (var dy = 10; dy < device.height; dy += 20) {
          ctx.beginPath(); ctx.arc(dx, dy, 1, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (pat === 'grid') {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      for (var gx = 0; gx < device.width; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, device.height); ctx.stroke(); }
      for (var gy = 0; gy < device.height; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(device.width, gy); ctx.stroke(); }
    } else if (pat === 'gradient') {
      var grd = ctx.createLinearGradient(0, 0, device.width, device.height);
      grd.addColorStop(0, bgColor);
      grd.addColorStop(1, _cfg.bgColor2 || '#1a1a2e');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, device.width, device.height);
    }
  }

  // Draw template-specific backgrounds
  if (_tpl && _tpl.id === 'gradient') {
    ctx.fillStyle = _cfg.bgColor1 || '#667eea';
    ctx.fillRect(0, 0, device.width / 2, device.height);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = _cfg.bgColor2 || '#764ba2';
    ctx.fillRect(device.width / 2, 0, device.width / 2, device.height);
    ctx.globalAlpha = 1;
  }

  // Draw elements
  var camW = device.width * device.cameraZoneRatio;
  if (_elements) {
    _elements.forEach(function (el) {
      ctx.save();
      var opacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
      ctx.globalAlpha = opacity;

      switch (el.type) {
        case 'text':
          var weight = el.bold ? '700' : '400';
          ctx.font = weight + ' ' + el.size + 'px -apple-system, sans-serif';
          ctx.fillStyle = el.color || '#ffffff';
          if (el.shadow === 'light') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; }
          else if (el.shadow === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
          else if (el.shadow === 'glow') { ctx.shadowColor = el.color; ctx.shadowBlur = 16; }
          if (el.multiLine) {
            var textLines = String(el.text || '').split('\n');
            textLines.forEach(function (line, li) { ctx.fillText(line, el.x, el.y + el.size + li * el.size * 1.4, el.w || 9999); });
          } else {
            var align = el.textAlign || 'left';
            if (align === 'center') { ctx.textAlign = 'center'; ctx.fillText(el.text || '', el.x + (el.w || 200) / 2, el.y + el.size); }
            else if (align === 'right') { ctx.textAlign = 'right'; ctx.fillText(el.text || '', el.x + (el.w || 200), el.y + el.size); }
            else { ctx.fillText(el.text || '', el.x, el.y + el.size); }
          }
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
          break;
        case 'rectangle':
          var rr = el.radius || 0;
          ctx.fillStyle = el.color || '#333333';
          drawRoundRect(ctx, el.x, el.y, el.w, el.h, rr);
          ctx.fill();
          break;
        case 'circle':
          ctx.fillStyle = el.color || '#6c5ce7';
          ctx.beginPath(); ctx.arc(el.x, el.y, el.r || 30, 0, Math.PI * 2); ctx.fill();
          break;
        case 'image':
          var fi = el.fileName ? JCM.uploadedFiles[el.fileName] : null;
          if (fi && fi.dataUrl) {
            try {
              var img = new Image();
              img.src = fi.dataUrl;
              ctx.drawImage(img, el.x, el.y, el.w || 100, el.h || 100);
            } catch (e) { /* image load failed in export */ }
          }
          break;
      }
      ctx.restore();
    });
  }

  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (pngBlob) {
      if (!pngBlob) return reject(new Error('PNG 导出失败'));
      var a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = (cardName || 'card') + '.png';
      a.click();
      resolve();
    }, 'image/png');
  });
};

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Export Template Config JSON ───────────────────────────────────
JCM.exportTemplateJSON = function (tplId, cfg, elements) {
  var data = JSON.stringify({ templateId: tplId, config: cfg, elements: elements || [] }, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (cfg.cardName || 'template') + '.json';
  a.click();
};

JCM.importTemplateJSON = function (file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      try { resolve(JSON.parse(reader.result)); }
      catch (e) { reject(new Error('JSON 格式错误')); }
    };
    reader.readAsText(file);
  });
};
