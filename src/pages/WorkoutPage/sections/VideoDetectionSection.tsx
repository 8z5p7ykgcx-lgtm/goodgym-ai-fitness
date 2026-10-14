import { useRef, useEffect } from 'react';
import { CameraOff, AlertTriangle, CheckCircle, UserX, Loader2 } from 'lucide-react';
import { drawSkel, drawErr, drawAngle } from '@/lib/pose-utils';
import type { DE, JA, KP } from '@/lib/pose-utils';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement|null>;
  kps: KP[]; angles: JA; errors: DE[];
  detecting: boolean; camOn: boolean; exName: string;
  good: boolean; progress: number; hasPerson: boolean; modelLoading: boolean;
}

export default function VideoDetectionSection({videoRef,kps,angles,errors,detecting,camOn,exName,good,progress,hasPerson,modelLoading}: Props) {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const pulseRef = useRef(0);

  useEffect(() => {
    const c = canvasRef.current; if(!c) return;
    const ctx = c.getContext('2d'); if(!ctx) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    c.width = rect.width*dpr; c.height = rect.height*dpr;
    ctx.scale(dpr,dpr);
    const w=rect.width,h=rect.height;
    ctx.clearRect(0,0,w,h);
    if(!detecting||!hasPerson) return;
    pulseRef.current += .08;
    const pulse=(Math.sin(pulseRef.current)+1)/2;
    drawSkel(ctx,kps,w,h,good?'#00ff88':'#ff4757');
    const joints=[{k:13,a:angles.leftElbow},{k:14,a:angles.rightElbow},{k:25,a:angles.leftKnee},{k:26,a:angles.rightKnee},{k:23,a:angles.leftHip},{k:24,a:angles.rightHip}];
    for(const j of joints){const p=kps[j.k]; if(!p||p.visibility<.3)continue; drawAngle(ctx,{x:p.x,y:p.y},j.a,w,h,j.a>100&&j.a<175);}
    for(const e of errors) drawErr(ctx,e.jointPoint,w,h,e.severity,pulse);
  },[kps,errors,detecting,hasPerson,good,angles]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-card border shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-muted to-card">
        {camOn ? (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-x-[-1]" playsInline muted />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <CameraOff className="w-16 h-16 opacity-40"/><p className="text-sm">未启用摄像头</p><p className="text-xs opacity-70">点击「开始检测」授权访问</p>
          </div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]" />
        {!detecting&&!modelLoading&&(
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
              <span className="text-sm text-muted-foreground">{exName?`选择了${exName}，点击开始检测`:'请选择运动类型'}</span>
            </div>
          </div>
        )}
        {modelLoading&&(
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
            <div className="text-center space-y-3"><Loader2 className="w-10 h-10 text-primary animate-spin mx-auto"/><p className="text-sm">正在加载姿态检测模型</p><p className="text-xs text-muted-foreground">首次加载约需 10 秒</p></div>
          </div>
        )}
        {detecting&&!hasPerson&&(
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/50">
              <UserX className="w-4 h-4 text-muted-foreground"/><span className="text-sm text-muted-foreground">未检测到人体，请站到镜头前</span>
            </div>
          </div>
        )}
        {detecting&&hasPerson&&(
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
              <div className={`w-2 h-2 rounded-full ${good?'bg-green-500':'bg-red-500'} animate-pulse`}/>
              <span className="text-xs font-medium">{exName}检测中</span>
            </div>
            {good?(
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/40 backdrop-blur-sm">
                <CheckCircle className="w-4 h-4 text-green-400"/><span className="text-xs font-medium text-green-400">动作标准</span>
              </div>
            ):(<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-sm">
              <AlertTriangle className="w-4 h-4 text-red-400"/><span className="text-xs font-medium text-red-400">{errors.length} 处需调整</span>
            </div>)}
          </div>
        )}
        {detecting&&hasPerson&&(
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <div className="h-1 bg-background/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-150" style={{width:`${progress*100}%`}}/>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 bg-card/50 border-t border-border/30 flex items-center gap-2">
        <Shield className="size-3.5 text-green-400 shrink-0"/>
        <p className="text-xs text-muted-foreground">所有检测在本地完成，视频画面不会上传服务器</p>
      </div>
    </div>
  );
}

import { Shield } from 'lucide-react';
