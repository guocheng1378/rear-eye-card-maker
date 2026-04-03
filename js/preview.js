// ─── Preview: 预览渲染器 ──────────────────────────────────────────

var PREVIEW_W = 420;

function PreviewRenderer(device, showCamera) {
  this.device = device;
  this.scale = PREVIEW_W / device.width;
  this.camW = showCamera ? PREVIEW_W * device.cameraZoneRatio : 0;
}

PreviewRenderer.prototype.bg = function (bg, inner) {
  return '<div style="position:absolute;inset:0;background:' + bg + '"></div>' + inner;
};

PreviewRenderer.prototype.esc = function (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
  var tk = {
    yyyy: String(now.getFullYear()),
    MM: String(now.getMonth() + 1).padStart(2, '0'),
    dd: String(now.getDate()).padStart(2, '0'),
    EEEE: '星期' + days[now.getDay()]
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
  var target = new Date(y, tMonth - 1, tDay);
  var diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diff < 0) { target = new Date(y + 1, tMonth - 1, tDay); diff = Math.ceil((target.getTime() - now.getTime()) / 86400000); }
  return diff;
};

PreviewRenderer.prototype.renderClock = function (c) {
  var now = new Date();
  var ts = this.fmtTime(now, c.timeFormat);
  var ds = this.fmtDate(now, c.dateFormat);
  var tfs = Math.round(Number(c.timeSize) * this.scale);
  var dy = Math.round(30 + tfs + 6 * this.scale);
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:30px;font-size:' + tfs + 'px;color:' + c.timeColor + ';font-weight:700;letter-spacing:1px">' + this.esc(ts) + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + dy + 'px;font-size:' + Math.round(20 * this.scale) + 'px;color:' + c.dateColor + '">' + this.esc(ds) + '</div>'
  );
};

PreviewRenderer.prototype.renderQuote = function (c) {
  var lines = String(c.text).split('\n');
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:24px;right:10px;font-size:' + Math.round(Number(c.textSize) * this.scale) + 'px;color:' + c.textColor + ';line-height:1.4">' + lines.map(this.esc).join('<br>') + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;bottom:20px;font-size:' + Math.round(16 * this.scale) + 'px;color:' + c.authorColor + '">' + this.esc(c.author) + '</div>'
  );
};

PreviewRenderer.prototype.renderBattery = function (c) {
  var level = 78;
  var bw = PREVIEW_W - this.camW - 20;
  var status = level < 20 ? '电量极低' : level < 80 ? '电量偏低' : '电量充足';
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:20px;font-size:' + Math.round(18 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.6">电量</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:42px;font-size:' + Math.round(56 * this.scale) + 'px;color:' + c.textColor + ';font-weight:700">' + level + '%</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:110px;width:' + bw + 'px;height:7px;background:#333;border-radius:4px"><div style="width:' + level + '%;height:100%;background:' + c.barColor + ';border-radius:4px"></div></div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:126px;font-size:' + Math.round(16 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.5">' + status + '</div>'
  );
};

PreviewRenderer.prototype.renderStatus = function (c) {
  var items = [c.item1, c.item2, c.item3, c.item4].filter(Boolean);
  var self = this;
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 6) + 'px;top:18px;display:flex;align-items:center;gap:6px">' +
    '<div style="width:3px;height:' + Math.round(24 * this.scale) + 'px;background:' + c.accentColor + ';border-radius:2px"></div>' +
    '<span style="font-size:' + Math.round(22 * this.scale) + 'px;color:' + c.textColor + ';font-weight:600">' + this.esc(c.title) + '</span></div>' +
    items.map(function (t, i) {
      return '<div style="position:absolute;left:' + (self.camW + 16) + 'px;top:' + (50 + i * Math.round(40 * self.scale)) + 'px;font-size:' + Math.round(16 * self.scale) + 'px;color:' + c.textColor + ';opacity:0.8">' + self.esc(t) + '</div>';
    }).join('')
  );
};

PreviewRenderer.prototype.renderCountdown = function (c) {
  var diff = this.calcCountdown(c.targetDate);
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:20px;font-size:' + Math.round(18 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.6">' + this.esc(c.eventName) + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:44px;font-size:' + Math.round(72 * this.scale) + 'px;color:' + c.accentColor + ';font-weight:700">' + diff + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(44 + 72 * this.scale + 4) + 'px;font-size:' + Math.round(20 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.5">天</div>'
  );
};

