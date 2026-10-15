import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown instead of the 3D scene when WebGL is unavailable or the scene crashes. */
  fallback: ReactNode;
}

/** Keeps a WebGL failure from taking down the whole game: the quest terminal still works without 3D. */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D scene failed:', error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
