import { useRef, useEffect } from 'react';
import { Shield, CameraOff, AlertTriangle, CheckCircle, UserX, Loader2, Camera, RefreshCw } from 'lucide-react';
import type { CameraStatus } from '@/hooks/usePoseDetection';
import {
  drawSkeleton, drawErrorMarker, drawJointAngle,
  type Keypoint, type JointAngles, type DetectedError,
} from '@/lib/pose-utils';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  keypoints: Keypoint[];
  angles: JointAngles;
  errors: DetectedError[];
  isDetecting: boolean;
  cameraEnabled: boolean;
  cameraStatus: CameraStatus;
  exerciseName: string;
  isGoodForm: boolean;
  repProgress: number;
  hasPerson: boolean;
  modelLoading: boolean;
  onEnableCamera: () => void;
}

/** 摄像头授权异常时的引导文案 */
function cameraStatusGuide(status: CameraStatus): { title: string; desc: string } {
  switch (status) {
    case 'denied':
      return {
        title: '摄像头权限被拒绝',
        desc: '请在浏览器地址栏左侧的摄像头图标处，将权限改为「允许」，然后点击下方按钮重新授权。',
      };
    case 'no-device':
      return {
        title: '未检测到摄像头',
        desc: '请确认设备已连接摄像头，或检查是否被系统禁用后重试。',
      };
    case 'in-use':
      return {
        title: '摄像头被占用',
        desc: '摄像头可能正被其他应用使用，请关闭占用摄像头的应用后重试。',
      };
    case 'unsupported':
      return {
        title: '当前环境不支持摄像头',
        desc: '摄像头需要 HTTPS 或 localhost 环境，请使用 HTTPS 打开本应用（安卓 App 内可直接使用）。',
      };
    case 'error':
      return {
        title: '摄像头开启失败',
        desc: '发生未知错误，请点击下方按钮重试。',
      };
    default:
      return { title: '需要摄像头授权', desc: '动作识别需要调用摄像头，请点击下方按钮授权使用。' };
  }
}

export default function VideoDetectionSection({
  videoRef, keypoints, angles, errors,
  isDetecting, cameraEnabled, cameraStatus, exerciseName,
  isGoodForm, repProgress, hasPerson, modelLoading, onEnableCamera,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseRef = useRef(0);
  const needCamera = !cameraEnabled;
  const cameraBlocked = !cameraEnabled && ['denied', 'no-device', 'in-use', 'unsupported', 'error'].includes(cameraStatus);
  const guide = cameraBlocked ? cameraStatusGuide(cameraStatus) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (!isDetecting || !hasPerson) return;
    pulseRef.current += 0.08;
    const pulse = (Math.sin(pulseRef.current) + 1) / 2;
    drawSkeleton(ctx, keypoints, w, h, isGoodForm ? '#22c55e' : '#ef4444');
    const angleJoints = [
      { kpIndex: 13, angle: angles.leftElbow },
      { kpIndex: 14, angle: angles.rightElbow },
      { kpIndex: 25, angle: angles.leftKnee },
      { kpIndex: 26, angle: angles.rightKnee },
      { kpIndex: 23, angle: angles.leftHip },
      { kpIndex: 24, angle: angles.rightHip },
    ];
    for (const j of angleJoints) {
      const kp = keypoints[j.kpIndex];
      if (!kp || kp.visibility < 0.3) continue;
      const normal = j.angle > 100 && j.angle < 175;
      drawJointAngle(ctx, { x: kp.x, y: kp.y }, j.angle, w, h, normal);
    }
    for (const err of errors) drawErrorMarker(ctx, err.jointPoint, w, h, err.severity, pulse);
  }, [keypoints, angles, errors, isDetecting, hasPerson, isGoodForm]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {/* video 元素始终渲染：保证 ref 恒定存在，摄像头流可稳定挂载 */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${cameraEnabled ? 'opacity-60' : 'opacity-0'}`}
          autoPlay playsInline muted
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100" />

        {/* 未授权时：提示 + 授权按钮（授权是使用前置条件） */}
        {needCamera && !cameraBlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400 bg-neutral-100/60">
            <CameraOff className="w-12 h-12 opacity-40" />
            <p className="text-sm font-medium text-neutral-500">动作识别需要摄像头授权</p>
            <p className="text-xs">点击下方按钮，在浏览器弹窗中选择「允许」</p>
            <button
              onClick={onEnableCamera}
              disabled={cameraStatus === 'requesting'}
              className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-60"
            >
              {cameraStatus === 'requesting' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />正在请求授权…</>
              ) : (
                <><Camera className="w-4 h-4" />授权摄像头</>
              )}
            </button>
          </div>
        )}

        {/* 授权被拒/无设备/不支持：展示具体原因与操作指引 */}
        {cameraBlocked && guide && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center bg-neutral-100/60">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <p className="text-sm font-semibold text-neutral-800">{guide.title}</p>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">{guide.desc}</p>
            <button
              onClick={onEnableCamera}
              className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700"
            >
              <RefreshCw className="w-4 h-4" />重新授权
            </button>
          </div>
        )}

        {!isDetecting && cameraEnabled && !modelLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-neutral-200">
              <span className="text-sm text-neutral-600">{exerciseName ? `已选择${exerciseName}，点击开始检测` : '请选择运动类型'}</span>
            </div>
          </div>
        )}
        {modelLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 text-neutral-900 animate-spin mx-auto" />
              <p className="text-sm">正在加载姿态检测模型</p>
              <p className="text-xs text-neutral-500">首次加载约需 10 秒</p>
            </div>
          </div>
        )}
        {isDetecting && cameraEnabled && !hasPerson && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-neutral-200">
              <UserX className="w-4 h-4 inline mr-2 text-neutral-500" />
              <span className="text-sm text-neutral-600">未检测到人体，请站到镜头前</span>
            </div>
          </div>
        )}
        {isDetecting && cameraEnabled && hasPerson && (
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200">
              <div className={`w-2 h-2 rounded-full ${isGoodForm ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-xs font-medium">{exerciseName}检测中</span>
            </div>
            {isGoodForm ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">动作标准</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-600">{errors.length} 处需调整</span>
              </div>
            )}
          </div>
        )}
        {isDetecting && cameraEnabled && hasPerson && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="h-1 bg-white/50 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-900 transition-all duration-150" style={{ width: `${repProgress * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-neutral-200 flex items-center gap-2">
        <Shield className="size-3.5 text-green-600 shrink-0" />
        <p className="text-xs text-neutral-500">所有检测在本地完成，视频画面不会上传服务器</p>
      </div>
    </div>
  );
}
