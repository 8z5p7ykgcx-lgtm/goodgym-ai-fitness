import { Card, CardContent } from '@/components/ui/card';
import { Activity, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CounterDisplaySection({reps,sets,target,detecting,duration,exName}:{reps:number;sets:number;target:number;detecting:boolean;duration:number;exName:string}){
  const prog=target>0?(reps/target)*100:0;
  const ts=format(new Date(duration*1000),'mm:ss');
  return(
    <Card><CardContent className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-4 text-primary"/><span className="text-sm text-muted-foreground">{exName||'未选择运动'}</span>
        {detecting&&<span className="ml-auto text-xs text-muted-foreground font-mono">{ts}</span>}
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={cn('text-6xl font-black font-mono tabular-nums',detecting?'text-primary':'text-foreground')}>{reps}</span>
        <span className="text-lg text-muted-foreground mb-2">/ {target} 次</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div className={cn('h-full transition-all duration-200 rounded-full',prog>=100?'bg-green-500':'bg-primary')} style={{width:`${Math.min(prog,100)}%`}}/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
          <div className="size-7 rounded-md bg-primary/20 flex items-center justify-center"><Target className="size-4 text-primary"/></div>
          <div><div className="text-xs text-muted-foreground">组数</div><div className="text-lg font-bold font-mono">{sets}</div></div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
          <div className="size-7 rounded-md bg-green-500/20 flex items-center justify-center"><Activity className="size-4 text-green-400"/></div>
          <div><div className="text-xs text-muted-foreground">本轮完成</div><div className="text-lg font-bold font-mono">{sets*target+reps}</div></div>
        </div>
      </div>
    </CardContent></Card>
  );
}
