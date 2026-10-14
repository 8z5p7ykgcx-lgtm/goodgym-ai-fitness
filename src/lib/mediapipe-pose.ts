// MediaPipe Pose Landmarker 加载与推理封装
import type { Keypoint } from './pose-utils';

const TASKS_VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/umd/index.js';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

let tasksVision: any = null;
let poseLandmarker: any = null;
let loadPromise: Promise<any> | null = null;

function loadTasksVision(): Promise<any> {
  if (tasksVision) return Promise.resolve(tasksVision);
  return new Promise((resolve, reject) => {
    if ((window as any).TasksVision) {
      tasksVision = (window as any).TasksVision;
      resolve(tasksVision);
      return;
    }
    const script = document.createElement('script');
    script.src = TASKS_VISION_URL;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      tasksVision = (window as any).TasksVision;
      if (tasksVision) resolve(tasksVision);
      else reject(new Error('TasksVision 加载失败'));
    };
    script.onerror = () => reject(new Error('TasksVision 脚本加载失败'));
    document.head.appendChild(script);
  });
}

export function loadPoseLandmarker(): Promise<any> {
  if (poseLandmarker) return Promise.resolve(poseLandmarker);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const tv = await loadTasksVision();
    const filesetResolver = await tv.FilesetResolver.forVisionTasks(WASM_URL);
    poseLandmarker = await tv.PoseLandmarker.createFromOptions(filesetResolver, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
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
