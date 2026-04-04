#!/usr/bin/env node
// ─── build.js: 把所有 JS + CSS + HTML 拼入一个文件，供 Android WebView 使用 ───

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const JS_FILES = [
  'js/store.js',
  'js/devices.js',
  'js/maml.js',
  'js/templates.js',
  'js/preview.js',
  'js/editor.js',
  'js/export.js',
  'js/ui.js',
  'js/app.js',
];

// Read all JS
const js = JS_FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

// Read CSS
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');

// Read JSZip
const jszip = fs.readFileSync(path.join(ROOT, 'lib', 'jszip.min.js'), 'utf8');

// Build single HTML (mirrors index.html)
const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Janus 卡片制作器</title>
<meta name="description" content="为小米背屏（SubScreen）制作 MAML 卡片模板的免费在线工具。">
<meta property="og:title" content="Janus 卡片制作器">
<meta property="og:description" content="为小米背屏制作 MAML 卡片模板的免费在线工具">
<script>try{var t=localStorage.getItem('jcm-theme');if(t){document.documentElement.setAttribute('data-theme',t);window.__themeBtn=t==='dark'?'🌙':'☀️'}}catch(e){}</script>
<style>${css}</style>
</head>
<body>

<input type="file" id="fileImagePick" accept="image/*" style="display:none">
<input type="file" id="fileVideoPick" accept="video/*" style="display:none">

<div class="app">
  <div class="topbar">
    <div class="topbar-left">
      <h1><span>🃏</span> Janus 卡片制作器</h1>
      <span class="badge">MAML</span>
      <button class="theme-toggle" id="themeToggle" onclick="JCM.toggleTheme()" title="切换主题">🌙</button>
      <button class="theme-toggle" id="helpBtn" onclick="JCM.toggleHelp()" title="快捷键帮助">⌨️</button>
      <a class="theme-toggle" href="https://github.com/guocheng1378/janus-card-maker" target="_blank" title="GitHub">⭐</a>
    </div>
    <div class="steps" id="stepIndicator">
      <div class="step-tab active" data-step="0" onclick="JCM.goStep(0)">
        <span class="step-num">1</span>
        <span class="step-label">选择模板</span>
      </div>
      <div class="step-tab" data-step="1" onclick="JCM.goStep(1)">
        <span class="step-num">2</span>
        <span class="step-label">配置参数</span>
      </div>
      <div class="step-tab" data-step="2" onclick="JCM.goStep(2)">
        <span class="step-num">3</span>
        <span class="step-label">预览导出</span>
      </div>
      <div class="step-slider" id="stepSlider"></div>
    </div>
  </div>

  <div class="content">
    <div class="page page-tpl active" id="page0">
      <div class="page-title">选择卡片模板</div>
      <div class="page-subtitle">从预设模板开始，或选择自定义从零创建</div>
      <div class="tpl-grid" id="tplGrid"></div>
    </div>

    <div class="page page-config" id="page1">
      <div class="config-header">
        <span class="tpl-icon" id="cfgIcon"></span>
        <div>
          <h2 id="cfgTitle">配置</h2>
          <p id="cfgDesc">调整参数以自定义卡片</p>
        </div>
      </div>
      <div id="cfgContent"></div>
    </div>

    <div class="page page-preview" id="page2">
      <div class="device-row">
        <label>机型</label>
        <select id="deviceSelect">
          <option value="q200">Pro — 904×572</option>
          <option value="p2">Pro Max — 976×596</option>
          <option value="q100">标准版 — 840×520</option>
          <option value="ultra">Ultra — 1020×620</option>
        </select>
        <label class="check-label">
          <input type="checkbox" id="showCamera" checked> 摄像头遮挡区
        </label>
      </div>
      <div class="preview-layout">
        <div class="preview-phone-wrap">
          <div class="preview-phone">
            <div class="preview-screen">
              <div class="preview-camera" id="previewCamera"></div>
              <div class="preview-content" id="previewContent">
                <div class="preview-placeholder">
                  <span>📱</span>
                  <p>点击下方「生成预览」查看效果</p>
                </div>
              </div>
            </div>
          </div>
          <div class="preview-device-label" id="deviceLabel">Pro — 904 × 572</div>
        </div>
        <div class="preview-side">
          <h3>📄 MAML XML</h3>
          <div class="xml-preview"><pre id="codeContent">选择模板并配置后，点击「生成预览」查看 XML</pre></div>
          <div class="preview-actions">
            <button class="btn btn-secondary" onclick="JCM.renderPreview()"><span class="btn-icon">🔄</span> 生成预览</button>
            <button class="btn btn-export" onclick="JCM.handleExport()"><span class="btn-icon">📦</span> 导出 ZIP</button>
            <button class="btn btn-secondary" onclick="JCM.handleExportPNG()"><span class="btn-icon">🖼</span> 导出 PNG</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="bottombar">
    <div class="bottombar-left">
      <button class="btn btn-back" id="btnBack" onclick="JCM.prevStep()" style="display:none">
        <span class="btn-icon">←</span> 上一步
      </button>
    </div>
    <div class="bottombar-right">
      <button class="btn btn-primary" id="btnNext" onclick="JCM.nextStep()">
        下一步 <span class="btn-icon">→</span>
      </button>
    </div>
  </div>
</div>

<!-- Keyboard Shortcut Help Modal -->
<div class="modal-overlay" id="helpModal" style="display:none" onclick="JCM.toggleHelp()">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>⌨️ 快捷键</h3>
      <button class="modal-close" onclick="JCM.toggleHelp()">✕</button>
    </div>
    <div class="modal-body">
      <div class="shortcut-list">
        <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>Z</kbd><span>撤销</span></div>
        <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>Y</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><span>重做</span></div>
        <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>D</kbd><span>复制当前元素</span></div>
        <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>C</kbd><span>复制到剪贴板</span></div>
        <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>V</kbd><span>从剪贴板粘贴</span></div>
        <div class="shortcut-item"><kbd>Delete</kbd><span>删除当前元素</span></div>
      </div>
      <div class="shortcut-tip">在预览区可直接拖拽移动元素，拖拽右下角调整大小</div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>${jszip}</script>
<script>${js}</script>
</body>
</html>`;

const outDir = path.join(ROOT, 'app', 'src', 'main', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('✅ Built: ' + path.join(outDir, 'index.html') + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
