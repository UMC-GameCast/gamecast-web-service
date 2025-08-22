import React from 'react'
import { Button1 } from '../../../../components/gamecast/common/Button1'

interface SubtitleHeaderProps {
  showVideoUploader: boolean
  showMultiSpeakerUploader: boolean
  isRendering: boolean
  videoUrl: string | null
  onToggleVideoUploader: () => void
  onToggleMultiSpeakerUploader: () => void
  onAddSubtitleSegment: () => void
  onFFmpegRender: () => void
  onCanvasRender: () => void
  onMainVideoUpload: () => void
  onMainVideoDelete: () => void
}

const SubtitleHeader: React.FC<SubtitleHeaderProps> = ({
  showVideoUploader,
  showMultiSpeakerUploader,
  isRendering,
  videoUrl,
  onToggleVideoUploader,
  onToggleMultiSpeakerUploader,
  onAddSubtitleSegment,
  onFFmpegRender,
  onCanvasRender,
  onMainVideoUpload,
  onMainVideoDelete
}) => {
  return (
    <>
      {/* 헤더 */}
      <div className="bg-gray-800 border-b border-gray-700 p-4"></div>
      {/* 버튼들을 아래로만 렌더링 */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 mt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={onAddSubtitleSegment}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ➕ 자막 추가
            </button>

            <Button1
              onClick={onCanvasRender}
              disabled={isRendering || !videoUrl}
              loading={isRendering}
              loadingText="렌더링 중..."
            >
              편집완료
            </Button1>
          </div>
        </div>
      </div>
    </>
  )
}

export default SubtitleHeader 