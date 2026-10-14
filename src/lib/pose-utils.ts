export interface KP { x:number; y:number; z:number; visibility:number; }
export interface JA {
  leftShoulder:number; rightShoulder:number; leftElbow:number; rightElbow:number;
  leftHip:number; rightHip:number; leftKnee:number; rightKnee:number;
  leftAnkle:number; rightAnkle:number; torso:number;
}
export interface DE { id:string; type:string; description:string; suggestion:string; severity:'warning'|'error'; jointPoint:{x:number;y:number}; duration:number; }
export const CONNS: [number,number][] = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
  [11,12],[11,23],[12,24],[23,24],
  [11,13],[13,15],[15,17],[15,19],[15,21],[17,19],
  [12,14],[14,16],[16,18],[16,20],[16,22],[18,20],
  [23,25],[25,27],[27,29],[27,31],[29,31],
  [24,26],[26,28],[28,30],[28,32],[30,32],
];
export function angle(p1:{x:number;y:number},j:{x:number;y:number},p2:{x:number;y:number}):number{
  const v1={x:p1.x-j.x,y:p1.y-j.y},v2={x:p2.x-j.x,y:p2.y-j.y};
  const d=v1.x*v2.x+v1.y*v2.y,m1=Math.hypot(v1.x,v1.y),m2=Math.hypot(v2.x,v2.y);
  if(!m1||!m2)return 0; return Math.acos(Math.max(-1,Math.min(1,d/(m1*m2)))*180/Math.PI);
}
export function jointAngles(k:KP[]):JA{
  const ls=k[11],rs=k[12],le=k[13],re=k[14],lw=k[15],rw=k[16];
  const lh=k[23],rh=k[24],lk=k[25],rk=k[26],la=k[27],ra=k[28];
  const sm={x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2},hm={x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2};
  return{
    leftShoulder:angle(le,ls,lh),rightShoulder:angle(re,rs,rh),
    leftElbow:angle(ls,le,lw),rightElbow:angle(rs,re,rw),
    leftHip:angle(ls,lh,lk),rightHip:angle(rs,rh,rk),
    leftKnee:angle(lh,lk,la),rightKnee:angle(rh,rk,ra),
    leftAnkle:angle(lk,la,{x:la.x+0.05,y:la.y}),rightAnkle:angle(rk,ra,{x:ra.x-0.05,y:ra.y}),
    torso:angle({x:sm.x,y:sm.y-0.1},sm,hm),
  };
}
export function drawSkel(ctx:CanvasRenderingContext2D,k:KP[],w:number,h:number,color='#00ff88'){
  ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineCap='round';
  for(const[a,b]of CONNS){const p1=k[a],p2=k[b];if(!p1||!p2||p1.visibility<0.3||p2.visibility<0.3)continue;
    ctx.beginPath();ctx.moveTo(p1.x*w,p1.y*h);ctx.lineTo(p2.x*w,p2.y*h);ctx.stroke();}
  ctx.fillStyle=color;
  for(const p of k){if(p.visibility<0.3)continue;ctx.beginPath();ctx.arc(p.x*w,p.y*h,5,0,Math.PI*2);ctx.fill();}
}
export function drawErr(ctx:CanvasRenderingContext2D,pt:{x:number;y:number},w:number,h:number,sev:'warning'|'error',pulse=0){
  const cx=pt.x*w,cy=pt.y*h,r=20+pulse*8;
  ctx.save();ctx.strokeStyle=sev==='error'?'#ff4757':'#ffa502';ctx.lineWidth=3;
  ctx.globalAlpha=0.8-pulse*0.4;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=0.3+pulse*0.2;ctx.fillStyle=ctx.strokeStyle;
  ctx.beginPath();ctx.arc(cx,cy,r*0.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function drawAngle(ctx:CanvasRenderingContext2D,pt:{x:number;y:number},a:number,w:number,h:number,ok=true){
  const cx=pt.x*w,cy=pt.y*h,t=`${Math.round(a)}\u00b0`;
  ctx.save();ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const tw=ctx.measureText(t).width+10;
  ctx.fillStyle=ok?'rgba(0,255,136,0.15)':'rgba(255,71,87,0.15)';
  ctx.beginPath();ctx.roundRect(cx-tw/2,cy-28,tw,20,4);ctx.fill();
  ctx.fillStyle=ok?'#00ff88':'#ff4757';ctx.fillText(t,cx,cy-18);ctx.restore();
}
