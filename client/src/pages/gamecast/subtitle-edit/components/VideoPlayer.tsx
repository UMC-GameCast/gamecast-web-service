import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { SubtitleSegment, Speaker, Emotion } from '../types'

interface VideoPlayerProps {
  videoUrl: string | null
  subtitleSegments: SubtitleSegment[]
  speakers: Speaker[]
  emotions: Emotion[]
  currentTime: number
  duration: number
  isPlaying: boolean
  onTimeUpdate: (time: number) => void
  onDurationChange: (duration: number) => void
  onPlayPause: () => void
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  subtitleSegments,
  speakers,
  emotions,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayPause
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleSegment | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false)

  // Sync isActuallyPlaying with video element events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handlePlay = () => setIsActuallyPlaying(true)
    const handlePause = () => setIsActuallyPlaying(false)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    setIsActuallyPlaying(!video.paused)
    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [videoUrl])

  // 동영상이 로드될 때 duration 즉시 확인
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    // 동영상이 이미 로드된 상태라면 duration 확인
    if (video.readyState >= 1) {
      console.log('Video already loaded, checking duration:', video.duration)
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration)
      }
    }

    // 주기적으로 duration 확인 (동영상이 완전히 로드되지 않았을 경우)
    const checkDuration = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration !== duration) {
        console.log('Duration updated via polling:', video.duration)
        onDurationChange(video.duration)
      }
    }

    const interval = setInterval(checkDuration, 1000) // 1초마다 확인

    return () => clearInterval(interval)
  }, [videoUrl, onDurationChange]) // duration 의존성 제거

  // 동영상 시간 업데이트 처리
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime)
    }

    const handleDurationChange = () => {
      console.log('Duration changed:', video.duration)
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration)
      }
    }

    const handleLoadedMetadata = () => {
      console.log('Video duration loaded:', video.duration)
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration)
      }
    }

    const handleLoadedData = () => {
      console.log('Video data loaded, duration:', video.duration)
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration)
      }
    }

    const handleCanPlay = () => {
      console.log('Video can play, duration:', video.duration)
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration)
      }
    }

    const handleCanPlayThrough = () => {
      console.log('Video can play through, duration:', video.duration)
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('durationchange', handleDurationChange)


    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('durationchange', handleDurationChange)
    }
  }, [onTimeUpdate, onDurationChange])

  // 외부에서 재생/일시정지 제어
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play().catch(console.error)
    } else {
      video.pause()
    }
  }, [isPlaying])

  // 외부에서 시간 제어
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 드래그 중이 아닐 때만 외부 시간 변경을 적용
    if (!isDragging && Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime
    }
  }, [currentTime, isDragging])

  // 현재 시간에 맞는 자막 찾기
  useEffect(() => {
    const now = currentTime
    const subtitle = subtitleSegments.find(segment => 
      now >= segment.startTime && now <= segment.endTime
    )
    console.log('Current time:', now, 'Found subtitle:', subtitle)
    setCurrentSubtitle(subtitle || null)
  }, [currentTime, subtitleSegments])

  // 동영상이 없을 때도 자막 표시를 위한 계산
  const displaySubtitle = currentSubtitle || (() => {
    if (!videoUrl && subtitleSegments.length > 0) {
      // 동영상이 없을 때는 현재 시간에 가장 가까운 자막을 찾기
      const now = currentTime
      const closestSubtitle = subtitleSegments.reduce((closest, segment) => {
        const segmentMiddle = (segment.startTime + segment.endTime) / 2
        const closestMiddle = closest ? (closest.startTime + closest.endTime) / 2 : 0
        return Math.abs(segmentMiddle - now) < Math.abs(closestMiddle - now) ? segment : closest
      }, null as SubtitleSegment | null)
      
      return closestSubtitle
    }
    return null
  })()

  // 시간 포맷팅
  const formatTime = (seconds: number, showZero?: boolean, showTenths?: boolean): string => {
    if (!isFinite(seconds) || seconds < 0) return showZero ? '00:00.0' : '00:00.0'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    const tenths = Math.floor((seconds % 1) * 10)

    const formattedMinutes = minutes.toString().padStart(2, '0')
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0')
    if (showTenths) {
      return `${formattedMinutes}:${formattedSeconds}.${tenths}`
    }
    return `${formattedMinutes}:${formattedSeconds}`
  }

  // 자막 스타일 가져오기
  const getSubtitleStyle = (subtitle: SubtitleSegment) => {
    const emotion = emotions.find(e => e.id === subtitle.emotion)
    const speaker = speakers.find(s => s.id === subtitle.speaker)
    
    // 감정에 따른 스타일
    const emotionStyles = {
      normal: 'text-white',
      happy: 'text-yellow-300',
      sad: 'text-blue-300',
      angry: 'text-red-300',
      surprised: 'text-purple-300'
    }

    return {
      textClass: emotionStyles[subtitle.emotion as keyof typeof emotionStyles] || emotionStyles.normal,
      speakerColor: speaker?.color || 'bg-gray-500'
    }
  }

  // 픽셀을 시간으로 변환
  const pixelToTime = useCallback((pixelX: number): number => {
    if (!timelineRef.current || duration <= 0) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (pixelX - rect.left) / rect.width))
    return percentage * duration
  }, [duration])

  // 진행률 계산 (안전장치 포함)
  const getProgressPercentage = (time: number): number => {
    if (!isFinite(duration) || duration <= 0) return 0
    return Math.max(0, Math.min(100, (time / duration) * 100))
  }

  // 시간바 클릭 핸들러
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return
    const newTime = pixelToTime(e.clientX)
    const clampedTime = Math.max(0, Math.min(duration, newTime))
    
    // 동영상이 있으면 직접 동영상 시간을 변경
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = clampedTime
    }
    onTimeUpdate(clampedTime)
  }

  // 마우스 다운 핸들러 (드래그 시작)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    const newTime = pixelToTime(e.clientX)
    const clampedTime = Math.max(0, Math.min(duration, newTime))
    
    // 동영상이 있으면 직접 동영상 시간을 변경
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = clampedTime
    }
    onTimeUpdate(clampedTime)
  }

  // 마우스 이동 핸들러 (드래그 중)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newTime = pixelToTime(e.clientX)
      const clampedTime = Math.max(0, Math.min(duration, newTime))
      
      // 동영상이 있으면 직접 동영상 시간을 변경
      if (videoRef.current && videoUrl) {
        videoRef.current.currentTime = clampedTime
      }
      onTimeUpdate(clampedTime)
    }
  }, [isDragging, pixelToTime, duration, onTimeUpdate, videoUrl])

  // 마우스 업 핸들러 (드래그 종료)
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 마우스 이벤트 리스너 등록
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // 자막 세그먼트를 시간바에 표시하기 위한 계산
  const getSegmentPosition = (segment: SubtitleSegment) => {
    if (!isFinite(duration) || duration <= 0) return { left: 0, width: 0 }
    const startPercent = (segment.startTime / duration) * 100
    const endPercent = (segment.endTime / duration) * 100
    const width = Math.max(0, endPercent - startPercent)
    return { left: startPercent, width }
  }

  // SVG Components for controller buttons
  const RewindIcon = () => (
    <svg width="26" height="27" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.9714 12.5829C13.3539 12.9394 13.3539 13.8307 13.9714 14.1872L23.697 19.8023C24.3145 20.1588 25.0864 19.7131 25.0864 19.0001L25.0864 7.76998C25.0864 7.05695 24.3145 6.61131 23.697 6.96782L13.9714 12.5829Z" fill="white"/>
      <path d="M1.92843 12.5829C1.31094 12.9394 1.31094 13.8307 1.92843 14.1872L11.654 19.8023C12.2715 20.1588 13.0434 19.7131 13.0434 19.0001L13.0434 7.76998C13.0434 7.05695 12.2715 6.61131 11.654 6.96782L1.92843 12.5829Z" fill="white"/>
    </svg>
  )
  const PlayIcon = () => (
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24.5 13.5L3.5 26V1L24.5 13.5Z" fill="white"/>
    </svg>
  )
  const PauseIcon = () => (
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="21" rx="2" fill="white"/>
      <rect x="17" y="3" width="7" height="21" rx="2" fill="white"/>
    </svg>
  )
  const ForwardIcon = () => (
    <svg width="26" height="27" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24.263 12.5829C24.8805 12.9394 24.8805 13.8307 24.263 14.1872L14.5374 19.8023C13.9199 20.1588 13.148 19.7131 13.148 19.0001L13.148 7.76998C13.148 7.05695 13.9199 6.61131 14.5374 6.96782L24.263 12.5829Z" fill="white"/>
      <path d="M12.22 12.5829C12.8375 12.9394 12.8375 13.8307 12.22 14.1872L2.49441 19.8023C1.87692 20.1588 1.10504 19.7131 1.10504 19.0001L1.10504 7.76998C1.10504 7.05695 1.87692 6.61131 2.49441 6.96782L12.22 12.5829Z" fill="white"/>
    </svg>
  )

  // Add new PauseIconSVG for the provided SVG
  const PauseIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="22" viewBox="0 0 19 22" fill="none">
      <rect width="7" height="22" rx="2" fill="white"/>
      <rect x="12" width="7" height="22" rx="2" fill="white"/>
    </svg>
  )

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="relative">
        {/* 동영상 플레이어 또는 플레이스홀더 - 테두리 적용 */}
        <div
          style={{
            borderRadius: '17.507px',
            border: '3px solid rgba(167, 192, 255, 0.86)',
            background: 'url(https://via.placeholder.com/600x340) lightgray 50% / cover no-repeat',
            width: '569.54px',
            height: '336.6px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {videoUrl ? (
            <div className="relative" style={{ width: '100%', height: '100%' }}>
              <video
                ref={videoRef}
                className="rounded-lg relative"
                style={{ width: '100%', height: '100%' }}
                controls={true}
                onTimeUpdate={() => {
                  onTimeUpdate(videoRef.current?.currentTime || 0)
                }}
              >
                <source src={videoUrl} type="video/mp4" />
                브라우저가 비디오를 지원하지 않습니다.
              </video>
              {/* 자막 오버레이 - 동영상 위에 겹치게 표시 */}
              {displaySubtitle && (
                <div className="absolute top-3/4 left-2/4 transform -translate-x-1/2 z-10 w-4/5">
                  <div className="flex items-center space-x-4">
                    {/* 화자 정보 */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full ${getSubtitleStyle(displaySubtitle).speakerColor} flex items-center justify-center text-white text-lg font-bold`}>
                        {speakers.find(s => s.id === displaySubtitle.speaker)?.avatar || '👤'}
                      </div>
                      <span 
                        className="text-white text-2xl font-bold"
                      >
                        {speakers.find(s => s.id === displaySubtitle.speaker)?.name || 'Unknown'}
                      </span>
                    </div>
                    {/* 자막 텍스트 */}
                    <div 
                      className="text-5xl font-bold px-8 py-4 text-white"
                      style={{ 
                        color: 'white',
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 2px 0px #000, 0px -2px 0px #000, 2px 0px 0px #000, -2px 0px 0px #000'
                      }}
                    >
                      {displaySubtitle.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-black rounded-lg relative overflow-hidden" style={{ width: '100%', height: '100%' }}>
              {/* 스켈레톤 애니메이션 배경 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
              {/* 메인 콘텐츠 */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center">
                {/* 아이콘 */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center animate-pulse">
                    <div className="text-gray-400 text-3xl">🎬</div>
                  </div>
                  {/* 펄스 효과 */}
                  <div className="absolute inset-0 w-20 h-20 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                </div>
                {/* 텍스트 */}
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-semibold text-gray-300">
                    동영상을 업로드해주세요
                  </h3>
                  <p className="text-gray-400 text-sm max-w-xs">
                    동영상 파일을 선택하면 여기에 표시됩니다
                  </p>
                </div>
                {/* 스켈레톤 바 */}
                <div className="mt-8 w-full max-w-md space-y-2">
                  <div className="h-2 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-2 bg-gray-600 rounded animate-pulse" style={{ width: '70%' }}></div>
                  <div className="h-2 bg-gray-600 rounded animate-pulse" style={{ width: '90%' }}></div>
                </div>
                {/* 업로드 버튼 스타일의 힌트 */}
                <div className="mt-6">
                  <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                    <span className="mr-2">📁</span>
                    동영상 업로드 버튼을 클릭하세요
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 커스텀 바 - 메인 동영상 아래 시간바 아래 */}
        <div
          style={{
            borderRadius: '11px',
            border: '1px solid #000',
            background: 'rgba(101, 92, 181, 0.40)',
            display: 'flex',
            flexDirection: 'column',
            width: '569.642px',
            height: '49.091px',
            padding: '0px 0px 0px 0px',
            margin: '23px auto 0 auto', // gap 23px from video
            justifyContent: 'flex-start',
          }}
        >
          {/* 1. 타임바 (맨 위) */}
          <div style={{ width: '100%', marginBottom: '2px', position: 'relative', flex: 'none' }}>
            <div 
              ref={timelineRef}
              className="relative h-8 bg-gray-700 rounded-lg cursor-pointer border-2 border-gray-600 w-full"
              onClick={handleTimelineClick}
              onMouseDown={handleMouseDown}
            >
              {/* 자막 세그먼트 표시 */}
              {subtitleSegments.map((segment) => {
                const { left, width } = getSegmentPosition(segment)
                const speaker = speakers.find(s => s.id === segment.speaker)
                return (
                  <div
                    key={segment.id}
                    className="absolute top-1 bottom-1 rounded opacity-60 hover:opacity-80 transition-opacity"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: speaker?.color.replace('bg-', '') === 'red-500' ? '#ef4444' :
                                     speaker?.color.replace('bg-', '') === 'green-500' ? '#10b981' :
                                     speaker?.color.replace('bg-', '') === 'yellow-500' ? '#f59e0b' :
                                     speaker?.color.replace('bg-', '') === 'purple-500' ? '#8b5cf6' :
                                     speaker?.color.replace('bg-', '') === 'blue-500' ? '#3b82f6' : '#6b7280'
                    }}
                    title={`${speaker?.name}: ${segment.text}`}
                  />
                )
              })}
              {/* 진행 바 */}
              <div 
                className="absolute top-1 left-0 bottom-1 bg-blue-500 rounded transition-all duration-100 ease-out"
                style={{ width: `${getProgressPercentage(currentTime)}%` }}
              />
              {/* 시간바 핸들 */}
              <div 
                className={`absolute top-0 w-8 h-8 bg-white rounded-full shadow-lg transform -translate-y-0.5 cursor-pointer transition-all duration-100 ${
                  isDragging ? 'scale-125 shadow-xl' : 'hover:scale-110'
                }`}
                style={{ left: `calc(${getProgressPercentage(currentTime)}% - 16px)` }}
              >
                {/* 핸들 내부 점 */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
          {/* 2. 시간+컨트롤러 (한 줄, 시간 왼쪽, 컨트롤러 중앙) */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', height: '25.935px', marginTop: '2px' }}>
            {/* 시간 표시 (왼쪽) */}
            <div style={{
              color: '#E8E6FD',
              fontFamily: 'Pretendard',
              fontSize: '12px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '18px',
              letterSpacing: '-0.228px',
              minWidth: '110px',
              textAlign: 'left',
              marginLeft: '18px',
              flex: 'none',
              zIndex: 1,
            }}>
              {formatTime(currentTime, false, true)} / {formatTime(duration, false, true)}
            </div>
            {/* 컨트롤러 (정중앙, absolute) */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '24px',
              width: '144.494px',
              height: '25.935px',
              margin: '0',
              zIndex: 2,
            }}>
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, (videoRef.current.currentTime || 0) - 10)
                  onTimeUpdate(Math.max(0, (videoRef.current?.currentTime || 0)))
                }}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '2.2rem', cursor: 'pointer', width: '32px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="10초 뒤로"
              >
                <RewindIcon />
              </button>
              <button
                onClick={() => {
                  if (!isActuallyPlaying) {
                    videoRef.current?.play();
                  } else {
                    videoRef.current?.pause();
                  }
                  onPlayPause();
                }}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '2.6rem', cursor: 'pointer', width: '32px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isActuallyPlaying ? '일시정지' : '재생'}
              >
                {isActuallyPlaying ? <PauseIconSVG /> : <PlayIcon />}
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, (videoRef.current.currentTime || 0) + 10)
                  onTimeUpdate(Math.min(duration, (videoRef.current?.currentTime || 0)))
                }}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '2.2rem', cursor: 'pointer', width: '32px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="10초 앞으로"
              >
                <ForwardIcon />
              </button>
            </div>
            {/* 오른쪽 빈 공간 */}
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer 