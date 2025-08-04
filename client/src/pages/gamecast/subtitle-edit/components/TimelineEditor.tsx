import React from 'react'
import SubtitleBlock from './SubtitleBlock'

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

interface TimelineEditorProps {
  speakers: Speaker[]
  subtitleSegments: SubtitleSegment[]
  duration: number
  selectedSegment: string | null
  emotions: Emotion[]
  videoUrl: string | null
  onDragStart: (e: React.MouseEvent, segmentId: string) => void
  onResizeStart: (e: React.MouseEvent, segmentId: string, resizeType: 'start' | 'end') => void
  onSegmentClick: (segmentId: string) => void
  onTextChange: (segmentId: string, newText: string) => void
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({
  speakers,
  subtitleSegments,
  duration,
  selectedSegment,
  emotions,
  videoUrl,
  onDragStart,
  onResizeStart,
  onSegmentClick,
  onTextChange
}) => {
  // 스마트한 타임라인 마커 생성 (TimelineHeader와 동일한 로직)
  const generateTimeMarkers = () => {
    const markers: { time: number; label: string; isMajor: boolean }[] = []
    
    if (duration <= 10) {
      // 10초 이하: 1초 간격
      for (let i = 0; i <= Math.floor(duration); i++) {
        markers.push({ time: i, label: `${i}s`, isMajor: true })
      }
    } else if (duration <= 60) {
      // 1분 이하: 5초 간격
      for (let i = 0; i <= Math.floor(duration); i += 5) {
        markers.push({ time: i, label: `${i}s`, isMajor: true })
      }
    } else if (duration <= 300) {
      // 5분 이하: 10초 간격
      for (let i = 0; i <= Math.floor(duration); i += 10) {
        markers.push({ time: i, label: `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`, isMajor: true })
      }
    } else if (duration <= 600) {
      // 10분 이하: 30초 간격
      for (let i = 0; i <= Math.floor(duration); i += 30) {
        markers.push({ time: i, label: `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`, isMajor: true })
      }
    } else {
      // 10분 초과: 1분 간격
      for (let i = 0; i <= Math.floor(duration); i += 60) {
        markers.push({ time: i, label: `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`, isMajor: true })
      }
    }

    return markers.sort((a, b) => a.time - b.time)
  }

  const timeMarkers = generateTimeMarkers()

  // 동영상이 없을 때 스켈레톤 UI 표시
  if (!videoUrl) {
    return (
      <div className="col-span-10 bg-gray-800 rounded-lg p-4">
        <div className="relative overflow-x-auto">
          {/* 스켈레톤 헤더 */}
          <div className="sticky top-0 bg-gray-800 z-20 mb-2">
            <div className="flex">
              <div className="w-32 flex-shrink-0"></div>
              <div className="flex-1 relative">
                <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* 스켈레톤 트랙들 */}
          <div className="space-y-2">
            {speakers.map((speaker, index) => (
              <div key={speaker.id} className="flex items-center">
                {/* 스피커 이름 */}
                <div className="w-32 flex-shrink-0 flex items-center space-x-2 p-2">
                  <div className={`w-6 h-6 rounded-full ${speaker.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {speaker.avatar}
                  </div>
                  <span className="text-sm font-medium">{speaker.name}</span>
                </div>
                
                {/* 스켈레톤 트랙 영역 */}
                <div className="flex-1 relative h-12 bg-gray-700 rounded border border-gray-600 overflow-hidden">
                  {/* 스켈레톤 자막 블록들 */}
                  <div className="flex h-full">
                    <div 
                      className="h-full bg-gray-600 animate-pulse"
                      style={{ 
                        width: '15%',
                        animationDelay: `${index * 0.1}s`
                      }}
                    ></div>
                    <div 
                      className="h-full bg-gray-600 animate-pulse ml-2"
                      style={{ 
                        width: '20%',
                        animationDelay: `${index * 0.2}s`
                      }}
                    ></div>
                    <div 
                      className="h-full bg-gray-600 animate-pulse ml-2"
                      style={{ 
                        width: '12%',
                        animationDelay: `${index * 0.3}s`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 스켈레톤 안내 메시지 */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
              <span className="mr-2">🎬</span>
              동영상을 업로드하면 타임라인이 활성화됩니다
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-10 bg-gray-800 rounded-lg p-4">
      <div className="relative overflow-x-auto">
        {/* 타임라인 헤더 */}
        <div className="sticky top-0 bg-gray-800 z-20 mb-2">
          <div className="flex">
            <div className="w-32 flex-shrink-0"></div> {/* 스피커 이름 공간 */}
            <div className="flex-1 relative">
              {timeMarkers.map((marker) => (
                <div
                  key={marker.time}
                  className={`absolute top-0 bottom-0 ${marker.isMajor ? 'w-px bg-gray-500' : 'w-px bg-gray-600'}`}
                  style={{ left: `${(marker.time / duration) * 100}%` }}
                >
                  <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs ${
                    marker.isMajor ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {marker.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 트랙들 */}
        <div className="space-y-2">
          {speakers.map((speaker) => (
            <div key={speaker.id} className="flex items-center">
              {/* 스피커 이름 */}
              <div className="w-32 flex-shrink-0 flex items-center space-x-2 p-2">
                <div className={`w-6 h-6 rounded-full ${speaker.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {speaker.avatar}
                </div>
                <span className="text-sm font-medium">{speaker.name}</span>
              </div>
              
              {/* 트랙 영역 */}
              <div className="flex-1 relative h-12 bg-gray-700 rounded border border-gray-600">
                {/* 시간 마커들 */}
                {timeMarkers.map((marker) => (
                  <div
                    key={marker.time}
                    className={`absolute top-0 bottom-0 ${marker.isMajor ? 'w-px bg-gray-500' : 'w-px bg-gray-600'}`}
                    style={{ left: `${(marker.time / duration) * 100}%` }}
                  />
                ))}
                
                {/* 자막 블록들 */}
                {subtitleSegments
                  .filter(segment => segment.speaker === speaker.id)
                  .map((segment) => {
                    const emotion = emotions.find(e => e.id === segment.emotion)
                    const isSelected = selectedSegment === segment.id
                    
                    return (
                      <SubtitleBlock
                        key={segment.id}
                        segment={segment}
                        duration={duration}
                        isSelected={isSelected}
                        emotion={emotion}
                        onDragStart={onDragStart}
                        onResizeStart={onResizeStart}
                        onClick={() => onSegmentClick(segment.id)}
                        onTextChange={onTextChange}
                      />
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TimelineEditor 