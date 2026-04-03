// ─── MAML: XML 生成 + 转义 + 校验 ──────────────────────────────────

JCM.escXml = function (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
};

JCM.generateMAML = function (opts) {
  var lines = [];
  var attrs = 'screenWidth="' + opts.device.width + '" frameRate="0" scaleByDensity="false"';
  if (opts.updater) attrs += ' useVariableUpdater="' + opts.updater + '"';
  attrs += ' name="' + JCM.escXml(opts.cardName) + '"';
  lines.push('<Widget ' + attrs + '>');
  lines.push(opts.innerXml);

  if (opts.extraElements.length > 0) {
    lines.push('  <Group x="#marginL" y="0">');
    opts.extraElements.forEach(function (el) {
      lines.push(renderEl(el, opts.uploadedFiles));
    });
    lines.push('  </Group>');
  }

  lines.push('</Widget>');
  return lines.join('\n');
};

function alphaAttr(el) {
  return (el.opacity !== undefined && el.opacity !== 100)
    ? ' alpha="' + (el.opacity / 100).toFixed(2) + '"'
    : '';
}

function renderEl(el, files) {
  var p = '    ';
  switch (el.type) {
    case 'text': {
      var t = 'text="' + JCM.escXml(el.text || '') + '"';
      var a = el.textAlign && el.textAlign !== 'left' ? ' textAlign="' + el.textAlign + '"' : '';
      var ml = el.multiLine ? ' multiLine="true"' : '';
      var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ' w="' + (el.w || 200) + '"' : '';
      var b = el.bold ? ' bold="true"' : '';
      var sh = '';
      if (el.shadow === 'light') sh = ' shadow="1" shadowColor="#000000"';
      else if (el.shadow === 'dark') sh = ' shadow="3" shadowColor="#000000"';
      else if (el.shadow === 'glow') sh = ' shadow="4" shadowColor="' + (el.color || '#ffffff') + '"';
      return p + '<Text ' + t + ' x="' + el.x + '" y="' + el.y + '" size="' + el.size + '" color="' + el.color + '"' + w + a + ml + b + alphaAttr(el) + sh + ' />';
    }
    case 'rectangle': {
      if (el.h <= 3 && el.radius >= 1) {
        return p + '<Line x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '" cornerRadius="' + el.radius + '"' + alphaAttr(el) + ' />';
      }
      return p + '<Rectangle x="' + el.x + '" y="' + el.y + '" w="' + el.w + '" h="' + el.h + '" fillColor="' + el.color + '"' + (el.radius ? ' cornerRadius="' + el.radius + '"' : '') + alphaAttr(el) + ' />';
    }
    case 'circle': {
      return p + '<Circle x="' + el.x + '" y="' + el.y + '" r="' + el.r + '" fillColor="' + el.color + '"' + alphaAttr(el) + ' />';
    }
    case 'image': {
      var folder = el.src && files[el.src] && files[el.src].mimeType.indexOf('video/') === 0 ? 'videos' : 'images';
      return p + '<Image src="' + folder + '/' + JCM.escXml(el.src || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 100) + '" h="' + (el.h || 100) + '" />';
    }
    case 'video':
      return p + '<Video src="videos/' + JCM.escXml(el.src || '') + '" x="' + el.x + '" y="' + el.y + '" w="' + (el.w || 240) + '" h="' + (el.h || 135) + '" autoPlay="true" loop="true" />';
    default:
      return '';
  }
}

// ─── XML 校验 ────────────────────────────────────────────────────
JCM.validateMAML = function (xml) {
  var errors = [];
  // Check root Widget tag
  if (!xml.match(/<Widget[\s>]/)) errors.push('缺少 <Widget> 根标签');
  if (!xml.match(/<\/Widget>\s*$/)) errors.push('缺少 </Widget> 闭合标签');
  // Check balanced tags
  var openTags = xml.match(/<[A-Z][a-zA-Z]*\s[^/]*>/g) || [];
  var closeTags = xml.match(/<\/[A-Z][a-zA-Z]*>/g) || [];
  var selfClose = xml.match(/<[A-Z][a-zA-Z]*\s[^>]*\/>/g) || [];
  if (openTags.length !== closeTags.length + selfClose.length) {
    errors.push('标签开闭不匹配 (开:' + openTags.length + ' 闭:' + closeTags.length + ' 自闭:' + selfClose.length + ')');
  }
  // Check for unescaped special chars in attribute values
  if (xml.match(/="[^"]*[&<][^"]*"/)) {
    errors.push('属性值中存在未转义的 & 或 < 字符');
  }
  // Check name attribute
  if (!xml.match(/name="/)) errors.push('缺少 name 属性');
  return { valid: errors.length === 0, errors: errors };
};
