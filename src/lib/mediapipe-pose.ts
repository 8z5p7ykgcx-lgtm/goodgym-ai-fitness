// MediaPipe Pose Landmarker 加载与推理封装
// 加载链：
//   wasm : 本地（file:// 或 http(s)）→ jsdelivr CDN
//   模型 : 按协议智能排序，全部统一走 buffer 方式（XHR 读取 → modelAssetBuffer），
//          彻底规避 file:// 下 MediaPipe 内部 fetch 被 CORS 拦截的问题。
// 关键兼容点1：模型 base64 内联进应用（?raw 构建时打包），安卓 WebView 的 file:// 环境
//   下完全不依赖任何文件读取，100% 可靠。
// 关键兼容点2：本地资源统一用 XHR 读取 —— window.fetch 规范上不支持 file:// scheme，
//   XHR + WebView file 访问 flags 才能读到本地文件。
// 关键兼容点3：所有模型加载都先读成 ArrayBuffer 再传 modelAssetBuffer，
//   不再使用 modelAssetPath（其内部 fetch 在 file:// 下必失败）。
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Keypoint } from './pose-utils';

const BASE = import.meta.env.BASE_URL || './';

const WASM_LOCAL = `${BASE}wasm`;
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_LOCAL = `${BASE}models/pose_landmarker_full.task`;
const MODEL_B64 = `${BASE}models/pose_landmarker_full.task.b64`;

/** CDN 镜像列表（按优先级排序，国内可访问的优先） */
const MODEL_CDN_SOURCES: string[] = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
  'https://cdn.jsdelivr.net/gh/google/mediapipe@master/mediapipe/modules/pose_landmarker/pose_landmarker_full.tflite',
];

/** 是否为 file:// 协议（安卓 WebView 本地加载） */
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

let poseLandmarker: any = null;
let loadPromise: Promise<any> | null = null;

/** 提取错误简述，用于拼接可读的错误信息 */
function errBrief(err: unknown): string {
  if (err instanceof Error && err.message) {
    const m = err.message.replace(/\s+/g, ' ').trim();
    return m.length > 60 ? `${m.slice(0, 60)}…` : m;
  }
  return String(err);
}

/**
 * 加载构建时内联进 JS 的 base64 模型（src/assets/model-b64.txt，?raw 打包）。
 * 使用 import.meta.glob：文件存在则内联，不存在则返回 null（构建永不因缺模型失败），
 * 由构建/安装流程生成（本地仓库自带；GitHub Actions 构建时自动生成）。
 */
const inlineLoaders = import.meta.glob('../assets/*.txt', {
  query: '?raw',
  import: 'default',
});

async function loadInlineB64(): Promise<string | null> {
  try {
    const loader = inlineLoaders['../assets/model-b64.txt'];
    if (!loader) return null;
    const s = (await loader()) as unknown;
    return typeof s === 'string' ? s : null;
  } catch (e) {
    console.warn('[MediaPipe] 内联 base64 模型不可用（构建产物未包含）:', e);
    return null;
  }
}

/** XHR 读取本地/远端资源：兼容 file://（WebView）与 http(s)（网页部署） */
function readResource(url: string, type: 'arraybuffer' | 'text'): Promise<ArrayBuffer | string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = type === 'arraybuffer' ? 'arraybuffer' : 'text';
    xhr.timeout = 30000;
    xhr.onload = () => {
      // file:// 协议下 status 恒为 0，但 response 已就绪
      const ok = (xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.response != null);
      if (ok) resolve(xhr.response as ArrayBuffer | string);
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('网络请求失败'));
    xhr.ontimeout = () => reject(new Error('请求超时'));
    xhr.onabort = () => reject(new Error('请求被中止'));
    xhr.send();
  });
}

async function createLandmarker(fileset: any, modelBuffer: Uint8Array, delegate: 'GPU' | 'CPU') {
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: modelBuffer, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });
}

