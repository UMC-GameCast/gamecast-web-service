import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

interface RenderOptions {
  width: number
  height: number
  fps: number
  fontSize: number
  fontColor: string
  backgroundColor: string
  outlineColor: string
  outlineWidth: number
}

export class FFmpegRenderer {
  private ffmpeg: FFmpeg
  private isLoaded: boolean = false

  constructor() {
    this.ffmpeg = new FFmpeg()
  }

  async load() {
    if (!this.isLoaded) {
      console.log('FFmpeg 로딩 중...')
      
      try {
        // CORS 이슈 해결을 위한 설정
        this.ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg Log:', message)
        })
        
        // 더 간단한 로딩 방법
        await this.ffmpeg.load()
        
        this.isLoaded = true
        console.log('FFmpeg 로딩 완료!')
      } catch (error) {
        console.error('FFmpeg 로딩 실패:', error)
        throw new Error('FFmpeg 로딩에 실패했습니다. 브라우저를 새로고침하고 다시 시도해주세요.')
      }
    }
  }

  async renderVideoWithSubtitles(
    videoFile: File,
    subtitleSegments: any[],
    options: Partial<RenderOptions> = {},
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.load()

    const defaultOptions: RenderOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      fontSize: 24,
      fontColor: 'white',
      backgroundColor: 'black@0.5',
      outlineColor: 'black',
      outlineWidth: 2,
      ...options
    }

    try {
      console.log('비디오 파일 로딩 중...')
      // 비디오 파일을 FFmpeg에 로드
      await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))

      console.log('자막 파일 생성 중...')
      // SRT 파일 생성
      const srtContent = this.createSRTContent(subtitleSegments)
      await this.ffmpeg.writeFile('subtitles.srt', srtContent)

      console.log('FFmpeg 렌더링 시작...')
      // FFmpeg 명령어 실행
      const args = [
        '-i', 'input.mp4',
        '-vf', `subtitles=subtitles.srt:force_style='FontSize=${defaultOptions.fontSize},PrimaryColour=&Hffffff,OutlineColour=&H000000,BackColour=&H80000000,Bold=1,Outline=${defaultOptions.outlineWidth}'`,
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-y',
        'output.mp4'
      ]

      await this.ffmpeg.exec(args)

      console.log('렌더링 완료, 결과 파일 읽는 중...')
      // 결과 파일 읽기
      const data = await this.ffmpeg.readFile('output.mp4')
      const blob = new Blob([data], { type: 'video/mp4' })

      // 임시 파일 정리
      await this.ffmpeg.deleteFile('input.mp4')
      await this.ffmpeg.deleteFile('subtitles.srt')
      await this.ffmpeg.deleteFile('output.mp4')

      console.log('렌더링 성공!')
      return blob

    } catch (error) {
      console.error('FFmpeg 렌더링 오류:', error)
      throw error
    }
  }

  private createSRTContent(segments: any[]): string {
    let srtContent = ''
    
    segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.startTime)
      const endTime = this.formatTime(segment.endTime)
      const text = segment.text
      
      srtContent += `${index + 1}\n`
      srtContent += `${startTime} --> ${endTime}\n`
      srtContent += `${text}\n\n`
    })
    
    return srtContent
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const millisecs = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millisecs.toString().padStart(3, '0')}`
  }

  // 간단한 렌더링 (빠른 처리)
  async renderSimple(
    videoFile: File,
    subtitleSegments: any[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.load()

    try {
      console.log('간단한 렌더링 시작...')
      await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))

      const srtContent = this.createSRTContent(subtitleSegments)
      await this.ffmpeg.writeFile('subtitles.srt', srtContent)

      // 간단한 명령어 (빠른 처리)
      const args = [
        '-i', 'input.mp4',
        '-vf', 'subtitles=subtitles.srt',
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-y',
        'output.mp4'
      ]

      await this.ffmpeg.exec(args)

      const data = await this.ffmpeg.readFile('output.mp4')
      const blob = new Blob([data], { type: 'video/mp4' })

      // 정리
      await this.ffmpeg.deleteFile('input.mp4')
      await this.ffmpeg.deleteFile('subtitles.srt')
      await this.ffmpeg.deleteFile('output.mp4')

      return blob

    } catch (error) {
      console.error('FFmpeg 간단한 렌더링 오류:', error)
      throw error
    }
  }
}

// 사용 예시
export const createFFmpegRenderer = () => {
  return new FFmpegRenderer()
}

// 렌더링 진행률 추적
export const renderWithProgress = async (
  renderer: FFmpegRenderer,
  videoFile: File,
  subtitleSegments: any[],
  options?: Partial<RenderOptions>
): Promise<{ blob: Blob; duration: number }> => {
  const startTime = Date.now()
  
  const blob = await renderer.renderVideoWithSubtitles(
    videoFile,
    subtitleSegments,
    options,
    (progress) => {
      console.log(`FFmpeg 렌더링 진행률: ${(progress * 100).toFixed(1)}%`)
    }
  )
  
  const duration = Date.now() - startTime
  return { blob, duration }
}

// 간단한 렌더링
export const renderSimple = async (
  renderer: FFmpegRenderer,
  videoFile: File,
  subtitleSegments: any[]
): Promise<{ blob: Blob; duration: number }> => {
  const startTime = Date.now()
  
  const blob = await renderer.renderSimple(videoFile, subtitleSegments)
  
  const duration = Date.now() - startTime
  return { blob, duration }
} 