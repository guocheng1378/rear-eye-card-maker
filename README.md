# Janus 卡片制作器 v3

为小米背屏（SubScreen）制作 MAML 卡片模板的工具。

> 🌐 **在线使用**：[https://guocheng1378.github.io/janus-card-maker/](https://guocheng1378.github.io/janus-card-maker/)

## v3 改动

- **零构建**：砍掉 TypeScript + esbuild，纯原生 JS，改代码刷新浏览器即生效
- **模块化**：9 个 JS 文件，每个 ≤ 200 行，职责单一
- **JSZip 本地化**：不再依赖 CDN，离线可用
- **事件委托**：干掉 `window.__app` 全局污染，用 data 属性 + 事件委托
- **Android 兼容**：`node build.js` 一键打包成单文件 HTML

## 项目结构

```
janus-card-maker/
├── index.html              ← 浏览器直接打开即可使用
├── css/style.css           ← 所有样式 + 响应式
├── js/
│   ├── store.js            ← 响应式状态 + 公共工具
│   ├── devices.js          ← 设备参数（4 款机型）
│   ├── maml.js             ← XML 生成 + 转义 + 校验
│   ├── templates.js        ← 10 个预设模板定义
│   ├── preview.js          ← 预览渲染器
│   ├── editor.js           ← 元素编辑器 + 默认值
│   ├── export.js           ← ZIP/PNG 导入导出
│   ├── ui.js               ← 页面导航 + 配置 + 快捷键
│   └── app.js              ← 入口
├── lib/jszip.min.js        ← JSZip（本地化）
└── app/                    ← Android 包装（Kotlin）
```

## 使用

### 浏览器调试
```bash
cd janus-card-maker
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

### Android CI/CD
仓库已配置 GitHub Actions，push tag 或手动触发即可自动构建 APK：
- `Build Android APK` — Release 发布时自动构建并上传
- `Deploy to GitHub Pages` — 推送到 main 自动部署在线版本

## 功能

- 🎨 **10 个预设模板**：时钟、名言、电池、状态、倒计时、音乐、渐变、天气、步数、日历
- 🛠️ **自定义模式**：自由添加文字、矩形、圆形、线条、图片、视频
- 📱 **4 款机型适配**：Pro / Pro Max / 标准版 / Ultra
- 📷 **摄像头避让**：按设备实际比例自动计算安全区
- 📦 **一键导出**：生成 MAML ZIP，导入 Janus（含 XML 校验）
- 🖼️ **PNG 导出**：预览截图导出
- ↩️ **撤销/重做**：Ctrl+Z / Ctrl+Y，最多 50 步
- 📋 **复制粘贴**：Ctrl+C / Ctrl+V 跨卡片复制元素
- 🌗 **深色/浅色主题**
- ⌨️ **快捷键支持**：点击 ⌨️ 按钮查看全部快捷键
- 🔋 **电池预览**：可调节预览电量值
- 💾 **配置导入导出**：包含自定义元素的完整 JSON
- 📱 **移动端响应式**：工具本身支持手机浏览器使用

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+D` | 复制当前元素 |
| `Ctrl+C` | 复制到剪贴板 |
| `Ctrl+V` | 从剪贴板粘贴 |
| `Delete` | 删除当前元素 |

## License

[MIT](LICENSE)
