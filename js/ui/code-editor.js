// ─── Code Editor: Enhanced XML Code Editor ────────────────────────
// Features: syntax highlighting, auto-close, autocomplete, find/replace,
// go-to-line, bracket matching, line operations, minimap, smart indent

import { validateMAML } from '../maml.js';

// ─── MAML Autocomplete Definitions ────────────────────────────────
var MAML_ELEMENTS = [
  { tag: 'Widget', desc: '根标签', attrs: 'name="" screenWidth="" frameRate="" scaleByDensity=""' },
  { tag: 'Text', desc: '文字', attrs: 'text="" x="" y="" size="" color=""' },
  { tag: 'Rectangle', desc: '矩形', attrs: 'x="" y="" w="" h="" fillColor=""' },
  { tag: 'Circle', desc: '圆形', attrs: 'x="" y="" r="" fillColor=""' },
  { tag: 'Image', desc: '图片', attrs: 'src="" x="" y="" w="" h=""' },
  { tag: 'Video', desc: '视频', attrs: 'src="" x="" y="" w="" h=""' },
  { tag: 'Group', desc: '容器', attrs: 'x="" y=""' },
  { tag: 'Arc', desc: '弧形', attrs: 'x="" y="" r=""' },
  { tag: 'Progress', desc: '进度', attrs: 'x="" y="" w="" h="" value=""' },
];

var MAML_ATTRS = [
  { name: 'x', desc: 'X 坐标' }, { name: 'y', desc: 'Y 坐标' },
  { name: 'w', desc: '宽度' }, { name: 'h', desc: '高度' },
  { name: 'r', desc: '半径' },
  { name: 'fillColor', desc: '填充色' }, { name: 'fillColor2', desc: '渐变色2' },
  { name: 'color', desc: '颜色' }, { name: 'size', desc: '字号' },
  { name: 'text', desc: '文字内容' }, { name: 'bold', desc: '加粗' },
  { name: 'textAlign', desc: '文字对齐' }, { name: 'multiLine', desc: '多行' },
  { name: 'fontFamily', desc: '字体' }, { name: 'alpha', desc: '透明度' },
  { name: 'cornerRadius', desc: '圆角' }, { name: 'rotation', desc: '旋转' },
  { name: 'gradientColors', desc: '渐变色' }, { name: 'gradientOrientation', desc: '渐变方向' },
  { name: 'stroke', desc: '描边宽' }, { name: 'strokeColor', desc: '描边色' },
  { name: 'shadow', desc: '阴影' }, { name: 'shadowColor', desc: '阴影色' },
  { name: 'blur', desc: '模糊' }, { name: 'src', desc: '资源路径' },
  { name: 'autoPlay', desc: '自动播放' }, { name: 'loop', desc: '循环' },
  { name: 'name', desc: '卡片名' }, { name: 'screenWidth', desc: '屏幕宽度' },
  { name: 'frameRate', desc: '帧率' }, { name: 'scaleByDensity', desc: '密度缩放' },
  { name: 'useVariableUpdater', desc: '变量更新器' },
  { name: 'lineHeight', desc: '行高' }, { name: 'fitMode', desc: '适配模式' },
  { name: 'animationName', desc: '动画名' }, { name: 'animationDuration', desc: '动画时长' },
  { name: 'animationDelay', desc: '动画延迟' }, { name: 'animationRepeat', desc: '动画重复' },
  { name: 'animationInfinite', desc: '无限循环' },
];

