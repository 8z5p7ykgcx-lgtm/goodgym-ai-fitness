import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app';
import './index.css';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

// 挂载完成后隐藏启动加载页
function hideBootSplash() {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 400);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* HashRouter：静态托管 / 子路径 / 本地文件加载都不会因刷新或路径问题白屏 */}
      <HashRouter>
        <App />
        <Toaster position="top-right" />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

hideBootSplash();
