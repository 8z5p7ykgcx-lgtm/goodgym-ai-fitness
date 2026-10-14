import { Dumbbell } from 'lucide-react';

export default function HeaderSection() {
  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
        <div className="size-8 rounded-lg bg-neutral-900 flex items-center justify-center">
          <Dumbbell className="size-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-none">AI 健身助手</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">实时姿态检测 · 动作纠错</p>
        </div>
      </div>
    </header>
  );
}
