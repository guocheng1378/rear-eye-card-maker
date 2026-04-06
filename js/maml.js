// ─── MAML: XML 生成 + 转义 + 校验 ──────────────────────────────────

export function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
}

function alphaAttr(el) {
  return (el.opacity !== undefined && el.opacity !== 100)
    ? ' alpha="' + (el.opacity / 100).toFixed(2) + '"'
    : '';
}

function renderEl(el, files) {
  var p = '    ';
  switch (el.type) {
    case 'text': {
      var t = 'text="' + escXml(el.text || '') + '"';
      var a = el.textAlign && el.textAlign !== 'left' ? ' textAlign="' + el.textAlign + '"' : '';
      var ml = el.multiLine ? ' multiLine="true"' : '';
      var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ' w="' + (el.w || 200) + '"' : '';
      var b = el.bold ? ' bold="true"' : '';
      var ff = el.fontFamily && el.fontFamily !== 'default' ? ' fontFamily="' + el.fontFamily + '"' : '';
      var sh = '';
      if (el.shadow === 'light') sh = ' shadow="1" shadowColor="#000000"';
      else if (el.shadow === 'dark') sh = ' shadow="3" shadowColor="#000000"';
      else if (el.shadow === 'glow') sh = ' shadow="4" shadowColor="' + (el.color || '#ffffff') + '"';
      var tg = '';
      if (el.textGradient && el.textGradient !== 'none') {
        var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
        var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
        tg = ' gradientColors="' + gc + '" gradientOrientation="top_bottom"';
      }
      var ts = '';
      if (el.textStroke && el.textStroke > 0) {
        ts = ' stroke="' + el.textStroke + '" strokeColor="' + (el.textStrokeColor || '#000000') + '"';
      }
      var rot = el.rotation ? ' rotation="' + el.rotation + '"' : '';
      var lh = el.multiLine && el.lineHeight && el.lineHeight !== 1.4 ? ' lineHeight="' + el.lineHeight + '"' : '';
      return p + '<Text ' + t + ' x="' + el.x + '" y="' + el.y + '" size="' + el.size + '" color="' + el.color + '"' + w + a + ml + b + ff + alphaAttr(el) + sh + tg + ts + rot + lh + ' />';
    }
    case 'rectangle': {
      if (el.h <= 3 && el.radius >= 1) {
        var lineRot = el.rotation ? ' rotation="' + el.rotation + '"' : '';
        return p + '<Line x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '" cornerRadius="' + el.radius + '"' + alphaAttr(el) + lineRot + ' />';
      }
      var rectRot = el.rotation ? ' rotation="' + el.rotation + '"' : '';
      var blur = el.blur ? ' blur="' + el.blur + '"' : '';
      if (el.fillColor2) {
        return p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '" fillColor2="' + el.fillColor2 + '"' + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + alphaAttr(el) + rectRot + blur + ' />';
      }
      return p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '"' + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + alphaAttr(el) + rectRot + blur + ' />';
    }
    case 'circle': {
      return p + '<Circle x="' + el.x + '" y="' + el.y + '" r="' + el.r + '" fillColor="' + el.color + '"' + alphaAttr(el) + ' />';
    }
    case 'image': {
      var srcFile = el.src || el.fileName || '';
      var folder = srcFile && files[srcFile] && files[srcFile].mimeType.indexOf('video/') === 0 ? 'videos' : 'images';
      var fitAttr = el.fit && el.fit !== 'cover' ? ' fitMode="' + el.fit + '"' : '';
      return p + '<Image src="' + folder + '/' + escXml(srcFile) + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '"' + fitAttr + ' />';
    }
    case 'video':
      return p + '<Video src="videos/' + escXml(el.src || el.fileName || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 240) + '" h="' + (el.h || 135) + '" autoPlay="true" loop="true" />';
    case 'arc':
      return p + '<!-- Arc: MAML 不原生支持 <Arc>，用 Circle 模拟 -->\n' +
        p + '<Circle x="' + el.x + '" y="' + el.y + '" r="' + (el.r || 40) + '" fillColor="' + el.color + '" />';
    case 'progress': {
      var pw = el.w || 200;
      var ph = el.h || 8;
      var pv = el.value || 60;
      var pr = el.radius || 4;
      var barW = Math.round(pw * pv / 100);
      return p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + pw + '" h="' + ph + '" fillColor="' + (el.bgColor || '#333333') + '" cornerRadius="' + pr + '" />\n' +
        p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + barW + '" h="' + ph + '" fillColor="' + el.color + '" cornerRadius="' + pr + '" />';
    }
    case 'lottie':
      return p + '<!-- Lottie 动画: MAML 引擎不支持此格式，请替换为 Image/Video -->';
    default:
      return '';
  }
}

