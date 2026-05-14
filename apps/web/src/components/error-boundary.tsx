"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-[30px] border border-border/70 bg-card/40 p-10 text-center">
          <p className="text-base font-semibold text-[#f0ede8]">Something went wrong loading this view.</p>
          <p className="text-sm text-muted-foreground">Refresh the page to try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full border border-border/60 bg-background/60 px-5 py-2 text-sm font-medium text-[#f0ede8] transition-colors hover:bg-card"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
