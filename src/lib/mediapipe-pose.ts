// MediaPipe Pose Landmarker 加载与推理封装
// 加载链：本地二进制模型 → 仓库内置 base64 模型（运行时解码）→ 官方 CDN（GPU）→ 官方 CDN（CPU）
// wasm：本地优先，失败回退 jsdelivr CDN。保证离线包 / 国内网络 / 网页版均可工作。
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

/** 拉取仓库内的 base64 模型文本并解码为二进制 */
async function fetchModelFromB64(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`base64 模型拉取失败: ${res.status}`);
  const text = await res.text();
  const bin = atob(text.replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function loadPoseLandmarker(): Promise<any> {
  if (poseLandmarker) return Promise.resolve(poseLandmarker);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    // 1) wasm：本地优先，CDN 兜底
    let fileset: any;
    try {
      fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
    } catch (e) {
      console.warn('[MediaPipe] 本地 wasm 加载失败，回退 CDN:', e);
      fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
    }

    // 2) 模型：本地二进制 → 仓库 base64 → 官方 CDN；每级均含 GPU/CPU 降级
    try {
      poseLandmarker = await tryCreateLandmarker(fileset, { path: MODEL_LOCAL });
    } catch (e1) {
      console.warn('[MediaPipe] 本地模型不可用，尝试内置 base64 模型:', e1);
      try {
        const buffer = await fetchModelFromB64(MODEL_B64);
        poseLandmarker = await tryCreateLandmarker(fileset, { buffer });
      } catch (e2) {
        console.warn('[MediaPipe] base64 模型不可用，回退官方 CDN:', e2);
        poseLandmarker = await tryCreateLandmarker(fileset, { path: MODEL_CDN });
      }
    }
    return poseLandmarker;
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
