const STORAGE_KEY = 'goodgym_workout_history';

export interface WorkoutRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  duration: number;
  totalReps: number;
  sets: number;
  accuracy: number;
  errors: { type: string; count: number }[];
}

export function saveWorkoutRecord(record: Omit<WorkoutRecord, 'id' | 'date'>) {
  const history = getWorkoutHistory();
  history.unshift({
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

export function getWorkoutHistory(): WorkoutRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutRecord[];
  } catch {
    return [];
  }
}
