// ─── Code Editor: XML 代码编辑器 ──────────────────────────────────

export function highlightXML(code) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-comment">$1</span>')
    .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="xml-tag">$2</span>')
    .replace(/([\w:.-]+)(=)(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span class="xml-attr">$1</span>$2<span class="xml-val">$3</span>')
    .replace(/(&lt;|&gt;|\/&gt;)/g, '<span class="xml-bracket">$1</span>');
}

export function updateCodeEditor() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  
  // Size guard
  if (textarea.value.length > 500000) {
    textarea.value = textarea.value.substring(0, 500000) + '\n<!-- Truncated -->';
  }
  
  var gutter = document.getElementById('codeGutter');
  var highlight = document.getElementById('codeHighlight');
  if (!gutter || !highlight) return;
  
  var lines = textarea.value.split('\n');
  var lineCount = lines.length;
  
  // Gutter
  var gutterHtml = '';
  var gutterWidth = lineCount > 999 ? 52 : lineCount > 99 ? 44 : 36;
  gutter.style.width = gutterWidth + 'px';
  for (var i = 1; i <= lineCount; i++) gutterHtml += '<span>' + i + '</span>';
  gutter.innerHTML = gutterHtml;
  
  // Syntax highlight
  highlight.innerHTML = highlightXML(textarea.value) + '\n';
  highlight.style.paddingLeft = (gutterWidth + 8) + 'px';
  
  // Sync scroll
  syncEditorScroll();
}

function syncEditorScroll() {
  var textarea = document.getElementById('codeContent');
  var highlight = document.getElementById('codeHighlight');
  var gutter = document.getElementById('codeGutter');
  if (!textarea || !highlight || !gutter) return;
  highlight.style.transform = 'translate(' + (-textarea.scrollLeft) + 'px,' + (-textarea.scrollTop) + 'px)';
  gutter.style.transform = 'translateY(' + (-textarea.scrollTop) + 'px)';
}

export function setupCodeEditor() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  
  // Tab / Shift+Tab indent
  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      
      if (e.shiftKey) {
        // Outdent: remove 2 spaces from line start
        var lineStart = this.value.lastIndexOf('\n', start - 1) + 1;
        if (this.value.substring(lineStart).indexOf('  ') === 0) {
          this.value = this.value.substring(0, lineStart) + this.value.substring(lineStart + 2);
          this.selectionStart = this.selectionEnd = Math.max(lineStart, start - 2);
        }
      } else {
        // Indent: insert 2 spaces
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
      }
      updateCodeEditor();
      return;
    }
    
    // Enter: auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      var pos = this.selectionStart;
      var val = this.value;
      var lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      var currentLine = val.substring(lineStart, pos);
      var indent = currentLine.match(/^(\s*)/)[1];
      
      // Increase indent after opening tag
      var beforeCursor = val.substring(lineStart, pos).trimEnd();
      var extra = '';
      if (beforeCursor.match(/<[^/!][^>]*[^/]>\s*$/) && !beforeCursor.match(/<[^>]*\/>$/)) {
        extra = '  ';
      }
      // Decrease indent if cursor is after closing tag
      if (beforeCursor.match(/<\/[^>]+>\s*$/)) {
        indent = indent.length >= 2 ? indent.substring(2) : '';
      }
      
      var insertion = '\n' + indent + extra;
      this.value = val.substring(0, pos) + insertion + val.substring(pos);
      this.selectionStart = this.selectionEnd = pos + insertion.length;
      updateCodeEditor();
      return;
    }
    
    // Ctrl+D: duplicate line
    if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      var pos = this.selectionStart;
      var val = this.value;
      var lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      var lineEnd = val.indexOf('\n', pos);
      if (lineEnd < 0) lineEnd = val.length;
      var line = val.substring(lineStart, lineEnd);
      this.value = val.substring(0, lineEnd) + '\n' + line + val.substring(lineEnd);
      this.selectionStart = this.selectionEnd = pos + line.length + 1;
      updateCodeEditor();
      return;
    }
    
    // Ctrl+/: toggle comment
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      var pos = this.selectionStart;
      var val = this.value;
      var lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      var lineEnd = val.indexOf('\n', pos);
      if (lineEnd < 0) lineEnd = val.length;
      var line = val.substring(lineStart, lineEnd);
      
      if (line.trimStart().startsWith('<!--')) {
        // Uncomment
        var newLine = line.replace(/<!--\s?/, '').replace(/\s?-->$/, '');
        this.value = val.substring(0, lineStart) + newLine + val.substring(lineEnd);
      } else {
        // Comment
        this.value = val.substring(0, lineStart) + '<!-- ' + line + ' -->' + val.substring(lineEnd);
      }
      this.selectionStart = this.selectionEnd = pos;
      updateCodeEditor();
      return;
    }
    
    // Ctrl+F: find (delegated to global handler)
    // Already handled by browser default
  });
  
  textarea.addEventListener('input', updateCodeEditor);
  textarea.addEventListener('scroll', syncEditorScroll);
  
  // Initial render
  updateCodeEditor();
}

export function formatXML() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  var xml = textarea.value;
  if (!xml || xml.indexOf('<') < 0) return;
  
  var formatted = '', indent = 0;
  var lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  
  lines.forEach(function (line) {
    line = line.trim();
    if (!line) return;
    
    // Decrease indent for closing tags
    if (line.indexOf('</') === 0 && indent > 0) indent--;
    
    formatted += '  '.repeat(indent) + line + '\n';
    
    // Increase indent for opening tags (not self-closing, not comments, not doctype)
    if (line.indexOf('<') === 0 && 
        line.indexOf('</') !== 0 && 
        line.indexOf('/>') < 0 && 
        line.indexOf('<?') < 0 && 
        line.indexOf('<!--') !== 0) {
      indent++;
    }
  });
  
  textarea.value = formatted.trim();
  updateCodeEditor();
}