// ─── Syntax Highlighting ──────────────────────────────────────────
export function highlightXML(code) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>')
    .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="tag">$2</span>')
    .replace(/([\w:.-]+)(=)(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, function (match, name, eq, val) {
      // Highlight MAML expressions (#variables) in attribute values
      var highlightedVal = val.replace(/#([\w.]+)/g, '<span class="expr">#$1</span>');
      return '<span class="attr-name">' + name + '</span>' + eq + '<span class="attr-val">' + highlightedVal + '</span>';
    })
    .replace(/(&lt;|&gt;|\/&gt;)/g, '<span class="bracket">$1</span>');
}

// ─── Line Numbers & Highlight Sync ────────────────────────────────
export function updateCodeEditor() {
  var textarea = document.getElementById('codeContent');
  var gutter = document.getElementById('codeGutter');
  var highlight = document.getElementById('codeHighlight');
  if (!textarea || !gutter || !highlight) return;
  var lines = textarea.value.split('\n');
  var gutterHtml = '';
  for (var i = 1; i <= lines.length; i++) gutterHtml += '<span>' + i + '</span>';
  gutter.innerHTML = gutterHtml;
  highlight.innerHTML = highlightXML(textarea.value) + '\n';
  updateCurrentLineHighlight(textarea);
  updateMinimap(textarea);
}

function updateCurrentLineHighlight(textarea) {
  var lineHighlight = document.getElementById('codeLineHighlight');
  if (!lineHighlight) return;
  var text = textarea.value.substring(0, textarea.selectionStart);
  var lineNum = text.split('\n').length;
  var lineHeight = 21; // match CSS line-height
  lineHighlight.style.top = ((lineNum - 1) * lineHeight) + 'px';
}

// ─── Minimap ──────────────────────────────────────────────────────
function updateMinimap(textarea) {
  var minimap = document.getElementById('codeMinimap');
  if (!minimap) return;
  var lines = textarea.value.split('\n');
  var canvas = minimap.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = Math.max(lines.length * 2.5, textarea.clientHeight);
    minimap.appendChild(canvas);
  }
  canvas.height = Math.max(lines.length * 2.5, textarea.clientHeight);
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Render minimap lines
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var indent = 0;
    while (indent < line.length && line[indent] === ' ') indent++;
    var codeLen = Math.min(line.trim().length, 60);
    if (codeLen === 0) continue;
    // Color by content type
    var trimmed = line.trim();
    if (trimmed.indexOf('<!--') === 0) {
      ctx.fillStyle = 'rgba(92, 99, 112, 0.5)';
    } else if (trimmed.indexOf('<') === 0 && trimmed.indexOf('</') !== 0) {
      ctx.fillStyle = 'rgba(97, 175, 239, 0.6)';
    } else {
      ctx.fillStyle = 'rgba(152, 195, 121, 0.4)';
    }
    ctx.fillRect(indent * 0.8, i * 2.5, codeLen * 0.7, 1.8);
  }
  // Viewport indicator
  var scrollRatio = textarea.scrollTop / (textarea.scrollHeight || 1);
  var viewH = (textarea.clientHeight / (textarea.scrollHeight || 1)) * canvas.height;
  var viewY = scrollRatio * canvas.height;
  ctx.fillStyle = 'rgba(108, 92, 231, 0.15)';
  ctx.fillRect(0, viewY, canvas.width, viewH);
}

// ─── Tag Auto-close ───────────────────────────────────────────────
function handleAutoClose(textarea, e) {
  if (e.key === '<' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var selected = textarea.value.substring(start, end);
    var text = '<' + selected + '>';
    textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.selectionStart = start + 1;
    textarea.selectionEnd = start + 1 + selected.length;
    updateCodeEditor();
    return true;
  }
  // Auto-close tags: type '/' inside <Text ... | → <Text ... />
  if (e.key === '/' && !e.ctrlKey) {
    var pos = textarea.selectionStart;
    var before = textarea.value.substring(0, pos);
    // Check if we're inside a tag
    var lastOpen = before.lastIndexOf('<');
    var lastClose = before.lastIndexOf('>');
    if (lastOpen > lastClose && before[lastOpen + 1] !== '/') {
      var tagContent = before.substring(lastOpen + 1);
      if (tagContent.indexOf(' ') > 0) {
        // This looks like <TagName attr=... | - append /> 
        // Don't auto-close yet, user might be typing a path
      }
    }
    return false;
  }
  return false;
}

// ─── Autocomplete ─────────────────────────────────────────────────
var _acVisible = false;
var _acIndex = 0;
var _acItems = [];
var _acStartPos = 0;