PreviewRenderer.prototype.renderMusic = function (c) {
  var bs = Math.round(48 * this.scale), br = Math.round(12 * this.scale), is = Math.round(28 * this.scale);
  var after = 18 + bs + 10;
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:18px;display:flex;gap:8px;align-items:center">' +
    '<div style="width:' + bs + 'px;height:' + bs + 'px;background:' + c.accentColor + ';border-radius:' + br + 'px;display:flex;align-items:center;justify-content:center;font-size:' + is + 'px;color:#fff">♪</div>' +
    '<span style="font-size:' + Math.round(12 * this.scale) + 'px;color:' + c.accentColor + '">正在播放</span></div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + after + 'px;font-size:' + Math.round(24 * this.scale) + 'px;color:' + c.titleColor + ';font-weight:600">' + this.esc(c.songName) + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + (after + Math.round(28 * this.scale)) + 'px;font-size:' + Math.round(16 * this.scale) + 'px;color:' + c.artistColor + '">' + this.esc(c.artistName) + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;right:10px;top:' + (after + Math.round(50 * this.scale)) + 'px;height:2px;background:#333;border-radius:1px"><div style="width:40%;height:100%;background:' + c.accentColor + ';border-radius:1px"></div></div>'
  );
};

PreviewRenderer.prototype.renderGradient = function (c) {
  var lines = String(c.text).split('\n');
  return '<div style="position:absolute;left:0;top:0;width:50%;height:100%;background:' + c.bgColor1 + '"></div>' +
    '<div style="position:absolute;left:50%;top:0;width:50%;height:100%;background:' + c.bgColor2 + ';opacity:0.7"></div>' +
    '<div style="position:absolute;left:' + this.camW + 'px;right:0;top:30%;text-align:center;font-size:' + Math.round(Number(c.textSize) * this.scale) + 'px;color:' + c.textColor + ';font-weight:700;line-height:1.3">' + lines.map(this.esc).join('<br>') + '</div>';
};

PreviewRenderer.prototype.renderCustom = function (c) {
  var pat = c.bgPattern || 'solid';
  if (pat === 'dots') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:radial-gradient(circle,rgba(255,255,255,0.08) 1px,transparent 1px);background-size:20px 20px"></div>';
  }
  if (pat === 'grid') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:20px 20px"></div>';
  }
  if (pat === 'gradient') {
    return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + c.bgColor + ',' + (c.bgColor2 || '#1a1a2e') + ')"></div>';
  }
  return this.bg(c.bgColor, '');
};

// ─── 新模板预览 ────────────────────────────────────────────────────

PreviewRenderer.prototype.renderWeather = function (c) {
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:14px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.descColor + ';opacity:0.7">' + this.esc(c.city) + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:32px;font-size:' + Math.round(Number(c.tempSize) * this.scale) + 'px;color:' + c.tempColor + ';font-weight:700">23°</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(32 + Number(c.tempSize) * this.scale + 8) + 'px;font-size:' + Math.round(18 * this.scale) + 'px;color:' + c.descColor + '">晴</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(32 + Number(c.tempSize) * this.scale + 40) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.descColor + ';opacity:0.5">湿度 45%</div>' +
    '<div style="position:absolute;left:' + (this.camW + 120) + 'px;top:' + Math.round(32 + Number(c.tempSize) * this.scale + 40) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.descColor + ';opacity:0.5">体感 21°</div>'
  );
};

PreviewRenderer.prototype.renderSteps = function (c) {
  var goal = parseInt(c.goal) || 10000;
  var steps = 6542; // Demo
  var pct = Math.min(Math.round(steps / goal * 100), 100);
  var barW = (PREVIEW_W - this.camW - 20) * pct / 100;
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:14px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.5">今日步数</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:30px;font-size:' + Math.round(52 * this.scale) + 'px;color:' + c.textColor + ';font-weight:700">' + steps.toLocaleString() + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(30 + 52 * this.scale + 4) + 'px;font-size:' + Math.round(16 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.5">步</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(30 + 52 * this.scale + 30) + 'px;right:10px;height:5px;background:#222;border-radius:3px">' +
      '<div style="width:' + barW + 'px;height:100%;background:' + c.barColor + ';border-radius:3px"></div></div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(30 + 52 * this.scale + 44) + 'px;font-size:' + Math.round(12 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.4">目标 ' + goal.toLocaleString() + ' · ' + pct + '%</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(30 + 52 * this.scale + 70) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.accentColor + ';opacity:0.7">距离 4.2 km</div>' +
    '<div style="position:absolute;left:' + (this.camW + 130) + 'px;top:' + Math.round(30 + 52 * this.scale + 70) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.accentColor + ';opacity:0.7">消耗 186 kcal</div>'
  );
};

