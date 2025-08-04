import React from 'react'

interface TimelineHeaderProps {
  duration: number
  currentTime: number
  zoom: number
  onZoomChange: (zoom: number) => void
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void
  timelineRef: React.RefObject<HTMLDivElement | null>
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  duration,
  currentTime,
  zoom,
  onZoomChange,
  onTimelineClick,
  timelineRef
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 스마트한 타임라인 마커 생성
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
        markers.push({ time: i, label: formatTime(i), isMajor: true })
      }
    } else if (duration <= 600) {
      // 10분 이하: 30초 간격
      for (let i = 0; i <= Math.floor(duration); i += 30) {
        markers.push({ time: i, label: formatTime(i), isMajor: true })
      }
    } else {
      // 10분 초과: 1분 간격
      for (let i = 0; i <= Math.floor(duration); i += 60) {
        markers.push({ time: i, label: formatTime(i), isMajor: true })
      }
    }

    // 중간 마커 추가 (줌 레벨에 따라)
    if (zoom > 120 && duration > 10) {
      const minorMarkers: { time: number; label: string; isMajor: boolean }[] = []
      const interval = duration <= 60 ? 1 : duration <= 300 ? 5 : duration <= 600 ? 10 : 30
      
      for (let i = interval; i < Math.floor(duration); i += interval) {
        if (!markers.some(m => m.time === i)) {
          minorMarkers.push({ time: i, label: duration <= 60 ? `${i}s` : formatTime(i), isMajor: false })
        }
      }
      markers.push(...minorMarkers)
    }

    return markers.sort((a, b) => a.time - b.time)
  }

  const timeMarkers = generateTimeMarkers()

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{formatTime(currentTime)}</span>
        <span className="text-sm text-gray-300">{formatTime(duration)}</span>
      </div>
      
      {/* 메인 타임라인 */}
      <div
        ref={timelineRef}
        className="relative h-8 bg-gray-700 rounded cursor-pointer"
        onClick={onTimelineClick}
      >
        {/* 시간 마커들 */}
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
        
        {/* 현재 시간 포인터 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
        </div>
      </div>

      {/* 줌 컨트롤 */}
      <div className="flex items-center space-x-2 mt-2">
        <span className="text-sm text-gray-300">줌:</span>
        <input
          type="range"
          min="50"
          max="200"
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-gray-300">{zoom}%</span>
      </div>
    </div>
  )
}

export default TimelineHeader 