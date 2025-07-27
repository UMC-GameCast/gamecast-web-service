import React from 'react'

const SubtitleEditPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          자막 편집 페이지
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">
            생성된 자막을 편집하고 수정하세요.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-3">자막 목록</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[
                  { time: '00:00:05', text: '안녕하세요, 게임캐스트입니다.' },
                  { time: '00:00:08', text: '오늘은 특별한 게스트와 함께합니다.' },
                  { time: '00:00:12', text: '게임을 시작해보겠습니다.' },
                  { time: '00:00:15', text: '첫 번째 라운드를 시작합니다.' },
                  { time: '00:00:20', text: '훌륭한 플레이입니다!' }
                ].map((subtitle, index) => (
                  <div key={index} className="border border-gray-200 rounded p-3 hover:bg-gray-50 cursor-pointer">
                    <div className="text-sm text-gray-500 mb-1">{subtitle.time}</div>
                    <div className="text-gray-800">{subtitle.text}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-3">자막 편집</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시간
                  </label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    defaultValue="00:00:05"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    자막 내용
                  </label>
                  <textarea 
                    className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                    defaultValue="안녕하세요, 게임캐스트입니다."
                  />
                </div>
                <div className="flex space-x-2">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    저장
                  </button>
                  <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between">
            <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              이전 단계
            </button>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              다음 단계
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubtitleEditPage 