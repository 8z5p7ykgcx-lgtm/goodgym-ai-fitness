// 姿态检测工具：关键点、角度计算、骨骼绘制

export interface Keypoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface JointAngles {
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftAnkle: number;
  rightAnkle: number;
  torso: number;
}

export interface DetectedError {
  id: string;
  type: string;
  description: string;
  suggestion: string;
  severity: 'warning' | 'error';
  jointPoint: { x: number; y: number };
  duration: number;
}

export const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

export function calculateAngle(
  p1: { x: number; y: number },
  joint: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  const v1x = p1.x - joint.x;
  const v1y = p1.y - joint.y;
  const v2x = p2.x - joint.x;
  const v2y = p2.y - joint.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function calculateJointAngles(kps: Keypoint[]): JointAngles {
  const ls = kps[11], rs = kps[12];
  const le = kps[13], re = kps[14];
  const lw = kps[15], rw = kps[16];
  const lh = kps[23], rh = kps[24];
  const lk = kps[25], rk = kps[26];
  const la = kps[27], ra = kps[28];
  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  return {
    leftShoulder: calculateAngle(le, ls, lh),
    rightShoulder: calculateAngle(re, rs, rh),
    leftElbow: calculateAngle(ls, le, lw),
    rightElbow: calculateAngle(rs, re, rw),
    leftHip: calculateAngle(ls, lh, lk),
    rightHip: calculateAngle(rs, rh, rk),
    leftKnee: calculateAngle(lh, lk, la),
    rightKnee: calculateAngle(rh, rk, ra),
    leftAnkle: calculateAngle(lk, la, { x: la.x + 0.05, y: la.y }),
    rightAnkle: calculateAngle(rk, ra, { x: ra.x - 0.05, y: ra.y }),
    torso: calculateAngle(
      { x: shoulderMid.x, y: shoulderMid.y - 0.1 },
      shoulderMid, hipMid,
    ),
  };
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D, kps: Keypoint[], width: number, height: number,
  color: string = '#22c55e',
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const [i, j] of SKELETON_CONNECTIONS) {
    const p1 = kps[i], p2 = kps[j];
    if (!p1 || !p2 || p1.visibility < 0.3 || p2.visibility < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  for (const kp of kps) {
    if (kp.visibility < 0.3) continue;
    ctx.beginPath();
    ctx.arc(kp.x * width, kp.y * height, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawErrorMarker(
  ctx: CanvasRenderingContext2D, point: { x: number; y: number },
  width: number, height: number, severity: 'warning' | 'error', pulse: number = 0,
) {
  const cx = point.x * width, cy = point.y * height;
  const baseR = 20 + pulse * 8;
  ctx.save();
  ctx.strokeStyle = severity === 'error' ? '#ef4444' : '#f59e0b';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8 - pulse * 0.4;
  ctx.beginPath(); ctx.arc(cx, cy, baseR, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.3 + pulse * 0.2;
  ctx.fillStyle = severity === 'error' ? '#ef4444' : '#f59e0b';
  ctx.beginPath(); ctx.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawJointAngle(
  ctx: CanvasRenderingContext2D, point: { x: number; y: number },
  angle: number, width: number, height: number, isNormal: boolean = true,
) {
  const cx = point.x * width, cy = point.y * height;
  const text = `${Math.round(angle)}°`;
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(text).width + 10;
  ctx.fillStyle = isNormal ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  ctx.beginPath(); ctx.roundRect(cx - textW / 2, cy - 28, textW, 20, 4); ctx.fill();
  ctx.fillStyle = isNormal ? '#22c55e' : '#ef4444';
  ctx.fillText(text, cx, cy - 18);
  ctx.restore();
}

export function dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointToLineDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const A = point.x - lineStart.x, B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x, D = lineEnd.y - lineStart.y;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  let xx: number, yy: number;
  if (param < 0) { xx = lineStart.x; yy = lineStart.y; }
  else if (param > 1) { xx = lineEnd.x; yy = lineEnd.y; }
  else { xx = lineStart.x + param * C; yy = lineStart.y + param * D; }
  return Math.hypot(point.x - xx, point.y - yy);
}