export function generateMAML(opts) {
  var lines = [];
  var attrs = 'screenWidth="' + opts.device.width + '" frameRate="0" scaleByDensity="false"';
  if (opts.updater) attrs += ' useVariableUpdater="' + opts.updater + '"';
  attrs += ' name="' + escXml(opts.cardName) + '"';
  lines.push('<Widget ' + attrs + '>');

  var innerXml = opts.innerXml;
  if (opts.bgImage) {
    var bgImgLine = '  <Image src="' + escXml(opts.bgImage) + '" x="0" y="0" w="#view_width" h="#view_height" />';
    if (innerXml.indexOf('<Rectangle') >= 0) {
      innerXml = innerXml.replace(/(  <Rectangle w="#view_width"[^>]*>)/, bgImgLine + '\n$1');
    } else {
      innerXml = bgImgLine + '\n' + innerXml;
    }
  }
  lines.push(innerXml);

  if (opts.extraElements.length > 0) {
    lines.push('  <Group x="#marginL" y="0">');
    opts.extraElements.forEach(function (el) {
      lines.push(renderEl(el, opts.uploadedFiles));
    });
    lines.push('  </Group>');
  }

  lines.push('</Widget>');
  return lines.join('\n');
}

export function validateMAML(xml) {
  // MAML 不是严格 XML（表达式含 <=, >= 等），只用正则校验
  return validateMAMLRegex(xml);
}

function validateMAMLRegex(xml) {
  var errors = [];
  if (!xml.match(/<Widget[\s>]/)) errors.push('缺少 <Widget> 根标签');
  if (!xml.match(/<\/Widget>\s*$/)) errors.push('缺少 </Widget> 闭合标签');

  // 正确处理属性值中的 > 字符（如 expression="(#x > 5)"）
  var openCount = 0, selfCloseCount = 0;
  for (var i = 0; i < xml.length; i++) {
    if (xml[i] === '<' && i + 1 < xml.length && xml[i + 1].match(/[A-Z]/)) {
      // 跳过引号内的 > 找到真正的标签结束
      var tagEnd = -1, inQ = false, qC = '';
      for (var j = i + 1; j < xml.length; j++) {
        if (inQ) { if (xml[j] === qC) inQ = false; continue; }
        if (xml[j] === '"' || xml[j] === "'") { inQ = true; qC = xml[j]; continue; }
        if (xml[j] === '>') { tagEnd = j; break; }
      }
      if (tagEnd < 0) continue;
      if (xml[tagEnd - 1] === '/') selfCloseCount++;
      else openCount++;
    }
  }
  var closeTags = xml.match(/<\/[A-Z][a-zA-Z]*>/g) || [];

  if (openCount !== closeTags.length) {
    errors.push('标签开闭不匹配 (开:' + openCount + ' 闭:' + closeTags.length + ' 自闭:' + selfCloseCount + ')');
  }
  if (!xml.match(/name="/)) errors.push('缺少 name 属性');
  if (xml.match(/="[^"]*[&<][^"]*"/)) {
    errors.push('属性值中存在未转义的 & 或 < 字符');
  }
  return { valid: errors.length === 0, errors: errors };
}