function getAutocompleteContext(textarea) {
  var pos = textarea.selectionStart;
  var text = textarea.value;
  var lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  var lineText = text.substring(lineStart, pos);

  // Tag context: after <  but before first space or >
  var tagMatch = lineText.match(/<([A-Za-z]*)$/);
  if (tagMatch) {
    return {
      type: 'tag',
      query: tagMatch[1],
      startPos: lineStart + lineText.lastIndexOf('<') + 1,
    };
  }

  // Attribute context: inside a tag, after a space
  var attrMatch = lineText.match(/<[A-Za-z][\w]*\s+(?:.*\s)?([\w]*)$/);
  if (attrMatch && lineText.lastIndexOf('>') < lineText.lastIndexOf('<')) {
    return {
      type: 'attr',
      query: attrMatch[1],
      startPos: pos - attrMatch[1].length,
    };
  }

  // Attribute value context: after attr="
  var valMatch = lineText.match(/([\w]+)="([^"]*)$/);
  if (valMatch) {
    return {
      type: 'value',
      attr: valMatch[1],
      query: valMatch[2],
      startPos: pos - valMatch[2].length,
    };
  }

  return null;
}

function showAutocomplete(textarea, ctx) {
  var dropdown = document.getElementById('codeAutocomplete');
  if (!dropdown) return;

  _acItems = [];
  if (ctx.type === 'tag') {
    _acItems = MAML_ELEMENTS.filter(function (el) {
      return el.tag.toLowerCase().indexOf(ctx.query.toLowerCase()) >= 0;
    }).map(function (el) {
      return { text: el.tag + ' ' + el.attrs + ' /', label: el.tag, desc: el.desc, insert: el.tag };
    });
  } else if (ctx.type === 'attr') {
    _acItems = MAML_ATTRS.filter(function (a) {
      return a.name.toLowerCase().indexOf(ctx.query.toLowerCase()) >= 0;
    }).map(function (a) {
      return { text: a.name + '=""', label: a.name, desc: a.desc, insert: a.name + '=""' };
    });
  } else if (ctx.type === 'value') {
    // Provide value suggestions for known attributes
    var valSuggestions = {
      textAlign: ['"left"', '"center"', '"right"'],
      bold: ['"true"', '"false"'],
      multiLine: ['"true"', '"false"'],
      scaleByDensity: ['"true"', '"false"'],
      frameRate: ['"0"', '"30"', '"60"'],
      gradientOrientation: ['"top_bottom"', '"left_right"', '"tl_br"', '"bl_tr"'],
      fitMode: ['"cover"', '"contain"', '"center"'],
    };
    var suggestions = valSuggestions[ctx.attr] || [];
    _acItems = suggestions.filter(function (v) {
      return v.toLowerCase().indexOf(ctx.query.toLowerCase()) >= 0;
    }).map(function (v) {
      return { text: v, label: v, desc: '', insert: v };
    });
  }

  if (_acItems.length === 0) {
    hideAutocomplete();
    return;
  }

  _acStartPos = ctx.startPos;
  _acIndex = 0;
  _acVisible = true;

  renderAutocompleteDropdown(textarea, dropdown);
}

function renderAutocompleteDropdown(textarea, dropdown) {
  dropdown.innerHTML = _acItems.map(function (item, i) {
    return '<div class="code-ac-item' + (i === _acIndex ? ' active' : '') + '" data-ac-idx="' + i + '">' +
      '<span class="code-ac-label">' + item.label + '</span>' +
      '<span class="code-ac-desc">' + item.desc + '</span></div>';
  }).join('');
  dropdown.style.display = '';

  // Position near cursor
  var coords = getCaretCoordinates(textarea);
  dropdown.style.left = coords.left + 'px';
  dropdown.style.top = coords.top + 'px';
}

