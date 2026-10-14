# AI 健身助手

基于 **MediaPipe Pose Landmarker** 的实时姿态检测与动作纠错应用。

## 功能特性

- **真实摄像头检测**：调用浏览器摄像头，通过 MediaPipe Pose 在本地实时检测 33 个人体关键点
- **动作计数**：支持深蹲、俯卧撑、仰卧起坐、哑铃弯举 4 种运动，基于关节角度状态机自动计数
- **动作纠错**：内置 12 条纠错规则，实时识别动作偏差并给出纠正建议（膝盖内扣、塌腰、弯腰过度、手腕弯曲等）
- **骨骼可视化**：在视频上叠加绘制骨骼连线、关节角度和错误警告标记
- **训练统计**：记录训练次数、组数、时长和动作标准率，历史记录保存在本地
- **PWA 支持**：可添加到安卓手机主屏幕，像原生 App 一样全屏使用
- **隐私保护**：所有检测在浏览器本地完成，视频画面不会上传到任何服务器

## 技术栈

- React 19 + TypeScript + Vite 6
- Tailwind CSS v3
- MediaPipe Tasks Vision（Pose Landmarker）
- Radix UI + Lucide Icons
- date-fns + sonner

## 快速开始

```bash
npm install
npm run dev
```

构建生产版本：
```bash
npm run build
```

## 安卓版使用

本应用已配置 PWA（Progressive Web App）。在安卓手机上用 Chrome 打开部署后的网页，点击菜单选择「添加到主屏幕」，即可像原生 App 一样全屏使用。

## 部署

可部署到 GitHub Pages、Vercel、Netlify 等静态托管平台。注意：摄像头功能需要 HTTPS 环境（localhost 除外）。

## 致谢

基于 [Good-GYM](https://github.com/yo-WASSUP/Good-GYM) 开源项目进行改进。
