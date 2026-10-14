// MediaPipe Pose Landmarker 加载与推理封装
// 加载链：
//   wasm : 本地（file:// 或 http(s)）→ jsdelivr CDN
//   模型 : 本地二进制 → 本地 base64（运行时解码）→ 官方 CDN
// 关键兼容点：本地资源统一用 XHR 读取 —— window.fetch 规范上不支持 file:// scheme，
// 在安卓 WebView（file:///android_asset）里必然失败，XHR + WebView file 访问 flags 才能读到本地模型。
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Keypoint } from './pose-utils';

const BASE = import.meta.env.BASE_URL || './';

const WASM_LOCAL = `${BASE}wasm`;
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_LOCAL = `${BASE}models/pose_landmarker_full.task`;
const MODEL_B64 = `${BASE}models/pose_landmarker_full.task.b64`;
const MODEL_CDN = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

let poseLandmarker: any = null;
let loadPromise: Promise<any> | null = null;

interface ModelSource {
  path?: string;
  buffer?: Uint8Array;
}

/** 提取错误简述，用于拼接可读的错误信息 */
function errBrief(err: unknown): string {
  if (err instanceof Error && err.message) {
    const m = err.message.replace(/\s+/g, ' ').trim();
    return m.length > 60 ? `${m.slice(0, 60)}…` : m;
  }
  return String(err);
}

/** XHR 读取本地/远端资源：兼容 file://（WebView）与 http(s)（网页部署） */
function readResource(url: string, type: 'arraybuffer' | 'text'): Promise<ArrayBuffer | string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = type === 'arraybuffer' ? 'arraybuffer' : 'text';
    xhr.onload = () => {
      // file:// 协议下 status 恒为 0，但 response 已就绪
      const ok = (xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.response != null);
      if (ok) resolve(xhr.response as ArrayBuffer | string);
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('网络请求失败'));
    xhr.onabort = () => reject(new Error('请求被中止'));
    xhr.send();
  });
}

async function createLandmarker(fileset: any, model: ModelSource, delegate: 'GPU' | 'CPU') {
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: model.buffer
      ? { modelAssetBuffer: model.buffer, delegate }
      : { modelAssetPath: model.path, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });
}

/** 依次尝试 GPU/CPU 委托创建 Landmarker，全部失败则抛出最后错误 */
async function tryCreateLandmarker(fileset: any, model: ModelSource): Promise<any> {
  let lastErr: unknown;
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      return await createLandmarker(fileset, model, delegate);
    } catch (e) {
      console.warn(`[MediaPipe] ${delegate} 委托创建失败:`, e);
      lastErr = e;
    }
  }
  throw lastErr;
}

/** 读取 base64 模型文本并解码为二进制 */
async function fetchModelFromB64(url: string): Promise<Uint8Array> {
  const text = (await readResource(url, 'text')) as string;
  const bin = atob(text.replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

    // 2) 模型：本地二进制 → 本地 base64 → 官方 CDN；每级含 GPU/CPU 降级
    try {
      poseLandmarker = await tryCreateLandmarker(fileset, {
        path: MODEL_LOCAL,
      });
      return poseLandmarker;
    } catch (e1) {
      console.warn('[MediaPipe] 本地模型二进制不可用:', e1);
      stageErrors.push(`内置模型文件不可用（${errBrief(e1)}）`);
    }
    try {
      const buffer = await fetchModelFromB64(MODEL_B64);
      poseLandmarker = await tryCreateLandmarker(fileset, { buffer });
      return poseLandmarker;
    } catch (e2) {
      console.warn('[MediaPipe] 本地 base64 模型不可用:', e2);
      stageErrors.push(`内置 base64 模型不可用（${errBrief(e2)}）`);
    }
    try {
      poseLandmarker = await tryCreateLandmarker(fileset, { path: MODEL_CDN });
      return poseLandmarker;
    } catch (e3) {
      stageErrors.push(`官方模型服务不可用（${errBrief(e3)}）`);
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