PreviewRenderer.prototype.renderCalendar = function (c) {
  var now = new Date();
  var days = ['日', '一', '二', '三', '四', '五', '六'];
  var mmdd = String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0');
  var dow = '星期' + days[now.getDay()];
  var dd = String(now.getDate());
  var events = [c.event1, c.event2, c.event3].filter(Boolean);
  var evHtml = events.map(function (e, i) {
    return '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:' + Math.round(130 + i * 28 * this.scale) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.textColor + '">' + this.esc(e) + '</div>';
  }.bind(this)).join('');

  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:14px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.5">' + mmdd + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:30px;font-size:' + Math.round(18 * this.scale) + 'px;color:' + c.accentColor + '">' + dow + '</div>' +
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:44px;font-size:' + Math.round(Number(c.daySize) * this.scale) + 'px;color:' + c.dayColor + ';font-weight:700">' + dd + '</div>' +
    evHtml
  );
};

PreviewRenderer.prototype.renderElements = function (elements, files, selIdx) {
  var self = this;
  return elements.map(function (el, i) {
    var px = self.camW + el.x * self.scale;
    var py = el.y * self.scale;
    var inCam = el.x < self.device.width * self.device.cameraZoneRatio;
    var bdr = '';
    if (i === selIdx && inCam) bdr = 'outline:2px solid #e17055;outline-offset:2px;';
    else if (i === selIdx) bdr = 'outline:1.5px dashed #6c5ce7;outline-offset:2px;';
    else if (inCam) bdr = 'outline:1.5px dashed rgba(225,112,85,0.6);outline-offset:2px;';

    var dc = 'cursor:move;' + bdr;
    var op = (el.opacity !== undefined && el.opacity !== 100) ? 'opacity:' + (el.opacity / 100) + ';' : '';
    var sh = '';
    if (el.shadow === 'light') sh = 'text-shadow:0 1px 3px rgba(0,0,0,0.4);';
    else if (el.shadow === 'dark') sh = 'text-shadow:0 2px 6px rgba(0,0,0,0.8);';
    else if (el.shadow === 'glow') sh = 'text-shadow:0 0 8px ' + el.color + ',0 0 16px ' + el.color + ';';
    // Resize handle for selected elements
    var rh = '';
    if (i === selIdx && (el.type === 'rectangle' || el.type === 'image' || el.type === 'video')) {
      var ew = (el.w || 100) * self.scale, eh = (el.h || 100) * self.scale;
      rh = '<div data-resize-idx="' + i + '" style="position:absolute;left:' + (px + ew - 6) + 'px;top:' + (py + eh - 6) + 'px;width:10px;height:10px;background:#6c5ce7;border:1px solid #fff;border-radius:2px;cursor:nwse-resize;z-index:20"></div>';
    }
    switch (el.type) {
      case 'text': {
        var ta = el.textAlign && el.textAlign !== 'left' ? 'text-align:' + el.textAlign + ';' : '';
        var fw = el.bold ? 'font-weight:700;' : '';
        var w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? 'width:' + ((el.w || 200) * self.scale) + 'px;' : '';
        var lh = el.multiLine ? 'white-space:pre-wrap;line-height:1.4;' : '';
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;font-size:' + el.size * self.scale + 'px;color:' + el.color + ';' + w + ta + fw + lh + sh + op + dc + '">' + self.esc(el.text || '') + '</div>';
      }
      case 'rectangle':
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + el.w * self.scale + 'px;height:' + el.h * self.scale + 'px;background:' + el.color + ';border-radius:' + (el.radius || 0) * self.scale + 'px;' + op + dc + '"></div>' + rh;
      case 'circle':
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + (self.camW + (el.x - el.r) * self.scale) + 'px;top:' + (el.y - el.r) * self.scale + 'px;width:' + el.r * 2 * self.scale + 'px;height:' + el.r * 2 * self.scale + 'px;background:' + el.color + ';border-radius:50%;' + op + dc + '"></div>';
      case 'image': {
        var fi = el.fileName ? files[el.fileName] : null;
        if (fi) return '<img data-el-idx="' + i + '" src="' + fi.dataUrl + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 100) * self.scale + 'px;height:' + (el.h || 100) * self.scale + 'px;object-fit:cover;border-radius:2px;' + dc + '">' + rh;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 100) * self.scale + 'px;height:' + (el.h || 100) * self.scale + 'px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#666;' + dc + '">🖼</div>' + rh;
      }
      case 'video': {
        var fi2 = el.fileName ? files[el.fileName] : null;
        if (fi2) return '<video data-el-idx="' + i + '" src="' + fi2.dataUrl + '" muted loop autoplay style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 240) * self.scale + 'px;height:' + (el.h || 135) * self.scale + 'px;object-fit:cover;border-radius:2px;' + dc + '"></video>' + rh;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 240) * self.scale + 'px;height:' + (el.h || 135) * self.scale + 'px;background:#1a1a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#555;' + dc + '">🎬</div>' + rh;
      }
      default: return '';
    }
  }).join('');
};

JCM.PreviewRenderer = PreviewRenderer;
