import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black text-neutral-900">404</h1>
        <p className="text-neutral-500">页面未找到</p>
        <Button asChild>
          <Link to="/">
            <Home className="size-4 mr-2" />
            返回首页
          </Link>
        </Button>
      </div>
    </div>
  );
}