function getCaretCoordinates(textarea) {
  // Simplified caret position estimation
  var text = textarea.value.substring(0, textarea.selectionStart);
  var lines = text.split('\n');
  var lineNum = lines.length;
  var colNum = lines[lines.length - 1].length;
  var lineH = 20.65; // line-height from CSS
  var charW = 7.2; // approximate char width at 12px monospace
  return {
    left: 44 + 16 + colNum * charW - textarea.scrollLeft, // 44=gutter, 16=padding
    top: 12 + lineNum * lineH - textarea.scrollTop,
  };
}

function hideAutocomplete() {
  _acVisible = false;
  var dropdown = document.getElementById('codeAutocomplete');
  if (dropdown) dropdown.style.display = 'none';
  _acItems = [];
}

function acceptAutocomplete(textarea) {
  if (!_acVisible || _acItems.length === 0) return false;
  var item = _acItems[_acIndex];
  if (!item) return false;

  var pos = textarea.selectionStart;
  var insert = item.insert;

  // For tag type, also insert closing tag
  if (item.text.indexOf(' /') > 0) {
    var tagOnly = item.label;
    // Check if auto-closing needed
    var before = textarea.value.substring(_acStartPos, pos);
    var fullInsert = insert;
    textarea.value = textarea.value.substring(0, _acStartPos) + fullInsert + textarea.value.substring(pos);
    // Position cursor after the tag name
    textarea.selectionStart = textarea.selectionEnd = _acStartPos + tagOnly.length;
  } else if (insert.indexOf('=""') > 0) {
    textarea.value = textarea.value.substring(0, _acStartPos) + insert + textarea.value.substring(pos);
    // Position cursor between quotes
    textarea.selectionStart = textarea.selectionEnd = _acStartPos + insert.length - 1;
  } else {
    textarea.value = textarea.value.substring(0, _acStartPos) + insert + textarea.value.substring(pos);
    textarea.selectionStart = textarea.selectionEnd = _acStartPos + insert.length;
  }

  hideAutocomplete();
  updateCodeEditor();
  return true;
}

// ─── Find & Replace ───────────────────────────────────────────────
var _findState = { query: '', replace: '', matches: [], currentIdx: -1 };

export function openFindReplace() {
  var bar = document.getElementById('codeFindBar');
  if (!bar) return;
  bar.style.display = '';
  var input = bar.querySelector('#codeFindInput');
  if (input) {
    input.focus();
    input.select();
  }
  updateFindCount();
}

export function closeFindReplace() {
  var bar = document.getElementById('codeFindBar');
  if (bar) bar.style.display = 'none';
  clearFindHighlights();
  var textarea = document.getElementById('codeContent');
  if (textarea) textarea.focus();
}

function findNext() {
  var textarea = document.getElementById('codeContent');
  if (!textarea || !_findState.matches.length) return;
  _findState.currentIdx = (_findState.currentIdx + 1) % _findState.matches.length;
  highlightFindMatch(textarea);
}

function findPrev() {
  var textarea = document.getElementById('codeContent');
  if (!textarea || !_findState.matches.length) return;
  _findState.currentIdx = (_findState.currentIdx - 1 + _findState.matches.length) % _findState.matches.length;
  highlightFindMatch(textarea);
}

function doFind(textarea, query) {
  _findState.query = query;
  _findState.matches = [];
  if (!query) { clearFindHighlights(); updateFindCount(); return; }
  var text = textarea.value;
  var idx = 0;
  while ((idx = text.indexOf(query, idx)) >= 0) {
    _findState.matches.push({ start: idx, end: idx + query.length });
    idx += query.length;
  }
  if (_findState.currentIdx >= _findState.matches.length) _findState.currentIdx = 0;
  if (_findState.matches.length > 0 && _findState.currentIdx < 0) _findState.currentIdx = 0;
  updateFindCount();
  if (_findState.matches.length > 0) highlightFindMatch(textarea);
}

