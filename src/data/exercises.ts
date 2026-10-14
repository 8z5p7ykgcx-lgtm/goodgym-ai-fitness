// 运动类型与纠错规则配置

export interface CorrectionRule {
  id: string;
  type: string;
  description: string;
  suggestion: string;
  severity: 'warning' | 'error';
}

export interface Exercise {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetReps: number;
  countRule: {
    joint: 'knee' | 'elbow' | 'hip';
    startAngle: number;
    endAngle: number;
    direction: 'flexion';
  };
  correctionRules: CorrectionRule[];
}

export const EXERCISES: Exercise[] = [
  {
    id: 'squat',
    name: '深蹲',
    icon: '🦵',
    description: '锻炼腿部与臀部的经典动作',
    targetReps: 15,
    countRule: { joint: 'knee', startAngle: 160, endAngle: 90, direction: 'flexion' },
    correctionRules: [
      { id: 'knee-inward', type: '膝盖内扣', description: '膝盖向内靠拢，与脚尖方向不一致', suggestion: '膝盖向外打开，与脚尖方向一致', severity: 'error' },
      { id: 'back-bend', type: '弯腰过度', description: '背部未挺直，躯干前倾过多', suggestion: '收紧核心，保持背部挺直', severity: 'warning' },
      { id: 'insufficient-depth', type: '下蹲深度不足', description: '未蹲到大腿与地面平行', suggestion: '继续下蹲直到大腿与地面平行', severity: 'warning' },
      { id: 'heel-lift', type: '脚跟抬起', description: '脚跟离地，重心前移', suggestion: '全脚掌着地，重心放在脚跟', severity: 'error' },
    ],
  },
  {
    id: 'pushup',
    name: '俯卧撑',
    icon: '💪',
    description: '锻炼胸肌、肩部和手臂核心',
    targetReps: 12,
    countRule: { joint: 'elbow', startAngle: 170, endAngle: 90, direction: 'flexion' },
    correctionRules: [
      { id: 'sag-waist', type: '塌腰', description: '腰部下沉，髋部低于肩膝连线', suggestion: '收紧核心，保持身体成直线', severity: 'error' },
      { id: 'hip-up', type: '撅臀', description: '臀部过高，身体呈倒V形', suggestion: '放下臀部，全身绷紧成平板状', severity: 'warning' },
      { id: 'arm-not-straight', type: '手臂未伸直', description: '撑起时肘关节未完全伸展', suggestion: '推起至手臂完全伸直', severity: 'warning' },
      { id: 'body-not-straight', type: '身体不成直线', description: '肩髋踝三点不在同一直线', suggestion: '从头到脚保持一条直线', severity: 'error' },
    ],
  },
  {
    id: 'situp',
    name: '仰卧起坐',
    icon: '🏋️',
    description: '锻炼腹部核心肌群',
    targetReps: 20,
    countRule: { joint: 'hip', startAngle: 180, endAngle: 90, direction: 'flexion' },
    correctionRules: [
      { id: 'pull-head', type: '抱头用力过猛', description: '双手拉扯头部借力', suggestion: '双手轻放耳侧，不要拉扯头部', severity: 'warning' },
      { id: 'neck-compensation', type: '颈部代偿', description: '颈部先发力，起身用颈部带动', suggestion: '用腹部力量起身，颈部放松', severity: 'error' },
      { id: 'insufficient-lift', type: '起身角度不足', description: '躯干抬起幅度不够', suggestion: '继续起身直到肘部接触膝盖', severity: 'warning' },
    ],
  },
  {
    id: 'dumbbell',
    name: '哑铃弯举',
    icon: '🏋️‍♂️',
    description: '锻炼肱二头肌的上肢动作',
    targetReps: 15,
    countRule: { joint: 'elbow', startAngle: 170, endAngle: 60, direction: 'flexion' },
    correctionRules: [
      { id: 'wrist-bend', type: '手腕弯曲', description: '手腕向内或向外弯曲', suggestion: '保持手腕挺直，与前臂成直线', severity: 'warning' },
      { id: 'body-swing', type: '身体晃动', description: '躯干前后摆动借力', suggestion: '身体稳定，仅用手臂发力', severity: 'error' },
      { id: 'range-too-small', type: '动作幅度不足', description: '弯举幅度太小，肌肉未充分收缩', suggestion: '向上弯举至最高点，下放时手臂伸直', severity: 'warning' },
      { id: 'elbow-drift', type: '肘部前移', description: '弯举时肘部前移离开体侧', suggestion: '肘部夹紧体侧，保持固定', severity: 'warning' },
    ],
  },
];
