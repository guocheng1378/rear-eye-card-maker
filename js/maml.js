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

// ── MAML 框架标签白名单（原样透传） ──
var FRAMEWORK_TAGS = {
  'Var': true, 'Variable': true, 'Permanence': true,
  'VariableBinders': true, 'MiPaletteBinder': true,
  'FolmeState': true, 'FolmeConfig': true,
  'Function': true, 'FunctionCommand': true,
  'IfCommand': true, 'Consequent': true, 'Alternate': true,
  'MultiCommand': true,
  'VariableCommand': true, 'PermanenceCommand': true,
  'BinderCommand': true, 'MusicCommand': true,
  'LottieCommand': true, 'FrameRateCommand': true,
  'ExternalCommand': true, 'ExternalCommands': true,
  'Trigger': true, 'Triggers': true,
  'Layer': true,
};

// 递归渲染子元素（支持 Group/Layer/MusicControl 嵌套）
function renderChildren(children, files, indent) {
  var lines = [];
  children.forEach(function (child) {
    lines.push(renderEl(child, files, indent));
  });
  return lines.filter(Boolean).join('\n');
}

function renderEl(el, files, indent) {
  var p = indent || '    ';

  // ── 框架标签：从 Group 的 children 中透传 ──
  if (el._rawXml) {
    return p + el._rawXml;
  }

  switch (el.type) {
    case 'text': {
      var t = el.expression ? 'textExp="' + el.expression + '"' : 'text="' + escXml(el.text || '') + '"';
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
      var rectRot = el.rotation ? ' rotation="' + el.rotation + '"' : '';
      var blur = el.blur ? ' blur="' + el.blur + '"' : '';
      var rectStroke = el.strokeWidth > 0 ? ' stroke="' + el.strokeWidth + '" strokeColor="' + (el.strokeColor || '#ffffff') + '"' : '';
      if (el.fillColor2) {
        return p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '" fillColor2="' + el.fillColor2 + '"' + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + alphaAttr(el) + rectRot + blur + rectStroke + ' />';
      }
      return p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '"' + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + alphaAttr(el) + rectRot + blur + rectStroke + ' />';
    }
    case 'circle': {
      return p + '<Circle x="' + el.x + '" y="' + el.y + '" r="' + el.r + '" fillColor="' + el.color + '"' + alphaAttr(el) + ' />';
    }
    case 'image': {
      var srcFile = el.src || el.fileName || '';
      var folder = srcFile && files[srcFile] && files[srcFile].mimeType.indexOf('video/') === 0 ? 'videos' : 'images';
      var fitAttr = el.fit && el.fit !== 'cover' ? ' fitMode="' + el.fit + '"' : '';
      var imgRadius = el.radius ? ' cornerRadius="' + el.radius + '"' : '';
      return p + '<Image src="' + folder + '/' + escXml(srcFile) + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '"' + fitAttr + imgRadius + alphaAttr(el) + ' />';
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
    case 'lottie': {
      // MAML 原生支持 <Lottie> 标签
      var lottieSrc = el.src || el.fileName || '';
      var lottieName = el.name || '';
      var lottieAlign = el.align || 'center';
      var lottieLoop = el.loop !== undefined ? el.loop : 0;
      var lottieAuto = el.autoplay !== false ? 'true' : 'false';
      var lottieW = ' w="' + (el.w || 120) + '"';
      var lottieH = ' h="' + (el.h || 120) + '"';
      var lottieX = el.x !== undefined ? ' x="' + el.x + '"' : '';
      var lottieY = el.y !== undefined ? ' y="' + el.y + '"' : '';
      var lottieNameAttr = lottieName ? ' name="' + escXml(lottieName) + '"' : '';
      return p + '<Lottie src="' + escXml(lottieSrc) + '"' + lottieX + lottieY + lottieW + lottieH + ' align="' + lottieAlign + '" autoplay="' + lottieAuto + '" loop="' + lottieLoop + '"' + lottieNameAttr + ' />';
    }

    // ── Group：容器元素，支持递归子元素 ──
    case 'group': {
      var attrs = '';
      if (el.name) attrs += ' name="' + escXml(el.name) + '"';
      if (el.x !== undefined) attrs += ' x="' + el.x + '"';
      if (el.y !== undefined) attrs += ' y="' + el.y + '"';
      if (el.w !== undefined) attrs += ' w="' + el.w + '"';
      if (el.h !== undefined) attrs += ' h="' + el.h + '"';
      if (el.alpha !== undefined) attrs += ' alpha="' + el.alpha + '"';
      if (el.visibility) attrs += ' visibility="' + el.visibility + '"';
      if (el.folmeMode) attrs += ' folmeMode="true"';
      if (el.align) attrs += ' align="' + el.align + '"';
      if (el.alignV) attrs += ' alignV="' + el.alignV + '"';
      if (el.contentDescription) attrs += ' contentDescriptionExp="' + escXml(el.contentDescription) + '"';
      if (el.interceptTouch) attrs += ' interceptTouch="true"';
      if (el.touchable) attrs += ' touchable="true"';
      if (!attrs) attrs = '';

      var children = (el.children && el.children.length > 0)
        ? '\n' + renderChildren(el.children, files, p + '  ') + '\n' + p
        : '';
      return p + '<Group' + attrs + '>' + children + '</Group>';
    }

    // ── Layer：超级材质层 ──
    case 'layer': {
      var layerAttrs = '';
      if (el.name) layerAttrs += ' name="' + escXml(el.name) + '"';
      if (el.alpha !== undefined) layerAttrs += ' alpha="' + el.alpha + '"';
      if (el.visibility) layerAttrs += ' visibility="' + el.visibility + '"';
      if (el.layerType) layerAttrs += ' layerType="' + el.layerType + '"';
      if (el.blurRadius !== undefined) layerAttrs += ' blurRadius="' + el.blurRadius + '"';
      if (el.blurColors) layerAttrs += ' blurColors="' + escXml(el.blurColors) + '"';
      if (el.colorModes !== undefined) layerAttrs += ' colorModes="' + el.colorModes + '"';
      if (el.frameRate !== undefined) layerAttrs += ' frameRate="' + el.frameRate + '"';
      if (el.updatePosition === false) layerAttrs += ' updatePosition="false"';
      if (el.updateSize === false) layerAttrs += ' updateSize="false"';
      if (el.updateTranslation === false) layerAttrs += ' updateTranslation="false"';

      var layerChildren = (el.children && el.children.length > 0)
        ? '\n' + renderChildren(el.children, files, p + '  ') + '\n' + p
        : '';
      return p + '<Layer' + layerAttrs + '>' + layerChildren + '</Layer>';
    }

    // ── MusicControl：音乐控件 ──
    case 'musiccontrol': {
      var mcAttrs = '';
      if (el.name) mcAttrs += ' name="' + escXml(el.name) + '"';
      mcAttrs += ' w="' + (el.w || '(#view_width - #viewMarginLeft)') + '"';
      mcAttrs += ' h="' + (el.h || '#view_height') + '"';
      if (el.x !== undefined) mcAttrs += ' x="' + el.x + '"';
      if (el.y !== undefined) mcAttrs += ' y="' + el.y + '"';
      if (el.autoShow === false) mcAttrs += ' autoShow="false"';
      if (el.autoRefresh !== false) mcAttrs += ' autoRefresh="true"';
      if (el.enableLyric) mcAttrs += ' enableLyric="true"';
      if (el.updateLyricInterval) mcAttrs += ' updateLyricInterval="' + el.updateLyricInterval + '"';

      var mcChildren = (el.children && el.children.length > 0)
        ? '\n' + renderChildren(el.children, files, p + '  ') + '\n' + p
        : '';
      return p + '<MusicControl' + mcAttrs + '>' + mcChildren + '</MusicControl>';
    }

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
  // 检查属性值中是否有未转义的 &（MAML 表达式含 <=, >=，不检查 <）
  if (xml.match(/="[^"]*(?:&[^a-zA-Z#;]|&[a-zA-Z]+(?:[^;a-zA-Z]|"[^"]*$))[^"]*"/)) {
    errors.push('属性值中存在未转义的 & 字符');
  }
  return { valid: errors.length === 0, errors: errors };
}
