import { useState, useRef, useCallback, useEffect } from 'react';
import type { EX } from '@/data/exercises';
import { type KP, type JA, type DE, jointAngles, angle } from '@/lib/pose-utils';
import { loadLandmarker, detect } from '@/lib/mediapipe-pose';

export interface PS {
  kps: KP[]; angles: JA; reps: number; sets: number;
  errors: DE[]; inMotion: boolean; good: boolean;
  frame: number; progress: number; hasPerson: boolean;
}

const INIT_A: JA = { leftShoulder:180,rightShoulder:180,leftElbow:180,rightElbow:180,leftHip:180,rightHip:180,leftKnee:180,rightKnee:180,leftAnkle:90,rightAnkle:90,torso:0 };
const EMPTY_KP: KP[] = Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));

export function usePoseDetection() {
  const [detecting, setDetecting] = useState(false);
  const [exercise, setExercise] = useState<EX|null>(null);
  const [camOn, setCamOn] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const rafRef = useRef<number|null>(null);
  const t0 = useRef(0);
  const lmRef = useRef<any>(null);
  const prevKp = useRef<KP[]|null>(null);
  const state = useRef<PS>({ kps:EMPTY_KP, angles:INIT_A, reps:0, sets:0, errors:[], inMotion:false, good:true, frame:0, progress:0, hasPerson:false });
  const [, force] = useState(0);
  const errAcc = useRef<Record<string,{frames:number;last:number}>>({});

  const loadModel = useCallback(async () => {
    if (modelReady && lmRef.current) return true;
    if (modelLoading) return false;
    setModelLoading(true);
    try { lmRef.current = await loadLandmarker(); setModelReady(true); return true; }
    catch { return false; }
    finally { setModelLoading(false); }
  }, [modelReady, modelLoading]);

  const enableCam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{width:640,height:480,facingMode:'user'}, audio:false });
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      setCamOn(true); return true;
    } catch { setCamOn(false); return false; }
  }, []);

  const dist2 = (a:{x:number;y:number},b:{x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y);
  const ptLine = (pt:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}) => {
    const A=pt.x-a.x,B=pt.y-a.y,C=b.x-a.x,D=b.y-a.y;
    const dot=A*C+B*D,len=C*C+D*D,t=len?dot/len:-1;
    const xx=t<0?a.x:t>1?b.x:a.x+t*C, yy=t<0?a.y:t>1?b.y:a.y+t*D;
    return Math.hypot(pt.x-xx,pt.y-yy);
  };

  const doCorrections = useCallback((angles: JA, ex: EX, kps: KP[]) => {
    const s = state.current; const found: DE[] = []; const now = s.frame;
    for (const rule of ex.correctionRules) {
      let isErr = false; let pt = {x:0.5,y:0.5};
      switch(rule.id) {
        case 'knee-inward': {
          const lk=kps[25],rk=kps[26],la=kps[27],ra=kps[28];
          if(lk.visibility>.5&&rk.visibility>.5&&la.visibility>.5&&ra.visibility>.5){
            const kd=Math.abs(rk.x-lk.x), ad=Math.abs(ra.x-la.x);
            isErr = ad>0 && kd<ad*0.8; pt={x:(lk.x+rk.x)/2,y:(lk.y+rk.y)/2;}
          }
          break;
        }
        case 'back-bend': {
          const ls=kps[11],rs=kps[12],lh=kps[23],rh=kps[24];
          if(ls.visibility>.5&&rs.visibility>.5&&lh.visibility>.5&&rh.visibility>.5){
            const sm={x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2},hm={x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2};
            const ta=Math.atan2(Math.abs(sm.x-hm.x),Math.abs(sm.y-hm.y))*180/Math.PI;
            isErr=ta>40 && s.progress<0.5; pt={x:hm.x,y:(sm.y+hm.y)/2};
          }
          break;
        }
        case 'insufficient-depth': {
          const ka=(angles.leftKnee+angles.rightKnee)/2;
          if(kps[25].visibility>.5){ isErr=s.inMotion&&s.progress>.5&&ka>110; pt={x:kps[25].x,y:kps[25].y}; }
          break;
        }
        case 'heel-lift': {
          const la=kps[27],lf=kps[31];
          if(la.visibility>.5&&lf.visibility>.5){ const fl=dist2(la,lf); isErr=fl>.06&&la.y<lf.y-.02; pt={x:la.x,y:la.y}; }
          break;
        }
        case 'sag-waist': {
          const ls=kps[11],rs=kps[12],lh=kps[23],rh=kps[24],lk=kps[25],rk=kps[26];
          if(ls.visibility>.5&&lh.visibility>.5&&lk.visibility>.5){
            const sy=(ls.y+rs.y)/2,hy=(lh.y+rh.y)/2,ky=(lk.y+rk.y)/2;
            const exp=sy+(ky-sy)*.5, bl=Math.abs(ky-sy);
            isErr=bl>.1&&hy-exp>.03; pt={x:(lh.x+rh.x)/2,y:hy};
          }
          break;
        }
        case 'hip-up': {
          const ls=kps[11],rs=kps[12],lh=kps[23],rh=kps[24],lk=kps[25],rk=kps[26];
          if(ls.visibility>.5&&lh.visibility>.5&&lk.visibility>.5){
            const sy=(ls.y+rs.y)/2,hy=(lh.y+rh.y)/2,ky=(lk.y+rk.y)/2;
            const exp=sy+(ky-sy)*.5, bl=Math.abs(ky-sy);
            isErr=bl>.1&&exp-hy>.03; pt={x:(lh.x+rh.x)/2,y:hy};
          }
          break;
        }
        case 'arm-not-straight': {
          const ea=(angles.leftElbow+angles.rightElbow)/2;
          if(kps[13].visibility>.5){ isErr=!s.inMotion&&ea<160; pt={x:kps[13].x,y:kps[13].y}; }
          break;
        }
        case 'body-not-straight': {
          const ls=kps[11],lh=kps[23],la=kps[27],rs=kps[12],rh=kps[24],ra=kps[28];
          if(ls.visibility>.5&&lh.visibility>.5&&la.visibility>.5){
            const sm={x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2},hm={x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2},am={x:(la.x+ra.x)/2,y:(la.y+ra.y)/2};
            const dev=ptLine(hm,sm,am), bl=dist2(sm,am);
            isErr=bl>.15&&dev/bl>.08; pt=hm;
          }
          break;
        }
        case 'pull-head': {
          const n=kps[0],lw=kps[15],rw=kps[16],le=kps[13],re=kps[14];
          if(n.visibility>.5&&lw.visibility>.5&&rw.visibility>.5){
            const near=dist2(lw,n)<.1&&dist2(rw,n)<.1, es=Math.abs(re.x-le.x);
            isErr=near&&es>.2&&s.progress>.2; pt={x:n.x,y:n.y};
          }
          break;
        }
        case 'neck-compensation': {
          const n=kps[0],ls=kps[11],rs=kps[12];
          if(n.visibility>.5&&ls.visibility>.5&&rs.visibility>.5){
            const smY=(ls.y+rs.y)/2; isErr=Math.abs(n.y-smY)<.05&&s.progress<.3&&s.progress>.05; pt={x:n.x,y:n.y+.03};
          }
          break;
        }
        case 'insufficient-lift': {
          const ha=(angles.leftHip+angles.rightHip)/2;
          if(kps[11].visibility>.5){ isErr=s.inMotion&&s.progress>.4&&ha>140; pt={x:kps[11].x,y:kps[11].y}; }
          break;
        }
        case 'wrist-bend': {
          const le=kps[13],lw=kps[15],li=kps[19],re=kps[14],rw=kps[16],ri=kps[20];
          const lo=le.visibility>.5&&lw.visibility>.5&&li.visibility>.5, ro=re.visibility>.5&&rw.visibility>.5&&ri.visibility>.5;
          if(lo||ro){ let wa=180; if(lo)wa=Math.min(wa,angle(le,lw,li)); if(ro)wa=Math.min(wa,angle(re,rw,ri)); isErr=wa<150; pt={x:lw.x,y:lw.y}; }
          break;
        }
        case 'body-swing': {
          const ls=kps[11],lh=kps[23];
          if(ls.visibility>.5&&lh.visibility>.5&&prevKp.current&&prevKp.current[23]?.visibility>.5){
            const hd=Math.abs(lh.x-prevKp.current[23].x), sd=Math.abs(ls.x-prevKp.current[11].x);
            isErr=s.inMotion&&(hd>.015||sd>.02); pt={x:lh.x,y:lh.y};
          }
          break;
        }
        case 'range-too-small': {
          const ea=(angles.leftElbow+angles.rightElbow)/2;
          if(ea>0&&s.inMotion){ isErr=s.progress>.6&&ea>120; pt={x:kps[13].x,y:kps[13].y}; }
          break;
        }
        case 'elbow-drift': {
          const ls=kps[11],le=kps[13],rs=kps[12],re=kps[14];
          const lo=ls.visibility>.5&&le.visibility>.5, ro=rs.visibility>.5&&re.visibility>.5;
          if(lo||ro){ let dr=0; if(lo)dr=Math.max(dr,Math.abs(le.x-ls.x)/.15); if(ro)dr=Math.max(dr,Math.abs(re.x-rs.x)/.15); isErr=s.inMotion&&dr>1.4; pt={x:le.x,y:le.y}; }
          break;
        }
      }
      if(isErr){
        if(!errAcc.current[rule.id]) errAcc.current[rule.id]={frames:0,last:now};
        errAcc.current[rule.id].frames++; errAcc.current[rule.id].last=now;
        if(errAcc.current[rule.id].frames>5) found.push({id:rule.id,type:rule.type,description:rule.description,suggestion:rule.suggestion,severity:rule.severity,jointPoint:pt,duration:errAcc.current[rule.id].frames});
      } else if(errAcc.current[rule.id] && now-errAcc.current[rule.id].last>15){ errAcc.current[rule.id].frames=0; }
    }
    s.errors=found; s.good=found.length===0;
  },[]);

  const loop = useCallback(() => {
    if(!exercise) return;
    const s=state.current; const v=videoRef.current; const lm=lmRef.current;
    if(!v||!lm){ rafRef.current=requestAnimationFrame(loop); return; }
    if(v.readyState<2||v.videoWidth===0){ rafRef.current=requestAnimationFrame(loop); return; }
    s.frame++;
    if(!t0.current) t0.current=performance.now();
    const el=performance.now()-t0.current;
    let kps:KP[]=[];
    try{ kps=detect(v,el);}catch{}
    if(kps.length===33){
      s.kps=kps; s.hasPerson=kps[11].visibility>.3||kps[12].visibility>.3;
      const an=jointAngles(kps); s.angles=an;
      if(s.hasPerson){
        const rule=exercise.countRule; let ca=180;
        if(rule.joint==='knee') ca=(an.leftKnee+an.rightKnee)/2;
        else if(rule.joint==='elbow') ca=(an.leftElbow+an.rightElbow)/2;
        else if(rule.joint==='hip') ca=(an.leftHip+an.rightHip)/2;
        if(rule.direction==='flexion'){
          if(!s.inMotion&&ca<=rule.endAngle+10) s.inMotion=true;
          else if(s.inMotion&&ca>=rule.startAngle-10){ s.inMotion=false; s.reps++; if(s.reps>=exercise.targetReps){s.sets++;s.reps=0;} }
        }
        const rng=rule.startAngle-rule.endAngle;
        s.progress=Math.max(0,Math.min(1,(rule.startAngle-ca)/rng));
        doCorrections(an,exercise,kps);
        prevKp.current=kps;
      } else { s.good=true; s.errors=[]; }
    } else { s.hasPerson=false; s.good=true; s.errors=[]; }
    force(n=>n+1);
    rafRef.current=requestAnimationFrame(loop);
  },[exercise,doCorrections]);

  const start = useCallback(() => {
    if(!exercise) return;
    state.current={kps:EMPTY_KP,angles:INIT_A,reps:0,sets:0,errors:[],inMotion:false,good:true,frame:0,progress:0,hasPerson:false};
    t0.current=0; errAcc.current={}; prevKp.current=null;
    setDetecting(true);
  },[exercise]);

  const stop = useCallback(() => { setDetecting(false); if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;} },[]);

  useEffect(() => {
    if(detecting&&exercise&&modelReady) rafRef.current=requestAnimationFrame(loop);
    return () => { if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;} };
  },[detecting,exercise,modelReady,loop]);

  const setEx = useCallback((ex:EX) => {
    if(detecting) stop();
    setExercise(ex); state.current.reps=0; state.current.sets=0; errAcc.current={};
  },[detecting,stop]);

  return { state:state.current, detecting, exercise, start, stop, setEx, camOn, enableCam, videoRef, modelLoading, modelReady, loadModel };
}
