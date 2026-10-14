import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { getWorkoutHistory, type WorkoutRecord } from '@/lib/workout-storage';
import { cn } from '@/lib/utils';

interface Props {
  currentReps: number;
  currentSets: number;
  targetReps: number;
  sessionDuration: number;
  accuracy: number;
  refreshVersion: number;
}

export default function StatsSection({ currentReps, currentSets, targetReps, sessionDuration, accuracy, refreshVersion }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<WorkoutRecord[]>([]);
  useEffect(() => { setHistory(getWorkoutHistory()); }, [refreshVersion]);
  const totalReps = currentSets * targetReps + currentReps;
  const timeStr = format(new Date(sessionDuration * 1000), 'mm:ss');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="size-4 text-neutral-900" /> 训练统计
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-neutral-50">
            <div className="text-lg font-bold font-mono">{totalReps}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">总次数</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-neutral-50">
            <div className="text-lg font-bold font-mono">{currentSets}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">组数</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-neutral-50">
            <div className="text-lg font-bold font-mono">{timeStr}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">时长</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-neutral-50">
            <div className={cn('text-lg font-bold font-mono', accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-600')}>{accuracy}%</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">标准率</div>
          </div>
        </div>
        <div>
          <button onClick={() => setHistoryOpen(!historyOpen)} className="w-full flex items-center justify-between py-2 text-xs text-neutral-500 hover:text-neutral-900">
            <span>历史训练记录 ({history.length})</span>
            {historyOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {historyOpen && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">暂无记录</p>
              ) : (
                history.slice(0, 10).map((rec) => (
                  <div key={rec.id} className="p-2.5 rounded-lg bg-neutral-50 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{rec.exerciseName}</span>
                      <span className="text-neutral-400">{new Date(rec.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-500">
                      <span>{rec.totalReps} 次</span><span>{rec.sets} 组</span>
                      <span>{Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}</span>
                      <span className={cn(rec.accuracy >= 80 ? 'text-green-600' : 'text-amber-600')}>{rec.accuracy}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