function highlightFindMatch(textarea) {
  var match = _findState.matches[_findState.currentIdx];
  if (!match) return;
  textarea.selectionStart = match.start;
  textarea.selectionEnd = match.end;
  textarea.focus();
  // Scroll to view
  var text = textarea.value.substring(0, match.start);
  var lineNum = text.split('\n').length;
  var lineH = 20.65;
  var targetScroll = (lineNum - 3) * lineH;
  if (targetScroll > 0) textarea.scrollTop = Math.max(textarea.scrollTop, targetScroll);
  updateFindCount();
}

function clearFindHighlights() {
  _findState.matches = [];
  _findState.currentIdx = -1;
}

function updateFindCount() {
  var countEl = document.getElementById('codeFindCount');
  if (!countEl) return;
  if (!_findState.query) { countEl.textContent = ''; return; }
  countEl.textContent = _findState.matches.length > 0
    ? (_findState.currentIdx + 1) + '/' + _findState.matches.length
    : '无匹配';
}

function doReplace(textarea) {
  if (!_findState.matches.length) return;
  var match = _findState.matches[_findState.currentIdx];
  if (!match) return;
  var replaceVal = document.getElementById('codeReplaceInput');
  if (!replaceVal) return;
  textarea.value = textarea.value.substring(0, match.start) + replaceVal.value + textarea.value.substring(match.end);
  doFind(textarea, _findState.query);
  updateCodeEditor();
}

function doReplaceAll(textarea) {
  if (!_findState.query) return;
  var replaceVal = document.getElementById('codeReplaceInput');
  if (!replaceVal) return;
  textarea.value = textarea.value.split(_findState.query).join(replaceVal.value);
  doFind(textarea, _findState.query);
  updateCodeEditor();
}

// ─── Go To Line ───────────────────────────────────────────────────
export function goToLine() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  var lineNum = prompt('跳转到行号:');
  if (!lineNum) return;
  var target = parseInt(lineNum, 10);
  if (isNaN(target) || target < 1) return;
  var lines = textarea.value.split('\n');
  var pos = 0;
  for (var i = 0; i < Math.min(target - 1, lines.length); i++) {
    pos += lines[i].length + 1;
  }
  textarea.selectionStart = textarea.selectionEnd = pos;
  textarea.focus();
  var lineH = 20.65;
  textarea.scrollTop = Math.max(0, (target - 3) * lineH);
  updateCurrentLineHighlight(textarea);
}

// ─── XML Error Squiggles ──────────────────────────────────────────
function showErrorSquiggles(textarea) {
  var errOverlay = document.getElementById('codeErrors');
  if (!errOverlay) return;
  errOverlay.innerHTML = '';
  var xml = textarea.value;
  if (!xml || xml.length < 10) return;

  // Quick validation
  var result = validateMAML(xml);
  if (result.valid) return;

  // Show error indicator in gutter (red line numbers)
  // For now, just update gutter style
  var gutter = document.getElementById('codeGutter');
  if (!gutter) return;
  // Highlight Widget tag presence
  if (!xml.match(/<Widget[\s>]/)) {
    var spans = gutter.querySelectorAll('span');
    if (spans.length > 0) spans[0].style.color = 'var(--red)';
  }
}

// ─── Line Operations ──────────────────────────────────────────────
function duplicateLine(textarea) {
  var start = textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  var end = textarea.value.indexOf('\n', textarea.selectionEnd);
  if (end < 0) end = textarea.value.length;
  var lineText = textarea.value.substring(start, end);
  textarea.value = textarea.value.substring(0, end) + '\n' + lineText + textarea.value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = end + 1 + lineText.length;
  updateCodeEditor();
}

function moveLineUp(textarea) {
  var lineStart = textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  var lineEnd = textarea.value.indexOf('\n', textarea.selectionEnd);
  if (lineEnd < 0) lineEnd = textarea.value.length;
  var prevLineStart = textarea.value.lastIndexOf('\n', lineStart - 2) + 1;
  if (prevLineStart < 0 && lineStart === 0) return; // already first line
  var curLine = textarea.value.substring(lineStart, lineEnd);
  var prevLine = textarea.value.substring(prevLineStart, lineStart - 1);
  textarea.value = textarea.value.substring(0, prevLineStart) + curLine + '\n' + prevLine + textarea.value.substring(lineEnd);
  textarea.selectionStart = prevLineStart;
  textarea.selectionEnd = prevLineStart + curLine.length;
  updateCodeEditor();
}

