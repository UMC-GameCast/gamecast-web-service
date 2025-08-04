import type { SubtitleSegment, Speaker, Emotion } from '../pages/gamecast/subtitle-edit/types'

interface RenderOptions {
  width: number
  height: number
  fps: number
  fontFamily: string
  fontSize: number
  fontColor: string
  backgroundColor: string
  outlineColor: string
  outlineWidth: number
  quality: 'low' | 'medium' | 'high'
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private video: HTMLVideoElement
  private options: RenderOptions

  constructor(video: HTMLVideoElement, options: Partial<RenderOptions> = {}) {
    this.video = video
    this.options = {
      width: 1280, // 기본 해상도를 낮춰서 성능 향상
      height: 720,
      fps: 24, // 프레임레이트를 낮춰서 성능 향상
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      outlineColor: '#000000',
      outlineWidth: 2,
      quality: 'medium',
      ...options
    }

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height
    this.ctx = this.canvas.getContext('2d')!
    
    // 캔버스 품질 설정
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
  }

  async renderFrame(
    currentTime: number,
    subtitleSegments: SubtitleSegment[],
    speakers: Speaker[],
    emotions: Emotion[]
  ): Promise<ImageData> {
    // 비디오 프레임 그리기
    this.ctx.drawImage(this.video, 0, 0, this.options.width, this.options.height)

    // 현재 시간에 해당하는 자막 찾기
    const currentSubtitle = subtitleSegments.find(
      segment => currentTime >= segment.startTime && currentTime <= segment.endTime
    )

    if (currentSubtitle) {
      this.drawSubtitle(currentSubtitle, speakers, emotions)
    }

    return this.ctx.getImageData(0, 0, this.options.width, this.options.height)
  }

  private drawSubtitle(
    subtitle: SubtitleSegment,
    speakers: Speaker[],
    emotions: Emotion[]
  ) {
    const speaker = speakers.find(s => s.id === subtitle.speaker)
    const emotion = emotions.find(e => e.id === subtitle.emotion)
    
    // 감정에 따른 색상 변경
    let textColor = this.options.fontColor
    if (emotion?.id === 'happy') textColor = '#ffff00' // 노란색
    else if (emotion?.id === 'sad') textColor = '#87ceeb' // 하늘색
    else if (emotion?.id === 'angry') textColor = '#ff6b6b' // 빨간색
    else if (emotion?.id === 'surprised') textColor = '#ffa500' // 주황색
    
    const text = `[${speaker?.name || 'Unknown'}] ${subtitle.text}`
    
    // 폰트 설정
    this.ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'bottom'

    // 텍스트 크기 측정
    const textMetrics = this.ctx.measureText(text)
    const textWidth = textMetrics.width
    const textHeight = this.options.fontSize

    // 자막 위치 (화면 하단 중앙)
    const x = this.options.width / 2
    const y = this.options.height - 30

    // 배경 박스 그리기
    const padding = 8
    const boxWidth = textWidth + padding * 2
    const boxHeight = textHeight + padding * 2
    const boxX = x - boxWidth / 2
    const boxY = y - textHeight - padding

    this.ctx.fillStyle = this.options.backgroundColor
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

    // 텍스트 외곽선 그리기
    this.ctx.strokeStyle = this.options.outlineColor
    this.ctx.lineWidth = this.options.outlineWidth
    this.ctx.strokeText(text, x, y)

    // 텍스트 그리기
    this.ctx.fillStyle = textColor
    this.ctx.fillText(text, x, y)
  }

  async renderVideo(
    subtitleSegments: SubtitleSegment[],
    speakers: Speaker[],
    emotions: Emotion[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const duration = this.video.duration
    const totalFrames = Math.floor(duration * this.options.fps)
    const frameTime = 1 / this.options.fps

    // MediaRecorder 설정 (품질에 따라)
    let mimeType = 'video/webm;codecs=vp8'
    if (this.options.quality === 'high') {
      mimeType = 'video/webm;codecs=vp9'
    }

    const chunks: Blob[] = []
    const mediaRecorder = new MediaRecorder(this.canvas.captureStream(this.options.fps), {
      mimeType
    })

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        resolve(blob)
      }

      mediaRecorder.onerror = reject

      mediaRecorder.start()

      let currentFrame = 0
      const renderNextFrame = async () => {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop()
          return
        }

        const currentTime = currentFrame * frameTime
        this.video.currentTime = currentTime

        await new Promise<void>((resolve) => {
          this.video.onseeked = () => {
            this.renderFrame(currentTime, subtitleSegments, speakers, emotions)
            resolve()
          }
        })

        currentFrame++
        onProgress?.(currentFrame / totalFrames)

        // 다음 프레임 렌더링 예약 (성능 최적화)
        requestAnimationFrame(() => {
          setTimeout(renderNextFrame, frameTime * 1000)
        })
      }

      renderNextFrame()
    })
  }

  // 빠른 렌더링 모드 (품질 대신 속도 우선)
  async renderVideoFast(
    subtitleSegments: SubtitleSegment[],
    speakers: Speaker[],
    emotions: Emotion[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // 해상도와 프레임레이트를 낮춰서 빠른 렌더링
    const originalWidth = this.options.width
    const originalHeight = this.options.height
    const originalFps = this.options.fps

    this.options.width = 854
    this.options.height = 480
    this.options.fps = 15
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height

    try {
      const result = await this.renderVideo(subtitleSegments, speakers, emotions, onProgress)
      return result
    } finally {
      // 원래 설정으로 복원
      this.options.width = originalWidth
      this.options.height = originalHeight
      this.options.fps = originalFps
      this.canvas.width = this.options.width
      this.canvas.height = this.options.height
    }
  }

  // 고품질 렌더링 모드
  async renderVideoHighQuality(
    subtitleSegments: SubtitleSegment[],
    speakers: Speaker[],
    emotions: Emotion[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // 고품질 설정
    this.options.width = 1920
    this.options.height = 1080
    this.options.fps = 30
    this.options.quality = 'high'
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height

    return this.renderVideo(subtitleSegments, speakers, emotions, onProgress)
  }
}

// 사용 예시
export const createVideoRenderer = (
  video: HTMLVideoElement,
  options?: Partial<RenderOptions>
) => {
  return new VideoRenderer(video, options)
}

// 렌더링 진행률 추적
export const trackRenderingProgress = (
  renderer: VideoRenderer,
  subtitleSegments: SubtitleSegment[],
  speakers: Speaker[],
  emotions: Emotion[],
  mode: 'fast' | 'normal' | 'high' = 'normal'
): Promise<{ blob: Blob; duration: number }> => {
  const startTime = Date.now()
  
  let renderPromise: Promise<Blob>
  
  switch (mode) {
    case 'fast':
      renderPromise = renderer.renderVideoFast(subtitleSegments, speakers, emotions, (progress) => {
        console.log(`빠른 렌더링 진행률: ${(progress * 100).toFixed(1)}%`)
      })
      break
    case 'high':
      renderPromise = renderer.renderVideoHighQuality(subtitleSegments, speakers, emotions, (progress) => {
        console.log(`고품질 렌더링 진행률: ${(progress * 100).toFixed(1)}%`)
      })
      break
    default:
      renderPromise = renderer.renderVideo(subtitleSegments, speakers, emotions, (progress) => {
        console.log(`렌더링 진행률: ${(progress * 100).toFixed(1)}%`)
      })
  }
  
  return renderPromise.then(blob => {
    const duration = Date.now() - startTime
    return { blob, duration }
  })
} 