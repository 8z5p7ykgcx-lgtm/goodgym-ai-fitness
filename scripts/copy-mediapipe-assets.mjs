// 将 @mediapipe/tasks-vision 的 wasm 资源同步到 public/wasm（供本地优先加载 / 离线使用）
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
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
