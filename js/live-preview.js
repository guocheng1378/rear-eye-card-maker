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

// ─── Template Renderers ───────────────────────────────────────────
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
  var steps = 6542;
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
  var cx = this.camW + (PREVIEW_W - this.camW) / 2;
  var cy = 120 * this.scale;
  var pct = demoVal;
  var label = isBattery ? '电量' : '步数';
  var unit = isBattery ? '%' : '步';
  return this.bg(c.bgColor,
    '<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 ' + PREVIEW_W + ' ' + (252) + '">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + ringR + '" fill="none" stroke="' + c.trackColor + '" stroke-width="' + ringW + '" />' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + ringR + '" fill="none" stroke="' + c.ringColor + '" stroke-width="' + ringW + '" ' +
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
PreviewRenderer.prototype.renderElements = function (elements, files, selIdx) {
  var self = this;
  return elements.map(function (el, i) {
    if (el.visible === false && i !== selIdx) return ''; // skip hidden (unless selected)
    var px = self.camW + el.x * self.scale;
    var py = el.y * self.scale;
    var inCam = el.x < self.device.width * self.device.cameraZoneRatio;
    var bdr = '';
    if (i === selIdx && inCam) bdr = 'outline:2px solid #e17055;outline-offset:2px;';
    else if (i === selIdx) bdr = 'outline:1.5px dashed #6c5ce7;outline-offset:2px;';
    else if (inCam) bdr = 'outline:1.5px dashed rgba(225,112,85,0.6);outline-offset:2px;';
    var dc = 'cursor:move;' + bdr;
    var op = (el.opacity !== undefined && el.opacity !== 100) ? 'opacity:' + (el.opacity / 100) + ';' : '';
    var rot = (el.rotation && el.rotation !== 0) ? 'transform:rotate(' + el.rotation + 'deg);transform-origin:center;' : '';
    var sh = '';
    if (el.shadow === 'light') sh = 'text-shadow:0 1px 3px rgba(0,0,0,0.4);';
    else if (el.shadow === 'dark') sh = 'text-shadow:0 2px 6px rgba(0,0,0,0.8);';
    else if (el.shadow === 'glow') sh = 'text-shadow:0 0 8px ' + el.color + ',0 0 16px ' + el.color + ';';

    // Resize handle
    var rh = '';
    if (i === selIdx && (el.type === 'rectangle' || el.type === 'image' || el.type === 'video' || el.type === 'progress')) {
      var ew = (el.w || 100) * self.scale, eh = (el.h || 100) * self.scale;
      rh = '<div data-resize-idx="' + i + '" style="position:absolute;left:' + (px + ew - 6) + 'px;top:' + (py + eh - 6) + 'px;width:10px;height:10px;background:#6c5ce7;border:1px solid #fff;border-radius:2px;cursor:nwse-resize;z-index:20"></div>';
    }

    // Size label
    var sizeLabel = '';
    if (i === selIdx) {
      var elW = el.w || (el.r ? el.r * 2 : 0) || 0;
      var elH = el.h || (el.r ? el.r * 2 : 0) || 0;
      sizeLabel = '<div class="size-label" style="position:absolute;left:' + px + 'px;top:' + (py + elH * self.scale + 4) + 'px;font-size:10px;color:var(--accent);background:rgba(108,92,231,0.15);padding:1px 6px;border-radius:3px;white-space:nowrap;z-index:20">x:' + el.x + ' y:' + el.y + ' · ' + elW + '×' + elH + '</div>';
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
        var gradStyle = '';
        if (el.textGradient && el.textGradient !== 'none') {
          var gradColors = { sunset: '#ff6b6b,#feca57', ocean: '#0984e3,#00cec9', neon: '#ff00ff,#00ffff', gold: '#f39c12,#fdcb6e', aurora: '#6c5ce7,#00b894' };
          var gc = el.textGradient === 'custom' ? (el.color || '#ffffff') + ',' + (el.gradientColor2 || '#ff6b6b') : gradColors[el.textGradient] || gradColors.sunset;
          gradStyle = 'background:linear-gradient(135deg,' + gc + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
        }
        var strokeStyle = '';
        if (el.textStroke && el.textStroke > 0) {
          strokeStyle = '-webkit-text-stroke:' + (el.textStroke * self.scale) + 'px ' + (el.textStrokeColor || '#000000') + ';';
        }
        var textContent = self.esc(el.text || '');
        if (el.multiLine) textContent = textContent.replace(/\n/g, '<br>');
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;font-size:' + el.size * self.scale + 'px;color:' + el.color + ';' + ff + w + ta + fw + lh + sh + op + rot + gradStyle + strokeStyle + dc + '">' + textContent + '</div>';
      }
      case 'rectangle':
        var rectBg = el.fillColor2 ? 'background:linear-gradient(135deg,' + el.color + ',' + el.fillColor2 + ')' : 'background:' + el.color;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + el.w * self.scale + 'px;height:' + el.h * self.scale + 'px;' + rectBg + ';border-radius:' + (el.radius || 0) * self.scale + 'px;' + op + rot + dc + '"></div>' + rh + sizeLabel;
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
        if (fi) return '<img data-el-idx="' + i + '" src="' + fi.dataUrl + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 100) * self.scale + 'px;height:' + (el.h || 100) * self.scale + 'px;object-fit:' + (el.fit || 'cover') + ';border-radius:2px;' + dc + '">' + rh + sizeLabel;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 100) * self.scale + 'px;height:' + (el.h || 100) * self.scale + 'px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#666;' + dc + '">🖼</div>' + rh + sizeLabel;
      }
      case 'video': {
        var fi2 = el.fileName ? files[el.fileName] : null;
        if (fi2) return '<video data-el-idx="' + i + '" src="' + fi2.dataUrl + '" muted loop autoplay style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 240) * self.scale + 'px;height:' + (el.h || 135) * self.scale + 'px;object-fit:' + (el.fit || 'cover') + ';border-radius:2px;' + dc + '"></video>' + rh + sizeLabel;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + (el.w || 240) * self.scale + 'px;height:' + (el.h || 135) * self.scale + 'px;background:#1a1a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#555;' + dc + '">🎬</div>' + rh + sizeLabel;
      }
      case 'progress': {
        var pw = (el.w || 200) * self.scale, ph = (el.h || 8) * self.scale;
        return '<div data-el-idx="' + i + '" style="position:absolute;left:' + (self.camW + el.x * self.scale) + 'px;top:' + (el.y * self.scale) + 'px;width:' + pw + 'px;height:' + ph + 'px;background:' + (el.bgColor || '#333') + ';border-radius:' + ((el.radius || 4) * self.scale) + 'px;' + dc + '"><div style="width:' + ((el.value || 60)) + '%;height:100%;background:' + el.color + ';border-radius:inherit"></div></div>' + rh + sizeLabel;
      }
      default: return sizeLabel;
    }
  }).join('');
};


