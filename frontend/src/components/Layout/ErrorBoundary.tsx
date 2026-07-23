import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onGoToLobby?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 mx-auto mb-6 rounded-full border-2 border-blood-600 flex items-center justify-center">
            <span className="text-blood-600 font-pixel text-[20px]">!</span>
          </div>
          <h1 className="text-gold-500 font-pixel text-[16px] tracking-wider mb-2">
            SOMETHING WENT WRONG
          </h1>
          <p className="text-stone-500 font-mono text-[10px] mb-8 leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-3 justify-center">
            {this.props.onRetry && (
              <button
                onClick={this.handleRetry}
                className="btn-gold !py-2 !px-5 !text-[10px]"
              >
                RETRY
              </button>
            )}
            {this.props.onGoToLobby && (
              <button
                onClick={this.props.onGoToLobby}
                className="btn-secondary !py-2 !px-5 !text-[10px]"
              >
                GO TO LOBBY
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
