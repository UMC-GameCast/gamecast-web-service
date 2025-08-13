import React from 'react'
import HelpPanel from './HelpPanel'

interface SubtitleHeaderProps {
  showHelp: boolean
  showVideoUploader: boolean
  showAudioUploader: boolean
  showMultiSpeakerUploader: boolean
  isRendering: boolean
  videoUrl: string | null
  onToggleHelp: () => void
  onToggleVideoUploader: () => void
  onToggleAudioUploader: () => void
  onToggleMultiSpeakerUploader: () => void
  onImportSubtitles: () => void
  onExportSubtitles: () => void
  onAddSubtitleSegment: () => void
  onTogglePlayback: () => void
  onFFmpegRender: () => void
  onCanvasRender: () => void
  onMainVideoUpload: () => void // 추가
  onMainVideoDelete: () => void // 추가
}

const SubtitleHeader: React.FC<SubtitleHeaderProps> = ({
  showHelp,
  showVideoUploader,
  showAudioUploader,
  showMultiSpeakerUploader,
  isRendering,
  videoUrl,
  onToggleHelp,
  onToggleVideoUploader,
  onToggleAudioUploader,
  onToggleMultiSpeakerUploader,
  onImportSubtitles,
  onExportSubtitles,
  onAddSubtitleSegment,
  onTogglePlayback,
  onFFmpegRender,
  onCanvasRender,
  onMainVideoUpload, // 추가
  onMainVideoDelete // 추가
}) => {
  return (
    <>
      {/* 헤더 */}
      <div className="bg-gray-800 border-b border-gray-700 p-4"></div>
      {/* 도움말 패널 */}
      <HelpPanel isVisible={showHelp} />
      {/* 버튼들을 아래로만 렌더링 */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 mt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-4">
            {!videoUrl && (
              <button
                onClick={onMainVideoUpload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                메인 동영상 업로드
              </button>
            )}
            {videoUrl && (
              <>
                <button
                  onClick={onMainVideoUpload}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  동영상 교체
                </button>
                <button
                  onClick={onMainVideoDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </>
            )}
            <button
              onClick={onToggleHelp}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ❓ 도움말
            </button>
            <button
              onClick={onToggleVideoUploader}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🎬 동영상 업로드
            </button>
            <button
              onClick={onToggleAudioUploader}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🎤 단일 오디오
            </button>
            <button
              onClick={onToggleMultiSpeakerUploader}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🎤 다중 화자
            </button>
            <button
              onClick={onImportSubtitles}
              className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📁 가져오기
            </button>
            <button
              onClick={onExportSubtitles}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              💾 내보내기
            </button>
            <button
              onClick={onAddSubtitleSegment}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ➕ 자막 추가
            </button>
            <button
              onClick={onTogglePlayback}
              disabled={!videoUrl}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !videoUrl
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              ▶️ 재생
            </button>
            <button
              onClick={onFFmpegRender}
              disabled={isRendering || !videoUrl}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRendering || !videoUrl
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRendering ? '🎬 FFmpeg 렌더링 중...' : '🎬 FFmpeg 렌더링 (추천)'}
            </button>
            <button
              onClick={onCanvasRender}
              disabled={isRendering || !videoUrl}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRendering || !videoUrl
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isRendering ? '🎬 렌더링 중...' : '🎬 Canvas 렌더링'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SubtitleHeader 