# AI 健身助手

基于 **MediaPipe Pose Landmarker** 的实时姿态检测与动作纠错应用，支持浏览器网页与安卓 App 两种形态。

## 功能特性

- **真实摄像头检测**：调用设备摄像头，通过 MediaPipe Pose 在本地实时检测 33 个人体关键点，画面与识别完全联动
- **摄像头授权前置**：使用前必须先完成摄像头授权；授权被拒、无摄像头、被占用、环境不支持等场景均有明确指引
- **动作计数**：支持深蹲、俯卧撑、仰卧起坐、哑铃弯举 4 种运动，基于关节角度状态机自动计数
- **动作纠错**：内置 12 条纠错规则，实时识别动作偏差并给出纠正建议（膝盖内扣、塌腰、弯腰过度、手腕弯曲等）
- **骨骼可视化**：在视频上叠加绘制骨骼连线、关节角度和错误警告标记
- **训练统计**：记录训练次数、组数、时长和动作标准率，历史记录保存在本地
- **离线可用**：模型与推理引擎（wasm）随应用打包，支持本地优先加载，无网环境也能运行
- **加载兜底**：姿态模型以 base64 形式**内联进应用构建产物**（零文件读取、零网络，安卓 WebView 的 file:// 环境下 100% 可靠），并保留「本地二进制 → 本地 base64 文件 → 官方 CDN」多级回退；wasm 本地优先、回退 jsdelivr CDN；GPU 不可用时自动降级 CPU
- **防白屏**：启动加载页 + 全局错误边界 + 致命错误兜底页，异常时始终有可见反馈
- **隐私保护**：所有检测在设备本地完成，视频画面不会上传到任何服务器

## 技术栈

- React 19 + TypeScript + Vite 6
- Tailwind CSS v3
- MediaPipe Tasks Vision（Pose Landmarker，模型与 wasm 本地打包）
- Radix UI + Lucide Icons
- date-fns + sonner

## 快速开始

```bash
npm install        # postinstall 会自动同步 wasm 资源到 public/wasm
npm run dev        # 本地开发（localhost 可直接使用摄像头）
```

构建生产版本：

```bash
npm run build      # 产物在 dist/
npm run preview    # 本地预览构建产物
```

## 模型与资源加载策略

| 形态 | wasm 推理引擎 | 姿态模型 |
|---|---|---|
| 打包副本 / 安卓 App（推荐） | `public/wasm/` 本地加载 | **base64 内联进 JS**（构建时由 `src/assets/model-b64.txt` 打包），完全不读文件，完全离线 |
| GitHub Pages 网页版 | 本地加载（构建时自动生成） | 内联加载（构建时自动下载模型并生成 base64） |
| 兜底 | jsdelivr CDN | 本地二进制 → 本地 base64 文件 → 官方 Google CDN（GPU 失败自动降级 CPU） |

> 提示：模型体积约 9.4MB。**内联方案**：构建时把模型的 base64 文本（约 12.5MB）直接编译进 JS（`src/assets/model-b64.txt` + Vite `?raw` 导入），运行时在内存中解码，**完全不依赖任何文件读取或网络**，因此安卓 WebView 的 `file://` 环境（`fetch`/部分 `XHR` 受限）也能 100% 加载成功。该内联文件由 `npm install`（postinstall 脚本）或 GitHub Actions 自动生成；从 GitHub 克隆源码后如需本地构建，请先运行 `npm install` 并保证 `src/assets/model-b64.txt` 存在（或直接使用打包副本/APK）。

## 摄像头授权说明

- 摄像头属于隐私权限，浏览器 / 安卓系统都会弹窗询问；**授权成功后才能开始动作识别**
- 网页版必须在 **HTTPS** 环境（localhost 除外）才能调用摄像头
- 若误点「拒绝」，请在浏览器地址栏左侧的摄像头图标处把权限改为「允许」后重试
- 安卓 App 版首次启动会请求「相机」权限，允许后即可使用

## 部署

### GitHub Pages（推荐，自动构建）

仓库已内置 `.github/workflows/deploy-pages.yml`：推送到 `main` 分支后，GitHub Actions 会自动安装依赖、下载 AI 模型、构建并部署到 Pages。

启用步骤（一次性）：
1. 进入仓库 **Settings → Pages**
2. 「Build and deployment」来源选择 **GitHub Actions**
3. 推送代码后，Actions 自动构建部署，页面地址为 `https://<用户名>.github.io/goodgym-ai-fitness/`

也可以部署到 Vercel、Netlify 等任意静态托管平台（已配置相对路径构建，子路径部署不会白屏）。

## 安卓 App

仓库根目录提供 `android/` 工程，可直接构建出安卓安装包（APK）：

```bash
# 前置：Android SDK（build-tools 34、platform android-34）
./android/build-apk.sh
```

APK 内嵌全部网页资源与 AI 模型，安装后 **无需联网** 即可完成动作识别。

## 目录结构

```
├── public/
│   ├── wasm/                 # MediaPipe 推理引擎（本地优先加载，仅打包副本/APK 内置）
│   └── models/               # 姿态模型：pose_landmarker_full.task（二进制）与 .task.b64（base64 副本）
├── src/
│   ├── assets/model-b64.txt  # 模型 base64（构建时内联进 JS，零文件读取；postinstall/Actions 自动生成）
│   ├── hooks/usePoseDetection.ts   # 摄像头授权 + 姿态检测主逻辑
│   └── lib/mediapipe-pose.ts       # MediaPipe 加载（内联→本地→base64→CDN 多级兜底）
├── android/                  # 安卓 WebView 壳工程（产出 APK）
└── scripts/copy-mediapipe-assets.mjs
```

## 致谢

基于 [Good-GYM](https://github.com/yo-WASSUP/Good-GYM) 开源项目进行改进。