// ─── rawXml Template Previews ────────────────────────────────────
PreviewRenderer.prototype.renderLyrics = function (c) {
  var mode = c.lyricMode || 'original';
  var lx = this.camW + 14;
  var sw = PREVIEW_W - this.camW - 28;
  var songS = Math.round((c.songSize || 26) * this.scale);
  var lyricS = Math.round((c.lyricSize || 22) * this.scale);
  var subS = Math.max(10, lyricS - 4);
  var demoLyric = '我已经爱上你\n疯狂地爱上你';
  var demoTrans = 'I've fallen for you\nCrazy in love with you';
  var demoRom = 'Wo yi jing ai shang ni';

  var html = this.bg(c.bgColor, '');
  // Accent bar
  html += '<div style="position:absolute;left:' + (this.camW + 2) + 'px;top:0;width:2px;height:100%;background:' + (c.accentColor || '#6c5ce7') + ';opacity:0.3"></div>';
  // Song info
  html += '<div style="position:absolute;left:' + lx + 'px;top:14px;font-size:' + songS + 'px;color:' + (c.songColor || '#fff') + ';font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:' + sw + 'px">光年之外</div>';
  html += '<div style="position:absolute;left:' + lx + 'px;top:' + (14 + songS + 4) + 'px;font-size:' + Math.round(10 * this.scale) + 'px;color:' + (c.artistColor || '#888') + '">邓紫棋</div>';
  // Divider
  html += '<div style="position:absolute;left:' + lx + 'px;top:' + (14 + songS + 20) + 'px;width:' + sw + 'px;height:1px;background:' + (c.accentColor || '#6c5ce7') + ';opacity:0.2"></div>';
  // Lyrics
  var lyY = 14 + songS + 32;
  if (mode === 'original' || mode === 'translation' || mode === 'romanization') {
    var text = mode === 'translation' ? demoTrans.replace('\n', '<br>') : mode === 'romanization' ? demoRom : demoLyric.replace('\n', '<br>');
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + lyY + 'px;font-size:' + lyricS + 'px;color:' + (c.lyricColor || '#fff') + ';line-height:1.6;max-width:' + sw + 'px">' + text + '</div>';
  } else if (mode === 'dual') {
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + lyY + 'px;font-size:' + lyricS + 'px;color:' + (c.lyricColor || '#fff') + ';line-height:1.4;max-width:' + sw + 'px">' + demoLyric.replace('\n', '<br>') + '</div>';
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + (lyY + lyricS * 1.8) + 'px;font-size:' + subS + 'px;color:' + (c.lyricSubColor || '#777') + ';line-height:1.4;max-width:' + sw + 'px">' + demoTrans.replace('\n', '<br>') + '</div>';
  } else {
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + lyY + 'px;font-size:' + lyricS + 'px;color:' + (c.lyricColor || '#fff') + ';line-height:1.3;max-width:' + sw + 'px">' + demoLyric.replace('\n', '<br>') + '</div>';
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + (lyY + lyricS * 1.8) + 'px;font-size:' + subS + 'px;color:' + (c.lyricSubColor || '#777') + ';line-height:1.3;max-width:' + sw + 'px">' + demoTrans.replace('\n', '<br>') + '</div>';
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + (lyY + lyricS * 1.8 + subS * 1.8 + 4) + 'px;font-size:' + (subS - 2) + 'px;color:' + (c.lyricDimColor || '#444') + ';line-height:1.3;max-width:' + sw + 'px">' + demoRom + '</div>';
  }
  // Play indicator
  html += '<div style="position:absolute;left:' + lx + 'px;bottom:10px;display:flex;align-items:center;gap:4px"><div style="width:5px;height:5px;border-radius:50%;background:' + (c.accentColor || '#6c5ce7') + '"></div><span style="font-size:' + Math.round(9 * this.scale) + 'px;color:' + (c.artistColor || '#888') + '">正在播放</span></div>';
  return html;
};