function moveLineDown(textarea) {
  var lineStart = textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  var lineEnd = textarea.value.indexOf('\n', textarea.selectionEnd);
  if (lineEnd < 0) lineEnd = textarea.value.length;
  var nextLineStart = lineEnd + 1;
  var nextLineEnd = textarea.value.indexOf('\n', nextLineStart);
  if (nextLineEnd < 0) nextLineEnd = textarea.value.length;
  if (nextLineStart > textarea.value.length) return; // already last line
  var curLine = textarea.value.substring(lineStart, lineEnd);
  var nextLine = textarea.value.substring(nextLineStart, nextLineEnd);
  textarea.value = textarea.value.substring(0, lineStart) + nextLine + '\n' + curLine + textarea.value.substring(nextLineEnd);
  textarea.selectionStart = lineStart + nextLine.length + 1;
  textarea.selectionEnd = lineStart + nextLine.length + 1 + curLine.length;
  updateCodeEditor();
}

function toggleComment(textarea) {
  var lineStart = textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  var lineEnd = textarea.value.indexOf('\n', textarea.selectionEnd);
  if (lineEnd < 0) lineEnd = textarea.value.length;
  var lineText = textarea.value.substring(lineStart, lineEnd).trimStart();
  if (lineText.indexOf('<!--') === 0) {
    // Remove comment
    var newLine = textarea.value.substring(lineStart, lineEnd)
      .replace(/<!--\s?/, '').replace(/\s?-->/, '');
    textarea.value = textarea.value.substring(0, lineStart) + newLine + textarea.value.substring(lineEnd);
  } else {
    // Add comment
    var newLine2 = '<!-- ' + textarea.value.substring(lineStart, lineEnd).trim() + ' -->';
    textarea.value = textarea.value.substring(0, lineStart) + newLine2 + textarea.value.substring(lineEnd);
  }
  updateCodeEditor();
}

// ─── Smart Indent ─────────────────────────────────────────────────
function handleEnterIndent(textarea, e) {
  e.preventDefault();
  var start = textarea.selectionStart;
  var end = textarea.selectionEnd;

  // Get current line's indentation
  var lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
  var lineText = textarea.value.substring(lineStart, start);
  var indent = '';
  for (var i = 0; i < lineText.length; i++) {
    if (lineText[i] === ' ' || lineText[i] === '\t') indent += lineText[i];
    else break;
  }

  // Check if we're after an opening tag → increase indent
  var trimmedBefore = lineText.trim();
  var extraIndent = '';
  if (trimmedBefore.match(/<[\w][^/]*>$/) && !trimmedBefore.match(/<\/[\w]+>$/) && !trimmedBefore.endsWith('/>')) {
    extraIndent = '  ';
  }

  var newline = '\n' + indent + extraIndent;
  textarea.value = textarea.value.substring(0, start) + newline + textarea.value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + newline.length;
  updateCodeEditor();
}

// ─── Format XML ───────────────────────────────────────────────────
export function formatXML() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  var xml = textarea.value;
  if (!xml || xml.indexOf('<') < 0) return;
  var formatted = '', indent = 0;
  xml.replace(/>\s*</g, '>\n<').split('\n').forEach(function (line) {
    line = line.trim();
    if (!line) return;
    if (line.indexOf('</') === 0 && indent > 0) indent--;
    formatted += '  '.repeat(indent) + line + '\n';
    if (line.indexOf('<') === 0 && line.indexOf('</') !== 0 && line.indexOf('/>') < 0 && line.indexOf('<?') < 0 && line.indexOf('<!--') < 0) indent++;
  });
  textarea.value = formatted.trim();
  updateCodeEditor();
}

