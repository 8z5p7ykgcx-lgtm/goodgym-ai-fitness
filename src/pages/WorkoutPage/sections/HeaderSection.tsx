import { Shield, Dumbbell } from 'lucide-react';
export default function HeaderSection() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center"><Dumbbell className="size-5 text-primary-foreground"/></div>
          <div><h1 className="text-base font-bold leading-tight">AI 健身助手</h1><p className="text-[11px] text-muted-foreground">实时姿态检测 · 智能动作纠错</p></div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
          <Shield className="size-3.5 text-green-400"/><span className="text-xs font-medium text-green-400">本地运行 · 隐私保护</span>
        </div>
      </div>
    </header>
  );
}
