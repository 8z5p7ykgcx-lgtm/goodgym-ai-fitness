import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DE } from '@/lib/pose-utils';

export default function CorrectionPanelSection({errors,detecting,good,goodFrames,totalFrames}:{errors:DE[];detecting:boolean;good:boolean;goodFrames:number;totalFrames:number}){
  const acc=totalFrames>0?Math.round((goodFrames/totalFrames)*100):100;
  return(
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="size-4 text-primary"/>动作纠错</CardTitle></CardHeader>
    <CardContent>
      {!detecting?(
        <div className="text-center py-8 space-y-2"><Lightbulb className="size-8 mx-auto text-muted-foreground/50"/><p className="text-sm text-muted-foreground">开始检测后</p><p className="text-xs text-muted-foreground/70">实时识别动作问题并给出纠正建议</p></div>
      ):good?(
        <div className="flex flex-col items-center gap-2 py-6">
          <div className="size-12 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle className="size-6 text-green-400"/></div>
          <p className="text-sm font-medium text-green-400">动作标准，保持住！</p><p className="text-xs text-muted-foreground">标准率 {acc}%</p>
        </div>
      ):(<div className="space-y-3">
        <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="size-4"/><span className="text-sm font-medium">发现 {errors.length} 处需调整</span></div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {errors.map(e=>(
            <div key={e.id} className={cn('p-3 rounded-lg border',e.severity==='error'?'bg-red-500/10 border-red-500/30':'bg-yellow-500/10 border-yellow-500/30')}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={cn('text-sm font-semibold',e.severity==='error'?'text-red-400':'text-yellow-400')}>{e.type}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">{e.duration}帧</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">{e.description}</p>
              <p className="text-xs text-foreground/80"><span className="text-primary/80 font-medium">建议：</span>{e.suggestion}</p>
            </div>
          ))}
        </div>
      </div>)}
    </CardContent></Card>
  );
}
