import React from 'react'

interface HelpPanelProps {
  isVisible: boolean
}

const HelpPanel: React.FC<HelpPanelProps> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-lg font-semibold mb-2">⌨️ 키보드 단축키</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Space</kbd> 재생/일시정지</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">←/→</kbd> 시간 이동</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Delete</kbd> 자막 삭제</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+N</kbd> 새 자막</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+S</kbd> 내보내기</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+O</kbd> 가져오기</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Esc</kbd> 선택 해제</div>
        </div>
        <div className="mt-4 text-sm text-gray-300">
          <h4 className="font-semibold mb-2">💡 편집 팁</h4>
          <ul className="space-y-1">
            <li>• 자막 블록을 <strong>드래그</strong>하여 위치 이동</li>
            <li>• 자막 블록 양쪽 끝을 <strong>드래그</strong>하여 크기 조절</li>
            <li>• 자막 블록을 <strong>더블클릭</strong>하여 텍스트 직접 편집</li>
            <li>• 자막 블록을 <strong>클릭</strong>하여 상세 편집 패널 열기</li>
            <li>• 편집 중 <kbd className="bg-gray-700 px-1 rounded text-xs">Enter</kbd>로 저장, <kbd className="bg-gray-700 px-1 rounded text-xs">Esc</kbd>로 취소</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HelpPanel 