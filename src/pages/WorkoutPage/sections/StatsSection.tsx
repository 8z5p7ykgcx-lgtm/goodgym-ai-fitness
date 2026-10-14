import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { getWR, type WR } from '@/lib/workout-storage';
import { cn } from '@/lib/utils';

export default function StatsSection({reps,sets,target,detecting,duration,exName,accuracy,errors,version}:{reps:number;sets:number;target:number;detecting:boolean;duration:number;exName:string;accuracy:number;errors:{type:string;count:number}[];version:number}){
  const [open,setOpen]=useState(false);
  const [hist,setHist]=useState<WR[]>([]);
  useEffect(()=>{setHist(getWR());},[version]);
  const total=sets*target+reps;
  const ts=format(new Date(duration*1000),'mm:ss');
  return(
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4 text-primary"/>训练统计</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/50"><div className="text-xl font-bold font-mono">{total}</div><div className="text-[10px] text-muted-foreground mt-0.5">总次数</div></div>
        <div className="text-center p-2 rounded-lg bg-muted/50"><div className="text-xl font-bold font-mono">{sets}</div><div className="text-[10px] text-muted-foreground mt-0.5">组数</div></div>
        <div className="text-center p-2 rounded-lg bg-muted/50"><div className="text-xl font-bold font-mono">{ts}</div><div className="text-[10px] text-muted-foreground mt-0.5">时长</div></div>
        <div className="text-center p-2 rounded-lg bg-muted/50"><div className={cn('text-xl font-bold font-mono',accuracy>=80?'text-green-400':accuracy>=60?'text-yellow-400':'text-red-400')}>{accuracy}%</div><div className="text-[10px] text-muted-foreground mt-0.5">标准率</div></div>
      </div>
      <div>
        <button onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground"><span>历史训练记录 ({hist.length})</span>{open?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}</button>
        {open&&<div className="space-y-2 max-h-[200px] overflow-y-auto">
          {hist.length===0?<p className="text-xs text-muted-foreground text-center py-4">暂无记录</p>:hist.slice(0,10).map(r=>(
            <div key={r.id} className="p-2.5 rounded-lg bg-muted/50 text-xs">
              <div className="flex items-center justify-between mb-1"><span className="font-medium">{r.exerciseName}</span><span className="text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span></div>
              <div className="flex items-center gap-3 text-muted-foreground"><span>{r.totalReps}次</span><span>{r.sets}组</span><span>{Math.floor(r.duration/60)}:{String(r.duration%60).padStart(2,'0')}</span><span className={cn(r.accuracy>=80?'text-green-400':'text-yellow-400')}>{r.accuracy}%</span></div>
            </div>
          ))}
        </div>}
      </div>
    </CardContent></Card>
  );
}