PreviewRenderer.prototype.renderHealth = function (c) {
  var lx = this.camW + 12;
  var sw = PREVIEW_W - this.camW - 24;
  var accent = c.accentColor || '#e74c3c';
  var items = [];
  if (c.showHeartRate !== 'false') items.push({ icon: '❤️', label: '心率', value: '72', unit: 'bpm', color: accent });
  if (c.showBloodOxygen !== 'false') items.push({ icon: '🫁', label: '血氧', value: '98', unit: '%', color: '#0984e3' });
  if (c.showSteps !== 'false') items.push({ icon: '🚶', label: '步数', value: '6,542', unit: '步', color: '#00b894' });
  if (c.showSleep !== 'false') items.push({ icon: '😴', label: '睡眠', value: '7h23', unit: '', color: '#6c5ce7' });
  if (items.length === 0) items.push({ icon: '❤️', label: '心率', value: '72', unit: 'bpm', color: accent });

  var html = this.bg(c.bgColor || '#0a1628', '');
  html += '<div style="position:absolute;left:' + lx + 'px;top:12px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + (c.titleColor || '#fff') + ';font-weight:600">健康数据</div>';
  var cols = Math.min(items.length, 2);
  var cellW = sw / cols;
  items.forEach(function (item, i) {
    var col = i % cols, row = Math.floor(i / cols);
    var cx = lx + col * cellW;
    var cy = 38 + row * Math.round(64 * this.scale);
    html += '<div style="position:absolute;left:' + cx + 'px;top:' + cy + 'px">';
    html += '<div style="font-size:' + Math.round(20 * this.scale) + 'px">' + item.icon + '</div>';
    html += '<div style="font-size:' + Math.round(28 * this.scale) + 'px;color:' + (c.valueColor || '#fff') + ';font-weight:700;margin-top:2px">' + item.value + '</div>';
    html += '<div style="font-size:' + Math.round(10 * this.scale) + 'px;color:' + (c.labelColor || '#888') + '">' + item.label + (item.unit ? ' ' + item.unit : '') + '</div>';
    html += '</div>';
  }.bind(this));
  html += '<div style="position:absolute;right:8px;bottom:6px;font-size:8px;color:' + (c.labelColor || '#888') + ';opacity:0.3">需真实设备数据</div>';
  return html;
};

