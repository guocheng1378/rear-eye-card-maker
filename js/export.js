// ─── Export: ZIP 打包 / 导入 / PNG / SVG 导出 (ES Module) ────────
import * as S from './state.js';

export function exportZip(maml, cardName, elements, files, isCustom, bgImage) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载');

  var zip = new JSZip();
  zip.file('manifest.xml', maml);

  if (!isCustom) {
    var varConfig = '<?xml version="1.0" encoding="UTF-8"?>\n<WidgetConfig version="1">\n' +
      '  <OnOff name="isDisplayDefaultBg" displayTitle="显示默认背景" default="0"/>\n';

    if (maml.indexOf('ContentProviderBinder') >= 0) {
      varConfig += '  <!-- ContentProvider 变量由系统自动绑定 -->\n';
      var varMatches = maml.match(/name="(\w+)"\s+type="(\w+)"\s+column="(\w+)"/g);
      if (varMatches) {
        varMatches.forEach(function (vm) {
          var nameM = vm.match(/name="(\w+)"/);
          if (nameM) varConfig += '  <!-- Variable: ' + nameM[1] + ' -->\n';
        });
      }
    }

    if (maml.indexOf('MusicControl') >= 0) {
      varConfig += '  <!-- MusicControl: 由系统音乐播放器自动提供数据 -->\n';
    }

    varConfig += '</WidgetConfig>';
    zip.file('var_config.xml', varConfig);
  }

  var usedFiles = {};
  elements.forEach(function (el) {
    var fname = el.fileName || el.src;
    if ((el.type === 'image' || el.type === 'video') && fname && files[fname]) {
      usedFiles[fname] = files[fname];
    }
  });

  // 背景图
  if (bgImage && bgImage.indexOf('data:') === 0) {
    try {
      var b64data = bgImage.split(',')[1];
      var mimeMatch = bgImage.match(/^data:([^;]+);/);
      var mime = mimeMatch ? mimeMatch[1] : 'image/png';
      var ext = mime.split('/')[1] || 'png';
      if (ext === 'jpeg') ext = 'jpg';
      var bgFileName = 'bg.' + ext;
      var binStr = atob(b64data);
      var bgArr = new Uint8Array(binStr.length);
      for (var bi = 0; bi < binStr.length; bi++) bgArr[bi] = binStr.charCodeAt(bi);
      usedFiles[bgFileName] = { data: bgArr.buffer, mimeType: mime };
    } catch (e) { /* skip */ }
  }

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
      if (typeof AndroidBridge !== 'undefined' && typeof AndroidBridge.saveZip === 'function') {
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
      document.body.appendChild(a);
      a.click();
      a.style.display = 'none';
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 10000);
    });
  }

  return buildZipWithData();
}

// ─── Import ZIP ────────────────────────────────────────────────────
var MAX_ZIP_SIZE = 200 * 1024 * 1024;
var MAX_FILE_SIZE = 50 * 1024 * 1024;

