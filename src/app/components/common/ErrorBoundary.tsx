'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 오류 대신 그릴 것. 다시 그려 볼 함수(reset)를 받는다 */
  fallback: (reset: () => void) => ReactNode;
  /** 어디서 깨졌는지 로그에 남길 이름 */
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * 렌더 중 오류를 이 아래에서 멈춘다(옵저버빌리티 1, Error Boundary 3층 중 모달 층).
 * Next 의 error.tsx 는 라우트 단위라 모달 같은 화면 조각은 이것으로 감싼다.
 * 외부 수집(Sentry)을 붙이면 componentDidCatch 가 그 자리다.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  override render() {
    return this.state.hasError ? this.props.fallback(this.reset) : this.props.children;
  }
}
