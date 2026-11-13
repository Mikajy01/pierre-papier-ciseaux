import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode; onError?: (error: unknown) => void };

/** Catches rendering errors of its subtree instead of letting them blank the whole page. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
