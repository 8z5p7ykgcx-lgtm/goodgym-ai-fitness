import { useState } from 'react';
import { Play, Square, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  isDetecting: boolean;
  onStart: () => void;
  onStop: () => void;
  hasExercise: boolean;
  cameraEnabled: boolean;
  onEnableCamera: () => Promise<boolean>;
  onReset: () => void;
  modelLoading: boolean;
}

export default function ControlButtonSection({
  isDetecting, onStart, onStop, hasExercise,
  cameraEnabled, onEnableCamera, onReset, modelLoading,
}: Props) {
  const [enablingCam, setEnablingCam] = useState(false);
  const handleCamera = async () => {
    setEnablingCam(true);
    const ok = await onEnableCamera();
    setEnablingCam(false);
    ok ? toast.success('摄像头已启用') : toast.error('摄像头授权失败');
  };
  return (
    <div className="space-y-3">
      {!isDetecting ? (
        <Button onClick={onStart} size="lg" className="w-full h-14 text-base font-semibold gap-2" disabled={!hasExercise || modelLoading}>
          {modelLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />加载模型中...</>) : (<><Play className="w-5 h-5" />开始检测</>)}
        </Button>
      ) : (
        <Button onClick={onStop} variant="destructive" size="lg" className="w-full h-14 text-base font-semibold gap-2">
          <Square className="w-5 h-5" />结束检测
        </Button>
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
