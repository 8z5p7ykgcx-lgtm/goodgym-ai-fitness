import { useState } from 'react';
import { Play, Square, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ControlButtonSection({detecting,onStart,onStop,hasEx,camOn,onCam,onReset,modelLoading}:{detecting:boolean;onStart:()=>void;onStop:()=>void;hasEx:boolean;camOn:boolean;onCam:()=>Promise<boolean>;onReset:()=>void;modelLoading?:boolean}){
  const [enabling,setEnabling]=useState(false);
  const handleCam=async()=>{setEnabling(true);const ok=await onCam();setEnabling(false);ok?toast.success('摄像头已启用'):toast.error('摄像头授权失败');};
  return(
    <div className="space-y-3">
      {!detecting?(
        <Button onClick={onStart} size="lg" className="w-full h-14 text-base font-semibold gap-2" disabled={!hasEx||modelLoading}>
          {modelLoading?<><Loader2 className="w-5 h-5 animate-spin"/>加载模型中...</>:<><Play className="w-5 h-5"/>开始检测</>}
        </Button>
      ):(<Button onClick={onStop} variant="destructive" size="lg" className="w-full h-14 text-base font-semibold gap-2"><Square className="w-5 h-5"/>结束检测</Button>)}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={handleCam} disabled={camOn||enabling||detecting} className="h-10">
          <Camera className="w-4 h-4 mr-1.5"/>{camOn?'已连接':enabling?'授权中':'启用摄像头'}
        </Button>
        <Button variant="secondary" onClick={onReset} disabled={detecting} className="h-10"><RefreshCw className="w-4 h-4 mr-1.5"/>重置计数</Button>
      </div>
    </div>
  );
}
