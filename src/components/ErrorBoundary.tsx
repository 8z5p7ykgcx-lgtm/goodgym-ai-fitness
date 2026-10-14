import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * 全局错误边界：运行时任意组件抛错都显示友好提示，而不是白屏。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#fafafa',
          color: '#262626', textAlign: 'center', padding: 24, fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>应用运行出错了</h2>
          <p style={{ fontSize: 13, color: '#737373', margin: '0 0 16px', lineHeight: 1.7, maxWidth: 360 }}>
            检测到异常：{this.state.message || '未知错误'}
            <br />
            请点击下方按钮重新加载；若问题依旧，请检查网络连接。
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); }}
            style={{
              padding: '10px 28px', border: 'none', borderRadius: 10,
              background: '#171717', color: '#fff', fontSize: 14, cursor: 'pointer',
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
