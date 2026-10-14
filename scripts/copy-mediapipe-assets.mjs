// 将 @mediapipe/tasks-vision 的 wasm 资源同步到 public/wasm（供本地优先加载 / 离线使用）
// 同时自动下载姿态模型文件（带重试），生成 base64 副本并同步到 src/assets 供构建时内联
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destDir = join(root, 'public', 'wasm');

// ========== 1. 同步 wasm 文件 ==========
if (!existsSync(srcDir)) {
  console.warn('[copy:mediapipe] 未找到 @mediapipe/tasks-vision，跳过 wasm 复制（先执行 npm install）');
} else {
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
}

// ========== 2. 下载姿态模型（带重试） ==========
const modelsDir = join(root, 'public', 'models');
const modelFile = join(modelsDir, 'pose_landmarker_full.task');
const b64File = join(modelsDir, 'pose_landmarker_full.task.b64');
const b64DestDir = join(root, 'src', 'assets');
const b64Dest = join(b64DestDir, 'model-b64.txt');

// 模型下载源列表（按优先级）
const MODEL_URLS = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
];

async function downloadModel() {
  // 已存在且大小合理（>5MB）则跳过
  if (existsSync(modelFile)) {
    const stat = readFileSync(modelFile).length;
    if (stat > 5 * 1024 * 1024) {
      console.log(`[copy:mediapipe] 模型文件已存在（${(stat / 1024 / 1024).toFixed(1)}MB），跳过下载`);
      return true;
    }
  }

  mkdirSync(modelsDir, { recursive: true });

  for (const url of MODEL_URLS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[copy:mediapipe] 下载姿态模型（第 ${attempt} 次）: ${url}`);
        execSync(
          `curl -sL --connect-timeout 15 --max-time 120 -o "${modelFile}" "${url}"`,
          { stdio: 'pipe' }
        );
        const stat = readFileSync(modelFile).length;
        if (stat > 5 * 1024 * 1024) {
          console.log(`[copy:mediapipe] 模型下载成功（${(stat / 1024 / 1024).toFixed(1)}MB）`);
          return true;
        }
        console.warn(`[copy:mediapipe] 下载的模型文件太小（${stat} bytes），重试...`);
      } catch (e) {
        console.warn(`[copy:mediapipe] 下载失败（第 ${attempt} 次）: ${e.message || e}`);
      }
    }
  }

  console.warn('[copy:mediapipe] 所有模型下载源均失败，跳过模型下载');
  console.warn('[copy:mediapipe] 提示：可手动下载模型到 public/models/pose_landmarker_full.task');
  return false;
}

// ========== 3. 生成 base64 副本并同步到 src/assets ==========
function syncBase64Model() {
  if (!existsSync(modelFile)) {
    console.warn('[copy:mediapipe] 模型文件不存在，跳过 base64 生成');
    return;
  }

  // 生成 base64 文件
  try {
    execSync(`base64 -w 0 "${modelFile}" > "${b64File}"`, { stdio: 'pipe' });
    console.log(`[copy:mediapipe] 已生成 base64 副本: ${b64File}`);
  } catch (e) {
    console.warn(`[copy:mediapipe] base64 生成失败: ${e.message || e}`);
    return;
  }

  // 同步到 src/assets 供构建时内联
  if (existsSync(b64File)) {
    mkdirSync(b64DestDir, { recursive: true });
    copyFileSync(b64File, b64Dest);
    console.log('[copy:mediapipe] 已同步 base64 模型到 src/assets/model-b64.txt（构建时内联）');
  }
}

// 执行下载和同步
const downloaded = await downloadModel();
if (downloaded) {
  syncBase64Model();
}