// ─── Setup ────────────────────────────────────────────────────────
export function setupCodeEditor() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;

  var codeBody = textarea.parentElement;
  var codeEditor = codeBody ? codeBody.closest('.code-editor') || codeBody.parentElement : null;

  // Create autocomplete dropdown (inside code-body so it scrolls with content)
  var acDropdown = document.createElement('div');
  acDropdown.id = 'codeAutocomplete';
  acDropdown.className = 'code-autocomplete';
  acDropdown.style.display = 'none';
  if (codeBody) codeBody.appendChild(acDropdown);

  // Create find bar
  createFindBar(textarea);

  // Create minimap (on code-editor so it doesn't scroll)
  var minimap = document.createElement('div');
  minimap.id = 'codeMinimap';
  minimap.className = 'code-minimap';
  if (codeEditor) codeEditor.appendChild(minimap);

  // Create line highlight (inside code-body so it scrolls with content)
  var lineHighlight = document.createElement('div');
  lineHighlight.id = 'codeLineHighlight';
  lineHighlight.className = 'code-line-highlight';
  if (codeBody) codeBody.appendChild(lineHighlight);

  // Create error overlay
  var errOverlay = document.createElement('div');
  errOverlay.id = 'codeErrors';
  errOverlay.className = 'code-errors';
  if (codeBody) codeBody.appendChild(errOverlay);

  textarea.addEventListener('keydown', function (e) {
    // Ctrl+F: Find
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      openFindReplace();
      return;
    }
    // Ctrl+G: Go to line
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      goToLine();
      return;
    }
    // Ctrl+/: Toggle comment
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      toggleComment(this);
      return;
    }
    // Ctrl+Shift+D: Duplicate line
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      duplicateLine(this);
      return;
    }
    // Alt+Up/Down: Move line
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); moveLineUp(this); return; }
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); moveLineDown(this); return; }

    // Escape: close autocomplete or find
    if (e.key === 'Escape') {
      if (_acVisible) { e.preventDefault(); hideAutocomplete(); return; }
      if (document.getElementById('codeFindBar').style.display !== 'none') {
        e.preventDefault(); closeFindReplace(); return;
      }
    }

    // Autocomplete navigation
    if (_acVisible && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      if (e.key === 'ArrowDown') _acIndex = (_acIndex + 1) % _acItems.length;
      else _acIndex = (_acIndex - 1 + _acItems.length) % _acItems.length;
      var dropdown = document.getElementById('codeAutocomplete');
      renderAutocompleteDropdown(this, dropdown);
      return;
    }
    // Accept autocomplete
    if (_acVisible && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      acceptAutocomplete(this);
      return;
    }
    // Accept autocomplete with space (for tags)
    if (_acVisible && e.key === ' ') {
      if (acceptAutocomplete(this)) {
        e.preventDefault();
        return;
      }
    }

    // Tab / Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      if (e.shiftKey) {
        var lineStart2 = this.value.lastIndexOf('\n', start - 1) + 1;
        if (this.value.substring(lineStart2).indexOf('  ') === 0) {
          this.value = this.value.substring(0, lineStart2) + this.value.substring(lineStart2 + 2);
          this.selectionStart = this.selectionEnd = Math.max(lineStart2, start - 2);
        }
      } else {
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(this.selectionEnd);
        this.selectionStart = this.selectionEnd = start + 2;
      }
      updateCodeEditor();
      return;
    }

    // Enter: smart indent
    if (e.key === 'Enter') {
      handleEnterIndent(this, e);
      return;
    }

    // Auto-close: <
    if (e.key === '<') {
      handleAutoClose(this, e);
      return;
    }
  });

  textarea.addEventListener('input', function () {
    updateCodeEditor();
    showErrorSquiggles(this);

    // Autocomplete on typing
    var ctx = getAutocompleteContext(this);
    if (ctx && (ctx.type === 'tag' && ctx.query.length >= 1 || ctx.type === 'attr' && ctx.query.length >= 1 || ctx.type === 'value' && ctx.query.length >= 0)) {
      showAutocomplete(this, ctx);
    } else {
      hideAutocomplete();
    }
  });

  textarea.addEventListener('click', function () {
    updateCurrentLineHighlight(this);
    hideAutocomplete();
  });

  textarea.addEventListener('scroll', function () {
    var highlight = document.getElementById('codeHighlight');
    var gutter = document.getElementById('codeGutter');
    var lineHighlight = document.getElementById('codeLineHighlight');
    var minimap = document.getElementById('codeMinimap');
    if (highlight) highlight.style.transform = 'translate(' + (-this.scrollLeft) + 'px,' + (-this.scrollTop) + 'px)';
    if (gutter) gutter.style.transform = 'translateY(' + (-this.scrollTop) + 'px)';
    if (lineHighlight) lineHighlight.style.transform = 'translateY(' + (-this.scrollTop) + 'px)';
    updateMinimap(this);
  });

  // Autocomplete click
  acDropdown.addEventListener('click', function (e) {
    var item = e.target.closest('.code-ac-item');
    if (!item) return;
    _acIndex = parseInt(item.dataset.acIdx, 10);
    acceptAutocomplete(textarea);
  });

  // Find bar events
  setupFindBarEvents(textarea);

  // Initial render
  updateCodeEditor();
}

