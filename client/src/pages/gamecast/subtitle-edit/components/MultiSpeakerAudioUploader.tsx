import React, { useState, useRef } from 'react'
import type { SubtitleSegment, Speaker } from '../types'

interface MultiSpeakerAudioUploaderProps {
  speakers: Speaker[]
  onSubtitlesGenerated: (segments: SubtitleSegment[]) => void
}

interface SpeakerAudio {
  speakerId: string
  file: File | null
  isUploading: boolean
  error: string
}

const MultiSpeakerAudioUploader: React.FC<MultiSpeakerAudioUploaderProps> = ({ 
  speakers, 
  onSubtitlesGenerated 
}) => {
  const [speakerAudios, setSpeakerAudios] = useState<SpeakerAudio[]>(
    speakers.map(speaker => ({
      speakerId: speaker.id,
      file: null,
      isUploading: false,
      error: ''
    }))
  )
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

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

  const handleFileSelect = (speakerId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 형식 검증
    if (!allowedFileTypes.includes(file.type)) {
      setSpeakerAudios(prev => prev.map(sa => 
        sa.speakerId === speakerId 
          ? { ...sa, error: '지원하지 않는 파일 형식입니다. MP3, WAV, WebM 등의 오디오 파일을 선택해주세요.' }
          : sa
      ))
      return
    }

    // 파일 크기 검증 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setSpeakerAudios(prev => prev.map(sa => 
        sa.speakerId === speakerId 
          ? { ...sa, error: '파일 크기가 25MB를 초과합니다.' }
          : sa
      ))
      return
    }

    setSpeakerAudios(prev => prev.map(sa => 
      sa.speakerId === speakerId 
        ? { ...sa, file, error: '' }
        : sa
    ))
  }

  const clearFile = (speakerId: string) => {
    setSpeakerAudios(prev => prev.map(sa => 
      sa.speakerId === speakerId 
        ? { ...sa, file: null, error: '' }
        : sa
    ))
    if (fileInputRefs.current[speakerId]) {
      fileInputRefs.current[speakerId]!.value = ''
    }
  }

  const processSingleAudio = async (speakerAudio: SpeakerAudio): Promise<SubtitleSegment[]> => {
    if (!speakerAudio.file) return []

    const formData = new FormData()
    formData.append('file', speakerAudio.file)
    formData.append('model', 'whisper-1')
    formData.append('language', 'ko')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities', 'word')

    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '음성 변환에 실패했습니다.')
    }

    const data = await response.json()
    
    if (data.segments && data.segments.length > 0) {
      return data.segments.map((segment: any, index: number) => ({
        id: `whisper-${speakerAudio.speakerId}-${index}`,
        speaker: speakerAudio.speakerId,
        text: segment.text.trim(),
        startTime: segment.start,
        endTime: segment.end,
        emotion: 'normal'
      }))
    }
    
    return []
  }

  const handleProcessAll = async () => {
    const filesToProcess = speakerAudios.filter(sa => sa.file)
    
    if (filesToProcess.length === 0) {
      alert('업로드된 오디오 파일이 없습니다.')
      return
    }

    setIsProcessingAll(true)
    
    // 모든 스피커의 업로드 상태를 true로 설정
    setSpeakerAudios(prev => prev.map(sa => ({ ...sa, isUploading: true, error: '' })))

    try {
      const allSegments: SubtitleSegment[] = []
      
      // 각 스피커의 오디오를 순차적으로 처리
      for (const speakerAudio of filesToProcess) {
        try {
          const segments = await processSingleAudio(speakerAudio)
          allSegments.push(...segments)
          
          // 성공한 스피커의 상태 업데이트
          setSpeakerAudios(prev => prev.map(sa => 
            sa.speakerId === speakerAudio.speakerId 
              ? { ...sa, isUploading: false, error: '' }
              : sa
          ))
        } catch (error) {
          // 실패한 스피커의 에러 상태 업데이트
          setSpeakerAudios(prev => prev.map(sa => 
            sa.speakerId === speakerAudio.speakerId 
              ? { ...sa, isUploading: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
              : sa
          ))
        }
      }

      if (allSegments.length > 0) {
        // 시간순으로 정렬
        allSegments.sort((a, b) => a.startTime - b.startTime)
        onSubtitlesGenerated(allSegments)
        alert(`🎉 자막 생성 완료!\n총 ${allSegments.length}개의 자막 세그먼트가 생성되었습니다.`)
      } else {
        alert('생성된 자막이 없습니다.')
      }

    } catch (error) {
      console.error('자막 생성 중 오류:', error)
      alert('자막 생성 중 오류가 발생했습니다.')
    } finally {
      setIsProcessingAll(false)
    }
  }

  const handleProcessSingle = async (speakerId: string) => {
    const speakerAudio = speakerAudios.find(sa => sa.speakerId === speakerId)
    if (!speakerAudio || !speakerAudio.file) {
      alert('업로드된 오디오 파일이 없습니다.')
      return
    }

    setSpeakerAudios(prev => prev.map(sa => 
      sa.speakerId === speakerId 
        ? { ...sa, isUploading: true, error: '' }
        : sa
    ))

    try {
      const segments = await processSingleAudio(speakerAudio)
      
      if (segments.length > 0) {
        onSubtitlesGenerated(segments)
        alert(`🎉 ${speakers.find(s => s.id === speakerId)?.name}의 자막 생성 완료!\n총 ${segments.length}개의 자막 세그먼트가 생성되었습니다.`)
      } else {
        alert('생성된 자막이 없습니다.')
      }

    } catch (error) {
      console.error('자막 생성 중 오류:', error)
      setSpeakerAudios(prev => prev.map(sa => 
        sa.speakerId === speakerId 
          ? { ...sa, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
          : sa
      ))
    } finally {
      setSpeakerAudios(prev => prev.map(sa => 
        sa.speakerId === speakerId 
          ? { ...sa, isUploading: false }
          : sa
      ))
    }
  }

  const uploadedCount = speakerAudios.filter(sa => sa.file).length

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-4">
      <h3 className="text-xl font-semibold mb-6">🎤 다중 화자 오디오 업로드</h3>
      
      <div className="space-y-6">
        {/* 화자별 오디오 업로드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {speakers.map(speaker => {
            const speakerAudio = speakerAudios.find(sa => sa.speakerId === speaker.id)!
            
            return (
              <div key={speaker.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">{speaker.avatar}</span>
                  <h4 className="font-medium">{speaker.name}</h4>
                </div>
                
                {/* 파일 선택 */}
                <div className="mb-3">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[speaker.id] = el;
                    }}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileSelect(speaker.id, e)}
                    className="hidden"
                    id={`audio-file-${speaker.id}`}
                  />
                  <label
                    htmlFor={`audio-file-${speaker.id}`}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer block text-center"
                  >
                    📁 파일 선택
                  </label>
                </div>

                {/* 파일 정보 */}
                {speakerAudio.file && (
                  <div className="bg-gray-600 rounded p-2 mb-3">
                    <p className="text-xs truncate"><strong>파일:</strong> {speakerAudio.file.name}</p>
                    <p className="text-xs"><strong>크기:</strong> {(speakerAudio.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}

                {/* 액션 버튼들 */}
                <div className="flex space-x-2">
                  {speakerAudio.file && (
                    <>
                      <button
                        onClick={() => handleProcessSingle(speaker.id)}
                        disabled={speakerAudio.isUploading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1 rounded text-sm font-medium transition-colors flex-1"
                      >
                        {speakerAudio.isUploading ? '🔄 처리중...' : '🚀 처리'}
                      </button>
                      <button
                        onClick={() => clearFile(speaker.id)}
                        className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>

                {/* 에러 메시지 */}
                {speakerAudio.error && (
                  <div className="mt-2 bg-red-900 border border-red-700 text-red-200 px-2 py-1 rounded text-xs">
                    ❌ {speakerAudio.error}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 전체 처리 버튼 */}
        {uploadedCount > 0 && (
          <div className="border-t border-gray-600 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium">전체 처리</h4>
                <p className="text-sm text-gray-400">
                  {uploadedCount}개 파일이 업로드됨
                </p>
              </div>
              <button
                onClick={handleProcessAll}
                disabled={isProcessingAll}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded font-medium transition-colors"
              >
                {isProcessingAll ? '🔄 전체 처리 중...' : '🚀 전체 자막 생성'}
              </button>
            </div>
          </div>
        )}

        {/* 사용법 안내 */}
        <div className="bg-gray-700 rounded p-4">
          <h4 className="font-medium mb-2">ℹ️ 사용법</h4>
          <ul className="text-sm space-y-1">
            <li>• 각 화자별로 오디오 파일을 업로드하세요</li>
            <li>• 지원 형식: MP3, WAV, WebM, M4A 등</li>
            <li>• 최대 파일 크기: 25MB</li>
            <li>• 개별 처리: 각 화자별로 따로 자막 생성</li>
            <li>• 전체 처리: 모든 업로드된 파일을 한번에 처리</li>
            <li>• 생성된 자막은 시간순으로 자동 정렬됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default MultiSpeakerAudioUploader 