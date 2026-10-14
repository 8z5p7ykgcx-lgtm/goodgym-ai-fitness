// 将 @mediapipe/tasks-vision 的 wasm 资源同步到 public/wasm（供本地优先加载 / 离线使用）
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destDir = join(root, 'public', 'wasm');

if (!existsSync(srcDir)) {
  console.warn('[copy:mediapipe] 未找到 @mediapipe/tasks-vision，跳过 wasm 复制（先执行 npm install）');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

const needed = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

let copied = 0;
for (const file of needed) {
  const src = join(srcDir, file);
  if (existsSync(src)) {
    copyFileSync(src, join(destDir, file));
    copied += 1;
  } else {
    console.warn(`[copy:mediapipe] 缺少 ${file}`);
  }
}
console.log(`[copy:mediapipe] 已同步 ${copied}/${needed.length} 个 wasm 文件到 public/wasm`);

// 若仓库内已有 base64 模型，同步一份到 src/assets/model-b64.txt 供构建时内联进 JS
const b64Src = join(root, 'public', 'models', 'pose_landmarker_full.task.b64');
const b64DestDir = join(root, 'src', 'assets');
const b64Dest = join(b64DestDir, 'model-b64.txt');
if (existsSync(b64Src)) {
  mkdirSync(b64DestDir, { recursive: true });
  copyFileSync(b64Src, b64Dest);
  console.log('[copy:mediapipe] 已同步 base64 模型到 src/assets/model-b64.txt（构建时内联）');
} else {
  console.warn('[copy:mediapipe] 未找到 base64 模型，跳过内联复制（GitHub 克隆请由 Actions 生成，或使用打包副本）');
}
