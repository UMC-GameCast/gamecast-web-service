import { useState, useRef, useEffect, useCallback } from 'react'
import type { SubtitleSegment, Speaker, Emotion } from '../types'

export const useSubtitleEditor = () => {
  // 기본 자막 데이터
  const [subtitleSegments, setSubtitleSegments] = useState<SubtitleSegment[]>([
    {
      id: '1',
      speaker: 'choroksaengmaesil',
      text: '그짓말 치지 마세요',
      startTime: 1.8,
      endTime: 3.2,
      emotion: 'normal',
      subtitleStyle: 1,
      emphasis: 'normal',
      emotionStyle: 'happy'
    },
    {
      id: '2',
      speaker: 'choroksaengmaesil',
      text: '자막이 들어가면 늘어나는 형태',
      startTime: 3.8,
      endTime: 5.5,
      emotion: 'normal',
      subtitleStyle: 1,
      emphasis: 'normal',
      emotionStyle: 'happy'
    },
    {
      id: '3',
      speaker: 'kimmojil',
      text: '감정자막은 형태가 다르게 구분',
      startTime: 3.2,
      endTime: 5.2,
      emotion: 'happy',
      subtitleStyle: 1,
      emphasis: 'emotion',
      emotionStyle: 'happy'
    }
  ])

  const [currentTime, setCurrentTime] = useState(1.2)
  const [duration, setDuration] = useState(10)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [dragStartX, setDragStartX] = useState(0)
  const [resizing, setResizing] = useState<'start' | 'end' | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showAudioUploader, setShowAudioUploader] = useState(false)
  const [showMultiSpeakerUploader, setShowMultiSpeakerUploader] = useState(false)
  const [showVideoUploader, setShowVideoUploader] = useState(false)
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null) // 현재 업로드할 동영상 인덱스
  const [videos, setVideos] = useState<Array<{ url: string | null; name: string }>>([
    { url: null, name: '메인 동영상' },
    { url: null, name: '동영상 1' },
    { url: null, name: '동영상 2' },
    { url: null, name: '동영상 3' },
    { url: null, name: '동영상 4' }
  ])
  
  // 메인 동영상 URL (하위 호환성을 위해)
  const videoUrl = videos[0]?.url || null
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  
  // 자막 스타일 상태
  const [selectedStyle, setSelectedStyle] = useState(1)
  const [selectedEmphasis, setSelectedEmphasis] = useState<'normal' | 'emotion'>('normal')
  const [selectedEmotion, setSelectedEmotion] = useState<'happy' | 'angry' | 'sad' | 'surprised'>('happy')
  
  const timelineRef = useRef<HTMLDivElement>(null)

  // 스피커와 감정 데이터
  const speakers: Speaker[] = [
    { id: 'maekju', name: '맥쥬', color: 'bg-red-500', avatar: '🔴' },
    { id: 'choroksaengmaesil', name: '초록색매실', color: 'bg-green-500', avatar: '🟢' },
    { id: 'sojangyangju', name: '소정양주', color: 'bg-yellow-500', avatar: '🟡' },
    { id: 'kimmojil', name: '김모질', color: 'bg-purple-500', avatar: '🟣' },
    { id: 'domtoro', name: '돔토로', color: 'bg-blue-500', avatar: '🔵' }
  ]

  const emotions: Emotion[] = [
    { id: 'normal', label: '일반', icon: 'T', color: 'bg-gray-100 text-gray-800' },
    { id: 'happy', label: '행복', icon: '😊', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'sad', label: '슬픔', icon: '😢', color: 'bg-blue-100 text-blue-800' },
    { id: 'angry', label: '화남', icon: '😠', color: 'bg-red-100 text-red-800' },
    { id: 'surprised', label: '놀람', icon: '😲', color: 'bg-purple-100 text-purple-800' }
  ]

  // 동영상 업로드 처리
  const handleVideoUploaded = (url: string, _file: File) => {
    if (activeVideoIndex !== null) {
      setVideos(prev => prev.map((video, index) => 
        index === activeVideoIndex ? { ...video, url } : video
      ))
    }
    setShowVideoUploader(false)
    setActiveVideoIndex(null)
    // 동영상이 업로드되면 duration을 초기화하지 않음 (VideoPlayer에서 실제 duration으로 업데이트됨)
    // setDuration(0) 제거
  }

  // 특정 인덱스의 동영상 업로드 시작
  const handleVideoUploadStart = (index: number) => {
    setActiveVideoIndex(index)
    setShowVideoUploader(true)
  }

  // 특정 인덱스의 동영상 삭제
  const handleVideoDelete = (index: number) => {
    setVideos(prev => prev.map((video, i) => 
      i === index ? { ...video, url: null } : video
    ))
  }

  // 자막 선택 시 해당 자막의 스타일을 UI에 반영
  useEffect(() => {
    if (selectedSegment) {
      const segment = subtitleSegments.find(s => s.id === selectedSegment)
      if (segment) {
        // 해당 자막의 스타일 정보를 UI에 반영
        setSelectedStyle(segment.subtitleStyle || 1)
        setSelectedEmphasis(segment.emphasis || 'normal')
        setSelectedEmotion(segment.emotionStyle || 'happy')
      }
    }
  }, [selectedSegment, subtitleSegments])

  // 자막 스타일 변경 핸들러들 - 선택된 자막에 직접 저장
  const handleStyleChange = (style: number) => {
    setSelectedStyle(style)
    
    // 선택된 자막이 있으면 해당 자막에 스타일 저장
    if (selectedSegment) {
      updateSubtitleSegment(selectedSegment, { subtitleStyle: style })
    }
  }

  const handleEmphasisChange = (emphasis: 'normal' | 'emotion') => {
    setSelectedEmphasis(emphasis)
    
    // 선택된 자막이 있으면 해당 자막에 저장
    if (selectedSegment) {
      updateSubtitleSegment(selectedSegment, { emphasis })
    }
  }

  const handleEmotionChange = (emotion: 'happy' | 'angry' | 'sad' | 'surprised') => {
    setSelectedEmotion(emotion)
    
    // 선택된 자막이 있으면 해당 자막에 저장
    if (selectedSegment) {
      updateSubtitleSegment(selectedSegment, { emotionStyle: emotion })
    }
  }

  // Whisper로 생성된 자막 처리
  const handleSubtitlesGenerated = (newSegments: SubtitleSegment[]) => {
    // 새로운 자막에 기본 스타일 값 추가
    const newSegmentsWithStyle = newSegments.map(segment => ({
      ...segment,
      subtitleStyle: segment.subtitleStyle || 1,
      emphasis: segment.emphasis || 'normal',
      emotionStyle: segment.emotionStyle || 'happy'
    }))
    
    setSubtitleSegments(prev => [...prev, ...newSegmentsWithStyle])
    
    const allSegments = [...subtitleSegments, ...newSegmentsWithStyle]
    const maxEndTime = Math.max(...allSegments.map(s => s.endTime))
    if (maxEndTime > duration) {
      setDuration(Math.ceil(maxEndTime) + 5)
    }
    
    setShowAudioUploader(false)
  }

  // duration 자동 조정
  useEffect(() => {
    if (subtitleSegments.length > 0) {
      const maxEndTime = Math.max(...subtitleSegments.map(s => s.endTime))
      if (maxEndTime > duration) {
        setDuration(Math.ceil(maxEndTime) + 5)
      }
    }
  }, [subtitleSegments, duration])

  // 픽셀을 시간으로 변환
  const pixelToTime = (pixelX: number, containerWidth: number): number => {
    return (pixelX / containerWidth) * duration
  }

  // 타임라인 클릭 핸들러
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDragging) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = pixelToTime(clickX, rect.width)
    
    setCurrentTime(Math.max(0, Math.min(duration, newTime)))
  }

  // 자막 블록 드래그 시작
  const handleDragStart = (e: React.MouseEvent, segmentId: string) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStartX(e.clientX)
    
    const segment = subtitleSegments.find(s => s.id === segmentId)
    if (segment) {
      setDragStartTime(segment.startTime)
    }
  }

  // 자막 블록 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, segmentId: string, resizeType: 'start' | 'end') => {
    e.stopPropagation()
    setResizing(resizeType)
    setDragStartX(e.clientX)
    
    const segment = subtitleSegments.find(s => s.id === segmentId)
    if (segment) {
      setDragStartTime(resizeType === 'start' ? segment.startTime : segment.endTime)
    }
  }

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!timelineRef.current || (!isDragging && !resizing)) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const deltaX = e.clientX - dragStartX
    const deltaTime = pixelToTime(deltaX, rect.width)
    
    if (isDragging && selectedSegment) {
      const newStartTime = Math.max(0, dragStartTime + deltaTime)
      const segment = subtitleSegments.find(s => s.id === selectedSegment)
      if (segment) {
        const segmentDuration = segment.endTime - segment.startTime
        const newEndTime = Math.min(duration, newStartTime + segmentDuration)
        
        updateSubtitleSegment(selectedSegment, {
          startTime: newStartTime,
          endTime: newEndTime
        })
      }
    } else if (resizing && selectedSegment) {
      const segment = subtitleSegments.find(s => s.id === selectedSegment)
      if (segment) {
        if (resizing === 'start') {
          const newStartTime = Math.max(0, Math.min(segment.endTime - 0.5, dragStartTime + deltaTime))
          updateSubtitleSegment(selectedSegment, { startTime: newStartTime })
        } else {
          const newEndTime = Math.min(duration, Math.max(segment.startTime + 0.5, dragStartTime + deltaTime))
          updateSubtitleSegment(selectedSegment, { endTime: newEndTime })
        }
      }
    }
  }, [isDragging, resizing, selectedSegment, dragStartX, dragStartTime, duration, subtitleSegments])

  // 마우스 업 핸들러
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setResizing(null)
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

  // 키보드 단축키 핸들러
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case ' ':
        e.preventDefault()
        togglePlayback()
        break
      case 'Delete':
      case 'Backspace':
        if (selectedSegment) {
          deleteSubtitleSegment(selectedSegment)
        }
        break
      case 'n':
      case 'N':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          addSubtitleSegment()
        }
        break
      case 's':
      case 'S':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          exportSubtitles()
        }
        break
      case 'o':
      case 'O':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          importSubtitles()
        }
        break
      case 'Escape':
        setSelectedSegment(null)
        break
      case 'ArrowLeft':
        e.preventDefault()
        setCurrentTime(prev => Math.max(0, prev - 0.1))
        break
      case 'ArrowRight':
        e.preventDefault()
        setCurrentTime(prev => Math.min(duration, prev + 0.1))
        break
    }
  }, [selectedSegment, duration])

  // 키보드 이벤트 리스너 등록
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 자막 세그먼트 추가
  const addSubtitleSegment = () => {
    const newSegment: SubtitleSegment = {
      id: Date.now().toString(),
      speaker: 'maekju',
      text: '새로운 자막을 입력하세요',
      startTime: currentTime,
      endTime: Math.min(currentTime + 2, duration),
      emotion: 'normal',
      // 기본 스타일 값 설정
      subtitleStyle: 1,
      emphasis: 'normal',
      emotionStyle: 'happy'
    }
    setSubtitleSegments([...subtitleSegments, newSegment])
    setSelectedSegment(newSegment.id)
  }

  // 자막 세그먼트 삭제
  const deleteSubtitleSegment = (id: string) => {
    setSubtitleSegments(subtitleSegments.filter(segment => segment.id !== id))
    setSelectedSegment(null)
  }

  // 자막 세그먼트 업데이트
  const updateSubtitleSegment = (id: string, updates: Partial<SubtitleSegment>) => {
    setSubtitleSegments(subtitleSegments.map(segment => 
      segment.id === id ? { ...segment, ...updates } : segment
    ))
  }

  // 자막 텍스트 변경 핸들러
  const handleTextChange = (segmentId: string, newText: string) => {
    updateSubtitleSegment(segmentId, { text: newText })
  }

  // 재생/일시정지 토글
  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  // 자막 내보내기
  const exportSubtitles = () => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const srtContent = subtitleSegments
      .sort((a, b) => a.startTime - b.startTime)
      .map((segment, index) => {
        const speaker = speakers.find(s => s.id === segment.speaker)
        return `${index + 1}\n${formatTime(segment.startTime)} --> ${formatTime(segment.endTime)}\n[${speaker?.name}] ${segment.text}\n`
      })
      .join('\n')

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subtitles.srt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 자막 가져오기
  const importSubtitles = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.srt,.txt'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          const lines = content.split('\n')
          const newSegments: SubtitleSegment[] = []
          
          for (let i = 0; i < lines.length; i += 4) {
            if (lines[i] && lines[i + 1] && lines[i + 2]) {
              const timeMatch = lines[i + 1].match(/(\d{2}:\d{2}:\d{2}) --> (\d{2}:\d{2}:\d{2})/)
              if (timeMatch) {
                const startTime = parseTime(timeMatch[1])
                const endTime = parseTime(timeMatch[2])
                const text = lines[i + 2].replace(/^\[.*?\]\s*/, '')
                
                newSegments.push({
                  id: Date.now().toString() + i,
                  speaker: 'maekju',
                  text,
                  startTime,
                  endTime,
                  emotion: 'normal'
                })
              }
            }
          }
          
          if (newSegments.length > 0) {
            setSubtitleSegments(newSegments)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  // 시간 문자열 파싱
  const parseTime = (timeStr: string): number => {
    const [minutes, seconds] = timeStr.split(':').map(Number)
    return minutes * 60 + seconds
  }

  // 재생 시뮬레이션 (동영상이 없을 때만)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && !videoUrl) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration, videoUrl])

  // 렌더링 관련 함수들
  const handleFFmpegRender = async () => {
    if (!videoUrl) {
      alert('렌더링할 동영상을 먼저 업로드해주세요.')
      return
    }

    if (subtitleSegments.length === 0) {
      alert('렌더링할 자막이 없습니다.')
      return
    }

    setIsRendering(true)
    setRenderProgress(0)

    try {
      const videoBlob = await fetch(videoUrl).then(r => r.blob())
      const videoFile = new File([videoBlob], 'video.mp4', { type: 'video/mp4' })

      const { createFFmpegRenderer, renderWithProgress } = await import('../../../../utils/ffmpegRenderer')
      
      const renderer = createFFmpegRenderer()
      
      // FFmpeg 로딩 타임아웃 설정 (60초)
      const loadTimeout = setTimeout(() => {
        alert('FFmpeg 로딩이 시간 초과되었습니다. Canvas 렌더링으로 대체합니다.')
        setIsRendering(false)
        setRenderProgress(0)
        handleClientSideRender()
      }, 500000)
      
      try {
        await renderer.load()
        clearTimeout(loadTimeout)
      } catch (error) {
        clearTimeout(loadTimeout)
        throw error
      }
      
      const renderOptions = {
        width: 1920,
        height: 1080,
        fps: 30,
        fontSize: 28,
        fontColor: 'white',
        backgroundColor: 'black@0.6',
        outlineColor: 'black',
        outlineWidth: 3
      }

      const { blob, duration } = await renderWithProgress(
        renderer,
        videoFile,
        subtitleSegments,
        renderOptions
      )

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `자막합성_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert(`🎬 FFmpeg 렌더링 완료!\n소요시간: ${(duration / 1000).toFixed(1)}초\n파일이 자동으로 다운로드됩니다.`)
      
    } catch (error) {
      console.error('FFmpeg 렌더링 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      
      if (errorMessage.includes('로딩에 실패')) {
        const useCanvas = confirm('FFmpeg 로딩에 실패했습니다.\nCanvas 렌더링으로 대체하시겠습니까?')
        if (useCanvas) {
          setIsRendering(false)
          setRenderProgress(0)
          handleClientSideRender()
          return
        }
      }
      
      alert('FFmpeg 렌더링 중 오류가 발생했습니다.\n' + errorMessage)
    } finally {
      setIsRendering(false)
      setRenderProgress(0)
    }
  }

  const handleClientSideRender = async () => {
    if (!videoUrl) {
      alert('렌더링할 동영상을 먼저 업로드해주세요.')
      return
    }

    setIsRendering(true)
    setRenderProgress(0)

    try {
      const video = document.createElement('video')
      video.src = videoUrl
      video.crossOrigin = 'anonymous'
      video.muted = true
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
        video.load()
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { alpha: false })! // 알파 채널 비활성화로 성능 향상
      canvas.width = 1920
      canvas.height = 1080
      
      // 고화질 렌더링을 위한 설정
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const stream = canvas.captureStream(60) // 30fps → 60fps로 증가
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, creating download...')
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `자막합성_Canvas_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        // 렌더링 상태 정리
        setIsRendering(false)
        setRenderProgress(0)
        alert('🎉 Canvas 렌더링 완료!\n파일이 자동으로 다운로드됩니다.')
      }

      mediaRecorder.start()
      video.currentTime = 0
      video.play()

      const duration = video.duration
      console.log('비디오 duration:', duration)
      
      if (!duration || !isFinite(duration) || duration <= 0) {
        throw new Error('비디오 duration이 유효하지 않습니다.')
      }
      
      const frameTime = 1 / 60 // 30fps → 60fps로 증가
      let currentTime = 0
      let isRendering = true

      const renderFrame = () => {
        try {
          if (!isRendering || currentTime >= duration) {
            console.log('렌더링 완료:', currentTime, duration)
            mediaRecorder.stop()
            return
          }

          // 비디오 프레임을 캔버스에 그리기
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // 현재 시간에 해당하는 자막 찾기
          const currentSubtitle = subtitleSegments.find(
            segment => currentTime >= segment.startTime && currentTime <= segment.endTime
          )

          if (currentSubtitle) {
            const speaker = speakers.find(s => s.id === currentSubtitle.speaker)
            const emotion = emotions.find(e => e.id === currentSubtitle.emotion)
            
            const speakerName = speaker?.name || 'Unknown'
            const subtitleText = currentSubtitle.text
            const speakerAvatar = speaker?.avatar || '👤'
            
            // VideoPlayer와 동일한 위치 (화면 3/4 지점)
            const x = canvas.width / 2
            const y = canvas.height * 0.75 // top-3/4와 동일
            
            // 화자 아바타 원형 배경 (32x32px)
            const avatarSize = 32
            const avatarX = x - 200 // 왼쪽으로 약간 이동
            const avatarY = y - 20
            
            // 화자 색상에 따른 원형 배경
            const speakerColor = speaker?.color || 'bg-gray-500'
            let bgColor = '#6b7280' // gray-500
            if (speakerColor.includes('red')) bgColor = '#ef4444' // red-500
            else if (speakerColor.includes('green')) bgColor = '#22c55e' // green-500
            else if (speakerColor.includes('yellow')) bgColor = '#eab308' // yellow-500
            else if (speakerColor.includes('purple')) bgColor = '#a855f7' // purple-500
            else if (speakerColor.includes('blue')) bgColor = '#3b82f6' // blue-500
            
            // 아바타 원형 배경 그리기
            ctx.beginPath()
            ctx.arc(avatarX, avatarY, avatarSize / 2, 0, 2 * Math.PI)
            ctx.fillStyle = bgColor
            ctx.fill()
            
            // 아바타 이모지 그리기 (중앙 정렬)
            ctx.font = '20px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = 'white'
            ctx.fillText(speakerAvatar, avatarX, avatarY)
            
            // 화자 이름 그리기 (아바타 옆)
            ctx.font = 'bold 24px Arial'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = 'white'
            ctx.fillText(speakerName, avatarX + avatarSize / 2 + 10, avatarY)
            
            // 자막 텍스트 그리기 (VideoPlayer와 동일한 스타일)
            ctx.font = 'bold 48px Arial' // text-5xl에 해당
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            
            // 텍스트 그림자 효과 (VideoPlayer의 textShadow와 동일)
            const shadowOffsets = [
              [2, 2], [-2, -2], [2, -2], [-2, 2],
              [0, 2], [0, -2], [2, 0], [-2, 0]
            ]
            
            // 그림자 그리기
            ctx.fillStyle = 'black'
            shadowOffsets.forEach(([offsetX, offsetY]) => {
              ctx.fillText(subtitleText, x + offsetX, y + offsetY)
            })
            
            // 메인 텍스트 그리기
            ctx.fillStyle = 'white'
            ctx.fillText(subtitleText, x, y)
          }

          currentTime += frameTime
          setRenderProgress(currentTime / duration)
          
          // 다음 프레임 예약
          if (isRendering) {
            setTimeout(renderFrame, frameTime * 1000)
          }
        } catch (error) {
          console.error('렌더링 프레임 오류:', error)
          isRendering = false
          mediaRecorder.stop()
        }
      }

      renderFrame()
      
    } catch (error) {
      console.error('Canvas 렌더링 오류:', error)
      alert('Canvas 렌더링 중 오류가 발생했습니다.')
      setIsRendering(false)
      setRenderProgress(0)
    }
  }

  return {
    // 상태
    subtitleSegments,
    currentTime,
    duration,
    isPlaying,
    selectedSegment,
    zoom,
    isDragging,
    resizing,
    showHelp,
    showAudioUploader,
    showMultiSpeakerUploader,
    showVideoUploader,
    videoUrl,
    videos,
    activeVideoIndex,
    isRendering,
    renderProgress,
    speakers,
    emotions,
    timelineRef,
    selectedStyle,
    selectedEmphasis,
    selectedEmotion,
    
    // 액션
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setSelectedSegment,
    setZoom,
    setShowHelp,
    setShowAudioUploader,
    setShowMultiSpeakerUploader,
    setShowVideoUploader,
    setIsRendering,
    setRenderProgress,
    
    // 이벤트 핸들러
    handleVideoUploaded,
    handleVideoUploadStart,
    handleVideoDelete,
    handleStyleChange,
    handleEmphasisChange,
    handleEmotionChange,
    handleSubtitlesGenerated,
    handleTimelineClick,
    handleDragStart,
    handleResizeStart,
    addSubtitleSegment,
    deleteSubtitleSegment,
    updateSubtitleSegment,
    handleTextChange,
    togglePlayback,
    exportSubtitles,
    importSubtitles,
    handleFFmpegRender,
    handleClientSideRender
  }
} 