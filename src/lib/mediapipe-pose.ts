import type { KP } from './pose-utils';
const TV_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/umd/index.js';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';
let tv:any=null,lm:any=null,promise:Promise<void>|null=null;
function loadTV():Promise<any>{
  if(tv)return Promise.resolve(tv);
  return new Promise((res,rej)=>{
    if((window as any).TasksVision){tv=(window as any).TasksVision;res(tv);return;}
    const s=document.createElement('script');s.src=TV_URL;s.crossOrigin='anonymous';
    s.onload=()=>{tv=(window as any).TasksVision?tv:null;tv?res(tv):rej(new Error('TasksVision加载失败'));};
    s.onerror=()=>rej(new Error('脚本加载失败'));document.head.appendChild(s);
  });
}
export function loadLandmarker():Promise<any>{
  if(lm)return Promise.resolve(lm);
  if(promise)return promise;
  promise=(async()=>{const t=await loadTV();
    const fr=await t.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    lm=await t.PoseLandmarker.createFromOptions(fr,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numPoses:1,
      minPoseDetectionConfidence:0.5,minPosePresenceConfidence:0.5,minTrackingConfidence:0.5,outputSegmentationMasks:false});
  })();return promise;
}
export function detect(video:HTMLVideoElement,ts:number):KP[]{
  if(!lm)return[];
  try{const r=lm.detectForVideo(video,ts);if(!r?.landmarks?.length)return[];
    const m=r.landmarks[0];return Array.from({length:33},(_,i)=>({x:m[i].x,y:m[i].y,z:m[i].z,visibility:m[i].visibility??0.5}));
  }catch{return[];}
}
