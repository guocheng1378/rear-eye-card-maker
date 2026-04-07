// ─── MAML Linter + Performance Analyzer + Accessibility Checker ───
import { toast } from './toast.js';

// ─── MAML Linter ──────────────────────────────────────────────────
export function lintMAML(xml) {
  var issues = [];
  if (!xml || xml.trim().length === 0) {
    issues.push({ severity: 'error', line: 0, message: 'XML 为空' });
    return issues;
  }

  var lines = xml.split('\n');

  // Check Widget root
  if (xml.indexOf('<Widget') < 0) {
    issues.push({ severity: 'error', line: 1, message: '缺少 <Widget> 根元素' });
  }

  // Check closing tags
  var openTags = xml.match(/<(\w+)\s[^/]*>/g) || [];
  var closeTags = xml.match(/<\/(\w+)>/g) || [];
  var selfClosing = xml.match(/<(\w+)\s[^>]*\/>/g) || [];

  // Check for unclosed tags (simple heuristic)
  var tagStack = [];
  lines.forEach(function (line, i) {
    var lineNum = i + 1;

    // Check attribute quotes
    var attrPattern = /\w+="[^"]*$/;
    if (attrPattern.test(line) && line.indexOf('/>') < 0 && line.indexOf('>') < 0) {
      issues.push({ severity: 'error', line: lineNum, message: '属性引号未闭合' });
    }

    // Check empty text elements
    if (/<Text\s[^>]*text=""[^>]*\/?>/.test(line) || /<Text\s[^>]*text=""[^>]*><\/Text>/.test(line)) {
      issues.push({ severity: 'warning', line: lineNum, message: 'Text 元素内容为空' });
    }

    // Check zero-size elements
    if (/w="0"/.test(line) || /h="0"/.test(line)) {
      issues.push({ severity: 'warning', line: lineNum, message: '元素宽/高为 0' });
    }

    // Check negative coordinates
    var xMatch = line.match(/x="(-\d+)"/);
    var yMatch = line.match(/y="(-\d+)"/);
    if (xMatch && parseInt(xMatch[1]) < -50) {
      issues.push({ severity: 'info', line: lineNum, message: 'X 坐标为负值 (' + xMatch[1] + ')，可能不可见' });
    }
    if (yMatch && parseInt(yMatch[1]) < -50) {
      issues.push({ severity: 'info', line: lineNum, message: 'Y 坐标为负值 (' + yMatch[1] + ')，可能不可见' });
    }

    // Check color format
    var colorMatch = line.match(/(fillColor|color|strokeColor)="(#[^"]+)"/g);
    if (colorMatch) {
      colorMatch.forEach(function (cm) {
        var c = cm.match(/"(#[^"]+)"/)[1];
        if (c.length !== 7 && c.length !== 4 && c !== 'transparent') {
          issues.push({ severity: 'warning', line: lineNum, message: '颜色值格式异常: ' + c });
        }
      });
    }

    // Check deprecated or risky patterns
    if (line.indexOf('alert(') >= 0 || line.indexOf('eval(') >= 0) {
      issues.push({ severity: 'error', line: lineNum, message: '检测到潜在的不安全代码' });
    }
  });

  // Check file size
  if (xml.length > 100000) {
    issues.push({ severity: 'warning', line: 0, message: 'XML 文件较大 (' + (xml.length / 1024).toFixed(0) + 'KB)，可能影响加载性能' });
  }

  return issues;
}

export function showLintResults(issues) {
  var existing = document.getElementById('lintResults');
  if (existing) existing.remove();

  if (issues.length === 0) {
    toast('✅ MAML 语法检查通过，未发现问题', 'success');
    return;
  }

  var div = document.createElement('div');
  div.id = 'lintResults';
  div.style.cssText = 'position:fixed;bottom:60px;right:20px;max-width:360px;max-height:300px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;z-index:10001;box-shadow:var(--shadow)';

  var errors = issues.filter(function (i) { return i.severity === 'error'; });
  var warnings = issues.filter(function (i) { return i.severity === 'warning'; });
  var infos = issues.filter(function (i) { return i.severity === 'info'; });

  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<span style="font-size:13px;font-weight:600">✅ MAML 检查结果</span>' +
    '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px">✕</button></div>';

  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">' +
    (errors.length ? '<span style="color:var(--red)">' + errors.length + ' 错误</span> · ' : '') +
    (warnings.length ? '<span style="color:var(--orange)">' + warnings.length + ' 警告</span> · ' : '') +
    infos.length + ' 提示</div>';

  issues.forEach(function (issue) {
    var icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    var color = issue.severity === 'error' ? 'var(--red)' : issue.severity === 'warning' ? 'var(--orange)' : 'var(--text3)';
    html += '<div style="display:flex;gap:6px;padding:4px 0;font-size:11px;color:' + color + '">' +
      '<span>' + icon + '</span>' +
      (issue.line ? '<span style="color:var(--text3)">L' + issue.line + '</span>' : '') +
      '<span>' + issue.message + '</span></div>';
  });

  div.innerHTML = html;
  document.body.appendChild(div);

  // Auto-remove after 15s
  setTimeout(function () { if (div.parentNode) div.remove(); }, 15000);
}

