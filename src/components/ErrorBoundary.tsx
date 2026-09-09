import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Ignore third-party wallet/extension errors
    const msg = error?.message || String(error);
    if (
      msg.includes('MetaMask') ||
      msg.includes('metamask') ||
      msg.includes('ethereum') ||
      msg.includes('Failed to connect')
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || String(error);
    if (
      msg.includes('MetaMask') ||
      msg.includes('metamask') ||
      msg.includes('ethereum')
    ) {
      // Suppress extension errors
      return;
    }
    console.error('[CIGHT] Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="cight-error-boundary" className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FF4E00]/10 flex items-center justify-center mb-4 text-[#FF4E00]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight mb-2">Something went wrong</h2>
          <p className="text-sm text-white/60 max-w-md mb-6">
            An unexpected error occurred while rendering this section.
          </p>
          <button
            id="cight-error-reload-btn"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4E00] hover:bg-[#FF4E00]/90 text-black font-black text-xs uppercase tracking-widest rounded-sm transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
