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
│   ├── store.js            ← 响应式状态 + 公共工具
│   ├── devices.js          ← 设备参数（4 款机型 + 自动检测）
│   ├── maml.js             ← XML 生成 + 转义 + 校验
│   ├── templates.js        ← 17 个预设模板定义（含 2 个真实设备模板）
│   ├── preview.js          ← 预览渲染器
│   ├── editor.js           ← 元素编辑器 + 默认值
│   ├── export.js           ← ZIP/PNG 导入导出
│   ├── transcode.js        ← FFmpeg.wasm 视频转码
│   ├── ui.js               ← 页面导航 + 配置 + 快捷键
│   └── app.js              ← 入口 + PWA 注册
├── lib/jszip.min.js        ← JSZip（本地化）
├── manifest.json           ← PWA 清单
├── sw.js                   ← Service Worker
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

## 模板

### 预设模板（15 个）

| 模板 | 说明 | 动态更新 |
|------|------|----------|
| ⏰ 时钟卡片 | 时间 + 日期 | DateTime.Minute |
| 💬 名言卡片 | 文字 + 作者 | 静态 |
| 🔋 电池卡片 | 电量条 + 状态 | Battery |
| 📊 状态卡片 | 多个状态指标 | DateTime.Minute |
| ⏳ 倒计时卡片 | 倒计时到指定日期 | DateTime.Day |
| 🎵 音乐信息卡片 | 歌名 + 歌手 | 静态 |
| 🌈 渐变文字卡片 | 渐变背景 + 居中文字 | 静态 |
| 🌤️ 天气卡片 | 温度 + 天气描述 | Weather |
| 🏃 步数卡片 | 步数 + 进度条 | Step |
| 📅 日历卡片 | 日期 + 日程 | DateTime.Day |
| 🌏 双时钟 | 两个时区 | DateTime.Minute |
| 💊 每日一句 | 每天轮换语录 | DateTime.Day |
| 🎯 环形进度 | 步数/电量环形图 | Step,Battery |
| 📊 仪表盘 | 聚合时间/步数/电量/天气 | DateTime.Minute |
| 🖼️ 纯图片 | 壁纸/照片/二维码 | 静态 |
| 🛠️ 自定义 | 从零创建 | - |

### 真实设备模板（2 个）

| 模板 | 说明 | 数据绑定 |
|------|------|----------|
| 🌤️ 天气（真实） | 绑定系统天气 | ContentProvider: weather |
| 🎵 音乐（真实） | 绑定系统播放器 | MusicControl |

> ⚠️ 真实设备模板需要在小米背屏设备上使用，浏览器预览显示占位图。

## 功能清单

### 编辑
- 🎨 17 个预设模板
- 🛠️ 自定义模式：文字、矩形、圆形、线条、图片、视频
- 🔤 字体选择（8 种）
- 🌈 文字渐变（6 种预设 + 自定义）
- ✏️ 文字描边（粗细 + 颜色）
- 📐 矩形渐变 + 模糊效果
- 📷 摄像头避让（按设备实际比例）
- ↩️ 撤销/重做（Ctrl+Z / Ctrl+Y，50 步）
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
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+D` | 复制当前元素 |
| `Ctrl+C` | 复制到剪贴板 |
| `Ctrl+V` | 从剪贴板粘贴 |
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