// ─── Performance Analyzer ─────────────────────────────────────────
export function analyzePerformance(elements, xml) {
  var warnings = [];

  var totalElements = elements ? elements.length : 0;
  if (totalElements > 20) {
    warnings.push({ level: 'warning', msg: '元素数量较多 (' + totalElements + ')，可能影响渲染性能。建议控制在 15 个以内。' });
  }
  if (totalElements > 30) {
    warnings.push({ level: 'error', msg: '元素数量过多 (' + totalElements + ')，强烈建议精简。' });
  }

  // Count media elements
  var videoCount = 0, imageCount = 0;
  if (elements) {
    elements.forEach(function (el) {
      if (el.type === 'video') videoCount++;
      if (el.type === 'image') imageCount++;
    });
  }
  if (videoCount > 1) {
    warnings.push({ level: 'warning', msg: '多个视频元素 (' + videoCount + ') 可能导致性能问题。' });
  }
  if (imageCount > 5) {
    warnings.push({ level: 'info', msg: '图片较多 (' + imageCount + ')，注意文件大小。' });
  }

  // Check XML size
  if (xml && xml.length > 50000) {
    warnings.push({ level: 'warning', msg: 'XML 文件较大 (' + (xml.length / 1024).toFixed(0) + 'KB)。' });
  }

  // Check nested groups
  if (xml) {
    var groupCount = (xml.match(/<Group/g) || []).length;
    if (groupCount > 5) {
      warnings.push({ level: 'info', msg: '嵌套 Group 较多 (' + groupCount + ')，可能导致渲染延迟。' });
    }
  }

  return warnings;
}

export function showPerfResults(warnings) {
  if (warnings.length === 0) {
    toast('📊 性能分析通过，未发现问题', 'success');
    return;
  }
  var msg = warnings.map(function (w) {
    return (w.level === 'error' ? '❌ ' : w.level === 'warning' ? '⚠️ ' : 'ℹ️ ') + w.msg;
  }).join('\n');
  toast(msg, warnings.some(function (w) { return w.level === 'error'; }) ? 'error' : 'warning');
}

// ─── Accessibility Checker ────────────────────────────────────────
export function checkAccessibility(elements) {
  var issues = [];

  if (!elements || elements.length === 0) return issues;

  elements.forEach(function (el, i) {
    // Check text contrast
    if (el.type === 'text' && el.color) {
      var textLum = getLuminance(el.color);
      // Assume dark background
      if (textLum < 0.3) {
        issues.push({ element: i, msg: '文字颜色较暗，可能在深色背景上难以阅读' });
      }
      // Check small text
      if (el.size < 12) {
        issues.push({ element: i, msg: '文字过小 (' + el.size + 'px)，建议至少 12px' });
      }
      if (el.size < 14 && el.size >= 12) {
        issues.push({ element: i, msg: '文字偏小 (' + el.size + 'px)，建议正文至少 14px' });
      }
    }

    // Check touch target size
    if ((el.type === 'rectangle' || el.type === 'circle') && el.w < 24 && el.h < 24) {
      issues.push({ element: i, msg: '元素尺寸过小，触摸目标建议至少 44×44px' });
    }
  });

  return issues;
}

function getLuminance(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substr(0, 2), 16) / 255;
  var g = parseInt(hex.substr(2, 2), 16) / 255;
  var b = parseInt(hex.substr(4, 2), 16) / 255;
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function showA11yResults(issues) {
  if (issues.length === 0) {
    toast('♿ 无障碍检查通过', 'success');
    return;
  }
  var msg = issues.slice(0, 5).map(function (i) {
    return '⚠️ 元素 #' + (i.element + 1) + ': ' + i.msg;
  }).join('\n');
  if (issues.length > 5) msg += '\n... 还有 ' + (issues.length - 5) + ' 条';
  toast(msg, 'warning');
}
