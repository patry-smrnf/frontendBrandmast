"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-semibold text-red-400">Wystąpił nieoczekiwany błąd</h2>
            <p className="text-gray-400">
              Przepraszamy za niedogodności. Spróbuj odświeżyć stronę lub skontaktuj się z administratorem.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors mr-2"
              >
                Odśwież stronę
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                Spróbuj ponownie
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                  Szczegóły błędu (tryb deweloperski)
                </summary>
                <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs text-red-300 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


