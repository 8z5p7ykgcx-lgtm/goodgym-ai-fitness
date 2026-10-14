import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/data/exercises';

interface Props {
  exercises: Exercise[];
  selectedId: string | null;
  onSelect: (ex: Exercise) => void;
  disabled?: boolean;
}

export default function ExerciseSelectorSection({ exercises, selectedId, onSelect, disabled }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">选择运动类型</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {exercises.map((ex) => {
            const isSelected = selectedId === ex.id;
            return (
              <button key={ex.id} onClick={() => !disabled && onSelect(ex)} disabled={disabled}
                className={cn('flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected ? 'border-neutral-900 bg-neutral-900/5' : 'border-neutral-200 bg-white')}>
                <span className="text-2xl">{ex.icon}</span>
                <span className={cn('text-xs font-medium', isSelected ? 'text-neutral-900' : 'text-neutral-700')}>{ex.name}</span>
              </button>
            );
          })}
        </div>
        {selectedId && (
          <p className="mt-3 text-xs text-neutral-500">{exercises.find((e) => e.id === selectedId)?.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
