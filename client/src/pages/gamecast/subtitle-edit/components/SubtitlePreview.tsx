import React from 'react'

interface SubtitleSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  emotion?: string
}

interface Speaker {
  id: string
  name: string
  color: string
  avatar: string
}

interface Emotion {
  id: string
  label: string
  icon: string
  color: string
}

interface SubtitlePreviewProps {
  subtitleSegments: SubtitleSegment[]
  speakers: Speaker[]
  emotions: Emotion[]
  videoUrl: string | null
}

const SubtitlePreview: React.FC<SubtitlePreviewProps> = ({
  subtitleSegments,
  speakers,
  emotions,
  videoUrl
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 동영상이 없을 때 스켈레톤 UI 표시
  if (!videoUrl) {
    return (
      <div className="mt-4 bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">자막 미리보기</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {/* 스켈레톤 자막 아이템들 */}
          {[1, 2, 3].map((index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-700 rounded animate-pulse">
              <div className="w-16 h-4 bg-gray-600 rounded"></div>
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
              <div className="w-20 h-4 bg-gray-600 rounded"></div>
              <div className="w-16 h-4 bg-gray-600 rounded"></div>
              <div className="flex-1 h-4 bg-gray-600 rounded"></div>
            </div>
          ))}
          
          {/* 안내 메시지 */}
          <div className="text-center py-4">
            <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
              <span className="mr-2">📝</span>
              동영상을 업로드하면 자막 미리보기가 활성화됩니다
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">자막 미리보기</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {subtitleSegments
          .sort((a, b) => a.startTime - b.startTime)
          .map((segment) => {
            const speaker = speakers.find(s => s.id === segment.speaker)
            const emotion = emotions.find(e => e.id === segment.emotion)
            
            return (
              <div key={segment.id} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                <span className="text-xs text-gray-400 w-16">{formatTime(segment.startTime)}</span>
                <div className={`w-6 h-6 rounded-full ${speaker?.color} flex items-center justify-center text-white text-xs`}>
                  {speaker?.avatar}
                </div>
                <span className="text-sm font-medium">{speaker?.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${emotion?.color}`}>
                  {emotion?.icon} {emotion?.label}
                </span>
                <span className="text-sm flex-1">{segment.text}</span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default SubtitlePreview 