import { useState, useRef, useCallback, useEffect } from 'react';
import type { Exercise } from '@/data/exercises';
import {
  type Keypoint,
  type JointAngles,
  type DetectedError,
  calculateJointAngles,
  calculateAngle,
  dist2D,
  pointToLineDistance,
} from '@/lib/pose-utils';
import { loadPoseLandmarker, detectPose } from '@/lib/mediapipe-pose';

export interface PoseState {
  keypoints: Keypoint[];
  angles: JointAngles;
  reps: number;
  sets: number;
  errors: DetectedError[];
  isInMotion: boolean;
  isGoodForm: boolean;
  frameCount: number;
  repProgress: number;
  hasPerson: boolean;
}

const INITIAL_ANGLES: JointAngles = {
  leftShoulder: 180, rightShoulder: 180,
  leftElbow: 180, rightElbow: 180,
  leftHip: 180, rightHip: 180,
  leftKnee: 180, rightKnee: 180,
  leftAnkle: 90, rightAnkle: 90,
  torso: 0,
};

const EMPTY_KEYPOINTS: Keypoint[] = Array.from({ length: 33 }, () => ({
  x: 0, y: 0, z: 0, visibility: 0,
}));

export function usePoseDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const landmarkerRef = useRef<any>(null);
  const prevKeypointsRef = useRef<Keypoint[] | null>(null);

  const stateRef = useRef<PoseState>({
    keypoints: EMPTY_KEYPOINTS,
    angles: INITIAL_ANGLES,
    reps: 0, sets: 0,
    errors: [],
    isInMotion: false,
    isGoodForm: true,
    frameCount: 0,
    repProgress: 0,
    hasPerson: false,
  });
  const [, forceUpdate] = useState(0);
  const errorAccumRef = useRef<Record<string, { frames: number; lastFrame: number }>>({});

  const loadModel = useCallback(async (): Promise<boolean> => {
    if (modelReady && landmarkerRef.current) return true;
    if (modelLoading) return false;
    setModelLoading(true);
    try {
      const lm = await loadPoseLandmarker();
      landmarkerRef.current = lm;
      setModelReady(true);
      return true;
    } catch (e) {
      console.error('模型加载失败:', e);
      return false;
    } finally {
      setModelLoading(false);
    }
  }, [modelReady, modelLoading]);

  const enableCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraEnabled(true);
      return true;
    } catch (e) {
      console.error('摄像头授权失败:', e);
      setCameraEnabled(false);
      return false;
    }
  }, []);

  const runCorrections = useCallback(
    (angles: JointAngles, exercise: Exercise, kps: Keypoint[]) => {
      const s = stateRef.current;
      const found: DetectedError[] = [];
      const now = s.frameCount;

      for (const rule of exercise.correctionRules) {
        let isError = false;
        let point = { x: 0.5, y: 0.5 };

        switch (rule.id) {
          case 'knee-inward': {
            const lk = kps[25], rk = kps[26], la = kps[27], ra = kps[28];
            if (lk.visibility > 0.5 && rk.visibility > 0.5 && la.visibility > 0.5 && ra.visibility > 0.5) {
              const kneeDist = Math.abs(rk.x - lk.x);
              const ankleDist = Math.abs(ra.x - la.x);
              isError = ankleDist > 0 && kneeDist < ankleDist * 0.8;
              point = { x: (lk.x + rk.x) / 2, y: (lk.y + rk.y) / 2 };
            }
            break;
          }
          case 'back-bend': {
            const ls = kps[11], rs = kps[12], lh = kps[23], rh = kps[24];
            if (ls.visibility > 0.5 && rs.visibility > 0.5 && lh.visibility > 0.5 && rh.visibility > 0.5) {
              const sm = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
              const hm = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
              const dx = Math.abs(sm.x - hm.x);
              const dy = Math.abs(sm.y - hm.y);
              const torsoAngle = (Math.atan2(dx, dy) * 180) / Math.PI;
              isError = torsoAngle > 40 && s.repProgress < 0.5;
              point = { x: hm.x, y: (sm.y + hm.y) / 2 };
            }
            break;
          }
          case 'insufficient-depth': {
            const kneeAvg = (angles.leftKnee + angles.rightKnee) / 2;
            if (kps[25].visibility > 0.5) {
              isError = s.isInMotion && s.repProgress > 0.5 && kneeAvg > 110;
              point = { x: kps[25].x, y: kps[25].y };
            }
            break;
          }
          case 'heel-lift': {
            const la = kps[27], lfi = kps[31];
            if (la.visibility > 0.5 && lfi.visibility > 0.5) {
              const footLen = dist2D(la, lfi);
              isError = footLen > 0.06 && la.y < lfi.y - 0.02;
              point = { x: la.x, y: la.y };
            }
            break;
          }
          case 'sag-waist': {
            const ls = kps[11], rs = kps[12], lh = kps[23], rh = kps[24], lk = kps[25], rk = kps[26];
            if (ls.visibility > 0.5 && lh.visibility > 0.5 && lk.visibility > 0.5) {
              const sy = (ls.y + rs.y) / 2, hy = (lh.y + rh.y) / 2, ky = (lk.y + rk.y) / 2;
              const expectedHipY = sy + (ky - sy) * 0.5;
              const bodyLen = Math.abs(ky - sy);
              isError = bodyLen > 0.1 && hy - expectedHipY > 0.03;
              point = { x: (lh.x + rh.x) / 2, y: hy };
            }
            break;
          }
          case 'hip-up': {
            const ls = kps[11], rs = kps[12], lh = kps[23], rh = kps[24], lk = kps[25], rk = kps[26];
            if (ls.visibility > 0.5 && lh.visibility > 0.5 && lk.visibility > 0.5) {
              const sy = (ls.y + rs.y) / 2, hy = (lh.y + rh.y) / 2, ky = (lk.y + rk.y) / 2;
              const expectedHipY = sy + (ky - sy) * 0.5;
              const bodyLen = Math.abs(ky - sy);
              isError = bodyLen > 0.1 && expectedHipY - hy > 0.03;
              point = { x: (lh.x + rh.x) / 2, y: hy };
            }
            break;
          }
          case 'arm-not-straight': {
            const elbowAvg = (angles.leftElbow + angles.rightElbow) / 2;
            if (kps[13].visibility > 0.5) {
              isError = !s.isInMotion && elbowAvg < 160;
              point = { x: kps[13].x, y: kps[13].y };
            }
            break;
          }
          case 'body-not-straight': {
            const ls = kps[11], rs = kps[12], lh = kps[23], rh = kps[24], la = kps[27], ra = kps[28];
            if (ls.visibility > 0.5 && lh.visibility > 0.5 && la.visibility > 0.5) {
              const sm = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
              const hm = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
              const am = { x: (la.x + ra.x) / 2, y: (la.y + ra.y) / 2 };
              const deviation = pointToLineDistance(hm, sm, am);
              const bodyLen = dist2D(sm, am);
              isError = bodyLen > 0.15 && deviation / bodyLen > 0.08;
              point = hm;
            }
            break;
          }
          case 'pull-head': {
            const nose = kps[0], lw = kps[15], rw = kps[16], le = kps[13], re = kps[14];
            if (nose.visibility > 0.5 && lw.visibility > 0.5 && rw.visibility > 0.5) {
              const wristNearHead = dist2D(lw, nose) < 0.1 && dist2D(rw, nose) < 0.1;
              const elbowSpread = Math.abs(re.x - le.x);
              isError = wristNearHead && elbowSpread > 0.2 && s.repProgress > 0.2;
              point = { x: nose.x, y: nose.y };
            }
            break;
          }
          case 'neck-compensation': {
            const nose = kps[0], ls = kps[11], rs = kps[12];
            if (nose.visibility > 0.5 && ls.visibility > 0.5 && rs.visibility > 0.5) {
              const shoulderMidY = (ls.y + rs.y) / 2;
              const headShoulderDiff = Math.abs(nose.y - shoulderMidY);
              isError = headShoulderDiff < 0.05 && s.repProgress < 0.3 && s.repProgress > 0.05;
              point = { x: nose.x, y: nose.y + 0.03 };
            }
            break;
          }
          case 'insufficient-lift': {
            const hipAvg = (angles.leftHip + angles.rightHip) / 2;
            if (kps[11].visibility > 0.5) {
              isError = s.isInMotion && s.repProgress > 0.4 && hipAvg > 140;
              point = { x: kps[11].x, y: kps[11].y };
            }
            break;
          }
          case 'wrist-bend': {
            const le = kps[13], lw = kps[15], li = kps[19];
            const re = kps[14], rw = kps[16], ri = kps[20];
            const leftOk = le.visibility > 0.5 && lw.visibility > 0.5 && li.visibility > 0.5;
            const rightOk = re.visibility > 0.5 && rw.visibility > 0.5 && ri.visibility > 0.5;
            if (leftOk || rightOk) {
              let wristAngle = 180;
              if (leftOk) wristAngle = Math.min(wristAngle, calculateAngle(le, lw, li));
              if (rightOk) wristAngle = Math.min(wristAngle, calculateAngle(re, rw, ri));
              isError = wristAngle < 150;
              point = { x: lw.x, y: lw.y };
            }
            break;
          }
          case 'body-swing': {
            const ls = kps[11], lh = kps[23];
            const prev = prevKeypointsRef.current;
            if (ls.visibility > 0.5 && lh.visibility > 0.5 && prev && prev[23]?.visibility > 0.5) {
              const hipDelta = Math.abs(lh.x - prev[23].x);
              const shoulderDelta = Math.abs(ls.x - prev[11].x);
              isError = s.isInMotion && (hipDelta > 0.015 || shoulderDelta > 0.02);
              point = { x: lh.x, y: lh.y };
            }
            break;
          }
          case 'range-too-small': {
            const elbowAvg = (angles.leftElbow + angles.rightElbow) / 2;
            if (s.isInMotion) {
              isError = s.repProgress > 0.6 && elbowAvg > 120;
              point = { x: kps[13].x, y: kps[13].y };
            }
            break;
          }
          case 'elbow-drift': {
            const ls = kps[11], le = kps[13], rs = kps[12], re = kps[14];
            const leftOk = ls.visibility > 0.5 && le.visibility > 0.5;
            const rightOk = rs.visibility > 0.5 && re.visibility > 0.5;
            if (leftOk || rightOk) {
              let driftRatio = 0;
              if (leftOk) driftRatio = Math.max(driftRatio, Math.abs(le.x - ls.x) / 0.15);
              if (rightOk) driftRatio = Math.max(driftRatio, Math.abs(re.x - rs.x) / 0.15);
              isError = s.isInMotion && driftRatio > 1.4;
              point = { x: le.x, y: le.y };
            }
            break;
          }
        }

        if (isError) {
          if (!errorAccumRef.current[rule.id]) {
            errorAccumRef.current[rule.id] = { frames: 0, lastFrame: now };
          }
          errorAccumRef.current[rule.id].frames += 1;
          errorAccumRef.current[rule.id].lastFrame = now;
          if (errorAccumRef.current[rule.id].frames > 5) {
            found.push({
              id: rule.id, type: rule.type, description: rule.description,
              suggestion: rule.suggestion, severity: rule.severity,
              jointPoint: point, duration: errorAccumRef.current[rule.id].frames,
            });
          }
        } else {
          const acc = errorAccumRef.current[rule.id];
          if (acc && now - acc.lastFrame > 15) acc.frames = 0;
        }
      }

      s.errors = found;
      s.isGoodForm = found.length === 0;
    },
    []
  );

  const detectionLoop = useCallback(() => {
    if (!currentExercise) return;
    const s = stateRef.current;
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (!video || !lm) { rafRef.current = requestAnimationFrame(detectionLoop); return; }
    if (video.readyState < 2 || video.videoWidth === 0) { rafRef.current = requestAnimationFrame(detectionLoop); return; }

    s.frameCount += 1;
    if (startTimeRef.current === 0) startTimeRef.current = performance.now();
    const elapsedMs = performance.now() - startTimeRef.current;
    const kps = detectPose(video, elapsedMs);

    if (kps.length === 33) {
      s.keypoints = kps;
      s.hasPerson = kps[11].visibility > 0.3 || kps[12].visibility > 0.3;
      const angles = calculateJointAngles(kps);
      s.angles = angles;
      if (s.hasPerson) {
        const rule = currentExercise.countRule;
        let currentAngle = 180;
        if (rule.joint === 'knee') currentAngle = (angles.leftKnee + angles.rightKnee) / 2;
        else if (rule.joint === 'elbow') currentAngle = (angles.leftElbow + angles.rightElbow) / 2;
        else if (rule.joint === 'hip') currentAngle = (angles.leftHip + angles.rightHip) / 2;
        if (!s.isInMotion && currentAngle <= rule.endAngle + 10) {
          s.isInMotion = true;
        } else if (s.isInMotion && currentAngle >= rule.startAngle - 10) {
          s.isInMotion = false;
          s.reps += 1;
          if (s.reps >= currentExercise.targetReps) { s.sets += 1; s.reps = 0; }
        }
        const range = rule.startAngle - rule.endAngle;
        s.repProgress = Math.max(0, Math.min(1, (rule.startAngle - currentAngle) / range));
        runCorrections(angles, currentExercise, kps);
        prevKeypointsRef.current = kps;
      } else {
        s.isGoodForm = true;
        s.errors = [];
      }
    } else {
      s.hasPerson = false;
      s.isGoodForm = true;
      s.errors = [];
    }
    forceUpdate((n) => n + 1);
    rafRef.current = requestAnimationFrame(detectionLoop);
  }, [currentExercise, runCorrections]);

  const startDetection = useCallback(() => {
    if (!currentExercise) return;
    stateRef.current = {
      keypoints: EMPTY_KEYPOINTS, angles: INITIAL_ANGLES,
      reps: 0, sets: 0, errors: [], isInMotion: false,
      isGoodForm: true, frameCount: 0, repProgress: 0, hasPerson: false,
    };
    startTimeRef.current = 0;
    errorAccumRef.current = {};
    prevKeypointsRef.current = null;
    setIsDetecting(true);
  }, [currentExercise]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  useEffect(() => {
    if (isDetecting && currentExercise && modelReady) {
      rafRef.current = requestAnimationFrame(detectionLoop);
    }
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [isDetecting, currentExercise, modelReady, detectionLoop]);

  const selectExercise = useCallback((ex: Exercise) => {
    if (isDetecting) stopDetection();
    setCurrentExercise(ex);
    stateRef.current.reps = 0;
    stateRef.current.sets = 0;
    errorAccumRef.current = {};
  }, [isDetecting, stopDetection]);

  return {
    state: stateRef.current, isDetecting, currentExercise,
    startDetection, stopDetection, selectExercise,
    cameraEnabled, enableCamera, videoRef,
    modelLoading, modelReady, loadModel,
  };
}
