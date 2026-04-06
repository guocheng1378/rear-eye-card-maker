#!/usr/bin/env node
// ─── build.js: 读取 index.html，将外部 CSS/JS 引用替换为内联，供 Android WebView 使用 ───

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Read all JS files
const JS_FILES = [
  'js/store.js',
  'js/devices.js',
  'js/maml.js',
  'js/templates.js',
  'js/preview.js',
  'js/editor.js',
  'js/export.js',
  'js/transcode.js',
  'js/ui.js',
  'js/app.js',
];
const js = JS_FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

// Read CSS
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');

// Read JSZip
const jszip = fs.readFileSync(path.join(ROOT, 'lib', 'jszip.min.js'), 'utf8');

// Read index.html and inline everything
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Replace <link rel="stylesheet" href="css/style.css"> with inline <style>
html = html.replace(
  /<link\s+rel="stylesheet"\s+href="css\/style\.css">/,
  '<style>' + css + '</style>'
);

// Replace <link rel="manifest" href="manifest.json"> — remove for APK
html = html.replace(
  /<link\s+rel="manifest"\s+href="manifest\.json">\s*\n?/,
  ''
);

// Remove PWA meta tags (not needed for APK)
html = html.replace(
  /<meta\s+name="theme-color"[^>]*>\s*\n?/,
  ''
);

// Remove external script tags and replace with inline
html = html.replace(
  /<script\s+src="js\/[^"]+"><\/script>\s*\n?/g,
  ''
);
html = html.replace(
  /<script\s+src="lib\/jszip\.min\.js"><\/script>\s*\n?/,
  ''
);

// Remove SW registration from inlined JS
let jsFinal = js.replace(
  /\/\/\s*.*Service Worker[\s\S]*?if\s*\(\s*'serviceWorker'[\s\S]*?\}\s*\)\s*;?\s*/,
  '// SW removed for APK build\n'
);

// Insert inline scripts before </body>
const inlineScripts = [
  '<!-- Inlined by build.js -->',
  '<script>' + jszip + '<\/script>',
  '<script>' + jsFinal + '<\/script>',
].join('\n');
html = html.replace('</body>', inlineScripts + '\n</body>');

// Remove empty lines left by removals
html = html.replace(/\n{3,}/g, '\n\n');

// Write output
const outDir = path.join(ROOT, 'app', 'src', 'main', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('✅ Built: ' + path.join(outDir, 'index.html') + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
