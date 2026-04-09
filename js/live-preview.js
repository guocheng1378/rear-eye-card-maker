// ─── Live Preview: 配置页实时预览 ──────────────────────────────────
import { escHtml } from './utils.js';
import { getDevice } from './devices.js';

var PREVIEW_W = 420;

function PreviewRenderer(device, showCamera) {
  this.device = device;
  this.scale = PREVIEW_W / device.width;
  this.camW = showCamera ? PREVIEW_W * device.cameraZoneRatio : 0;
}

PreviewRenderer.prototype.bg = function (bg, inner) {
  return '<div style="position:absolute;inset:0;background:' + bg + '"></div>' + inner;
};

// 安全区域叠加层
PreviewRenderer.prototype.safeZoneOverlay = function () {
  var camW = this.device.cameraZoneRatio * 100;
  var margin = 10;
  var d = this.device;
  return '<div style="position:absolute;inset:0;z-index:15;pointer-events:none">' +
    // 摄像头区域 (红色半透明)
    '<div style="position:absolute;left:0;top:0;width:' + camW + '%;height:100%;background:rgba(239,122,98,0.08);border-right:1.5px dashed rgba(239,122,98,0.5)">' +
    '<div style="position:absolute;top:4px;left:4px;font-size:8px;color:rgba(239,122,98,0.7);font-weight:600">📷 摄像头</div>' +
    '<div style="position:absolute;top:16px;left:4px;font-size:7px;color:rgba(239,122,98,0.5)">' + Math.round(d.width * d.cameraZoneRatio) + 'px</div>' +
    '</div>' +
    // 安全区域 (绿色边框)
    '<div style="position:absolute;left:' + camW + '%;top:' + margin + 'px;right:' + margin + 'px;bottom:' + margin + 'px;border:1px dashed rgba(0,201,160,0.35);border-radius:4px">' +
    '<div style="position:absolute;top:-1px;right:2px;font-size:7px;color:rgba(0,201,160,0.6)">安全区 ' + Math.round(d.width * (1 - d.cameraZoneRatio) - margin * 2) + '×' + (d.height - margin * 2) + '</div>' +
    '</div>' +
    '</div>';
};

PreviewRenderer.prototype.esc = function (s) {
  return escHtml(s);
};

PreviewRenderer.prototype.fmtTime = function (now, fmt) {
  var h = now.getHours(), m = String(now.getMinutes()).padStart(2, '0');
  if (fmt.indexOf('hh') >= 0) {
    var h12 = h % 12 || 12, ampm = h < 12 ? 'AM' : 'PM';
    return String(h12).padStart(2, '0') + ':' + m + ' ' + ampm;
  }
  return String(h).padStart(2, '0') + ':' + m;
};

PreviewRenderer.prototype.fmtDate = function (now, fmt) {
  var days = ['日', '一', '二', '三', '四', '五', '六'];
  var h = now.getHours(), h12 = h % 12 || 12;
  var tk = {
    yyyy: String(now.getFullYear()),
    MM: String(now.getMonth() + 1).padStart(2, '0'),
    dd: String(now.getDate()).padStart(2, '0'),
    HH: String(h).padStart(2, '0'),
    hh: String(h12).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
    ss: String(now.getSeconds()).padStart(2, '0'),
    a: h < 12 ? 'AM' : 'PM',
    EEEE: '星期' + days[now.getDay()],
    E: '周' + days[now.getDay()],
  };
  return Object.keys(tk).sort(function (a, b) { return b.length - a.length; })
    .reduce(function (s, k) { return s.split(k).join(tk[k]); }, fmt);
};

PreviewRenderer.prototype.calcCountdown = function (str) {
  var td = String(str || '0101');
  if (!/^\d{4}$/.test(td)) return 0;
  var tMonth = Math.floor(Number(td) / 100), tDay = Number(td) % 100;
  if (tMonth < 1 || tMonth > 12 || tDay < 1 || tDay > 31) return 0;
  var now = new Date(), y = now.getFullYear();
  function absDay(year, month, day) {
    var y2 = year, m = month;
    if (m <= 2) { y2--; m += 12; }
    return 365*y2 + Math.floor(y2/4) - Math.floor(y2/100) + Math.floor(y2/400) + Math.floor(306*(m+1)/10) + day - 654855;
  }
  var today = absDay(y, now.getMonth()+1, now.getDate());
  var target = absDay(y, tMonth, tDay);
  var diff = target - today;
  if (diff <= 0) { diff = absDay(y+1, tMonth, tDay) - today; }
  return diff;
};