export function importZip(file) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载');

  if (file.size > MAX_ZIP_SIZE) {
    return Promise.reject(new Error('ZIP 文件过大（最大 200MB），当前 ' + (file.size / 1048576).toFixed(1) + 'MB'));
  }

  return JSZip.loadAsync(file).then(function (zip) {
    var result = { cardName: '导入的卡片', bgColor: '#000000', elements: [], files: {} };

    // 解压总大小检查（使用公开 API）
    var totalSize = 0;
    var sizePromises = [];
    zip.forEach(function (path, entry) {
      if (!entry.dir) {
        sizePromises.push(entry.async('uint8array').then(function (data) {
          totalSize += data.length;
        }));
      }
    });

    return Promise.all(sizePromises).then(function () {
      if (totalSize > MAX_ZIP_SIZE * 3) {
        return Promise.reject(new Error('ZIP 解压后内容过大，可能存在 zip bomb 攻击'));
      }

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

        // Parse elements from XML using DOMParser
        try {
          var parser = new DOMParser();
          var doc = parser.parseFromString(xml, 'application/xml');
          var parseError = doc.querySelector('parsererror');
          if (!parseError) {
            // DOM parsing succeeded
            var widgets = doc.querySelectorAll('Text, Rectangle, Circle, Image, Video');
            widgets.forEach(function (node) {
              var tag = node.tagName.toLowerCase();
              var a = function (name) { return node.getAttribute(name) || ''; };
              if (tag === 'text') {
                result.elements.push({
                  type: 'text', text: a('text'), x: Number(a('x')) || 0, y: Number(a('y')) || 0,
                  size: Number(a('size')) || 24, color: a('color') || '#ffffff',
                  textAlign: a('textAlign') || 'left', bold: a('bold') === 'true',
                  multiLine: a('multiLine') === 'true', w: Number(a('w')) || 200,
                  opacity: a('alpha') ? Math.round(parseFloat(a('alpha')) * 100) : 100,
                  rotation: Number(a('rotation')) || 0,
                  fontFamily: a('fontFamily') || 'default',
                });
              } else if (tag === 'rectangle') {
                result.elements.push({
                  type: 'rectangle', x: Number(a('x')) || 0, y: Number(a('y')) || 0,
                  w: Number(a('w')) || 100, h: Number(a('h')) || 40,
                  color: a('fillColor') || '#333333', radius: Number(a('cornerRadius')) || 0,
                  opacity: a('alpha') ? Math.round(parseFloat(a('alpha')) * 100) : 100,
                  rotation: Number(a('rotation')) || 0,
                  fillColor2: a('fillColor2') || '',
                  blur: Number(a('blur')) || 0,
                });
              } else if (tag === 'circle') {
                result.elements.push({
                  type: 'circle', x: Number(a('x')) || 0, y: Number(a('y')) || 0,
                  r: Number(a('r')) || 30, color: a('fillColor') || '#6c5ce7',
                  opacity: a('alpha') ? Math.round(parseFloat(a('alpha')) * 100) : 100,
                  strokeWidth: Number(a('stroke')) || 0,
                  strokeColor: a('strokeColor') || '#ffffff',
                });
              } else if (tag === 'image') {
                var imgSrc = (a('src') || '').replace(/^images\//, '');
                result.elements.push({
                  type: 'image', x: Number(a('x')) || 0, y: Number(a('y')) || 0,
                  w: Number(a('w')) || 100, h: Number(a('h')) || 100,
                  fileName: imgSrc, src: imgSrc,
                  fit: a('fitMode') || 'cover',
                });
              } else if (tag === 'video') {
                var vidSrc = (a('src') || '').replace(/^videos\//, '');
                result.elements.push({
                  type: 'video', x: Number(a('x')) || 0, y: Number(a('y')) || 0,
                  w: Number(a('w')) || 240, h: Number(a('h')) || 135,
                  fileName: vidSrc, src: vidSrc,
                });
              }
            });
          } else {
            // Fallback to regex parsing
            parseXmlFallback(xml, result);
          }
        } catch (e) {
          // DOMParser failed, fallback to regex
          parseXmlFallback(xml, result);
        }

        // 背景图检测
        var bgImgMatch = xml.match(/<Image\s+src="([^"]*)"[^>]*x="0"[^>]*y="0"[^>]*w="#view_width"[^>]*h="#view_height"[^>]*\/?>/i) ||
                          xml.match(/<Image\s+[^>]*x="0"[^>]*y="0"[^>]*w="#view_width"[^>]*h="#view_height"[^>]*src="([^"]*)"[^>]*\/?>/i);
        if (bgImgMatch) {
          result.bgImageSrc = bgImgMatch[1];
        }

        // Load media files
        var promises = [];
        zip.forEach(function (path, entry) {
          if (path === 'manifest.xml' || path === 'var_config.xml') return;
          if (path.match(/^(images|videos)\//) && !entry.dir) {
            promises.push(entry.async('arraybuffer').then(function (buf) {
              if (buf.byteLength > MAX_FILE_SIZE) {
                console.warn('跳过过大文件: ' + path);
                return;
              }
              var fname = path.replace(/^(images|videos)\//, '');
              var ext = fname.split('.').pop().toLowerCase();
              var isVideo = ['mp4', 'webm', '3gp', 'mkv', 'mov', 'avi', 'ts', 'flv'].indexOf(ext) >= 0;
              var mime = isVideo ? 'video/' + ext : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
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

        return Promise.all(promises).then(function () {
          if (result.bgImageSrc) {
            var bgSrc = result.bgImageSrc;
            var bgFile = bgSrc.replace(/^(images|videos)\//, '');
            if (result.files[bgFile]) {
              result.bgImage = result.files[bgFile].dataUrl;
            } else if (bgSrc.indexOf('http') === 0 || bgSrc.indexOf('data:') === 0) {
              result.bgImage = bgSrc;
            }
          }
          return result;
        });
      });
    });
  });
}

// Fallback regex XML parsing (for malformed XML)
function parseXmlFallback(xml, result) {
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
}

function parseXmlAttrs(str) {
  var attrs = {};
  var re = /(\w+)="([^"]*)"/g;
  var m;
  while ((m = re.exec(str)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

// ─── Export PNG ────────────────────────────────────────────────────
export function exportPNG(cardName, cfg, elements, tpl, uploadedFiles, getDeviceFn) {
  var el = document.querySelector('.preview-screen');
  if (!el) return Promise.reject(new Error('预览区域不存在'));

  var device = getDeviceFn ? getDeviceFn() : { width: 420, height: 252 };
  var scale = 2;
  var canvas = document.createElement('canvas');
  canvas.width = device.width * scale;
  canvas.height = device.height * scale;
  var ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  var bgColor = cfg.bgColor || '#000000';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, device.width, device.height);

  var bgImgPromise = Promise.resolve();
  if (cfg.bgImage) {
    bgImgPromise = new Promise(function (resolve) {
      var bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = function () {
        ctx.drawImage(bgImg, 0, 0, device.width, device.height);
        resolve();
      };
      bgImg.onerror = function () { resolve(); };
      bgImg.src = cfg.bgImage;
    });
  }

  return bgImgPromise.then(function () {
    if (tpl && tpl.id === 'custom') {
      var pat = cfg.bgPattern || 'solid';
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
        grd.addColorStop(1, cfg.bgColor2 || '#1a1a2e');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, device.width, device.height);
      }
    }

    if (tpl && tpl.id === 'gradient') {
      ctx.fillStyle = cfg.bgColor1 || '#667eea';
      ctx.fillRect(0, 0, device.width / 2, device.height);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = cfg.bgColor2 || '#764ba2';
      ctx.fillRect(device.width / 2, 0, device.width / 2, device.height);
      ctx.globalAlpha = 1;
    }

    var imageLoaders = [];
    if (elements) {
      elements.forEach(function (el) {
        if (el.type !== 'image') return;
        var fi = el.fileName ? uploadedFiles[el.fileName] : null;
        if (!fi || !fi.dataUrl) return;
        imageLoaders.push(new Promise(function (resolve) {
          var img = new Image();
          img.onload = function () { resolve({ el: el, img: img }); };
          img.onerror = function () { resolve(null); };
          img.src = fi.dataUrl;
        }));
      });
    }

    return Promise.all(imageLoaders).then(function (loadedImages) {
      var imgMap = {};
      loadedImages.forEach(function (item) {
        if (item) imgMap[item.el.fileName] = item.img;
      });

      if (elements) {
        elements.forEach(function (el) {
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
              if (el.fillColor2) {
                var grd2 = ctx.createLinearGradient(el.x, el.y, el.x + el.w, el.y + el.h);
                grd2.addColorStop(0, el.color || '#333333');
                grd2.addColorStop(1, el.fillColor2);
                ctx.fillStyle = grd2;
              } else {
                ctx.fillStyle = el.color || '#333333';
              }
              drawRoundRect(ctx, el.x, el.y, el.w, el.h, rr);
              ctx.fill();
              break;
            case 'circle':
              ctx.fillStyle = el.color || '#6c5ce7';
              ctx.beginPath(); ctx.arc(el.x, el.y, el.r || 30, 0, Math.PI * 2); ctx.fill();
              if (el.strokeWidth > 0) {
                ctx.strokeStyle = el.strokeColor || '#ffffff';
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
              }
              break;
            case 'image':
              var loadedImg = imgMap[el.fileName];
              if (loadedImg) ctx.drawImage(loadedImg, el.x, el.y, el.w || 100, el.h || 100);
              break;
            case 'progress':
              var pw = (el.w || 200), ph = (el.h || 8), pv = (el.value || 60) / 100;
              var pr2 = el.radius || 4;
              ctx.fillStyle = el.bgColor || '#333333';
              drawRoundRect(ctx, el.x, el.y, pw, ph, pr2); ctx.fill();
              ctx.fillStyle = el.color || '#6c5ce7';
              drawRoundRect(ctx, el.x, el.y, pw * pv, ph, pr2); ctx.fill();
              break;
            case 'arc':
              // Render arc as SVG-style arc on canvas
              var cx = el.x, cy = el.y, r = el.r || 40;
              var startRad = (el.startAngle || 0) * Math.PI / 180;
              var endRad = (el.endAngle || 270) * Math.PI / 180;
              ctx.strokeStyle = el.color || '#6c5ce7';
              ctx.lineWidth = el.strokeWidth || 6;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(cx, cy, r, startRad, endRad);
              ctx.stroke();
              break;
            case 'video':
              ctx.fillStyle = '#1a1a2e';
              drawRoundRect(ctx, el.x, el.y, el.w || 240, el.h || 135, 4); ctx.fill();
              ctx.globalAlpha = 0.3;
              ctx.font = '24px sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText('🎬', el.x + (el.w || 240) / 2, el.y + (el.h || 135) / 2 + 8);
              ctx.textAlign = 'left';
              break;
          }
          ctx.restore();
        });
      }

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (pngBlob) {
          if (!pngBlob) return reject(new Error('PNG 导出失败'));
          var url = URL.createObjectURL(pngBlob);
          var a = document.createElement('a');
          a.href = url;
          a.download = (cardName || 'card') + '.png';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 10000);
          resolve();
        }, 'image/png');
      });
    });
  });
}

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

