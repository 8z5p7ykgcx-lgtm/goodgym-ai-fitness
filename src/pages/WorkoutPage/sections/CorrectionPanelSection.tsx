import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Lightbulb, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetectedError } from '@/lib/pose-utils';

interface Props {
  errors: DetectedError[];
  isDetecting: boolean;
  isGoodForm: boolean;
  goodFrames: number;
  totalFrames: number;
}

export default function CorrectionPanelSection({ errors, isDetecting, isGoodForm, goodFrames, totalFrames }: Props) {
  const accuracy = totalFrames > 0 ? Math.round((goodFrames / totalFrames) * 100) : 100;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="size-4 text-neutral-900" /> 动作纠错
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isDetecting ? (
          <div className="text-center py-8 space-y-2">
            <Lightbulb className="size-8 mx-auto text-neutral-300" />
            <p className="text-sm text-neutral-500">开始检测后</p>
            <p className="text-xs text-neutral-400">实时识别动作问题并给出纠正建议</p>
          </div>
        ) : isGoodForm ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="size-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700">动作标准，保持住！</p>
            <p className="text-xs text-neutral-500">标准率 {accuracy}%</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-4" />
              <span className="text-sm font-medium">发现 {errors.length} 处需调整</span>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {errors.map((err) => (
                <div key={err.id} className={cn('p-3 rounded-lg border', err.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200')}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={cn('text-sm font-semibold', err.severity === 'error' ? 'text-red-700' : 'text-amber-700')}>{err.type}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="size-3 text-neutral-400" />
                      <span className="text-[11px] text-neutral-400">{err.duration}帧</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mb-1.5">{err.description}</p>
                  <p className="text-xs text-neutral-700"><span className="font-medium text-neutral-900">建议：</span>{err.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
