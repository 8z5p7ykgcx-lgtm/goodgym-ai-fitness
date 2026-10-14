import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { EXERCISES } from '@/data/exercises';
import type { Exercise } from '@/data/exercises';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { saveWorkoutRecord } from '@/lib/workout-storage';
import HeaderSection from './sections/HeaderSection';
import VideoDetectionSection from './sections/VideoDetectionSection';
import ExerciseSelectorSection from './sections/ExerciseSelectorSection';
import CounterDisplaySection from './sections/CounterDisplaySection';
import CorrectionPanelSection from './sections/CorrectionPanelSection';
import ControlButtonSection from './sections/ControlButtonSection';
import StatsSection from './sections/StatsSection';

export default function WorkoutPage() {
  const {
    state, isDetecting, currentExercise,
    startDetection, stopDetection, selectExercise,
    cameraEnabled, cameraStatus, enableCamera, videoRef,
    modelLoading, modelReady, loadModel,
  } = usePoseDetection();

  const [sessionDuration, setSessionDuration] = useState(0);
  const [goodFrameRatio, setGoodFrameRatio] = useState(100);
  const [historyVersion, setHistoryVersion] = useState(0);
  const wasDetectingRef = useRef(false);
  const goodFramesRef = useRef(0);
  const totalFramesRef = useRef(0);
  const errorCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isDetecting) return;
    const timer = setInterval(() => setSessionDuration((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isDetecting]);

  useEffect(() => {
    if (!isDetecting) return;
    totalFramesRef.current += 1;
    if (state.isGoodForm) goodFramesRef.current += 1;
    for (const err of state.errors) {
      errorCountsRef.current[err.type] = (errorCountsRef.current[err.type] || 0) + 1;
    }
    if (totalFramesRef.current % 15 === 0) {
      const ratio = totalFramesRef.current > 0 ? Math.round((goodFramesRef.current / totalFramesRef.current) * 100) : 100;
      setGoodFrameRatio(ratio);
    }
  }, [state.frameCount, isDetecting, state.isGoodForm, state.errors]);

  useEffect(() => {
    if (isDetecting && !wasDetectingRef.current) {
      setSessionDuration(0);
      goodFramesRef.current = 0;
      totalFramesRef.current = 0;
      errorCountsRef.current = {};
      setGoodFrameRatio(100);
    }
    wasDetectingRef.current = isDetecting;
  }, [isDetecting]);

  /**
   * 开始检测：摄像头授权是使用的前置条件。
   * 1) 未授权 → 先请求摄像头（触发浏览器/系统授权弹窗）
   * 2) 授权成功 → 加载姿态模型
   * 3) 一切就绪 → 启动检测循环（画面与识别同时工作）
   */
  const handleStart = useCallback(async () => {
    if (!currentExercise) { toast.warning('请先选择运动类型'); return; }
    if (!cameraEnabled) {
      const ok = await enableCamera();
      if (!ok) {
        if (cameraStatus === 'denied') {
          toast.error('摄像头权限被拒绝，请在浏览器设置中允许后重试');
        } else {
          toast.error('无法访问摄像头，请按画面提示操作');
        }
        return;
      }
    }
    if (!modelReady) {
      toast.info('正在加载姿态检测模型，请稍候...');
      const ok = await loadModel();
      if (!ok) { toast.error('模型加载失败，请检查网络连接'); return; }
      toast.success('模型加载完成');
    }
    startDetection();
    toast.success('检测已开始，请站到镜头前');
  }, [currentExercise, cameraEnabled, cameraStatus, enableCamera, modelReady, loadModel, startDetection]);

  const handleStop = useCallback(() => {
    if (currentExercise && state.reps + state.sets > 0) {
      const errors = Object.entries(errorCountsRef.current).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
      const accuracy = totalFramesRef.current > 0 ? Math.round((goodFramesRef.current / totalFramesRef.current) * 100) : 100;
      saveWorkoutRecord({
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name,
        duration: sessionDuration,
        totalReps: state.sets * currentExercise.targetReps + state.reps,
        sets: state.sets + (state.reps > 0 ? 1 : 0),
        accuracy,
        errors,
      });
      setHistoryVersion((v) => v + 1);
      toast.success(`训练完成！共完成 ${state.sets * currentExercise.targetReps + state.reps} 次，标准率 ${accuracy}%`);
    }
    stopDetection();
  }, [currentExercise, state, sessionDuration, stopDetection]);

  const handleReset = useCallback(() => {
    if (isDetecting) return;
    if (currentExercise) selectExercise(currentExercise);
    setSessionDuration(0);
    setGoodFrameRatio(100);
    goodFramesRef.current = 0;
    totalFramesRef.current = 0;
    errorCountsRef.current = {};
    toast.info('计数已重置');
  }, [isDetecting, currentExercise, selectExercise]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <HeaderSection />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VideoDetectionSection
              videoRef={videoRef} keypoints={state.keypoints} angles={state.angles}
              errors={state.errors} isDetecting={isDetecting} cameraEnabled={cameraEnabled}
              cameraStatus={cameraStatus} exerciseName={currentExercise?.name || ''}
              isGoodForm={state.isGoodForm} repProgress={state.repProgress}
              hasPerson={state.hasPerson} modelLoading={modelLoading}
              onEnableCamera={enableCamera}
            />
            <div className="lg:hidden">
              <StatsSection currentReps={state.reps} currentSets={state.sets} targetReps={currentExercise?.targetReps || 0} sessionDuration={sessionDuration} accuracy={goodFrameRatio} refreshVersion={historyVersion} />
            </div>
          </div>
          <div className="space-y-4">
            <ExerciseSelectorSection exercises={EXERCISES} selectedId={currentExercise?.id || null} onSelect={selectExercise} disabled={isDetecting} />
            <CounterDisplaySection currentReps={state.reps} currentSets={state.sets} targetReps={currentExercise?.targetReps || 0} isDetecting={isDetecting} sessionDuration={sessionDuration} exerciseName={currentExercise?.name || ''} />
            <CorrectionPanelSection errors={state.errors} isDetecting={isDetecting} isGoodForm={state.isGoodForm} goodFrames={goodFramesRef.current} totalFrames={totalFramesRef.current} />
            <ControlButtonSection isDetecting={isDetecting} onStart={handleStart} onStop={handleStop} hasExercise={!!currentExercise} cameraEnabled={cameraEnabled} cameraStatus={cameraStatus} onEnableCamera={enableCamera} onReset={handleReset} modelLoading={modelLoading} />
            <div className="hidden lg:block">
              <StatsSection currentReps={state.reps} currentSets={state.sets} targetReps={currentExercise?.targetReps || 0} sessionDuration={sessionDuration} accuracy={goodFrameRatio} refreshVersion={historyVersion} />
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-6 text-center text-xs text-neutral-400 border-t border-neutral-200 mt-8">
        <p>AI 健身助手 · 基于 MediaPipe Pose 的实时姿态检测与动作纠错 · 本地运行保护隐私</p>
      </footer>
    </div>
  );
}
