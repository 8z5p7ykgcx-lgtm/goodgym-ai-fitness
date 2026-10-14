import { useState } from 'react';
import { Play, Square, Camera, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CameraStatus } from '@/hooks/usePoseDetection';

interface Props {
  isDetecting: boolean;
  onStart: () => void;
  onStop: () => void;
  hasExercise: boolean;
  cameraEnabled: boolean;
  cameraStatus: CameraStatus;
  onEnableCamera: () => Promise<boolean>;
  onReset: () => void;
  modelLoading: boolean;
}

const STATUS_TEXT: Record<CameraStatus, { label: string; color: string }> = {
  unknown: { label: '未授权', color: 'text-amber-600' },
  requesting: { label: '授权中…', color: 'text-neutral-500' },
  granted: { label: '已授权', color: 'text-green-600' },
  denied: { label: '已拒绝', color: 'text-red-600' },
  'no-device': { label: '无摄像头', color: 'text-red-600' },
  'in-use': { label: '摄像头被占用', color: 'text-red-600' },
  unsupported: { label: '环境不支持', color: 'text-red-600' },
  error: { label: '授权出错', color: 'text-red-600' },
};

export default function ControlButtonSection({
  isDetecting, onStart, onStop, hasExercise,
  cameraEnabled, cameraStatus, onEnableCamera, onReset, modelLoading,
}: Props) {
  const [enablingCam, setEnablingCam] = useState(false);
  const status = STATUS_TEXT[cameraStatus];
  const cameraBlocked = !cameraEnabled && ['denied', 'no-device', 'in-use', 'unsupported', 'error'].includes(cameraStatus);

  const handleCamera = async () => {
    setEnablingCam(true);
    const ok = await onEnableCamera();
    setEnablingCam(false);
    ok ? toast.success('摄像头已启用') : toast.error('摄像头授权失败，请按画面提示操作');
  };

  return (
    <div className="space-y-3">
      {/* 摄像头授权状态条 */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
        cameraBlocked ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-neutral-50'
      }`}>
        <span className="flex items-center gap-1.5 text-neutral-600">
          <Camera className="w-3.5 h-3.5" />
          摄像头：<b className={status.color}>{status.label}</b>
        </span>
        {cameraBlocked && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" />需授权后使用
          </span>
        )}
      </div>

      {!isDetecting ? (
        <Button
          onClick={onStart}
          size="lg"
          className="w-full h-14 text-base font-semibold gap-2"
          disabled={!hasExercise || modelLoading || cameraBlocked}
        >
          {modelLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />加载模型中...</>) : (<><Play className="w-5 h-5" />开始检测</>)}
        </Button>
      ) : (
        <Button onClick={onStop} variant="destructive" size="lg" className="w-full h-14 text-base font-semibold gap-2">
          <Square className="w-5 h-5" />结束检测
        </Button>
      )}
      {cameraBlocked && !isDetecting && (
        <p className="text-xs text-red-600 px-1">请先在上方画面中完成摄像头授权，再开始检测。</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleCamera} disabled={cameraEnabled || enablingCam || isDetecting} className="h-10">
          <Camera className="w-4 h-4 mr-1.5" />
          {cameraEnabled ? '已连接' : enablingCam ? '授权中' : '启用摄像头'}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={isDetecting} className="h-10">
          <RefreshCw className="w-4 h-4 mr-1.5" />重置计数
        </Button>
      </div>
    </div>
  );
}
