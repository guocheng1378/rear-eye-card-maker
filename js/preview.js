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
  return JCM.escHtml(s);
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
  // Helper: absolute day number from year 0 (handles leap years)
  function absDay(year, month, day) {
    var y = year, m = month;
    if (m <= 2) { y--; m += 12; }
    return 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) + Math.floor(306*(m+1)/10) + day - 654855;
  }
  var today = absDay(y, now.getMonth()+1, now.getDate());
  var target = absDay(y, tMonth, tDay);
  var diff = target - today;
  if (diff <= 0) { diff = absDay(y+1, tMonth, tDay) - today; }
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
  var level = Number(c.demoLevel) || 78;
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
  if (pat === 'dots-large') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:radial-gradient(circle,rgba(255,255,255,0.06) 4px,transparent 4px);background-size:32px 32px"></div>';
  }
  if (pat === 'grid') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:20px 20px"></div>';
  }
  if (pat === 'diagonal') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + ';background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,0.04) 10px,rgba(255,255,255,0.04) 11px)"></div>';
  }
  if (pat === 'wave') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + '"></div>' +
      '<svg style="position:absolute;bottom:0;left:0;width:100%;height:40%;opacity:0.08" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0,60 C100,100 200,20 300,60 C350,80 400,40 400,60 L400,120 L0,120Z" fill="' + (c.bgColor2 || '#fff') + '"/></svg>';
  }
  if (pat === 'noise') {
    return '<div style="position:absolute;inset:0;background:' + c.bgColor + '"></div>' +
      '<div style="position:absolute;inset:0;opacity:0.03;background-image:url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")"></div>';
  }
  if (pat === 'gradient') {
    return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + c.bgColor + ',' + (c.bgColor2 || '#1a1a2e') + ')"></div>';
  }
  if (pat === 'gradient-radial') {
    return '<div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,' + c.bgColor + ',' + (c.bgColor2 || '#1a1a2e') + ')"></div>';
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
    '<div style="position:absolute;left:' + (this.camW + 120) + 'px;top:' + Math.round(32 + Number(c.tempSize) * this.scale + 40) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.descColor + ';opacity:0.5">体感 21°</div>' +
    '<div style="position:absolute;right:8px;bottom:6px;font-size:' + Math.round(10 * this.scale) + 'px;color:' + c.descColor + ';opacity:0.3">预览数据</div>'
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
    '<div style="position:absolute;left:' + (this.camW + 130) + 'px;top:' + Math.round(30 + 52 * this.scale + 70) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.accentColor + ';opacity:0.7">消耗 186 kcal</div>' +
    '<div style="position:absolute;right:8px;bottom:6px;font-size:' + Math.round(10 * this.scale) + 'px;color:' + c.textColor + ';opacity:0.15">预览数据</div>'
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

// ─── 新增模板预览 ──────────────────────────────────────────────────

PreviewRenderer.prototype.renderDualclock = function (c) {
  var now = new Date();
  var o1 = Number(c.offset1) || 0, o2 = Number(c.offset2) || 0;
  var utc = now.getTime() + now.getTimezoneOffset() * 60000;
  var t1 = new Date(utc + o1 * 3600000);
  var t2 = new Date(utc + o2 * 3600000);
  var ts = Math.round(Number(c.timeSize) * this.scale);
  var lx = this.camW + 10;
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + lx + 'px;top:18px;font-size:' + Math.round(13 * this.scale) + 'px;color:' + c.dateColor + '">' + this.esc(c.city1) + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:36px;font-size:' + ts + 'px;color:' + c.timeColor1 + ';font-weight:700">' + this.fmtTime(t1, 'HH:mm') + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(36 + ts + 4) + 'px;font-size:' + Math.round(12 * this.scale) + 'px;color:' + c.dateColor + ';opacity:0.6">' + this.fmtDate(t1, 'MM/dd EEEE') + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:50%;width:' + (PREVIEW_W - this.camW - 20) + 'px;height:1px;background:' + c.dividerColor + '"></div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:54%;font-size:' + Math.round(13 * this.scale) + 'px;color:' + c.dateColor + '">' + this.esc(c.city2) + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:calc(54% + 18px);font-size:' + ts + 'px;color:' + c.timeColor2 + ';font-weight:700">' + this.fmtTime(t2, 'HH:mm') + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:calc(54% + ' + Math.round(18 + ts + 4) + 'px);font-size:' + Math.round(12 * this.scale) + 'px;color:' + c.dateColor + ';opacity:0.6">' + this.fmtDate(t2, 'MM/dd EEEE') + '</div>'
  );
};

