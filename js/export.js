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
    if ((el.type === 'image' || el.type === 'video') && el.fileName && files[el.fileName]) {
      usedFiles[el.fileName] = files[el.fileName];
    }
  });

  var keys = Object.keys(usedFiles);
  if (keys.length > 0) {
    var imgFolder = zip.folder('images');
    var vidFolder = zip.folder('videos');
    keys.forEach(function (fname) {
      var info = usedFiles[fname];
      if (info.mimeType.indexOf('video/') === 0) {
        vidFolder.file(fname, info.data);
      } else {
        imgFolder.file(fname, info.data);
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
            var isVideo = ['mp4', 'webm', '3gp', 'mkv'].indexOf(ext) >= 0;
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

// ─── Export PNG ────────────────────────────────────────────────────
JCM.exportPNG = function (cardName) {
  var el = document.querySelector('.preview-phone');
  if (!el) return Promise.reject(new Error('预览区域不存在'));

  var w = el.offsetWidth, h = el.offsetHeight;
  var html = el.innerHTML;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + 'px;height:' + h + 'px;position:relative;overflow:hidden;background:#000">' +
    html + '</div></foreignObject></svg>';

  var canvas = document.createElement('canvas');
  canvas.width = w * 2;
  canvas.height = h * 2;
  var ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  var url = URL.createObjectURL(blob);

  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (pngBlob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        a.download = (cardName || 'card') + '.png';
        a.click();
        resolve();
      }, 'image/png');
    };
    img.onerror = function () { reject(new Error('PNG 导出失败')); };
    img.src = url;
  });
};

// ─── Export Template Config JSON ───────────────────────────────────
JCM.exportTemplateJSON = function (tplId, cfg) {
  var data = JSON.stringify({ templateId: tplId, config: cfg }, null, 2);
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