PreviewRenderer.prototype.renderSchedule = function (c) {
  var lx = this.camW + 12;
  var sw = PREVIEW_W - this.camW - 24;
  var events = ['09:00 团队会议', '14:30 代码评审', '17:00 健身'];
  var maxE = c.maxEvents || 3;
  var html = this.bg(c.bgColor || '#0d1117', '');
  // Date
  html += '<div style="position:absolute;left:' + lx + 'px;top:12px;font-size:' + Math.round(12 * this.scale) + 'px;color:' + (c.dateColor || '#fff') + ';opacity:0.6">' + this.fmtDate(new Date(), 'MM/dd EEEE') + '</div>';
  html += '<div style="position:absolute;left:' + lx + 'px;top:28px;font-size:' + Math.round(18 * this.scale) + 'px;color:' + (c.accentColor || '#6c5ce7') + ';font-weight:600">今日日程</div>';
  // Divider
  html += '<div style="position:absolute;left:' + lx + 'px;top:52px;width:' + sw + 'px;height:1px;background:' + (c.accentColor || '#6c5ce7') + ';opacity:0.15"></div>';
  events.slice(0, maxE).forEach(function (ev, i) {
    var parts = ev.split(' ');
    var y = 62 + i * Math.round(36 * this.scale);
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + y + 'px">';
    html += '<div style="width:4px;height:4px;border-radius:50%;background:' + (c.dotColor || '#00b894') + ';display:inline-block;margin-right:6px;vertical-align:middle"></div>';
    if (c.showTime !== 'false') {
      html += '<span style="font-size:' + Math.round(11 * this.scale) + 'px;color:' + (c.eventTimeColor || '#888') + '">' + parts[0] + '</span> ';
    }
    html += '<span style="font-size:' + Math.round(12 * this.scale) + 'px;color:' + (c.eventTitleColor || '#e0e0e0') + '">' + (parts.slice(1).join(' ') || parts[0]) + '</span>';
    html += '</div>';
  }.bind(this));
  return html;
};

