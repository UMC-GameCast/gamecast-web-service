import React from 'react'

export const RenderingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          렌더링 페이지
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">
            편집된 자막과 소스를 합쳐서 최종 영상을 렌더링합니다.
          </p>
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">렌더링 진행 중...</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-2/3"></div>
              </div>
              <p className="text-sm text-green-600 mt-2">65% 완료</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">렌더링 정보</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>해상도: 1920x1080</p>
                  <p>프레임레이트: 30fps</p>
                  <p>코덱: H.264</p>
                  <p>예상 시간: 5분 30초</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">진행 상황</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>✓ 소스 파일 로드 완료</p>
                  <p>✓ 자막 파일 로드 완료</p>
                  <p>🔄 영상 합성 중...</p>
                  <p>⏳ 최종 인코딩 대기</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                렌더링 중단
              </button>
              <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" disabled>
                다운로드 (완료 후 활성화)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 