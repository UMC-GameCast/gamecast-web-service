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
  currentTime: number
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
  currentTime,
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



  // playhead 위치 계산 함수
  const getPlayheadPosition = () => {
    if (duration === 0) return 15 // 0초일 때 헤더 시작점(15px)에 위치
    // 타임라인 헤더의 실제 콘텐츠 영역 내에서 위치 계산
    // 헤더 너비: 1182.55px, 좌우 패딩: 26px + 15px = 41px
    // 실제 타임라인 영역: 1182.55 - 41 = 1141.55px
    const headerLeftPadding = 15 // 왼쪽 패딩만 (0s 시작점)
    const timelineWidth = 1182.55 - 41 // 전체 타임라인 영역
    const pixelPosition = (currentTime / duration) * timelineWidth
    return headerLeftPadding + pixelPosition // 0s는 왼쪽 패딩 시작점에 위치
  }

  return (
    <div className="col-span-12">
      <div className="relative overflow-x-auto" ref={timelineRef}>
        {/* Playhead - 재생 위치 표시 커서 */}
        <div
          className="absolute"
          style={{
            left: `${getPlayheadPosition()}px`,
            top: '0px',
            transform: 'translateX(-50%)',
            zIndex: 1000, // 모든 요소 위에 표시
            pointerEvents: 'none',
            width: '2px',
            height: '100%',
          }}
        >
          {/* 상단 삼각형 인디케이터 */}
          <div
            className="absolute"
            style={{
              top: '-2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '10px solid #ffffff',
              zIndex: 1001,
            }}
          />
          {/* 세로 라인 */}
          <div
            className="absolute"
            style={{
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '2px',
              height: 'calc(100% - 8px)',
              backgroundColor: '#ffffff',
              zIndex: 1001,
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)', // 가시성을 위한 그림자
            }}
          />
        </div>

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
            {/* major bar(주요 마커) - 시간 라벨이 있는 위치에는 세로선도 없음 */}
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
        <div className="space-y-0">
          {[...Array(5)].map((_, idx) => {
            const speaker = speakers[idx] || { id: `empty-${idx}`, name: `트랙 ${idx + 1}`, color: 'bg-gray-600', avatar: `${idx + 1}` };
            const isFirst = idx === 0;
            const isLast = idx === 4;
            
            // 모든 트랙에 동일한 기본 스타일 적용
            let trackStyle: React.CSSProperties = {
              background: 'rgba(65,78,145,0.2)',
              height: '50px',
              width: '1183px',
              position: 'relative',
              borderBottom: isLast ? 'none' : '1px dashed rgba(255,255,255,0.5)',
            };
            
            // 첫 번째와 마지막 트랙에만 border-radius 적용
            if (isFirst) {
              trackStyle.borderRadius = '6px 6px 0 0';
            } else if (isLast) {
              trackStyle.borderRadius = '0 0 6px 6px';
            }
            
            return (
              <div key={speaker.id}>
                <div
                  className="w-full relative"
                  style={trackStyle}
                >

                  {/* 자막 블록들 - always vertically centered */}
                  <div className="absolute inset-0 flex items-center" style={{ zIndex: 10 }}>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default TimelineEditor 