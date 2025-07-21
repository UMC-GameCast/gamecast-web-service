import React from 'react'

export const HostEvaluationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          호스트 평가 페이지
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">
            호스트의 진행 능력을 평가해주세요.
          </p>
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">평가 항목</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    진행 능력
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="text-2xl text-yellow-400 hover:text-yellow-500">
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명의 명확성
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="text-2xl text-gray-300 hover:text-yellow-400">
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    게스트와의 상호작용
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="text-2xl text-gray-300 hover:text-yellow-400">
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전체적인 만족도
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="text-2xl text-gray-300 hover:text-yellow-400">
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                추가 의견
              </label>
              <textarea 
                className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                placeholder="호스트에 대한 추가 의견을 작성해주세요..."
              />
            </div>
            
            <div className="flex justify-between">
              <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                이전 단계
              </button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                평가 완료
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 