PreviewRenderer.prototype.renderNotification = function (c) {
  var lx = this.camW + 12;
  var sw = PREVIEW_W - this.camW - 24;
  var notifs = [
    { app: '微信', title: '张三', body: '晚上一起吃饭？', time: '12:30' },
    { app: '淘宝', title: '物流更新', body: '您的包裹已到达驿站', time: '11:15' },
    { app: '日历', title: '提醒', body: '30分钟后有会议', time: '08:50' },
  ];
  var maxN = c.maxNotifs || 3;
  var html = this.bg(c.bgColor || '#0a0a0a', '');
  html += '<div style="position:absolute;left:' + lx + 'px;top:12px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + (c.titleColor || '#fff') + ';font-weight:600">通知</div>';
  notifs.slice(0, maxN).forEach(function (n, i) {
    var y = 34 + i * Math.round(52 * this.scale);
    html += '<div style="position:absolute;left:' + lx + 'px;top:' + y + 'px;max-width:' + sw + 'px">';
    if (c.showApp !== 'false') {
      html += '<span style="font-size:' + Math.round(9 * this.scale) + 'px;color:' + (c.appColor || '#6c5ce7') + '">' + n.app + '</span>';
    }
    if (c.showTime !== 'false') {
      html += '<span style="font-size:' + Math.round(9 * this.scale) + 'px;color:' + (c.timeColor || '#555') + ';float:right">' + n.time + '</span>';
    }
    html += '<div style="font-size:' + Math.round(12 * this.scale) + 'px;color:' + (c.titleColor || '#fff') + ';font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:' + sw + 'px">' + n.title + '</div>';
    html += '<div style="font-size:' + Math.round(10 * this.scale) + 'px;color:' + (c.bodyColor || '#aaa') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:' + sw + 'px">' + n.body + '</div>';
    html += '</div>';
  }.bind(this));
  return html;
};

PreviewRenderer.prototype.renderQuickSettings = function (c) {
  var lx = this.camW + 14;
  var sw = PREVIEW_W - this.camW - 28;
  var active = c.activeColor || '#6c5ce7';
  var inactive = c.inactiveColor || '#333';
  var toggles = [];
  if (c.showWifi !== 'false') toggles.push({ icon: '📶', label: 'WiFi', on: true });
  if (c.showBluetooth !== 'false') toggles.push({ icon: '🔵', label: '蓝牙', on: true });
  if (c.showBrightness !== 'false') toggles.push({ icon: '☀️', label: '亮度', on: false });
  if (c.showSilent !== 'false') toggles.push({ icon: '🔇', label: '静音', on: false });
  if (c.showNfc !== 'false') toggles.push({ icon: '📡', label: 'NFC', on: true });
  if (c.showFlashlight !== 'false') toggles.push({ icon: '🔦', label: '手电', on: false });
  if (toggles.length === 0) toggles.push({ icon: '📶', label: 'WiFi', on: true });

  var html = this.bg(c.bgColor || '#0a0e1a', '');
  html += '<div style="position:absolute;left:' + lx + 'px;top:12px;font-size:' + Math.round(14 * this.scale) + 'px;color:' + (c.titleColor || '#fff') + ';font-weight:600">快捷设置</div>';
  var cols = Math.min(toggles.length, 3);
  var gap = 8;
  var cellW = (sw - gap * (cols - 1)) / cols;
  var iconSz = Math.round((c.iconSize || 40) * this.scale * 0.6);
  toggles.forEach(function (t, i) {
    var col = i % cols, row = Math.floor(i / cols);
    var cx = lx + col * (cellW + gap);
    var cy = 36 + row * Math.round(60 * this.scale);
    var bg = t.on ? active : inactive;
    html += '<div style="position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:' + cellW + 'px;text-align:center">';
    html += '<div style="width:' + iconSz + 'px;height:' + iconSz + 'px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:' + Math.round(iconSz * 0.55) + 'px">' + t.icon + '</div>';
    html += '<div style="font-size:' + Math.round(9 * this.scale) + 'px;color:' + (c.labelColor || '#888') + ';margin-top:3px">' + t.label + '</div>';
    html += '</div>';
  }.bind(this));
  return html;
};


PreviewRenderer.prototype.renderVideoWallpaper = function (c) {
  var bg = c.bgColor || '#000000';
  var html = '<div style="position:absolute;inset:0;background:' + bg + '"></div>';
  // Video placeholder with play icon
  html += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px">';
  html += '<div style="width:' + Math.round(48 * this.scale) + 'px;height:' + Math.round(48 * this.scale) + 'px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:' + Math.round(24 * this.scale) + 'px">▶️</div>';
  html += '<div style="font-size:' + Math.round(11 * this.scale) + 'px;color:rgba(255,255,255,0.4)">上传视频以预览</div>';
  html += '</div>';
  // Settings indicator
  var settings = [];
  if (c.loopMode === 'loop') settings.push('🔁 循环');
  else if (c.loopMode === 'bounce') settings.push('↔️ 来回');
  else settings.push('▶️ 单次');
  if (c.volume > 0) settings.push('🔊 ' + c.volume + '%');
  if (c.overlayEnable === 'true') settings.push('🎭 遮罩');
  html += '<div style="position:absolute;left:8px;bottom:6px;font-size:' + Math.round(8 * this.scale) + 'px;color:rgba(255,255,255,0.3)">' + settings.join(' · ') + '</div>';
  return html;
};

