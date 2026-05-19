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
      return <div className="rounded-[18px] border border-red-200 bg-white p-4 text-sm font-black text-red-700">Something went wrong.</div>;
    }
    return this.props.children;
  }
}