// ─── Find Bar ─────────────────────────────────────────────────────
function createFindBar(textarea) {
  var bar = document.createElement('div');
  bar.id = 'codeFindBar';
  bar.className = 'code-find-bar';
  bar.style.display = 'none';
  bar.innerHTML =
    '<div class="code-find-row">' +
    '<input type="text" id="codeFindInput" placeholder="查找..." class="code-find-input">' +
    '<span id="codeFindCount" class="code-find-count"></span>' +
    '<button class="code-find-btn" id="codeFindPrev" title="上一个">▲</button>' +
    '<button class="code-find-btn" id="codeFindNext" title="下一个">▼</button>' +
    '<button class="code-find-btn" id="codeFindReplaceToggle" title="替换">⇄</button>' +
    '<button class="code-find-btn" id="codeFindClose" title="关闭">✕</button>' +
    '</div>' +
    '<div class="code-replace-row" id="codeReplaceRow" style="display:none">' +
    '<input type="text" id="codeReplaceInput" placeholder="替换为..." class="code-find-input">' +
    '<button class="code-find-btn" id="codeReplaceOne" title="替换当前">替换</button>' +
    '<button class="code-find-btn" id="codeReplaceAll" title="全部替换">全部</button>' +
    '</div>';

  var codeEditor = textarea.closest('.code-editor') || textarea.parentElement;
  if (codeEditor) codeEditor.insertBefore(bar, codeEditor.firstChild);
}

function setupFindBarEvents(textarea) {
  var findInput = document.getElementById('codeFindInput');
  var replaceToggle = document.getElementById('codeFindReplaceToggle');

  if (findInput) {
    findInput.addEventListener('input', function () {
      doFind(textarea, this.value);
    });
    findInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) findPrev(); else findNext(); }
      if (e.key === 'Escape') { e.preventDefault(); closeFindReplace(); }
    });
  }

  var findPrevBtn = document.getElementById('codeFindPrev');
  var findNextBtn = document.getElementById('codeFindNext');
  var findCloseBtn = document.getElementById('codeFindClose');
  var replaceOneBtn = document.getElementById('codeReplaceOne');
  var replaceAllBtn = document.getElementById('codeReplaceAll');

  if (findPrevBtn) findPrevBtn.addEventListener('click', function () { findPrev(); });
  if (findNextBtn) findNextBtn.addEventListener('click', function () { findNext(); });
  if (findCloseBtn) findCloseBtn.addEventListener('click', function () { closeFindReplace(); });
  if (replaceOneBtn) replaceOneBtn.addEventListener('click', function () { doReplace(textarea); });
  if (replaceAllBtn) replaceAllBtn.addEventListener('click', function () { doReplaceAll(textarea); });
  if (replaceToggle) {
    replaceToggle.addEventListener('click', function () {
      var row = document.getElementById('codeReplaceRow');
      if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
    });
  }
}