/** 依次尝试 GPU/CPU 委托创建 Landmarker，全部失败则抛出最后错误 */
async function tryCreateLandmarker(fileset: any, modelBuffer: Uint8Array): Promise<any> {
  let lastErr: unknown;
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      return await createLandmarker(fileset, modelBuffer, delegate);
    } catch (e) {
      console.warn(`[MediaPipe] ${delegate} 委托创建失败:`, e);
      lastErr = e;
    }
  }
  throw lastErr;
}

/** 解码 base64 文本为二进制 */
function decodeB64(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 读取 base64 模型文本并解码为二进制 */
async function fetchModelFromB64Url(url: string): Promise<Uint8Array> {
  const text = (await readResource(url, 'text')) as string;
  return decodeB64(text);
}

/** 读取二进制模型文件为 Uint8Array */
async function fetchModelAsBuffer(url: string): Promise<Uint8Array> {
  const buf = (await readResource(url, 'arraybuffer')) as ArrayBuffer;
  return new Uint8Array(buf);
}

export function loadPoseLandmarker(): Promise<any> {
  if (poseLandmarker) return Promise.resolve(poseLandmarker);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const stageErrors: string[] = [];

    // 1) wasm：本地优先，CDN 兜底
    let fileset: any;
    try {
      fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
    } catch (e) {
      console.warn('[MediaPipe] 本地 wasm 加载失败，回退 CDN:', e);
      try {
        fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
      } catch (e2) {
        throw new Error('推理引擎（wasm）加载失败：本地与 CDN 均不可用');
      }
    }

    // 2) 模型加载：全部走 buffer 方式，按协议智能排序
    //    file:// (安卓 WebView)：内联base64 → 本地base64文件 → 本地二进制 → CDN
    //    http/https (网页)：本地二进制 → 内联base64 → 本地base64文件 → CDN
    const attempts: { label: string; load: () => Promise<Uint8Array> }[] = isFileProtocol
      ? [
          { label: '内联模型', load: async () => {
            const inline = await loadInlineB64();
            if (!inline) throw new Error('构建产物未包含内联模型');
            return decodeB64(inline);
          }},
          { label: '本地base64文件', load: () => fetchModelFromB64Url(MODEL_B64) },
          { label: '本地模型文件', load: () => fetchModelAsBuffer(MODEL_LOCAL) },
          ...MODEL_CDN_SOURCES.map((url) => ({
            label: 'CDN模型',
            load: () => fetchModelAsBuffer(url),
          })),
        ]
      : [
          { label: '本地模型文件', load: () => fetchModelAsBuffer(MODEL_LOCAL) },
          { label: '内联模型', load: async () => {
            const inline = await loadInlineB64();
            if (!inline) throw new Error('构建产物未包含内联模型');
            return decodeB64(inline);
          }},
          { label: '本地base64文件', load: () => fetchModelFromB64Url(MODEL_B64) },
          ...MODEL_CDN_SOURCES.map((url) => ({
            label: 'CDN模型',
            load: () => fetchModelAsBuffer(url),
          })),
        ];

    for (const attempt of attempts) {
      try {
        const buffer = await attempt.load();
        poseLandmarker = await tryCreateLandmarker(fileset, buffer);
        console.log(`[MediaPipe] 模型加载成功（来源：${attempt.label}）`);
        return poseLandmarker;
      } catch (e) {
        console.warn(`[MediaPipe] ${attempt.label} 加载失败:`, e);
        stageErrors.push(`${attempt.label}不可用（${errBrief(e)}）`);
      }
    }

    throw new Error(
      `姿态模型加载失败：${stageErrors.join('；')}。若为网页版且网络正常，请改用打包版或安卓 App（模型已内置）；安卓 App 内请确认安装包完整。`
    );
  })();
  return loadPromise;
}

export function detectPose(video: HTMLVideoElement, timestamp: number): Keypoint[] {
  if (!poseLandmarker) return [];
  try {
    const result = poseLandmarker.detectForVideo(video, timestamp);
    if (!result || !result.landmarks || result.landmarks.length === 0) return [];
    const mp = result.landmarks[0];
    const keypoints: Keypoint[] = [];
    for (let i = 0; i < 33; i++) {
      const lm = mp[i];
      keypoints.push({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility ?? 0.5 });
    }
    return keypoints;
  } catch {
    return [];
  }
}
