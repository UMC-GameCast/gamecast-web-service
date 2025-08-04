import React from 'react'

interface RenderModalProps {
  isRendering: boolean
  renderProgress: number
  onCancel?: () => void
}

const RenderModal: React.FC<RenderModalProps> = ({ isRendering, renderProgress, onCancel }) => {
  if (!isRendering) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-white mb-2">렌더링 중...</h3>
          <p className="text-gray-300 mb-4">동영상과 자막을 합치는 중입니다.</p>
          
          {/* 진행률 바 */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${renderProgress * 100}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-400 mb-4">
            진행률: {Math.round(renderProgress * 100)}%
          </p>
          
          {/* 취소 버튼 */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium transition-colors"
            >
              ❌ 렌더링 취소
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RenderModal 