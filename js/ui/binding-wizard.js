// ─── Binding Wizard: 可视化数据绑定向导 ────────────────────────────
import { toast } from './toast.js';

var _modal = null;

var DATA_SOURCES = [
  {
    id: 'weather', icon: '🌤️', name: '天气数据', desc: '温度/天气类型/城市/湿度',
    uri: 'content://weather/weatherData/4/%s',
    columns: [
      { name: 'temperature', type: 'int', label: '温度' },
      { name: 'weather_type', type: 'int', label: '天气类型' },
      { name: 'city_name', type: 'string', label: '城市' },
      { name: 'description', type: 'string', label: '天气描述' },
      { name: 'tmphighs', type: 'string[]', label: '最高温' },
      { name: 'tmplows', type: 'string[]', label: '最低温' },
    ],
  },
  {
    id: 'music', icon: '🎵', name: '音乐播放器', desc: '歌名/歌手/播放状态',
    useMusicControl: true,
    columns: [
      { name: 'title', type: 'string', label: '歌名' },
      { name: 'artist', type: 'string', label: '歌手' },
      { name: 'music_state', type: 'int', label: '播放状态(0/1)' },
    ],
  },
  {
    id: 'health', icon: '❤️', name: '健康数据', desc: '心率/血氧/步数/睡眠',
    uri: 'content://com.xiaomi.health/data',
    columns: [
      { name: 'heart_rate', type: 'int', label: '心率' },
      { name: 'blood_oxygen', type: 'int', label: '血氧' },
      { name: 'steps', type: 'int', label: '步数' },
      { name: 'sleep_hours', type: 'float', label: '睡眠时长' },
    ],
  },
  {
    id: 'calendar', icon: '📅', name: '日历事件', desc: '事件标题/开始时间/结束时间',
    uri: 'content://com.android.calendar/events',
    columns: [
      { name: 'title', type: 'string', label: '事件标题' },
      { name: 'dtstart', type: 'long', label: '开始时间' },
      { name: 'dtend', type: 'long', label: '结束时间' },
    ],
  },
  {
    id: 'battery', icon: '🔋', name: '电池状态', desc: '电量百分比/充电状态',
    useVar: true,
    columns: [
      { name: 'battery_level', type: 'int', label: '电量百分比' },
      { name: 'battery_status', type: 'int', label: '充电状态' },
    ],
  },
  {
    id: 'step', icon: '🏃', name: '步数', desc: '今日步数',
    useVar: true,
    columns: [
      { name: 'step_count', type: 'int', label: '步数' },
    ],
  },
  {
    id: 'notification', icon: '🔔', name: '通知历史', desc: '最新通知标题/内容',
    uri: 'content://com.android.notification/history',
    columns: [
      { name: 'app', type: 'string', label: '应用名' },
      { name: 'title', type: 'string', label: '标题' },
      { name: 'body', type: 'string', label: '内容' },
    ],
  },
  {
    id: 'settings', icon: '⚙️', name: '系统设置', desc: 'WiFi/蓝牙/亮度等状态',
    uri: 'content://com.android.systemui/settings',
    columns: [
      { name: 'wifi_state', type: 'int', label: 'WiFi状态' },
      { name: 'bluetooth_state', type: 'int', label: '蓝牙状态' },
      { name: 'brightness_level', type: 'int', label: '亮度' },
    ],
  },
];

export function openBindingWizard() {
  if (_modal) { _modal.remove(); _modal = null; }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = '';
  overlay.onclick = function () { closeBindingWizard(); };

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '580px';
  modal.style.maxHeight = '80vh';
  modal.onclick = function (e) { e.stopPropagation(); };

  var html = '<div class="modal-header"><h3>🔗 数据绑定向导</h3><button class="modal-close" id="bwCloseBtn">✕</button></div>';
  html += '<div class="modal-body" style="max-height:60vh;overflow-y:auto">';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:16px">选择数据源，自动生成 MAML 绑定代码</div>';

  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  DATA_SOURCES.forEach(function (ds) {
    html += '<div class="card-lib-item" style="cursor:pointer" data-bw-source="' + ds.id + '">' +
      '<div class="card-lib-icon" style="font-size:24px">' + ds.icon + '</div>' +
      '<div class="card-lib-info">' +
      '<div class="card-lib-name">' + ds.name + '</div>' +
      '<div class="card-lib-meta"><span>' + ds.desc + '</span></div>' +
      '<div class="card-lib-meta" style="margin-top:2px">' +
      ds.columns.map(function (c) { return '<span style="background:var(--surface3);padding:1px 5px;border-radius:3px;font-size:10px">' + c.label + '</span>'; }).join(' ') +
      '</div></div>' +
      '<div class="card-lib-actions"><button class="card-lib-btn" data-bw-copy="' + ds.id + '" title="复制绑定代码">📋</button></div>' +
      '</div>';
  });
  html += '</div></div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  _modal = overlay;

  overlay.querySelector('#bwCloseBtn').onclick = function () { closeBindingWizard(); };

  overlay.querySelectorAll('[data-bw-copy]').forEach(function (btn) {
    btn.onclick = function (e) {
      e.stopPropagation();
      var ds = DATA_SOURCES.find(function (d) { return d.id === btn.dataset.bwCopy; });
      if (!ds) return;
      var code = generateBindingCode(ds);
      navigator.clipboard.writeText(code).then(function () {
        toast('📋 ' + ds.name + ' 绑定代码已复制', 'success');
      });
    };
  });
}

function generateBindingCode(ds) {
  var lines = [];
  if (ds.useMusicControl) {
    lines.push('<MusicControl name="music_control" autoShow="false" autoRefresh="true" x="0" y="0" />');
    lines.push('<!-- 使用: @music_control.title, @music_control.artist, #music_control.music_state -->');
  } else if (ds.useVar) {
    lines.push('<!-- MAML 内置变量，直接使用: #' + ds.columns[0].name + ' -->');
  } else {
    lines.push('<VariableBinders>');
    lines.push('  <ContentProviderBinder name="' + ds.id + '_provider" uri="' + ds.uri + '" columns="' + ds.columns.map(function (c) { return c.name; }).join(',') + '">');
    ds.columns.forEach(function (c) {
      lines.push('    <Variable name="' + ds.id + '_' + c.name + '" type="' + c.type + '" column="' + c.name + '" />');
    });
    lines.push('  </ContentProviderBinder>');
    lines.push('</VariableBinders>');
    lines.push('<!-- 使用: @' + ds.id + '_' + ds.columns[0].name + ' -->');
  }
  return lines.join('\n');
}

export function closeBindingWizard() {
  if (_modal) { _modal.remove(); _modal = null; }
}