// ─── Export SVG ────────────────────────────────────────────────────
export function exportSVG(cardName, cfg, elements, uploadedFiles, getDeviceFn) {
  if (!elements || elements.length === 0) {
    return Promise.reject(new Error('没有可导出的元素'));
  }
  var device = getDeviceFn ? getDeviceFn() : { width: 976, height: 596, cameraZoneRatio: 0.3 };
  var svgParts = [];
  var gradId = 0;
  var defs = [];

  svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + device.width + '" height="' + device.height + '" viewBox="0 0 ' + device.width + ' ' + device.height + '">');
  svgParts.push('<rect width="100%" height="100%" fill="' + (cfg.bgColor || '#000000') + '"/>');

  elements.forEach(function (el) {
    var opacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
    var opAttr = opacity < 1 ? ' opacity="' + opacity + '"' : '';

    switch (el.type) {
      case 'text': {
        var anchor = el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start';
        var tx = el.textAlign === 'center' ? el.x + (el.w || 200) / 2 : el.textAlign === 'right' ? el.x + (el.w || 200) : el.x;
        var fill = el.color;
        var strokeAttr = '';
        if (el.textGradient && el.textGradient !== 'none') {
          var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
          var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
          var colors = gc.split(',');
          var gid = 'grad' + (++gradId);
          defs.push('<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="' + colors[0].trim() + '"/><stop offset="100%" stop-color="' + (colors[1] || colors[0]).trim() + '"/></linearGradient>');
          fill = 'url(#' + gid + ')';
        }
        if (el.textStroke && el.textStroke > 0) {
          strokeAttr = ' stroke="' + (el.textStrokeColor || '#000000') + '" stroke-width="' + el.textStroke + '"';
        }
        var lines = String(el.text || '').split('\n');
        lines.forEach(function (line, li) {
          svgParts.push('<text x="' + tx + '" y="' + (el.y + el.size + li * el.size * (el.lineHeight || 1.4)) + '" font-size="' + el.size + '" fill="' + fill + '" text-anchor="' + anchor + '"' + (el.bold ? ' font-weight="bold"' : '') + opAttr + strokeAttr + '>' + escXmlSafe(line) + '</text>');
        });
        break;
      }
      case 'rectangle': {
        var rotAttr = el.rotation ? ' transform="rotate(' + el.rotation + ' ' + (el.x + el.w / 2) + ' ' + (el.y + el.h / 2) + ')"' : '';
        if (el.fillColor2) {
          var gid2 = 'grad' + (++gradId);
          defs.push('<linearGradient id="' + gid2 + '" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + el.color + '"/><stop offset="100%" stop-color="' + el.fillColor2 + '"/></linearGradient>');
          svgParts.push('<rect x="' + el.x + '" y="' + el.y + '" width="' + el.w + '" height="' + el.h + '" fill="url(#' + gid2 + ')"' + (el.radius ? ' rx="' + el.radius + '"' : '') + opAttr + rotAttr + '/>');
        } else {
          svgParts.push('<rect x="' + el.x + '" y="' + el.y + '" width="' + el.w + '" height="' + el.h + '" fill="' + el.color + '"' + (el.radius ? ' rx="' + el.radius + '"' : '') + opAttr + rotAttr + '/>');
        }
        break;
      }
      case 'circle': {
        var circStroke = el.strokeWidth > 0 ? ' stroke="' + (el.strokeColor || '#ffffff') + '" stroke-width="' + el.strokeWidth + '"' : '';
        svgParts.push('<circle cx="' + el.x + '" cy="' + el.y + '" r="' + el.r + '" fill="' + el.color + '"' + opAttr + circStroke + '/>');
        break;
      }
      case 'image': {
        var fi = el.fileName ? uploadedFiles[el.fileName] : null;
        if (fi && fi.dataUrl) {
          svgParts.push('<image x="' + el.x + '" y="' + el.y + '" width="' + (el.w || 100) + '" height="' + (el.h || 100) + '" href="' + fi.dataUrl + '"' + opAttr + '/>');
        }
        break;
      }
      case 'progress': {
        var pw = el.w || 200, ph = el.h || 8, pv = (el.value || 60) / 100;
        svgParts.push('<rect x="' + el.x + '" y="' + el.y + '" width="' + pw + '" height="' + ph + '" fill="' + (el.bgColor || '#333') + '"' + (el.radius ? ' rx="' + el.radius + '"' : '') + '/>');
        svgParts.push('<rect x="' + el.x + '" y="' + el.y + '" width="' + (pw * pv) + '" height="' + ph + '" fill="' + el.color + '"' + (el.radius ? ' rx="' + el.radius + '"' : '') + '/>');
        break;
      }
      case 'arc': {
        var r = el.r || 40;
        var startRad = ((el.startAngle || 0) - 90) * Math.PI / 180;
        var endRad = ((el.endAngle || 270) - 90) * Math.PI / 180;
        var x1 = el.x + r * Math.cos(startRad);
        var y1 = el.y + r * Math.sin(startRad);
        var x2 = el.x + r * Math.cos(endRad);
        var y2 = el.y + r * Math.sin(endRad);
        var largeArc = ((el.endAngle || 270) - (el.startAngle || 0)) > 180 ? 1 : 0;
        svgParts.push('<path d="M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + '" fill="none" stroke="' + el.color + '" stroke-width="' + (el.strokeWidth || 6) + '" stroke-linecap="round"' + opAttr + '/>');
        break;
      }
    }
  });

  if (defs.length > 0) {
    svgParts.splice(1, 0, '<defs>' + defs.join('') + '</defs>');
  }

  svgParts.push('</svg>');
  var svgStr = svgParts.join('\n');
  var blob = new Blob([svgStr], { type: 'image/svg+xml' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (cardName || 'card') + '.svg';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 10000);
  return Promise.resolve();
}

function escXmlSafe(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Export/Import Template Config JSON ────────────────────────────
export function exportTemplateJSON(tplId, cfg, elements) {
  var data = JSON.stringify({ templateId: tplId, config: cfg, elements: elements || [] }, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = URL.createObjectURL(blob);
  a.download = (cfg.cardName || 'template') + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 10000);
}

export function importTemplateJSON(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      try { resolve(JSON.parse(reader.result)); }
      catch (e) { reject(new Error('JSON 格式错误')); }
    };
    reader.readAsText(file);
  });
}

// ─── .rear-eye 自定义格式 ─────────────────────────────────────
export function exportRearEyeFormat(tplId, cfg, elements, uploadedFiles) {
  var data = {
    format: 'rear-eye',
    version: 1,
    templateId: tplId,
    config: cfg,
    elements: elements,
    files: {},
    exportedAt: new Date().toISOString(),
  };
  // Include file metadata (not binary data for this lightweight format)
  Object.keys(uploadedFiles || {}).forEach(function (k) {
    var f = uploadedFiles[k];
    data.files[k] = {
      mimeType: f.mimeType,
      originalName: f.originalName,
      hasData: !!f.data,
      dataUrl: f.dataUrl && f.dataUrl.indexOf('blob:') !== 0 ? f.dataUrl : '',
    };
  });
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (cfg.cardName || 'card') + '.rear-eye';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 10000);
}

export function importRearEyeFormat(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data.format !== 'rear-eye') throw new Error('不是 .rear-eye 格式');
        resolve({
          templateId: data.templateId,
          config: data.config || {},
          elements: data.elements || [],
          files: {},
        });
      } catch (e) {
        reject(new Error('导入失败: ' + e.message));
      }
    };
    reader.readAsText(file);
  });
}
