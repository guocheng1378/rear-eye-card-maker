// ─── Code Editor: XML 代码编辑器 ──────────────────────────────────

export function highlightXML(code) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>')
    .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="tag">$2</span>')
    .replace(/([\w:.-]+)(=)(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span class="attr-name">$1</span>$2<span class="attr-val">$3</span>')
    .replace(/(&lt;|&gt;|\/&gt;)/g, '<span class="bracket">$1</span>');
}

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
}

export function setupCodeEditor() {
  var textarea = document.getElementById('codeContent');
  if (!textarea) return;
  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      if (e.shiftKey) {
        var lineStart = this.value.lastIndexOf('\n', start - 1) + 1;
        if (this.value.substring(lineStart).indexOf('  ') === 0) {
          this.value = this.value.substring(0, lineStart) + this.value.substring(lineStart + 2);
          this.selectionStart = this.selectionEnd = Math.max(lineStart, start - 2);
        }
      } else {
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(this.selectionEnd);
        this.selectionStart = this.selectionEnd = start + 2;
      }
      updateCodeEditor();
    }
  });
  textarea.addEventListener('input', updateCodeEditor);
  textarea.addEventListener('scroll', function () {
    var highlight = document.getElementById('codeHighlight');
    var gutter = document.getElementById('codeGutter');
    if (highlight) highlight.style.transform = 'translate(' + (-this.scrollLeft) + 'px,' + (-this.scrollTop) + 'px)';
    if (gutter) gutter.style.transform = 'translateY(' + (-this.scrollTop) + 'px)';
  });
}

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
