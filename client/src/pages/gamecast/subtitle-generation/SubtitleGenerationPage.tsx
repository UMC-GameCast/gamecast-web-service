import React from 'react'

export const SubtitleGenerationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          자막 생성 페이지
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">
            선택된 소스에서 자막을 자동으로 생성합니다.
          </p>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 font-medium">자막 생성 중...</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-3/4"></div>
              </div>
              <p className="text-sm text-blue-600 mt-2">75% 완료</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">생성된 자막 미리보기</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>[00:00:05] 안녕하세요, 게임캐스트입니다.</p>
                <p>[00:00:08] 오늘은 특별한 게스트와 함께합니다.</p>
                <p>[00:00:12] 게임을 시작해보겠습니다.</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                자막 편집하기
              </button>
              <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                다시 생성
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 