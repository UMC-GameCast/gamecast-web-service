import React from 'react'

export const SourceSelectionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          소스 선택 페이지
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">
            추출된 소스 중에서 사용할 소스를 선택하세요.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer">
                <div className="bg-gray-200 h-32 rounded mb-2 flex items-center justify-center">
                  <span className="text-gray-500">소스 {item}</span>
                </div>
                <h3 className="font-medium text-gray-800">소스 파일 {item}</h3>
                <p className="text-sm text-gray-500">파일 크기: 2.3MB</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 