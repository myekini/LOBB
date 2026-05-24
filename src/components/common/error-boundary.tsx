"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="rounded-[12px] border border-[var(--lobb-border-error)] bg-[var(--lobb-bg-elevated)] p-4 text-sm font-black text-[var(--lobb-error)] shadow-[var(--lobb-shadow-card)]">Something went wrong.</div>;
    }
    return this.props.children;
  }
}
