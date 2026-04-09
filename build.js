#!/usr/bin/env node
// ─── build.js: 将 CSS/JS 内联到单个 HTML，供 Android WebView 使用 ───
// v4: 补全所有模块和模板

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 依赖顺序（从无依赖的模块开始）
const JS_FILES = [
  'js/utils.js',
  'js/state.js',
  'js/devices.js',
  'js/maml.js',
  // Templates
  'js/templates/custom.js',
  'js/templates/animated_clock.js',
  'js/templates/slide_unlock.js',
  'js/templates/smart_battery.js',
  'js/templates/action_buttons.js',
  'js/templates/number_clock.js',
  'js/templates/weather_cp.js',
  'js/templates/persistent_counter.js',
  'js/templates/breathing_light.js',
  'js/templates/brightness_slider.js',
  'js/templates/date_beauty.js',
  'js/templates/dual_clock.js',
  'js/templates/fitness_ring.js',
  'js/templates/music_player.js',
  'js/templates/photo_frame.js',
  'js/templates/pomodoro.js',
  'js/templates/quick_clock.js',
  'js/templates/daily_quote.js',
  'js/templates/mini_status.js',
  'js/templates/quick_note.js',
  'js/templates/usage.js',
  'js/templates/index.js',
  // Core
  'js/live-preview.js',
  'js/history.js',
  'js/canvas.js',
  'js/card-library.js',
  'js/storage.js',
  'js/export.js',
  'js/transcode.js',
  'js/changelog.js',
  'js/i18n.js',
  // UI
  'js/ui/toast.js',
  'js/ui/steps.js',
  'js/ui/code-editor.js',
  'js/ui/elements.js',
  'js/ui/editors/common.js',
  'js/ui/editors/text-editor.js',
  'js/ui/editors/shape-editor.js',
  'js/ui/editors/media-editor.js',
  'js/ui/editors/container-editor.js',
  'js/ui/editors/index.js',
  'js/ui/config-panel.js',
  'js/ui/share.js',
  'js/ui/qr-share.js',
  'js/ui/card-library-ui.js',
  'js/ui/template-market.js',
  'js/ui/design-tools.js',
  'js/ui/layer-panel.js',
  'js/ui/ruler.js',
  'js/ui/eyedropper.js',
  'js/ui/gist-backup.js',
  'js/ui/binding-wizard.js',
  'js/ui/command-palette.js',
  'js/ui/linter-tools.js',
  'js/ui/version-snapshots.js',
  'js/ui/export-adb.js',
  'js/ui/snippets.js',
  'js/ui/batch-ops.js',
  'js/ui/dev-tools.js',
  'js/ui/index.js',
  'js/main.js',
];

// 读取并转换模块文件
function stripModules(code, filename) {
  // 移除 import 语句（值已通过拼接顺序保证）
  code = code.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  code = code.replace(/^import\s+\{[^}]*\}\s+from\s+['"].*?['"];?\s*$/gm, '');
  // 将 export default 转为变量赋值（使用文件名作为变量名）
  var basename = filename ? filename.replace(/\.js$/, '').replace(/.*\//, '') : '_default';
  code = code.replace(/^export\s+default\s+/gm, 'var ' + basename + ' = ');
  // 将 export function/class/const/var/let 转为普通声明
  code = code.replace(/^export\s+(function|class|const|var|let)\s+/gm, '$1 ');
  // 将 export { ... } 移除
  code = code.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
  return code;
}

// 读取所有 JS
const jsParts = JS_FILES.map(f => {
  const fullPath = path.join(ROOT, f);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Missing: ${f}`);
    return `// --- MISSING: ${f} ---`;
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  return `// ─── ${f} ───\n${stripModules(raw, f)}`;
});

const js = jsParts.join('\n');

// Read CSS
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');

// Read JSZip
const jszip = fs.readFileSync(path.join(ROOT, 'lib', 'jszip.min.js'), 'utf8');

// Read index.html and inline everything
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Replace <link rel="stylesheet" href="css/style.css..."> with inline <style>
html = html.replace(
  /<link\s+rel="stylesheet"\s+href="css\/style\.css(\?v=\w+)?"\s*>/,
  '<style>' + css + '</style>'
);

// Remove manifest and PWA meta (not needed for APK)
html = html.replace(/<link\s+rel="manifest"[^>]*>\s*\n?/, '');
html = html.replace(/<meta\s+name="theme-color"[^>]*>\s*\n?/, '');

// Remove script tags from original HTML (keep only early-init + remove module scripts)
let scriptCount = 0;
html = html.replace(/<script[\s\S]*?<\/script>/g, function (match) {
  scriptCount++;
  return scriptCount <= 1 ? match : '';
});
// Also remove <script type="module" ...> self-closing tags
html = html.replace(/<script\s+type="module"\s+src="[^"]*"\s*><\/script>\s*\n?/g, '');
// Also remove empty <!-- Non-module libs --> comments
html = html.replace(/<!--\s*Non-module[^>]*-->\s*\n?/g, '');

// Insert inline scripts before </body>
const inlineScripts = [
  '<!-- Inlined by build.js v4 -->',
  '<script>' + jszip + '<\/script>',
  '<script>window.JCM = window.JCM || {};<\/script>',
  '<script>' + js + '<\/script>',
].join('\n');
html = html.replace('</body>', inlineScripts + '\n</body>');

// Clean up empty lines
html = html.replace(/\n{3,}/g, '\n\n');

// Write output
const outDir = path.join(ROOT, 'app', 'src', 'main', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('✅ Built: ' + path.join(outDir, 'index.html') + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
