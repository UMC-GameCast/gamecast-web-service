import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * 캐릭터 관련 컴포넌트에서 발생하는 오류를 포착하는 에러 바운더리
 * React의 Error Boundary 패턴을 구현
 */
export class CharacterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 에러가 발생하면 다음 렌더링에서 폴백 UI를 표시
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 정보를 상태에 저장
    this.setState({
      error,
      errorInfo
    });

    // 외부 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 에러 로깅
    console.error('🚨 [CharacterErrorBoundary] 캐릭터 관련 오류 포착:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      // 사용자 정의 폴백 UI가 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-b from-red-50 to-red-100 rounded-lg border border-red-200">
          <div className="text-center p-6 max-w-md">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              캐릭터 설정에 문제가 발생했습니다
            </h2>
            <p className="text-red-700 mb-4">
              예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.
            </p>
            
            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                다시 시도
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                페이지 새로고침
              </button>
            </div>

            {/* 개발 환경에서만 에러 세부사항 표시 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                  개발자 정보 (클릭하여 펼치기)
                </summary>
                <div className="mt-2 p-3 bg-red-50 rounded text-xs font-mono overflow-auto max-h-32">
                  <div className="text-red-800 font-bold mb-1">Error:</div>
                  <div className="mb-2">{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <>
                      <div className="text-red-800 font-bold mb-1">Stack:</div>
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}