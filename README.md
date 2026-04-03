# Janus 卡片制作器

为小米背屏（SubScreen）制作 MAML 卡片模板的 Android 工具。

## 功能

- 🎨 **7 个预设模板**: 时钟、名言、电池、状态、倒计时、音乐信息、渐变文字
- 🛠️ **自定义模式**: 自由添加文字、矩形、圆形、图片
- 📱 **双机型适配**: 支持 Mix Flip (Q200) 和 Mix Flip 2 (P2)
- 📷 **摄像头避让**: 自动计算安全区，避开左侧摄像头
- 📦 **一键导出**: 生成标准 MAML ZIP，直接导入 Janus

## 使用方法

1. 选择模板
2. 调整配置（颜色、文字、字号等）
3. 预览效果
4. 导出 ZIP
5. 在 Janus 中导入

## 构建

```bash
./gradlew assembleDebug
```

APK 位于 `app/build/outputs/apk/debug/`

## 模板说明

所有模板自动处理：
- 左侧 30% 安全区（避开摄像头）
- MAML 变量表达式
- `manifest.xml` 格式规范

导出的 ZIP 包含 `manifest.xml`（必须）和 `var_config.xml`（可选），可直接导入 Janus 使用。

## 相关项目

- [Janus](https://github.com/penguinyzsh/janus) - 小米背屏 Xposed 模块
