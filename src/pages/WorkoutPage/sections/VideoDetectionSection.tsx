import { useRef, useEffect } from 'react';
import { Shield, CameraOff, AlertTriangle, CheckCircle, UserX, Loader2 } from 'lucide-react';
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
  exerciseName: string;
  isGoodForm: boolean;
  repProgress: number;
  hasPerson: boolean;
  modelLoading: boolean;
}

export default function VideoDetectionSection({
  videoRef, keypoints, angles, errors,
  isDetecting, cameraEnabled, exerciseName,
  isGoodForm, repProgress, hasPerson, modelLoading,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseRef = useRef(0);

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
        {cameraEnabled ? (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-60 -scale-x-100" playsInline muted />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <CameraOff className="w-14 h-14 opacity-40" />
            <p className="text-sm">未启用摄像头</p>
            <p className="text-xs">点击「开始检测」授权访问</p>
          </div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100" />
        {!isDetecting && !modelLoading && (
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
        {isDetecting && !hasPerson && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-neutral-200">
              <UserX className="w-4 h-4 inline mr-2 text-neutral-500" />
              <span className="text-sm text-neutral-600">未检测到人体，请站到镜头前</span>
            </div>
          </div>
        )}
        {isDetecting && hasPerson && (
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
        {isDetecting && hasPerson && (
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
