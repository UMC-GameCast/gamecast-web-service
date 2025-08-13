import React, { useState, useRef } from 'react'

interface VideoUploaderProps {
  onVideoUploaded: (videoUrl: string, videoFile: File, videoIndex: number) => void
  videoIndex: number
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoUploaded, videoIndex }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 지원하는 파일 형식
  const allowedFileTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 형식 검증
    if (!allowedFileTypes.includes(file.type)) {
      setError('지원하지 않는 파일 형식입니다. MP4, WebM, OGG 등의 비디오 파일을 선택해주세요.')
      return
    }

    // 파일 크기 검증 (500MB)
    if (file.size > 500 * 1024 * 1024) {
      setError('파일 크기가 500MB를 초과합니다.')
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
      // 실제 업로드 로직은 여기에 구현
      // 현재는 로컬 파일 URL 생성
      const videoUrl = URL.createObjectURL(selectedFile)
      
      // 업로드 시뮬레이션 (실제로는 서버로 업로드)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onVideoUploaded(videoUrl, selectedFile, videoIndex)
    } catch (err) {
      setError('동영상 업로드에 실패했습니다.')
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      // 파일 형식 검증
      if (!allowedFileTypes.includes(file.type)) {
        setError('지원하지 않는 파일 형식입니다. MP4, WebM, OGG 등의 비디오 파일을 선택해주세요.')
        return
      }

      // 파일 크기 검증 (500MB)
      if (file.size > 500 * 1024 * 1024) {
        setError('파일 크기가 500MB를 초과합니다.')
        return
      }

      setSelectedFile(file)
      setError('')
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold mb-6 text-white">🎬 동영상 파일 업로드</h3>
      
      <div className="space-y-6">
        {/* 드래그 앤 드롭 영역 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            selectedFile 
              ? 'border-green-500 bg-green-900 bg-opacity-20' 
              : 'border-gray-600 hover:border-gray-500 bg-gray-700'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-gray-400 text-4xl mb-4">📁</div>
          <div className="text-gray-300 text-lg mb-2">
            {selectedFile ? '파일이 선택되었습니다!' : '동영상 파일을 드래그하거나 클릭하여 선택하세요'}
          </div>
          <p className="text-gray-500 text-sm mb-4">
            지원 형식: MP4, WebM, OGG, AVI, MOV 등 (최대 500MB)
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="video-file"
          />
          <label
            htmlFor="video-file"
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
          >
            📁 동영상 선택
          </label>
        </div>

        {/* 파일 정보 */}
        {selectedFile && (
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-blue-400 text-2xl">🎬</div>
                <div>
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-gray-400 text-sm">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm transition-colors"
              >
                🗑️ 제거
              </button>
            </div>
          </div>
        )}

        {/* 업로드 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              !selectedFile || isUploading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isUploading ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>업로드 중...</span>
              </span>
            ) : (
              '🎬 동영상 로드하기'
            )}
          </button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* 사용법 안내 */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium mb-3 text-white">ℹ️ 사용법</h4>
          <ul className="text-sm space-y-2 text-gray-300">
            <li className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>지원 형식: MP4, WebM, OGG, AVI, MOV, WMV, FLV</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>최대 파일 크기: 500MB</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>동영상이 로드되면 자막과 함께 재생됩니다</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>자막은 동영상 하단에 오버레이로 표시됩니다</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default VideoUploader 