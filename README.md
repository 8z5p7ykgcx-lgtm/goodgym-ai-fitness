# GoodGYM AI 健身助手

基于 MediaPipe Pose 的浏览器端实时姿态检测与动作纠错网页应用。

## 功能

- **实时姿态检测**：通过摄像头捕捉人体 33 个骨骼关键点
- **运动计数**：支持深蹲、俯卧撑、仰卧起坐、哑铃弯举
- **动作纠错**：实时识别错误姿势并给出纠正建议
- **隐私保护**：所有检测在浏览器本地完成，视频不上传

## 技术栈

- React 19 + TypeScript + Vite
- MediaPipe Pose Landmarker（Google，CDN 加载）
- Tailwind CSS

## 运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173，授权摄像头后选择运动类型即可开始。