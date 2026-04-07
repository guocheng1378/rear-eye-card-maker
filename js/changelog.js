// ─── Changelog: 更新日志数据 + 弹窗 — ES Module ──────────────────

var CHANGELOG = [
  {
    version: 'v4.7',
    date: '2026-04-07',
    items: [
      '🏗️ 架构重构 — ui.js 拆分为子模块，ES Module 统一',
      '🔍 XML 解析升级 — ZIP 导入改用 DOMParser + regex 降级',
      '🛡️ 安全加固 — 移除 JSZip 内部属性访问',
      '◠ 弧形 SVG 预览 — 编辑器和导出一致',
      '⭕ 圆形描边支持 — strokeWidth + strokeColor',
      '🎨 PNG/SVG 导出增强 — 支持弧形和圆形描边渲染',
    ],
  },
  {
    version: 'v4.6',
    date: '2026-04-06',
    items: [
      '🔄 元素旋转 — 0-360° 旋转控制，预览+MAML导出',
      '📐 SVG 矢量导出 — 支持渐变/描边/旋转',
      '📏 行间距控制 — 文字多行自定义行高',
      '🔲 矩形渐变导出 — fillColor2 支持',
      '💨 矩形模糊导出 — blur 属性输出',
      '🔤 颜色 hex 输入 — 可直接输入色值',
      '🖱️ Alt+拖拽复制 — 类似 Figma 交互',
      '📱 响应式布局 — 手机/平板适配',
      '📴 离线指示器 — 断网时显示提示',
      '⚠️ 错误边界 — 全局错误捕获不白屏',
    ],
  },
  {
    version: 'v4.5',
    date: '2026-04-06',
    items: [
      '📁 背景图上传按钮 — 点击选择本地图片作为卡片背景',
      '📏 智能对齐线 — 拖拽时显示中心/边缘参考线',
      '↩️ Toast 撤销 — 删除操作后可一键恢复',
      '📂 配置区折叠 — 点击标题收起/展开配置分组',
      '🔘 Toggle 开关 — 是/否选项改为滑动开关',
      '💾 自动保存提示 — 右下角显示保存状态',
      '🏷️ 模板分类标签 — 按时间/信息/媒体/设备/自定义筛选',
    ],
  },
  {
    version: 'v4.4',
    date: '2026-04-06',
    items: [
      '⌨️ 方向键移动元素 — ↑↓←→ 移动 1px，Shift+方向键 10px',
      '📝 操作历史描述 — 撤销面板显示具体操作名称',
      '🔍 配置页缩放 — 实时预览区域可缩放 50%~200%',
    ],
  },
  {
    version: 'v4.3',
    date: '2026-04-06',
    items: [
      '🎬 元素动画 — 7 种 MAML 动画',
      '🎨 颜色面板 — 24 色预设 + 最近使用颜色',
      '📋 右键菜单 — 复制/删除/锁定/置顶置底/对齐',
      '📐 列表拖拽排序 — 元素支持拖拽调整 z-index',
      '🎭 Lottie 动画 — 新增 Lottie JSON 动画元素',
      '⭐ 模板收藏 — 收藏常用模板置顶显示',
    ],
  },
  {
    version: 'v4.2',
    date: '2026-04-06',
    items: ['🎨 XML 代码编辑器 — 语法高亮/行号/Tab缩进/格式化'],
  },
  {
    version: 'v4.1',
    date: '2026-04-06',
    items: [
      '📂 拖拽上传 — 图片/视频直接拖入页面',
      '💾 自动保存草稿 — localStorage 定时保存',
      '📜 撤销历史面板 — 查看和跳转到任意操作步骤',
      '◠ 弧形/▰ 进度条元素 — 新增 Arc 和 Progress 类型',
      '🔒 元素锁定 — 锁定后防止误拖拽',
      '🔍 模板搜索 — 按名称/描述过滤模板',
    ],
  },
  {
    version: 'v4.0',
    date: '2026-04-05',
    items: [
      '🌤️🎵 真实设备模板 — 天气/音乐卡片绑定系统数据',
      '🔤 字体选择 — 8 种字体',
      '🌈 文字渐变 — 6 种预设 + 自定义双色渐变',
      '✏️ 文字描边 — 可调粗细和颜色',
      '📝 XML 直接编辑 — textarea 可手动修改 MAML 代码',
      '📱 通用卡片导出 — 一份 MAML 自动适配 4 款机型',
      '📲 PWA 离线支持 — 安装到桌面 + 断网可用',
      '🤖 APK 在线构建 — 网页触发 GitHub Actions',
      '🔗 模板分享 — URL 编码分享',
      '🔄 视频强制转码 — MP4 编码不兼容时可转为 H.264',
      '📐 矩形模糊 — backdrop blur 效果',
    ],
  },
];

export function toggleChangelog() {
  var modal = document.getElementById('changelogModal');
  if (!modal) return;
  if (modal.style.display === 'none') {
    var list = document.getElementById('changelogList');
    list.innerHTML = CHANGELOG.map(function (v) {
      return '<div class="changelog-version">' +
        '<div class="changelog-header"><span class="changelog-ver">' + v.version + '</span><span class="changelog-date">' + v.date + '</span></div>' +
        '<ul class="changelog-items">' + v.items.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }).join('');
    modal.style.display = '';
  } else {
    modal.style.display = 'none';
  }
}
