import { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "../ui";

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
    console.error("[ErrorBoundary]", error, errorInfo);
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
            <span className="text-blood-600 font-pixel text-xl">!</span>
          </div>
          <h1 className="text-gold-500 font-pixel text-lg tracking-wider mb-2">
            SOMETHING WENT WRONG
          </h1>
          <p className="text-stone-500 font-pixel text-xs mb-8 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <div className="flex gap-3 justify-center">
            {this.props.onRetry && (
              <Button
                onClick={this.handleRetry}
                size="lg"
              >
                RETRY
              </Button>
            )}
            {this.props.onGoToLobby && (
              <Button
                onClick={this.props.onGoToLobby}
                variant="secondary"
                size="lg"
              >
                GO TO LOBBY
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
