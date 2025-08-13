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
  timelineRef: React.RefObject<HTMLDivElement | null>
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
  onTextChange,
  timelineRef
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

    // duration이 마지막 마커에 포함되어 있지 않으면 추가
    if (markers.length === 0 || markers[markers.length - 1].time < duration) {
      // 소수점 이하까지 표시
      let label = '';
      if (duration < 60) {
        label = `${duration.toFixed(1)}s`;
      } else {
        const min = Math.floor(duration / 60);
        const sec = (duration % 60).toFixed(1).padStart(4, '0');
        label = `${min}:${sec}`;
      }
      markers.push({ time: duration, label, isMajor: true });
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
    <div className="col-span-12 bg-gray-800 rounded-lg p-4">
      <div className="relative overflow-x-auto" ref={timelineRef}>
        {/* 타임라인 헤더: sticky */}
        <div className="sticky top-0 z-20" style={{
          borderRadius: '5.487px',
          background: '#1E2655',
          boxShadow: '0 3.658px 3.658px 0 rgba(0, 0, 0, 0.25)',
          display: 'flex',
          width: '1182.55px',
          height: '32.578px',
          padding: '5px 26px 5px 15px',
          alignItems: 'flex-start',
        }}>
          <div className="flex-1 relative w-full h-full">
            {/* 시간 라벨(숫자)만 위쪽에 렌더 */}
            {timeMarkers.map((marker) => {
              // 시간 라벨 포맷: 1분 미만은 '10s', 1분 이상은 '1m\n10s' (줄바꿈)
              let label = '';
              if (marker.time < 60) {
                label = `${Math.round(marker.time)}s`;
              } else {
                const min = Math.floor(marker.time / 60);
                const sec = Math.round(marker.time % 60);
                label = `${min}m\n${sec < 10 ? '0' : ''}${sec}s`;
              }
              return (
                <div
                  key={`label-${marker.time}`}
                  className="absolute"
                  style={{
                    left: `${(marker.time / duration) * 100}%`,
                    top: '50%',
                    width: '40px',
                    transform: 'translate(-50%, -50%)', // 중앙 정렬
                    textAlign: 'center',
                    zIndex: 2,
                  }}
                >
                  <span
                    className="select-none"
                    style={{
                      color: '#FFF',
                      textAlign: 'center',
                      fontFamily: 'Segoe UI',
                      fontSize: '15px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '22.5px',
                      letterSpacing: '-0.285px',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
            {/* major bar(주요 마커) - 시간 라벨이 있는 위치에는 세로선도 없음 */}
            {timeMarkers.map((marker) => (
              // 시간 라벨이 있는 위치에는 major bar도 그리지 않음
              null
            ))}
            {/* 각 구간(마커~다음마커)마다 9개 minor bar, 마커 위치는 비움 */}
            {timeMarkers.map((marker, idx) => {
              if (idx === timeMarkers.length - 1) return null; // 마지막 마커는 다음 마커가 없음
              const nextMarker = timeMarkers[idx + 1];
              const lines = [];
              for (let i = 1; i < 10; i++) {
                const t = marker.time + ((nextMarker.time - marker.time) * i) / 10;
                // t가 major 마커 위치와 정확히 일치하면 minor bar를 넣지 않음
                if (timeMarkers.some(m => Math.abs(m.time - t) < 1e-6)) continue;
                lines.push(
                  <svg
                    key={`minor-line-${marker.time}-${i}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="2" height="22" viewBox="0 0 2 22" fill="none"
                    style={{
                      position: 'absolute',
                      left: `${(t / duration) * 100}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      height: '21.691px',
                      zIndex: 1,
                    }}
                  >
                    <path d="M0.949219 0.0839844V21.7745" stroke="white" strokeWidth="0.914579" />
                  </svg>
                );
              }
              return lines;
            })}
          </div>
        </div>
        {/* 헤더 spacer */}
        <div style={{ height: '12px' }} />
        {/* 트랙들 */}
        <div className="space-y-2">
          {[...Array(5)].map((_, idx) => {
            const speaker = speakers[idx] || { id: `empty-${idx}`, name: '', color: '', avatar: '' };
            const isFirst = idx === 0;
            const isLast = idx === 4;
            let trackStyle: React.CSSProperties = {};
            if (isFirst) {
              trackStyle = {
                borderRadius: '6px 6px 0 0',
                borderBottom: '1px dashed rgba(255,255,255,0.5)',
                background: 'rgba(65,78,145,0.2)',
                height: '50px',
                flex: '1 0 0',
              };
            } else if (isLast) {
              trackStyle = {
                borderRadius: '0 0 6px 6px',
                background: 'rgba(65,78,145,0.2)',
                width: '1183px',
                height: '50px',
                flexShrink: 0,
              };
            } else {
              trackStyle = {
                display: 'flex',
                width: '1246px',
                alignItems: 'center',
                gap: '32px',
              };
            }
            return (
              <div key={speaker.id} className="flex items-center">
                <div
                  className="flex-1 relative flex items-center"
                  style={trackStyle}
                >
                  {/* 시간 마커들 */}
                  {timeMarkers.map((marker) => (
                    <div
                      key={marker.time}
                      className={`absolute top-0 bottom-0 ${marker.isMajor ? 'w-px bg-gray-500' : 'w-px bg-gray-600'}`}
                      style={{ left: `${(marker.time / duration) * 100}%` }}
                    />
                  ))}
                  {/* 자막 블록들 - always vertically centered */}
                  <div className="w-full h-full flex items-center" style={{ position: 'relative' }}>
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
                            onClick={onSegmentClick}
                            onTextChange={onTextChange}
                          />
                        )
                      })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default TimelineEditor 