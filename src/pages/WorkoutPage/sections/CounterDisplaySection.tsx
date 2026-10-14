import { Card, CardContent } from '@/components/ui/card';
import { Activity, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  currentReps: number;
  currentSets: number;
  targetReps: number;
  isDetecting: boolean;
  sessionDuration: number;
  exerciseName: string;
}

export default function CounterDisplaySection({
  currentReps, currentSets, targetReps,
  isDetecting, sessionDuration, exerciseName,
}: Props) {
  const progress = targetReps > 0 ? (currentReps / targetReps) * 100 : 0;
  const timeStr = format(new Date(sessionDuration * 1000), 'mm:ss');
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-neutral-900" />
          <span className="text-sm text-neutral-500">{exerciseName || '未选择运动'}</span>
          {isDetecting && <span className="ml-auto text-xs text-neutral-400 font-mono">{timeStr}</span>}
        </div>
        <div className="flex items-end gap-2 mb-3">
          <span className={cn('text-6xl font-black font-mono tabular-nums leading-none', isDetecting ? 'text-neutral-900' : 'text-neutral-400')}>{currentReps}</span>
          <span className="text-lg text-neutral-400 mb-1">/ {targetReps} 次</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-4">
          <div className={cn('h-full transition-all duration-200 rounded-full', progress >= 100 ? 'bg-green-500' : 'bg-neutral-900')} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50">
            <div className="size-7 rounded-md bg-neutral-900/10 flex items-center justify-center">
              <Target className="size-4 text-neutral-900" />
            </div>
            <div><div className="text-xs text-neutral-500">组数</div><div className="text-lg font-bold font-mono">{currentSets}</div></div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50">
            <div className="size-7 rounded-md bg-green-100 flex items-center justify-center">
              <Activity className="size-4 text-green-600" />
            </div>
            <div><div className="text-xs text-neutral-500">累计</div><div className="text-lg font-bold font-mono">{currentSets * targetReps + currentReps}</div></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
