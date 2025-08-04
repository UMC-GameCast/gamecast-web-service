import React from 'react'

interface Speaker {
  id: string
  name: string
  color: string
  avatar: string
}

interface SpeakerPanelProps {
  speakers: Speaker[]
  videoUrl: string | null
}

const SpeakerPanel: React.FC<SpeakerPanelProps> = ({ speakers, videoUrl }) => {
  // 동영상이 없을 때 스켈레톤 UI 표시
  if (!videoUrl) {
    return (
      <div className="col-span-2 bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-center">스피커</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-2 rounded-lg animate-pulse"
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
              <div className="h-4 bg-gray-600 rounded flex-1"></div>
            </div>
          ))}
        </div>
        
        {/* 안내 메시지 */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-xs">
            <span className="mr-1">👥</span>
            동영상 업로드 후 활성화
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-2 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-center">스피커</h3>
      <div className="space-y-3">
        {speakers.map((speaker) => (
          <div
            key={speaker.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${speaker.color} flex items-center justify-center text-white font-bold`}>
              {speaker.avatar}
            </div>
            <span className="text-sm font-medium">{speaker.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SpeakerPanel 