PreviewRenderer.prototype.renderDailyquote = function (c) {
  var quotes = [c.quote1, c.quote2, c.quote3, c.quote4, c.quote5, c.quote6, c.quote7].filter(Boolean);
  if (quotes.length === 0) quotes = ['每日一句'];
  var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  var idx = dayOfYear % quotes.length;
  var lines = String(quotes[idx]).split('\n');
  var lx = this.camW + 10;
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + lx + 'px;top:38px;width:20px;height:2px;background:' + c.accentColor + ';border-radius:1px"></div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:50px;right:10px;font-size:' + Math.round(Number(c.textSize) * this.scale) + 'px;color:' + c.textColor + ';line-height:1.5">' + lines.map(this.esc).join('<br>') + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;bottom:16px;font-size:' + Math.round(12 * this.scale) + 'px;color:' + c.dayColor + ';opacity:0.5">' + this.fmtDate(new Date(), 'MM/dd EEEE') + '</div>'
  );
};

PreviewRenderer.prototype.renderRing = function (c) {
  var isBattery = c.source === 'battery';
  var demoVal = Number(c.demoValue) || 65;
  var ringR = Math.round(80 * this.scale);
  var ringW = Math.round(Number(c.ringSize) * this.scale);
  var innerR = ringR - ringW;
  var cx = this.camW + (PREVIEW_W - this.camW) / 2;
  var cy = 120 * this.scale;
  var pct = demoVal;
  var label = isBattery ? '电量' : '步数';
  var unit = isBattery ? '%' : '步';
  // SVG arc for progress
  var angle = pct / 100 * 360;
  var rad = (angle - 90) * Math.PI / 180;
  var x2 = cx + ringR * Math.cos(rad);
  var y2 = cy + ringR * Math.sin(rad);
  var largeArc = angle > 180 ? 1 : 0;
  var trackColor = c.trackColor;
  var ringColor = c.ringColor;
  return this.bg(c.bgColor,
    '<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 ' + PREVIEW_W + ' ' + (252) + '">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + ringR + '" fill="none" stroke="' + trackColor + '" stroke-width="' + ringW + '" />' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + ringR + '" fill="none" stroke="' + ringColor + '" stroke-width="' + ringW + '" ' +
      'stroke-dasharray="' + (2 * Math.PI * ringR * pct / 100) + ' ' + (2 * Math.PI * ringR) + '" ' +
      'stroke-linecap="round" transform="rotate(-90 ' + cx + ' ' + cy + ')" />' +
    '</svg>' +
    '<div style="position:absolute;left:' + (cx - 40) + 'px;top:' + (cy - Math.round(28 * this.scale)) + 'px;width:80px;text-align:center;font-size:' + Math.round(48 * this.scale) + 'px;color:' + c.textColor + ';font-weight:700">' + pct + '</div>' +
    '<div style="position:absolute;left:' + (cx - 12) + 'px;top:' + (cy + Math.round(14 * this.scale)) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.labelColor + ';opacity:0.6">' + unit + '</div>' +
    '<div style="position:absolute;left:' + (cx - 24) + 'px;top:' + (cy + ringR + Math.round(16 * this.scale)) + 'px;width:48px;text-align:center;font-size:' + Math.round(13 * this.scale) + 'px;color:' + c.labelColor + ';opacity:0.5">' + label + '</div>'
  );
};

PreviewRenderer.prototype.renderDashboard = function (c) {
  var lx = this.camW + 10;
  var sw = PREVIEW_W - this.camW - 20;
  var halfW = sw / 2;
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + lx + 'px;top:12px;font-size:' + Math.round(38 * this.scale) + 'px;color:' + c.timeColor + ';font-weight:700">' + this.fmtTime(new Date(), 'HH:mm') + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(12 + 38 * this.scale + 4) + 'px;font-size:' + Math.round(12 * this.scale) + 'px;color:' + c.dimColor + '">' + this.fmtDate(new Date(), 'MM/dd EEEE') + '</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(72 * this.scale) + 'px;width:' + sw + 'px;height:1px;background:#1a1f2e"></div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(80 * this.scale) + 'px;font-size:' + Math.round(11 * this.scale) + 'px;color:' + c.dimColor + '">步数</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(94 * this.scale) + 'px;font-size:' + Math.round(22 * this.scale) + 'px;color:' + c.textColor + ';font-weight:700">6,542</div>' +
    '<div style="position:absolute;left:' + (lx + halfW) + 'px;top:' + Math.round(80 * this.scale) + 'px;font-size:' + Math.round(11 * this.scale) + 'px;color:' + c.dimColor + '">电量</div>' +
    '<div style="position:absolute;left:' + (lx + halfW) + 'px;top:' + Math.round(94 * this.scale) + 'px;font-size:' + Math.round(22 * this.scale) + 'px;color:' + c.textColor + ';font-weight:700">78%</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(132 * this.scale) + 'px;width:' + sw + 'px;height:1px;background:#1a1f2e"></div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(142 * this.scale) + 'px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + c.accentColor + '">晴</div>' +
    '<div style="position:absolute;left:' + (lx + halfW) + 'px;top:' + Math.round(142 * this.scale) + 'px;font-size:' + Math.round(16 * this.scale) + 'px;color:' + c.textColor + '">23°</div>' +
    '<div style="position:absolute;left:' + lx + 'px;top:' + Math.round(164 * this.scale) + 'px;font-size:' + Math.round(11 * this.scale) + 'px;color:' + c.dimColor + ';opacity:0.5">湿度 45%</div>'
  );
};

PreviewRenderer.prototype.renderImage = function (c) {
  return this.bg(c.bgColor,
    '<div style="position:absolute;left:' + (this.camW + 10) + 'px;top:50%;right:10px;transform:translateY(-50%);text-align:center;color:#555;font-size:' + Math.round(14 * this.scale) + 'px">点击配置上传图片</div>'
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
        // Text gradient
        var gradStyle = '';
        if (el.textGradient && el.textGradient !== 'none') {
          var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
          var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
          gradStyle = 'background:linear-gradient(135deg,' + gc + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
        }
        // Text stroke
        var strokeStyle = '';
        if (el.textStroke && el.textStroke > 0) {
          var sw = el.textStroke * self.scale;
          var sc = el.textStrokeColor || '#000000';
          strokeStyle = '-webkit-text-stroke:' + sw + 'px ' + sc + ';';
        }
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;font-size:' + el.size * self.scale + 'px;color:' + el.color + ';' + w + ta + fw + lh + sh + op + gradStyle + strokeStyle + dc + '">' + self.esc(el.text || '') + '</div>';
      }
      case 'rectangle':
        var rectBg = el.fillColor2 ? 'background:linear-gradient(135deg,' + el.color + ',' + el.fillColor2 + ')' : 'background:' + el.color;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + el.w * self.scale + 'px;height:' + el.h * self.scale + 'px;' + rectBg + ';border-radius:' + (el.radius || 0) * self.scale + 'px;' + op + dc + '"></div>' + rh;
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
