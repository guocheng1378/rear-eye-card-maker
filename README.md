# REAREye 卡片制作器 v4

为小米背屏（SubScreen）制作 MAML 卡片模板的工具。

> 🌐 **在线使用**：[https://guocheng1378.github.io/rear-eye-card-maker/](https://guocheng1378.github.io/rear-eye-card-maker/)

## v4 新增

- 🌤️🎵 **真实设备模板**：天气/音乐卡片绑定系统数据（ContentProvider + MusicControl）
- 🔤 **字体选择**：8 种字体（Mi Pro 系列、Mi Bright、Noto Sans SC、Roboto、等宽）
- 🌈 **文字渐变**：6 种预设渐变 + 自定义双色渐变
- ✏️ **文字描边**：可调粗细和颜色
- 🖼️ **模板缩略图**：选择页显示 CSS mini 预览
- 📝 **XML 直接编辑**：textarea 可手动修改 MAML 代码
- 📋 **复制 XML**：一键复制到剪贴板
- 📱 **通用卡片导出**：一份 MAML 自动适配 4 款机型
- ⛶ **全屏预览**：浏览器 Fullscreen API
- 📲 **PWA 离线支持**：安装到桌面 + 断网可用
- 🤖 **APK 在线构建**：网页触发 GitHub Actions
- 🔗 **模板分享**：URL 编码分享，打开链接直接导入
- 🔄 **视频强制转码**：MP4 编码不兼容时可强制转为 H.264
- 📐 **矩形模糊**：backdrop blur 效果
- ⚡ **性能优化**：拖拽 rAF 节流、触摸支持、Toast 队列

## v3 改动

- **零构建**：砍掉 TypeScript + esbuild，纯原生 JS，改代码刷新浏览器即生效
- **模块化**：9 个 JS 文件，每个 ≤ 200 行，职责单一
- **JSZip 本地化**：不再依赖 CDN，离线可用
- **事件委托**：干掉 `window.__app` 全局污染，用 data 属性 + 事件委托
- **Android 兼容**：`node build.js` 一键打包成单文件 HTML

## 项目结构

```
rear-eye-card-maker/
├── index.html              ← 浏览器直接打开即可使用
├── css/style.css           ← 所有样式 + 响应式
├── js/
│   ├── early-init.js       ← 最早加载的初始化脚本
│   ├── main.js             ← 入口 + PWA 注册
│   ├── state.js            ← 响应式状态 + 公共工具
│   ├── utils.js            ← 通用工具函数
│   ├── devices.js          ← 设备参数（4 款机型 + 自动检测）
│   ├── maml.js             ← XML 生成 + 转义 + 校验
│   ├── live-preview.js     ← 预览渲染器
│   ├── history.js          ← 撤销/重做
│   ├── canvas.js           ← 画布拖拽
│   ├── card-library.js     ← 卡片库管理
│   ├── storage.js          ← 本地存储
│   ├── export.js           ← ZIP/PNG/SVG 导入导出
│   ├── transcode.js        ← FFmpeg.wasm 视频转码
│   ├── changelog.js        ← 更新日志
│   ├── i18n.js             ← 国际化
│   ├── templates/          ← 预设模板定义（20 个）
│   └── ui/                 ← UI 子模块
│       ├── index.js        ← UI 入口 + 事件 + JCM 全局接口
│       ├── toast.js        ← Toast 通知
│       ├── steps.js        ← 步骤导航
│       ├── code-editor.js  ← XML 代码编辑器
│       ├── elements.js     ← 元素操作（增删对齐等）
│       ├── config-panel.js ← 配置面板渲染
│       ├── share.js        ← 模板分享
│       ├── editors/        ← 各类型元素编辑器
│       └── ...             ← 更多 UI 模块
├── lib/jszip.min.js        ← JSZip（本地化）
├── manifest.json           ← PWA 清单
├── sw.js                   ← Service Worker
├── build.js                ← Node.js 构建脚本（内联打包）
└── app/                    ← Android 包装（Kotlin）
```

## 使用

### 浏览器调试
```bash
cd rear-eye-card-maker
# 用任意 HTTP 服务器打开
npx serve .
# 或直接双击 index.html（Chrome 推荐）
```

### Android 打包
```bash
npm run build
# 输出 → app/src/main/assets/index.html
# 然后用 Android Studio 构建 APK
```

### 在线构建
点击页面上的「🤖 构建 APK」按钮，自动触发 GitHub Actions 构建。

## 📱 配合 REAREye 使用（导入到小米背屏）

本工具生成的 MAML 卡片可通过 [REAREye](https://github.com/killerprojecte/REAREye) Xposed 模块导入到小米背屏上显示。

### 快速流程

1. **制作卡片** → 选择模板、调整参数
2. **导出 ZIP** → 点击「📦 导出 ZIP」下载
3. **导入 REAREye** → 打开 REAREye → 组件模板管理器 → 导入 ZIP → 设置 business 名称
4. **绑定卡片** → 卡片管理器 → 添加卡片 → business 名称填一致 → 启用常驻
5. **生效** → 重启背屏中心

> 📖 详细步骤请查看 [REAREYE_USAGE.md](REAREYE_USAGE.md)

### 前提

- 小米 17 Pro / Pro Max
- 已安装 LSPosed + [REAREye](https://github.com/killerprojecte/REAREye)
- REAREye 作用域包含 `com.xiaomi.subscreencenter`

## 模板

### 预设模板（20 个）

| 模板 | 类别 | 动态更新 |
|------|------|----------|
| 🛠️ 自定义 | 通用 | 静态 |
| 🕐 动画时钟 | 时钟 | DateTime.Second |
| 🔓 滑动解锁 | 通用 | DateTime.Minute |
| 🔋 智能电池 | 设备 | Battery |
| ⚡ 快捷按钮 | 工具 | DateTime.Minute |
| 🔢 数字时钟 | 时钟 | DateTime.Minute |
| 🌤️ 天气CP绑定 | 设备 | DateTime.Hour |
| 📊 持久计数器 | 工具 | DateTime.Minute |
| 🏋️ 健身圆环 | 健康 | Sensor |
| 🎵 音乐卡片 | 设备 | Music |
| 📅 精美日期 | 时钟 | DateTime.Day |
| 🌍 双时区时钟 | 时钟 | DateTime.Second |
| 📝 快捷便签 | 通用 | DateTime.Minute |
| 🔆 亮度滑块 | 设备 | DateTime.Minute |
| 💡 呼吸灯 | 通用 | DateTime.Second |
| 🖼️ 相框卡片 | 通用 | 静态 |
| 🍅 番茄钟 | 工具 | DateTime.Second |
| ⏱️ 速览时钟 | 时钟 | DateTime.Minute |
| 📖 每日一句 | 通用 | DateTime.Day |
| 📟 迷你状态栏 | 设备 | DateTime.Minute |

## 功能清单

### 编辑
- 🎨 20 个预设模板
- 🛠️ 自定义模式：文字、矩形、圆形、线条、图片、视频
- 🔤 字体选择（8 种）
- 🌈 文字渐变（6 种预设 + 自定义）
- ✏️ 文字描边（粗细 + 颜色）
- 📐 矩形渐变 + 模糊效果
- 📷 摄像头避让（按设备实际比例）
- ↩️ 撤销/重做（Ctrl+Z / Ctrl+Y，30 步）
- 📋 复制粘贴（Ctrl+C / Ctrl+V）
- 🎯 元素对齐（6 种对齐方式）
- 📐 吸附网格 + 智能对齐线
- 📱 拖拽移动 + 缩放（支持触摸）

### 预览
- 📱 4 款机型实时预览（Pro / Pro Max / 标准版 / Ultra）
- ⛶ 全屏预览
- 🔄 暗色/浅色主题
- 🔍 缩放控制（50% ~ 200%）

### 导出
- 📦 MAML ZIP 导出（含 XML 校验）
- 🖼️ PNG 预览截图
- 📱 通用卡片导出（一份适配所有机型）
- 📦 全部机型 ZIP 批量导出

### 视频
- 🎬 自动转码：非 MP4 格式自动转为 H.264
- 🔄 强制转码：MP4 编码不兼容时手动转码
- 🎬 支持格式：MP4、MOV、WebM、AVI、MKV、GIF

### 分享与构建
- 🔗 模板 URL 分享（打开链接直接导入）
- 💾 配置 JSON 导入导出
- 📦 MAML ZIP 导入
- 🤖 在线构建 APK
- 📲 PWA 离线使用

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `N` | 添加文字元素 |
| `R` | 添加矩形元素 |
| `C` | 添加圆形元素 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+D` | 复制当前元素 |
| `Ctrl+G` | 随机渐变色 |
| `Ctrl+S` | 导出 ZIP |
| `Ctrl+C` | 复制到剪贴板 |
| `Ctrl+V` | 从剪贴板粘贴 |
| `Ctrl+L` | 切换图层面板 |
| `Ctrl+K` | 命令面板 |
| `Shift+Tab` | 切换选中元素 |
| `Delete` | 删除当前元素 |

## 设备支持

| 设备 | 分辨率 | 摄像头区域 |
|------|--------|-----------|
| Pro Max | 976×596 | 30% |
| Pro | 904×572 | 30% |
| 标准版 | 840×520 | 28% |
| Ultra | 1020×620 | 32% |

## License

[MIT](LICENSE)
