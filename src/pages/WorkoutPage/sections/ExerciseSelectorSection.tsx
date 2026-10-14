import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EX } from '@/data/exercises';

export default function ExerciseSelectorSection({exercises,selectedId,onSelect,disabled}:{exercises:EX[];selectedId:string|null;onSelect:(e:EX)=>void;disabled?:boolean}){
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">选择运动类型</CardTitle></CardHeader>
    <CardContent><div className="grid grid-cols-3 gap-2">
      {exercises.map(ex=>{
        const sel=selectedId===ex.id;
        return(<button key={ex.id} onClick={()=>!disabled&&onSelect(ex)} disabled={disabled}
          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
          'hover:border-primary/50 hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
          sel?'border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary))]':'border-border bg-card')}>
          <span className="text-2xl">{ex.icon}</span><span className={cn('text-xs font-medium',sel?'text-primary':'text-foreground')}>{ex.name}</span>
        </button>);
      })}
    </div>{selectedId&&<p className="mt-3 text-xs text-muted-foreground">{exercises.find(e=>e.id===selectedId)?.description}</p>}</CardContent></Card>
  );
}
