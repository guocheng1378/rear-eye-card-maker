#!/usr/bin/env node
// ─── build.js: 将 CSS/JS 内联到单个 HTML，供 Android WebView 使用 ───
// v4: 补全所有模块和模板

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 依赖顺序（从无依赖的模块开始）
const JS_FILES = [
  'js/utils.js',           // 无依赖
  'js/state.js',           // 无依赖
  'js/devices.js',         // 无依赖
  'js/maml.js',            // 无依赖（escXml 内联）
  // Templates
  'js/templates/clock.js',
  'js/templates/quote.js',
  'js/templates/battery.js',
  'js/templates/countdown.js',
  'js/templates/gradient.js',
  'js/templates/steps.js',
  'js/templates/calendar.js',
  'js/templates/dualclock.js',
  'js/templates/dailyquote.js',
  'js/templates/ring.js',
  'js/templates/dashboard.js',
  'js/templates/image.js',
  'js/templates/custom.js',
  'js/templates/weather_real.js',
  'js/templates/music_real.js',
  'js/templates/lyrics.js',
  'js/templates/video_wallpaper.js',
  'js/templates/health.js',
  'js/templates/schedule.js',
  'js/templates/notification.js',
  'js/templates/carousel.js',
  'js/templates/quick_settings.js',
  'js/templates/torch.js',
  'js/templates/screen_time.js',
  'js/templates/storage.js',
  'js/templates/signal.js',
  'js/templates/water.js',
  'js/templates/stopwatch.js',
  'js/templates/world_clock3.js',
  'js/templates/todo.js',
  // 新增模板 end
  'js/templates/lunar.js',
  'js/templates/pomodoro.js',
  'js/templates/analog_clock.js',
  'js/templates/counter.js',
  'js/templates/photo_calendar.js',
  'js/templates/quote_carousel.js',
  'js/templates/multi_countdown.js',
  'js/templates/hitokoto.js',
  'js/templates/news.js',
  'js/templates/exchange_rate.js',
  'js/templates/bilibili.js',
  'js/templates/dice.js',
  'js/templates/flip_clock.js',
  'js/templates/breathing.js',
  'js/templates/pixel_clock.js',
  'js/templates/index.js',  // 汇总所有模板
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
  // UI 子模块
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
  'js/ui/binding-wizard.js',
  'js/ui/command-palette.js',
  'js/ui/linter-tools.js',
  'js/ui/version-snapshots.js',
  'js/ui/export-adb.js',
  'js/ui/snippets.js',
  'js/ui/batch-ops.js',
  'js/ui/dev-tools.js',
  'js/ui/index.js',         // UI 入口（依赖所有上面的）
  'js/main.js',             // 应用入口
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
