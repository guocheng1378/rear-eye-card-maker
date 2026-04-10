// ─── Shape Editor: rectangle / circle / arc / line / progress ─────
import { fieldHtml, colorFieldHtml, colorFieldHtml2, esc } from './common.js';

var GRAD_PRESETS = [
  { name: '赛博朋克', c1: '#ff00ff', c2: '#00ffff' },
  { name: '日落', c1: '#e55039', c2: '#f39c12' },
  { name: '海洋', c1: '#0984e3', c2: '#00cec9' },
  { name: '森林', c1: '#2d5016', c2: '#6ab04c' },
  { name: '极光', c1: '#6c5ce7', c2: '#00b894' },
  { name: '霓虹', c1: '#ff00ff', c2: '#39ff14' },
  { name: '暗金', c1: '#2c3e50', c2: '#f39c12' },
  { name: '玫瑰', c1: '#e84393', c2: '#fd79a8' },
];

export function renderRectangleEditor(el, idx) {
  var html = '';
  html += colorFieldHtml('颜色', el.color || '#333333', 'color', idx);

  // 渐变
  html += fieldHtml('渐变', '<div style="display:flex;gap:6px;align-items:center">' +
    colorFieldHtml2(el.fillColor2 || '', 'fillColor2', idx) +
    (el.fillColor2 ? '<button class="el-btn" data-clear-fill2 data-idx="' + idx + '" style="font-size:10px;padding:3px 6px">✕</button>' : '') +
    '</div>');

  // 渐变方向
  if (el.fillColor2) {
    var gradOpts = [
      { v: 'top_bottom', l: '⬇ 上→下' }, { v: 'left_right', l: '➡ 左→右' },
      { v: 'tl_br', l: '↘ 左上→右下' }, { v: 'tr_bl', l: '↙ 右上→左下' },
    ];
    html += fieldHtml('渐变方向', '<select data-prop="gradientOrientation" data-idx="' + idx + '">' +
      gradOpts.map(function (o) {
        return '<option value="' + o.v + '"' + ((el.gradientOrientation || 'top_bottom') === o.v ? ' selected' : '') + '>' + o.l + '</option>';
      }).join('') + '</select>');
  }

  // 多色阶渐变编辑器
  var stops = el.gradientStops || (el.fillColor2 ? [{ color: el.color, pos: 0 }, { color: el.fillColor2, pos: 100 }] : null);
  if (el.fillColor2 || (stops && stops.length > 0)) {
    var stopsData = stops || [{ color: el.color, pos: 0 }, { color: el.fillColor2 || '#ffffff', pos: 100 }];
    var gradCSS = stopsData.map(function (s) { return s.color + ' ' + s.pos + '%'; }).join(',');
    var gradAngle = { top_bottom: '180deg', left_right: '90deg', tl_br: '135deg', tr_bl: '225deg' };
    var angle = gradAngle[el.gradientOrientation] || '180deg';
    html += '<div style="margin:8px 0"><div style="font-size:10px;color:var(--text3);margin-bottom:4px">🌈 多色阶渐变</div>';
    html += '<div style="height:32px;border-radius:6px;background:linear-gradient(' + angle + ',' + gradCSS + ');margin-bottom:6px;position:relative;border:1px solid var(--border)"></div>';
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">';
    stopsData.forEach(function (s, si) {
      html += '<div style="display:flex;align-items:center;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 4px">' +
        '<input type="color" value="' + s.color + '" data-gradient-stop-color="' + si + '" data-idx="' + idx + '" style="width:20px;height:18px;padding:0;border:none;cursor:pointer">' +
        '<input type="number" value="' + s.pos + '" data-gradient-stop-pos="' + si + '" data-idx="' + idx + '" min="0" max="100" style="width:32px;font-size:10px;text-align:center;border:none;background:transparent;color:var(--text)">%' +
        (stopsData.length > 2 ? '<button class="el-btn" data-remove-gradient-stop="' + si + '" data-idx="' + idx + '" style="font-size:9px;padding:0 3px;color:var(--red)">✕</button>' : '') +
        '</div>';
    });
    html += '<button class="el-btn" data-add-gradient-stop data-idx="' + idx + '" style="font-size:10px;padding:2px 6px">+ 色标</button>';
    html += '</div></div>';
  }

  // 渐变预设
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px">';
  GRAD_PRESETS.forEach(function (p) {
    html += '<div class="grad-preset" data-gp-c1="' + p.c1 + '" data-gp-c2="' + p.c2 + '" data-gp-idx="' + idx + '" data-gp-type="rectangle" style="height:24px;border-radius:4px;background:linear-gradient(135deg,' + p.c1 + ',' + p.c2 + ');cursor:pointer" title="' + p.name + '"></div>';
  });
  html += '</div>';

  html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 0) + '" data-prop="radius" data-idx="' + idx + '" min="0" max="500">');

  // 描边
  html += fieldHtml('描边', '<div style="display:flex;gap:6px;align-items:center">' +
    '<input type="number" value="' + (el.strokeWidth || 0) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="0" max="20" style="width:60px">' +
    (el.strokeWidth > 0 ? colorFieldHtml2(el.strokeColor || '#ffffff', 'strokeColor', idx) : '') +
    '</div>');

  // 模糊
  html += fieldHtml('模糊', '<input type="range" min="0" max="30" value="' + (el.blur || 0) + '" data-prop="blur" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.blur || 0) + 'px</span>');

  // 毛玻璃快捷预设
  html += '<div style="margin:4px 0 8px;display:flex;gap:4px;flex-wrap:wrap">' +
    '<button class="el-btn" data-glass-preset="light" data-idx="' + idx + '" style="font-size:10px;padding:3px 8px">🪟 轻毛玻璃</button>' +
    '<button class="el-btn" data-glass-preset="dark" data-idx="' + idx + '" style="font-size:10px;padding:3px 8px">🌑 深毛玻璃</button>' +
    '<button class="el-btn" data-glass-preset="color" data-idx="' + idx + '" style="font-size:10px;padding:3px 8px">🌈 彩色毛玻璃</button>' +
    '</div>';

  // CSS 滤镜
  html += fieldHtml('亮度', '<input type="range" min="0" max="200" value="' + (el.brightness !== undefined ? el.brightness : 100) + '" data-prop="brightness" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.brightness !== undefined ? el.brightness : 100) + '%</span>');
  html += fieldHtml('饱和度', '<input type="range" min="0" max="200" value="' + (el.saturate !== undefined ? el.saturate : 100) + '" data-prop="saturate" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.saturate !== undefined ? el.saturate : 100) + '%</span>');
  html += fieldHtml('色相', '<input type="range" min="0" max="360" value="' + (el.hueRotate || 0) + '" data-prop="hueRotate" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.hueRotate || 0) + '°</span>');

  return html;
}

export function renderCircleEditor(el, idx) {
  var html = '';
  html += colorFieldHtml('颜色', el.color || '#6c5ce7', 'color', idx);
  html += fieldHtml('描边', '<div style="display:flex;gap:6px;align-items:center">' +
    '<input type="number" value="' + (el.strokeWidth || 0) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="0" max="20" style="width:60px">' +
    (el.strokeWidth > 0 ? colorFieldHtml2(el.strokeColor || '#ffffff', 'strokeColor', idx) : '') +
    '</div>');
  return html;
}

export function renderArcEditor(el, idx) {
  var html = '';
  html += colorFieldHtml('颜色', el.color || '#6c5ce7', 'color', idx);
  html += fieldHtml('起始角', '<input type="number" value="' + (el.startAngle || 0) + '" data-prop="startAngle" data-idx="' + idx + '" min="0" max="360">°');
  html += fieldHtml('终止角', '<input type="number" value="' + (el.endAngle || 270) + '" data-prop="endAngle" data-idx="' + idx + '" min="0" max="360">°');
  html += fieldHtml('线宽', '<input type="number" value="' + (el.strokeWidth || 6) + '" data-prop="strokeWidth" data-idx="' + idx + '" min="1" max="30">');
  return html;
}

export function renderProgressEditor(el, idx) {
  var html = '';
  html += fieldHtml('进度', '<input type="range" min="0" max="100" value="' + (el.value || 60) + '" data-prop="value" data-idx="' + idx + '"><span style="font-size:10px;color:var(--text3)">' + (el.value || 60) + '%</span>');
  html += colorFieldHtml('前景', el.color || '#6c5ce7', 'color', idx);
  html += colorFieldHtml('背景', el.bgColor || '#333333', 'bgColor', idx);
  html += fieldHtml('圆角', '<input type="number" value="' + (el.radius || 4) + '" data-prop="radius" data-idx="' + idx + '" min="0" max="50">');
  return html;
}
