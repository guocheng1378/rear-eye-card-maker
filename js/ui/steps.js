// ─── Steps: 步骤导航 ──────────────────────────────────────────────
import * as S from '../state.js';
import { toast } from './toast.js';

var _step = 0;
var _previewTimer = null;
var _stepTransitioning = false;

export function getStep() { return _step; }

export function moveStepSlider(n) {
  var slider = document.getElementById('stepSlider');
  var indicator = document.getElementById('stepIndicator');
  var tabs = indicator ? indicator.querySelectorAll('.step-tab') : [];
  if (!slider || !tabs[n]) return;
  var tab = tabs[n];
  var iRect = indicator.getBoundingClientRect();
  var tRect = tab.getBoundingClientRect();
  slider.style.left = (tRect.left - iRect.left) + 'px';
  slider.style.width = tRect.width + 'px';
}

export function goStep(n, callbacks) {
  if (_stepTransitioning) return; // prevent rapid clicking
  _stepTransitioning = true;
  setTimeout(function() { _stepTransitioning = false; }, 300);
  
  if (n === 1 && !S.tpl) return toast('请先选择一个模板', 'error');
  if (n === 2 && !S.tpl) return toast('请先选择模板并配置', 'error');
  _step = n;
  S.setStep(n);

  document.querySelectorAll('.page').forEach(function (p, i) { p.classList.toggle('active', i === n); });
  document.querySelectorAll('.step-tab').forEach(function (tab) {
    var s = Number(tab.dataset.step);
    tab.classList.remove('active', 'done');
    if (s === n) tab.classList.add('active');
    else if (s < n) tab.classList.add('done');
  });
  moveStepSlider(n);

  // Update step progress bar
  var fill = document.getElementById('stepProgressFill');
  if (fill) fill.style.width = ((n + 1) / 3 * 100) + '%';

  document.getElementById('btnBack').style.display = n > 0 ? '' : 'none';
  var btnNext = document.getElementById('btnNext');
  if (n === 2) { btnNext.style.display = 'none'; }
  else {
    btnNext.style.display = '';
    btnNext.innerHTML = n === 0 ? '下一步 <span class="btn-icon">→</span>' : '预览 & 导出 <span class="btn-icon">→</span>';
  }

  if (n === 1) { 
    // Hide preview panel on mobile
    var clr = document.querySelector('.config-live-right');
    if (clr) clr.style.display = window.innerWidth <= 900 ? 'none' : '';
    callbacks.renderConfig(); syncDeviceSelect('toCfg'); callbacks.renderLivePreview(); 
  }
  if (n === 2) { 
    syncDeviceSelect('toPreview'); 
    callbacks.renderPreview(); 
    // Auto-scroll to show preview
    var previewEl = document.getElementById('previewContent');
    if (previewEl) previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (n !== 2) cleanupVideos('previewContent');
  if (n !== 1) cleanupVideos('cfgPreviewContent');

  clearInterval(_previewTimer);
  if (n >= 1 && S.tpl && (S.tpl.updater === 'DateTime.Minute' || S.tpl.updater === 'DateTime.Day')) {
    _previewTimer = setInterval(function () {
      if (_step === 1) callbacks.renderLivePreview();
      if (_step === 2) callbacks.renderPreview();
    }, 1000);
  }
}

export function syncDeviceSelect(dir) {
  var devSel = document.getElementById('deviceSelect');
  var cfgDevSel = document.getElementById('cfgDeviceSelect');
  var showCam = document.getElementById('showCamera');
  var cfgShowCam = document.getElementById('cfgShowCamera');
  if (dir === 'toCfg' && devSel && cfgDevSel) {
    cfgDevSel.value = devSel.value;
    if (showCam && cfgShowCam) cfgShowCam.checked = showCam.checked;
  }
  if (dir === 'toPreview' && cfgDevSel && devSel) {
    devSel.value = cfgDevSel.value;
    if (cfgShowCam && showCam) showCam.checked = cfgShowCam.checked;
  }
}

function cleanupVideos(containerId) {
  var el = document.getElementById(containerId);
  if (el) el.querySelectorAll('video').forEach(function (v) { v.pause(); v.src = ''; });
}
// Cleanup timer on page unload
window.addEventListener('beforeunload', function() {
  clearInterval(_previewTimer);
});
