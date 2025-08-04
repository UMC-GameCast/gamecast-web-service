import React, { useState, useRef } from 'react'
import type { SubtitleSegment } from '../types'

interface AudioUploaderProps {
  onSubtitlesGenerated: (segments: SubtitleSegment[]) => void
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onSubtitlesGenerated }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 지원하는 파일 형식
  const allowedFileTypes = [
    'audio/mp3',
    'audio/mp4',
    'audio/mpeg',
    'audio/mpga',
    'audio/wav',
    'audio/webm',
    'audio/m4a'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 형식 검증
    if (!allowedFileTypes.includes(file.type)) {
      setError('지원하지 않는 파일 형식입니다. MP3, WAV, WebM 등의 오디오 파일을 선택해주세요.')
      return
    }

    // 파일 크기 검증 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('파일 크기가 25MB를 초과합니다.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('파일을 선택해주세요.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('model', 'whisper-1')
      formData.append('language', 'ko') // 한국어 지정
      formData.append('response_format', 'verbose_json') // 타임스탬프 포함 JSON 형식
      formData.append('timestamp_granularities', 'word') // 단어 단위 타임스탬프

      // OpenAI Whisper API 호출
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '음성 변환에 실패했습니다.')
      }

      const data = await response.json()
      
      console.log('Whisper API 응답:', data)
      
      if (data.segments && data.segments.length > 0) {
        // 세그먼트를 SubtitleSegment 형식으로 변환
        const subtitleSegments: SubtitleSegment[] = data.segments.map((segment: any, index: number) => ({
          id: `whisper-${index}`,
          speaker: 'maekju', // 기본 스피커
          text: segment.text.trim(),
          startTime: segment.start,
          endTime: segment.end,
          emotion: 'normal'
        }))
        
        onSubtitlesGenerated(subtitleSegments)
      } else {
        throw new Error('음성 변환 결과가 없습니다.')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4">🎤 오디오 파일 업로드</h3>
      
      <div className="space-y-4">
        {/* 파일 선택 */}
        <div>
          <label className="block text-sm font-medium mb-2">오디오 파일 선택</label>
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="audio-file"
            />
            <label
              htmlFor="audio-file"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition-colors cursor-pointer"
            >
              📁 파일 선택
            </label>
            {selectedFile && (
              <button
                onClick={clearFile}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-medium transition-colors"
              >
                🗑️ 초기화
              </button>
            )}
          </div>
        </div>

        {/* 파일 정보 */}
        {selectedFile && (
          <div className="bg-gray-700 rounded p-3">
            <p className="text-sm"><strong>파일명:</strong> {selectedFile.name}</p>
            <p className="text-sm"><strong>크기:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-sm"><strong>형식:</strong> {selectedFile.type}</p>
          </div>
        )}

        {/* 변환 버튼 */}
        <div>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded font-medium transition-colors"
          >
            {isUploading ? '🔄 변환 중...' : '🚀 Whisper로 자막 생성'}
          </button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            ❌ {error}
          </div>
        )}

        {/* 사용법 안내 */}
        <div className="bg-gray-700 rounded p-3">
          <h4 className="font-medium mb-2">ℹ️ 사용법</h4>
          <ul className="text-sm space-y-1">
            <li>• 지원 형식: MP3, WAV, WebM, M4A 등</li>
            <li>• 최대 파일 크기: 25MB</li>
            <li>• 변환 시간은 파일 길이에 따라 달라집니다</li>
            <li>• 한국어 음성을 자동으로 인식하여 자막을 생성합니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AudioUploader 