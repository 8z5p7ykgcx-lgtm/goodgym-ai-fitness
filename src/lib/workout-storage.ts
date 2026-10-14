const KEY='workout_history';
export interface WR { id:string; exerciseId:string; exerciseName:string; date:string; duration:number; totalReps:number; sets:number; accuracy:number; errors:{type:string;count:number}[]; }
export function saveWR(r:Omit<WR,'id'|'date'>){const h=getWR();h.unshift({...r,id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,date:new Date().toISOString()});localStorage.setItem(KEY,JSON.stringify(h.slice(0,50)));}
export function getWR():WR[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return[];}}
