import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { EXERCISES } from '@/data/exercises';
import type { EX } from '@/data/exercises';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { saveWR } from '@/lib/workout-storage';
import HeaderSection from './sections/HeaderSection';
import VideoDetectionSection from './sections/VideoDetectionSection';
import ExerciseSelectorSection from './sections/ExerciseSelectorSection';
import CounterDisplaySection from './sections/CounterDisplaySection';
import CorrectionPanelSection from './sections/CorrectionPanelSection';
import ControlButtonSection from './sections/ControlButtonSection';
import StatsSection from './sections/StatsSection';

export default function WorkoutPage() {
  const {
    state, detecting, exercise, start, stop, setEx,
    camOn, enableCam, videoRef, modelLoading, modelReady, loadModel,
  } = usePoseDetection();

  const [duration, setDuration] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errMap, setErrMap] = useState<Record<string, number>>({});
  const [version, setVersion] = useState(0);
  const wasDetecting = useRef(false);
  const goodRef = useRef(0);
  const totalRef = useRef(0);
  const errCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!detecting) return;
    const t = setInterval(() => setDuration(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [detecting]);

  useEffect(() => {
    if (!detecting) return;
    totalRef.current++;
    if (state.good) goodRef.current++;
    for (const e of state.errors) {
      if (!errCountRef.current[e.type]) errCountRef.current[e.type] = 0;
      errCountRef.current[e.type]++;
    }
    if (totalRef.current % 15 === 0) {
      setAccuracy(totalRef.current > 0 ? Math.round((goodRef.current / totalRef.current) * 100) : 100);
      setErrMap({ ...errCountRef.current });
    }
  }, [state.frame, detecting, state.good, state.errors]);

  useEffect(() => {
    if (detecting && !wasDetecting.current) {
      setDuration(0); goodRef.current = 0; totalRef.current = 0;
      errCountRef.current = {}; setAccuracy(100); setErrMap({});
    }
    wasDetecting.current = detecting;
  }, [detecting]);

  const handleStart = useCallback(async () => {
    if (!exercise) { toast.warning('请先选择运动类型'); return; }
    if (!camOn) {
      const ok = await enableCam();
      if (!ok) { toast.error('无法访问摄像头，请检查浏览器权限'); return; }
    }
    if (!modelReady) {
      toast.info('正在加载姿态检测模型，请稍候...');
      const ok = await loadModel();
      if (!ok) { toast.error('模型加载失败，请检查网络'); return; }
      toast.success('模型加载完成');
    }
    start();
    toast.success('检测已开始，请站到镜头前');
  }, [exercise, camOn, enableCam, modelReady, loadModel, start]);

  const handleStop = useCallback(() => {
    if (exercise && (state.reps + state.sets) > 0) {
      const errors = Object.entries(errCountRef.current).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
      const acc = totalRef.current > 0 ? Math.round((goodRef.current / totalRef.current) * 100) : 100;
      saveWR({
        exerciseId: exercise.id, exerciseName: exercise.name, duration,
        totalReps: state.sets * exercise.targetReps + state.reps,
        sets: state.sets + (state.reps > 0 ? 1 : 0),
        accuracy: acc, errors,
      });
      setVersion(v => v + 1);
      toast.success(`训练完成！共完成 ${state.sets * exercise.targetReps + state.reps} 次，标准率 ${acc}%`);
    }
    stop();
  }, [exercise, state, duration, stop]);

  const handleReset = useCallback(() => {
    if (detecting) return;
    if (exercise) setEx(exercise);
    setDuration(0); setAccuracy(100); setErrMap({});
    goodRef.current = 0; totalRef.current = 0; errCountRef.current = {};
    toast.info('计数已重置');
  }, [detecting, exercise, setEx]);

  const errArr = Object.entries(errMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <HeaderSection />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VideoDetectionSection
              videoRef={videoRef} kps={state.kps} angles={state.angles}
              errors={state.errors} detecting={detecting} camOn={camOn}
              exName={exercise?.name || ''} good={state.good}
              progress={state.progress} hasPerson={state.hasPerson} modelLoading={modelLoading}
            />
            <div className="lg:hidden">
              <StatsSection reps={state.reps} sets={state.sets} target={exercise?.targetReps || 0}
                detecting={detecting} duration={duration} exName={exercise?.name || ''}
                accuracy={accuracy} errors={errArr} version={version} />
            </div>
          </div>
          <div className="space-y-4">
            <ExerciseSelectorSection exercises={EXERCISES} selectedId={exercise?.id || null}
              onSelect={setEx} disabled={detecting} />
            <CounterDisplaySection reps={state.reps} sets={state.sets} target={exercise?.targetReps || 0}
              detecting={detecting} duration={duration} exName={exercise?.name || ''} />
            <CorrectionPanelSection errors={state.errors} detecting={detecting} good={state.good}
              goodFrames={goodRef.current} totalFrames={totalRef.current} />
            <ControlButtonSection detecting={detecting} onStart={handleStart} onStop={handleStop}
              hasEx={!!exercise} camOn={camOn} onCam={enableCam} onReset={handleReset} modelLoading={modelLoading} />
            <div className="hidden lg:block">
              <StatsSection reps={state.reps} sets={state.sets} target={exercise?.targetReps || 0}
                detecting={detecting} duration={duration} exName={exercise?.name || ''}
                accuracy={accuracy} errors={errArr} version={version} />
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-6 text-center text-xs text-muted-foreground border-t border-border/30">
        <p>AI 健身助手 · 基于姿态检测的智能训练 · 本地运行保护隐私</p>
      </footer>
    </div>
  );
}