// ─── Expression Evaluator (for template elements with textExp) ────
PreviewRenderer.prototype.evalExpression = function (expr) {
  // If mock mode is disabled, return raw expression
  try {
    if (typeof window.JCM !== 'undefined' && window.JCM.toggleMockMode) {
      // Check via a global flag
      if (window.__mockMode === false) return '{' + expr + '}';
    }
  } catch (e) {}

  var now = new Date();
  // formatDate('FORMAT', #variable)
  var fm = expr.match(/formatDate\s*\(\s*'([^']+)'\s*,\s*([^)]+)\)/);
  if (fm) {
    var fmt = fm[1];
    var varName = fm[2].trim();
    // Resolve variable to a Date-like value
    var dateVal = now;
    if (varName === '#time_sys') {
      dateVal = now;
    } else if (varName === '#utcNow' || varName === '#utcNow2') {
      // Approximate: use current time (timezone offset can't be known in preview)
      dateVal = now;
    }
    return this.fmtDate(dateVal, fmt);
  }
  // Simple variables
  var vars = {
    '#step_count': '6542',
    '#battery_level': '78',
    '#battery_state': '放电中',
    '#weather_temp': '23°',
    '#weather_desc': '晴',
    '#weather_city': '北京',
    '#view_width': String(this.device.width),
    '#view_height': String(this.device.height),
    '#heart_rate': '72',
    '#blood_oxygen': '98',
    '#sleep_hours': '7.5',
    '#utcNow': String(now.getTime()),
    '#utcNow2': String(now.getTime()),
    '#dayIdx': '0',
  };
  if (vars[expr]) return vars[expr];
  // Complex expressions (string concat, ifelse, etc.)
  var cleaned = expr
    .replace(/#view_width/g, this.device.width)
    .replace(/#view_height/g, this.device.height)
    .replace(/#marginL/g, Math.round(this.device.width * this.device.cameraZoneRatio))
    .replace(/#step_count/g, 6542)
    .replace(/#battery_level/g, 78)
    .replace(/#step_distance/g, 4.2)
    .replace(/#step_calorie/g, 256)
    .replace(/#goalN/g, 10000)
    .replace(/#pct/g, 65)
    .replace(/#year/g, now.getFullYear())
    .replace(/#month/g, now.getMonth() + 1)
    .replace(/#date/g, now.getDate())
    .replace(/#dayIdx/g, 0)
    .replace(/#time_sys/g, now.getTime())
    .replace(/#step/g, 6542)
    .replace(/#weather_humidity/g, 45);
  try {
    // MAML 函数 → JS 映射
    var scope = 'var ifelse = function(c,a,b){return c?a:b;};' +
      'var concat = function(){return Array.prototype.slice.call(arguments).join("");};' +
      'var clamp = function(v,lo,hi){return Math.min(Math.max(v,lo),hi);};' +
      'var floor = function(v){return Math.floor(v);};' +
      'var ceil = function(v){return Math.ceil(v);};' +
      'var abs = function(v){return Math.abs(v);};' +
      'var mod = function(a,b){return a%b;};' +
      'var div = function(a,b){return Math.floor(a/b);};' +
      'var gt = function(a,b){return a>b?1:0;};' +
      'var lt = function(a,b){return a<b?1:0;};' +
      'var neg = function(v){return -v;};' +
      'var eq = function(a,b){return a===b?1:0;};' +
      'var eqs = function(a,b){return String(a)===String(b)?1:0;};' +
      'var max = function(a,b){return Math.max(a,b);};' +
      'var min = function(a,b){return Math.min(a,b);};' +
      'var sqrt = function(v){return Math.sqrt(v);};' +
      'var rand = function(){return Math.random();};' +
      'var strIsEmpty = function(s){return !s||s.length===0?1:0;};' +
      'var len = function(s){return s?s.length:0;};';
    var result = Function('"use strict";' + scope + 'return (' + cleaned + ')')();
    if (result != null) return String(result);
  } catch (e) {}
  return expr; // fallback: show raw expression
};

// ─── Template Renderers ───────────────────────────────────────────
// Templates with elements() are rendered via renderElements + bg only.
// These are kept for the custom template (no elements()) and rawXml templates.

PreviewRenderer.prototype.renderCustom = function (c) {
  var pat = c.bgPattern || 'solid';
  if (pat === 'dots') return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:radial-gradient(circle,rgba(255,255,255,0.08) 1px,transparent 1px);background-size:20px 20px"></div>';
  if (pat === 'dots-large') return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:radial-gradient(circle,rgba(255,255,255,0.06) 4px,transparent 4px);background-size:32px 32px"></div>';
  if (pat === 'grid') return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:20px 20px"></div>';
  if (pat === 'diagonal') return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,0.04) 10px,rgba(255,255,255,0.04) 11px)"></div>';
  if (pat === 'gradient') return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + c.bgColor + ',' + (c.bgColor2 || '#1a1a2e') + ')"></div>';
  if (pat === 'gradient-radial') return '<div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,' + c.bgColor + ',' + (c.bgColor2 || '#1a1a2e') + ')"></div>';
  return this.bg(c.bgColor, '');
};

// ─── Element Rendering ────────────────────────────────────────────
PreviewRenderer.prototype.renderDistances = function (elements, selIdx) {
  if (selIdx < 0 || selIdx >= elements.length) return '';
  var self = this;
  var sel = elements[selIdx];
  var selW = (sel.w || (sel.r ? sel.r * 2 : 0) || 100);
  var selH = (sel.h || (sel.r ? sel.r * 2 : 0) || 30);
  var selCX = sel.x + selW / 2;
  var selCY = sel.y + selH / 2;
  var html = '';

  elements.forEach(function (el, i) {
    if (i === selIdx || el.visible === false) return;
    var ew = (el.w || (el.r ? el.r * 2 : 0) || 100);
    var eh = (el.h || (el.r ? el.r * 2 : 0) || 30);

    // 水平距离
    var hDist, hLabelX;
    if (el.x >= sel.x + selW) {
      hDist = el.x - (sel.x + selW);
      hLabelX = (sel.x + selW + el.x) / 2;
    } else if (sel.x >= el.x + ew) {
      hDist = sel.x - (el.x + ew);
      hLabelX = (el.x + ew + sel.x) / 2;
    } else {
      hDist = 0;
      hLabelX = Math.max(sel.x, el.x);
    }

    // 垂直距离
    var vDist, vLabelY;
    if (el.y >= sel.y + selH) {
      vDist = el.y - (sel.y + selH);
      vLabelY = (sel.y + selH + el.y) / 2;
    } else if (sel.y >= el.y + eh) {
      vDist = sel.y - (el.y + eh);
      vLabelY = (el.y + eh + sel.y) / 2;
    } else {
      vDist = 0;
      vLabelY = Math.max(sel.y, el.y);
    }

    if (hDist > 0 && hDist < 200) {
      var lx = self.camW + hLabelX * self.scale;
      var ly1 = Math.min(sel.y, el.y) * self.scale;
      var ly2 = Math.max(sel.y + selH, el.y + eh) * self.scale;
      html += '<div style="position:absolute;left:' + lx + 'px;top:' + ly1 + 'px;width:1px;height:' + (ly2 - ly1) + 'px;background:rgba(253,203,110,0.5);z-index:25;pointer-events:none"></div>';
      html += '<div style="position:absolute;left:' + (lx - 12) + 'px;top:' + ((ly1 + ly2) / 2 - 7) + 'px;font-size:9px;color:#fdcb6e;background:rgba(0,0,0,.7);padding:1px 5px;border-radius:3px;z-index:26;pointer-events:none;white-space:nowrap">' + Math.round(hDist) + '</div>';
    }
    if (vDist > 0 && vDist < 200) {
      var ly = self.camW + vLabelY * self.scale;
      var lx1 = Math.min(sel.x, el.x) * self.scale + self.camW;
      var lx2 = Math.max(sel.x + selW, el.x + ew) * self.scale + self.camW;
      html += '<div style="position:absolute;left:' + lx1 + 'px;top:' + ly + 'px;height:1px;width:' + (lx2 - lx1) + 'px;background:rgba(253,203,110,0.5);z-index:25;pointer-events:none"></div>';
      html += '<div style="position:absolute;left:' + ((lx1 + lx2) / 2 - 12) + 'px;top:' + (ly - 8) + 'px;font-size:9px;color:#fdcb6e;background:rgba(0,0,0,.7);padding:1px 5px;border-radius:3px;z-index:26;pointer-events:none;white-space:nowrap">' + Math.round(vDist) + '</div>';
    }
  });

  // 等间距检测
  if (elements.length >= 3) {
    var sorted = elements.map(function (e, idx) { return { idx: idx, el: e }; }).filter(function (s) { return s.idx !== selIdx && s.el.visible !== false; });
    // 水平等间距
    sorted.sort(function (a, b) { return a.el.x - b.el.x; });
    var gaps = [];
    for (var gi = 1; gi < sorted.length; gi++) {
      gaps.push({ gap: sorted[gi].el.x - sorted[gi - 1].el.x, i1: sorted[gi - 1].idx, i2: sorted[gi].idx });
    }
    for (var g = 0; g < gaps.length - 1; g++) {
      if (Math.abs(gaps[g].gap - gaps[g + 1].gap) < 2 && gaps[g].gap > 0) {
        // 等间距!
        var eqX = (sorted[g + 1].el.x + sorted[g + 2].el.x) / 2;
        html += '<div style="position:absolute;left:' + (self.camW + eqX * self.scale) + 'px;top:2px;font-size:8px;color:#00c9a0;background:rgba(0,0,0,.7);padding:1px 4px;border-radius:3px;z-index:27;pointer-events:none">≈' + Math.round(gaps[g].gap) + '</div>';
      }
    }
  }

  return html;
};

PreviewRenderer.prototype.renderElements = function (elements, files, selIdx) {
  var self = this;
  var html = '';

  // 距离测量线 (在元素下方渲染)
  if (selIdx >= 0) {
    html += self.renderDistances(elements, selIdx);
  }

  html += elements.map(function (el, i) {
    if (el.visible === false && i !== selIdx) return ''; // skip hidden (unless selected)
    var px = self.camW + el.x * self.scale;
    var py = el.y * self.scale;
    var inCam = el.x < self.device.width * self.device.cameraZoneRatio;
    var bdr = '';
    if (i === selIdx && inCam) bdr = 'outline:2px solid #ef7a62;outline-offset:2px;box-shadow:0 0 0 4px rgba(239,122,98,.25),0 0 16px rgba(239,122,98,.15);';
    else if (i === selIdx) bdr = 'outline:2px solid #7c6df0;outline-offset:2px;box-shadow:0 0 0 4px rgba(124,109,240,.25),0 0 16px rgba(124,109,240,.15);';
    else if (inCam) bdr = 'outline:1.5px dashed rgba(225,112,85,0.6);outline-offset:2px;';
    var dc = 'cursor:grab;' + bdr;
    var op = (el.opacity !== undefined && el.opacity !== 100) ? 'opacity:' + (el.opacity / 100) + ';' : '';
    var rot = (el.rotation && el.rotation !== 0) ? 'transform:rotate(' + el.rotation + 'deg);transform-origin:center;' : '';
    var sh = '';
    if (el.shadow === 'light') sh = 'text-shadow:0 1px 3px rgba(0,0,0,0.4);';
    else if (el.shadow === 'dark') sh = 'text-shadow:0 2px 6px rgba(0,0,0,0.8);';
    else if (el.shadow === 'glow') sh = 'text-shadow:0 0 8px ' + el.color + ',0 0 16px ' + el.color + ';';

    // Resize handle - bigger, more visible, more types
    var rh = '';
    if (i === selIdx && (el.type === 'rectangle' || el.type === 'image' || el.type === 'video' || el.type === 'progress' || el.type === 'text' || el.type === 'lottie')) {
      var ew = (el.w || 100) * self.scale, eh = (el.h || 100) * self.scale;
      if (el.type === 'text' && !el.w) { ew = 30; eh = (el.size || 20) * self.scale; }
      rh = '<div data-resize-idx="' + i + '" style="position:absolute;left:' + (px + ew - 5) + 'px;top:' + (py + eh - 5) + 'px;width:12px;height:12px;background:#7c6df0;border:2px solid #fff;border-radius:3px;cursor:nwse-resize;z-index:20;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:transform .15s ease" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'scale(1)\'"></div>';
      // Top-left corner handle for move hint
      rh += '<div style="position:absolute;left:' + (px - 3) + 'px;top:' + (py - 3) + 'px;width:6px;height:6px;background:#7c6df0;border:1.5px solid #fff;border-radius:50%;z-index:20;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>';
    }

    // Size label
    var sizeLabel = '';
    if (i === selIdx) {
      var elW = el.w || (el.r ? el.r * 2 : 0) || 0;
      var elH = el.h || (el.r ? el.r * 2 : 0) || 0;
      sizeLabel = '<div class="size-label" style="position:absolute;left:' + px + 'px;top:' + (py + elH * self.scale + 6) + 'px;font-size:11px;font-weight:600;color:#eaeaf4;background:rgba(124,109,240,.85);padding:2px 8px;border-radius:4px;white-space:nowrap;z-index:20;backdrop-filter:blur(4px);box-shadow:0 2px 6px rgba(0,0,0,.3)">x:' + el.x + ' y:' + el.y + ' · ' + elW + '×' + elH + '</div>';
    }

    switch (el.type) {
      case 'text': {
        var ta = el.textAlign && el.textAlign !== 'left' ? 'text-align:' + el.textAlign + ';' : '';
        var fw = el.bold ? 'font-weight:700;' : '';
        var ff = '';
        if (el.fontFamily && el.fontFamily !== 'default') {
          var fontMap = { 'mipro-normal': 'MiSans', 'mipro-demibold': 'MiSans', 'mipro-bold': 'MiSans', 'mipro-light': 'MiSans', 'mibright': 'MiBright', 'noto-sans-sc': '"Noto Sans SC"', 'roboto': 'Roboto', 'monospace': 'monospace' };
          ff = 'font-family:' + (fontMap[el.fontFamily] || 'sans-serif') + ';';
        }
        var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? 'width:' + ((el.w || 200) * self.scale) + 'px;' : '';
        var lh = el.multiLine ? 'white-space:pre-wrap;line-height:' + (el.lineHeight || 1.4) + ';' : '';
        var tDeco = '';
        if (el.underline && el.strikethrough) tDeco = 'text-decoration:underline line-through;';
        else if (el.underline) tDeco = 'text-decoration:underline;';
        else if (el.strikethrough) tDeco = 'text-decoration:line-through;';
        var lSpace = el.letterSpacing ? 'letter-spacing:' + (el.letterSpacing * self.scale) + 'px;' : '';
        var gradStyle = '';
        if (el.textGradient && el.textGradient !== 'none') {
          var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
          var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
          var gradAngle = { top_bottom: '180deg', left_right: '90deg', tl_br: '135deg', tr_bl: '225deg' };
          var ga = gradAngle[el.gradientOrientation] || '180deg';
          gradStyle = 'background:linear-gradient(' + ga + ',' + gc + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
        }
        var strokeStyle = '';
        if (el.textStroke && el.textStroke > 0) {
          strokeStyle = '-webkit-text-stroke:' + (el.textStroke * self.scale) + 'px ' + (el.textStrokeColor || '#000000') + ';';
        }
        var textContent = el.expression ? self.esc(self.evalExpression(el.expression)) : self.esc(el.text || '');
        if (el.multiLine) textContent = textContent.replace(/\n/g, '<br>');
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;font-size:' + el.size * self.scale + 'px;color:' + el.color + ';' + ff + w + ta + fw + lh + sh + op + rot + gradStyle + strokeStyle + tDeco + lSpace + dc + '">' + textContent + '</div>';
      }
      case 'rectangle':
        var gradAngles = { top_bottom: '180deg', left_right: '90deg', tl_br: '135deg', tr_bl: '225deg' };
        var rga = gradAngles[el.gradientOrientation] || '180deg';
        var rectBg = el.fillColor2 ? 'background:linear-gradient(' + rga + ',' + el.color + ',' + el.fillColor2 + ')' : 'background:' + el.color;
        var rectBorder = el.strokeWidth > 0 ? 'border:' + (el.strokeWidth * self.scale) + 'px solid ' + (el.strokeColor || '#ffffff') + ';' : '';
        var rectFilter = buildFilter(el);
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + el.w * self.scale + 'px;height:' + el.h * self.scale + 'px;' + rectBg + ';border-radius:' + (el.radius || 0) * self.scale + 'px;' + op + rot + rectBorder + rectFilter + dc + '"></div>' + rh + sizeLabel;
      case 'circle': {
        var circBorder = el.strokeWidth > 0 ? 'border:' + (el.strokeWidth * self.scale) + 'px solid ' + (el.strokeColor || '#ffffff') + ';' : '';
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + (self.camW + (el.x - el.r) * self.scale) + 'px;top:' + (el.y - el.r) * self.scale + 'px;width:' + el.r * 2 * self.scale + 'px;height:' + el.r * 2 * self.scale + 'px;background:' + el.color + ';border-radius:50%;' + circBorder + op + rot + dc + '"></div>';
      }
      case 'arc': {
        var ar = (el.r || 40) * self.scale;
        var cx = self.camW + el.x * self.scale;
        var cy = el.y * self.scale;
        var startAngle = (el.startAngle || 0) - 90;
        var endAngle = (el.endAngle || 270) - 90;
        var startRad = startAngle * Math.PI / 180;
        var endRad = endAngle * Math.PI / 180;
        var x1 = cx + ar * Math.cos(startRad);
        var y1 = cy + ar * Math.sin(startRad);
        var x2 = cx + ar * Math.cos(endRad);
        var y2 = cy + ar * Math.sin(endRad);
        var largeArc = ((el.endAngle || 270) - (el.startAngle || 0)) > 180 ? 1 : 0;
        var sw = (el.strokeWidth || 6) * self.scale;
        return '<svg data-el-idx="' + i + '" style="position:absolute;left:' + (cx - ar - sw) + 'px;top:' + (cy - ar - sw) + 'px;width:' + ((ar + sw) * 2) + 'px;height:' + ((ar + sw) * 2) + 'px;overflow:visible;' + dc + '"><path d="M ' + (x1 - cx + ar + sw) + ' ' + (y1 - cy + ar + sw) + ' A ' + ar + ' ' + ar + ' 0 ' + largeArc + ' 1 ' + (x2 - cx + ar + sw) + ' ' + (y2 - cy + ar + sw) + '" fill="none" stroke="' + el.color + '" stroke-width="' + sw + '" stroke-linecap="round"/></svg>' + sizeLabel;
      }
      case 'lottie':
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 120) * self.scale + 'px;height:' + (el.h || 120) * self.scale + 'px;background:rgba(108,92,231,0.15);border:1px dashed rgba(108,92,231,0.4);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#6c5ce7;gap:4px;' + dc + '">🎭<span style="font-size:8px;opacity:0.7">Lottie (仅预览)</span></div>' + sizeLabel;
      case 'image': {
        var fi = el.fileName ? files[el.fileName] : null;
        var imgFilter = buildFilter(el);
        var imgRadius = el.radius ? 'border-radius:' + (el.radius * self.scale) + 'px;' : '';
        if (fi) return '<img data-el-idx="' + i + '" src="' + fi.dataUrl + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 100) * self.scale + 'px;height:' + (el.h || 100) * self.scale + 'px;object-fit:' + (el.fit || 'cover') + ';' + imgRadius + imgFilter + dc + '">' + rh + sizeLabel;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 100) * self.scale + 'px;height:' + (el.h || 100) * self.scale + 'px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#666;' + dc + '">🖼</div>' + rh + sizeLabel;
      }
      case 'video': {
        var fi2 = el.fileName ? files[el.fileName] : null;
        var vidFilter = buildFilter(el);
        var vidRadius = el.radius ? 'border-radius:' + (el.radius * self.scale) + 'px;' : '';
        if (fi2) return '<video data-el-idx="' + i + '" src="' + fi2.dataUrl + '" muted loop autoplay style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 240) * self.scale + 'px;height:' + (el.h || 135) * self.scale + 'px;object-fit:' + (el.fit || 'cover') + ';' + vidRadius + vidFilter + dc + '"></video>' + rh + sizeLabel;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 240) * self.scale + 'px;height:' + (el.h || 135) * self.scale + 'px;background:#1a1a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#555;' + dc + '">🎬</div>' + rh + sizeLabel;
      }
      case 'progress': {
        var pw = (el.w || 200) * self.scale, ph = (el.h || 8) * self.scale;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + (self.camW + el.x * self.scale) + 'px;top:' + (el.y * self.scale) + 'px;width:' + pw + 'px;height:' + ph + 'px;background:' + (el.bgColor || '#333') + ';border-radius:' + ((el.radius || 4) * self.scale) + 'px;' + dc + '"><div style="width:' + ((el.value || 60)) + '%;height:100%;background:' + el.color + ';border-radius:inherit"></div></div>' + rh + sizeLabel;
      }
      case 'group': {
        var gOp = el.alpha !== undefined && el.alpha !== 1 ? 'opacity:' + el.alpha + ';' : '';
        var gW = (el.w || 200) * self.scale;
        var gH = (el.h || 200) * self.scale;
        var childHtml = '';
        if (el.children && el.children.length > 0) {
          childHtml = self.renderElements(el.children, files, -1);
        }
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + gW + 'px;height:' + gH + 'px;border:1px dashed rgba(124,109,240,0.4);border-radius:4px;' + gOp + dc + '">' +
          '<div style="position:absolute;top:-16px;left:0;font-size:9px;color:rgba(124,109,240,0.7);white-space:nowrap">📦 ' + (el.name || 'Group') + '</div>' +
          childHtml + '</div>' + rh + sizeLabel;
      }
      case 'layer': {
        var lVis = el.visibility ? 'opacity:0.5;' : '';
        return '<div data-el-idx="' + i + '" style="position:absolute;left:0;top:0;width:100%;height:100%;background:rgba(108,92,231,0.08);border:1px dashed rgba(108,92,231,0.3);' + lVis + dc + '">' +
          '<div style="position:absolute;top:4px;left:4px;font-size:9px;color:rgba(108,92,231,0.6)">🎨 Layer: ' + (el.name || '') + ' [' + (el.layerType || 'bottom') + ']</div></div>' + sizeLabel;
      }
      case 'musiccontrol': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 200) * self.scale + 'px;height:' + (el.h || 120) * self.scale + 'px;background:rgba(46,204,113,0.1);border:1px dashed rgba(46,204,113,0.4);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#2ecc71;gap:4px;' + dc + '">🎵<span style="font-size:8px;opacity:0.7">MusicControl</span></div>' + sizeLabel;
      }
      case 'numberimage': {
        var niText = el.expression ? '~' + (el.number || '12') : (el.number || '12');
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 30) * self.scale + 'px;height:' + (el.h || 50) * self.scale + 'px;background:rgba(255,193,7,0.1);border:1px dashed rgba(255,193,7,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:' + (el.h || 50) * self.scale * 0.6 + 'px;color:#ffc107;' + dc + '">#' + self.esc(niText) + '</div>' + sizeLabel;
      }
      case 'mask': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:60px;height:60px;background:rgba(255,152,0,0.15);border:1px dashed rgba(255,152,0,0.5);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#ff9800;' + dc + '">🎭 Mask</div>' + sizeLabel;
      }
      case 'slider': {
        var slW = (el.w || 280) * self.scale, slH = (el.h || 60) * self.scale;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + slW + 'px;height:' + slH + 'px;background:rgba(0,150,136,0.1);border:1px dashed rgba(0,150,136,0.4);border-radius:8px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;font-size:10px;color:#009688;' + dc + '">👆<div style="flex:1;height:2px;background:rgba(0,150,136,0.3);margin:0 6px;border-radius:1px"></div>🎯<span style="font-size:8px;opacity:0.7;margin-left:4px">Slider: ' + self.esc(el.name || '') + '</span></div>' + sizeLabel;
      }
      case 'button': {
        var btW = (el.w || 100) * self.scale, btH = (el.h || 40) * self.scale;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + btW + 'px;height:' + btH + 'px;background:rgba(33,150,243,0.15);border:1px dashed rgba(33,150,243,0.5);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#2196f3;' + dc + '">🔘 Button' + (el.name ? ': ' + self.esc(el.name) : '') + '</div>' + sizeLabel;
      }
      case 'variable': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(156,39,176,0.6);white-space:nowrap;pointer-events:none">📦 Var: ' + self.esc(el.name || '?') + '</div>';
      }
      case 'variablearray': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(156,39,176,0.6);white-space:nowrap;pointer-events:none">📦 VarArray: ' + self.esc(el.name || '?') + '</div>';
      }
      case 'trigger': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(244,67,54,0.6);white-space:nowrap;pointer-events:none">⚡ Trigger: ' + self.esc(el.action || 'click') + '</div>';
      }
      case 'variablecommand':
      case 'bindercommand':
      case 'musiccommand':
      case 'frameratecommand':
      case 'multicommand': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:8px;top:' + py + 'px;font-size:8px;color:rgba(96,125,139,0.5);white-space:nowrap;pointer-events:none">⚙️ ' + self.esc(el.type) + '</div>';
      }
      case 'ifcommand': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(255,152,0,0.6);white-space:nowrap;pointer-events:none">❓ IfCommand</div>';
      }
      case 'variablebinders': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(33,150,243,0.6);white-space:nowrap;pointer-events:none">🔗 VariableBinders</div>';
      }
      case 'contentprovider': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(33,150,243,0.6);white-space:nowrap;pointer-events:none">📊 ContentProvider</div>';
      }
      case 'permanence': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(76,175,80,0.6);white-space:nowrap;pointer-events:none">💾 Permanence: ' + self.esc(el.name || '?') + '</div>';
      }
      case 'folmestate': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(233,30,99,0.6);white-space:nowrap;pointer-events:none">✨ FolmeState</div>';
      }
      case 'folmeconfig': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(233,30,99,0.6);white-space:nowrap;pointer-events:none">✨ FolmeConfig</div>';
      }
      case 'mipalettebinder': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:4px;top:' + py + 'px;font-size:8px;color:rgba(255,87,34,0.6);white-space:nowrap;pointer-events:none">🎨 MiPaletteBinder</div>';
      }
      case 'wallpaper': {
        return '<div data-el-idx="' + i + '" style="position:absolute;left:0;top:0;width:100%;height:100%;background:rgba(158,158,158,0.08);border:1px dashed rgba(158,158,158,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(158,158,158,0.5);' + dc + '">🖼 Wallpaper</div>';
      }
      default: return sizeLabel;
    }
  }).join('');
  return html;
};




// ─── Render Template Preview (dispatch) ───────────────────────────
export function renderTemplatePreview(device, showCam, tpl, cfg) {
  var r = new PreviewRenderer(device, showCam);
  // Templates with elements() → just render background (elements are in S.elements)
  if (tpl.elements) {
    return r.bg(cfg.bgColor || '#000000', '');
  }
  // rawXml-only templates → generic preview
  switch (tpl.id) {
    case 'custom': return r.renderCustom(cfg);
    default:       return r.bg(cfg.bgColor || '#000000', '');
  }
}


export { PreviewRenderer };

// ─── CSS Filter Builder ───────────────────────────────────────────
function buildFilter(el) {
  var filters = [];
  if (el.brightness !== undefined && el.brightness !== 100) filters.push('brightness(' + el.brightness + '%)');
  if (el.saturate !== undefined && el.saturate !== 100) filters.push('saturate(' + el.saturate + '%)');
  if (el.hueRotate) filters.push('hue-rotate(' + el.hueRotate + 'deg)');
  return filters.length > 0 ? 'filter:' + filters.join(' ') + ';' : '';
}
