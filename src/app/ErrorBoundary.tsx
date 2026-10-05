import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last-resort boundary: a rendering bug shows a calm message instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel p-6">
        <div className="max-w-md bg-white p-8 shadow-card" style={{ borderTop: '3px solid #ec4f3c' }}>
          <h1 className="text-[20px] font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-[13px] leading-[22px] text-muted">The page hit an unexpected problem. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 cursor-pointer bg-ink px-[18px] py-[11px] text-[11px] font-semibold uppercase tracking-[1.2px] text-white"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