// ─── Render Template Preview (dispatch) ───────────────────────────
export function renderTemplatePreview(device, showCam, tpl, cfg) {
  if (tpl.rawXml) {
    return renderRealDevicePreview(device, showCam, tpl, cfg);
  }
  var r = new PreviewRenderer(device, showCam);
  switch (tpl.id) {
    case 'clock':      return r.renderClock(cfg);
    case 'quote':      return r.renderQuote(cfg);
    case 'battery':    return r.renderBattery(cfg);
    case 'status':     return r.renderStatus(cfg);
    case 'countdown':  return r.renderCountdown(cfg);
    case 'music':      return r.renderMusic(cfg);
    case 'gradient':   return r.renderGradient(cfg);
    case 'weather':    return r.renderWeather(cfg);
    case 'steps':      return r.renderSteps(cfg);
    case 'calendar':   return r.renderCalendar(cfg);
    case 'dualclock':  return r.renderDualclock(cfg);
    case 'dailyquote': return r.renderDailyquote(cfg);
    case 'ring':       return r.renderRing(cfg);
    case 'dashboard':  return r.renderDashboard(cfg);
    case 'image':      return r.renderImage(cfg);
    case 'custom':          return r.renderCustom(cfg);
    case 'video_wallpaper': return r.renderVideoWallpaper(cfg);
    default:                return '';
  }
}

function renderRealDevicePreview(device, showCam, tpl, cfg) {
  var r = new PreviewRenderer(device, showCam);
  switch (tpl.id) {
    case 'lyrics':        return r.renderLyrics(cfg);
    case 'health':        return r.renderHealth(cfg);
    case 'schedule':      return r.renderSchedule(cfg);
    case 'notification':  return r.renderNotification(cfg);
    case 'quick_settings':return r.renderQuickSettings(cfg);
  }
  // Fallback for weather_real / music_real
  var camW = showCam ? 420 * device.cameraZoneRatio : 0;
  var bg = cfg.bgColor || '#0a1628';
  var dc = cfg.descColor || '#888888';
  if (tpl.id === 'weather_real') {
    return '<div style="position:absolute;inset:0;background:' + bg + '"></div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:20px;font-size:40px;color:' + (cfg.timeColor || '#fff') + ';font-weight:700">09:41</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:68px;font-size:12px;color:' + dc + '">4月6日 星期日</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:88px;font-size:32px;color:' + (cfg.tempColor || '#fff') + ';font-weight:700">23°</div>' +
      '<div style="position:absolute;left:' + (camW + 10) + 'px;top:128px;font-size:11px;color:' + dc + '">北京 · 晴</div>' +
      '<div style="position:absolute;right:8px;bottom:6px;font-size:8px;color:' + dc + ';opacity:0.3">需真实设备数据</div>';
  }
  if (tpl.id === 'music_real') {
    return '<div style="position:absolute;inset:0;background:' + bg + '"></div>' +
      '<div style="position:absolute;left:' + (camW + 14) + 'px;top:18px;font-size:15px;color:' + (cfg.titleColor || '#fff') + ';font-weight:700">歌曲名称</div>' +
      '<div style="position:absolute;left:' + (camW + 14) + 'px;top:40px;font-size:10px;color:' + (cfg.artistColor || '#888') + '">歌手名称</div>' +
      '<div style="position:absolute;right:8px;bottom:6px;font-size:8px;color:' + dc + ';opacity:0.3">需真实设备数据</div>';
  }
  return '<div style="position:absolute;inset:0;background:' + bg + '"></div>';
}

export { PreviewRenderer };
