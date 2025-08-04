import React from 'react'
import type { SubtitleSegment, Speaker, Emotion } from '../types'

interface SubtitleStylePanelProps {
  selectedStyle: number
  selectedEmphasis: 'normal' | 'emotion'
  selectedEmotion: 'happy' | 'angry' | 'sad' | 'surprised'
  selectedSegment: SubtitleSegment | null
  speakers: Speaker[]
  emotions: Emotion[]
  onStyleChange: (style: number) => void
  onEmphasisChange: (emphasis: 'normal' | 'emotion') => void
  onEmotionChange: (emotion: 'happy' | 'angry' | 'sad' | 'surprised') => void
  onUpdateSegment: (id: string, updates: Partial<SubtitleSegment>) => void
  onDeleteSegment: (id: string) => void
  onCloseEdit: () => void
}

const SubtitleStylePanel: React.FC<SubtitleStylePanelProps> = ({
  selectedStyle,
  selectedEmphasis,
  selectedEmotion,
  selectedSegment,
  speakers,
  emotions,
  onStyleChange,
  onEmphasisChange,
  onEmotionChange,
  onUpdateSegment,
  onDeleteSegment,
  onCloseEdit
}) => {
  const styles = [
    { id: 1, name: '스타일 1' },
    { id: 2, name: '스타일 2' },
    { id: 3, name: '스타일 3' }
  ]

  const emphasisOptions = [
    { id: 'normal', name: '일반 자막' },
    { id: 'emotion', name: '감정 강조 자막' }
  ] as const

  const emotionOptions = [
    { id: 'happy', name: '신남', icon: '😊', color: 'bg-yellow-500' },
    { id: 'angry', name: '화남', icon: '😠', color: 'bg-red-500' },
    { id: 'sad', name: '슬픔', icon: '😢', color: 'bg-blue-500' },
    { id: 'surprised', name: '놀람', icon: '😲', color: 'bg-purple-500' }
  ] as const

  const getStyleDisplayText = () => {
    // 선택된 자막이 있으면 해당 자막의 스타일 정보를 사용, 없으면 현재 UI 상태 사용
    const currentStyle = selectedSegment?.subtitleStyle || selectedStyle
    const currentEmphasis = selectedSegment?.emphasis || selectedEmphasis
    const currentEmotion = selectedSegment?.emotionStyle || selectedEmotion
    
    const styleText = `스타일 ${currentStyle}`
    const emphasisText = currentEmphasis === 'normal' ? '일반 자막' : '감정 강조 자막'
    const emotionText = emotionOptions.find(e => e.id === currentEmotion)?.name || '신남'
    return `${styleText} · ${emphasisText} · ${emotionText}`
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 w-80 space-y-6">
      {/* 전체 자막 스타일 */}
      <div>
        <div className="text-center mb-4">
          <h3 className="text-white text-sm font-medium">전체 자막 스타일</h3>
        </div>
        <div className="flex gap-2 justify-center">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedStyle === style.id
                  ? 'bg-blue-600 text-white border-2 border-white'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* 자막 편집창 */}
      {selectedSegment && (
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold mb-4 text-white">자막 편집</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">스피커</label>
                <select
                  value={selectedSegment.speaker}
                  onChange={(e) => onUpdateSegment(selectedSegment.id, { speaker: e.target.value })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                >
                  {speakers.map(speaker => (
                    <option key={speaker.id} value={speaker.id}>
                      {speaker.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">감정</label>
                <select
                  value={selectedSegment.emotion}
                  onChange={(e) => onUpdateSegment(selectedSegment.id, { emotion: e.target.value })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                >
                  {emotions.map(emotion => (
                    <option key={emotion.id} value={emotion.id}>
                      {emotion.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">시작</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedSegment.startTime}
                  onChange={(e) => onUpdateSegment(selectedSegment.id, { startTime: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">종료</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedSegment.endTime}
                  onChange={(e) => onUpdateSegment(selectedSegment.id, { endTime: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">자막 텍스트</label>
              <textarea
                value={selectedSegment.text}
                onChange={(e) => onUpdateSegment(selectedSegment.id, { text: e.target.value })}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white h-16 resize-none text-sm"
                placeholder="자막 텍스트를 입력하세요..."
              />
            </div>

            {/* 선택한 스타일 정보 표시 */}
            <div className="bg-gray-600 rounded p-3 border border-gray-500">
              <div className="text-xs text-gray-300 mb-1">적용될 스타일:</div>
              <div className="text-sm text-blue-300 font-medium">{getStyleDisplayText()}</div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => onDeleteSegment(selectedSegment.id)}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-medium transition-colors text-sm"
              >
                삭제
              </button>
              <button
                onClick={onCloseEdit}
                className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded font-medium transition-colors text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 선택 자막 스타일 */}
      <div>
        <div className="text-center mb-4">
          <h3 className="text-white text-sm font-medium">선택 자막 스타일</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* 일반/감정 강조 자막 (좌측) */}
          <div className="space-y-2">
            {emphasisOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onEmphasisChange(option.id)}
                className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                  selectedEmphasis === option.id
                    ? 'bg-blue-600 text-white border-2 border-white'
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                }`}
              >
                {option.name}
              </button>
            ))}
          </div>

          {/* 감정 선택 (우측) */}
          <div className="grid grid-cols-2 gap-2">
            {emotionOptions.map((emotion) => (
              <button
                key={emotion.id}
                onClick={() => onEmotionChange(emotion.id)}
                className={`px-2 py-2 rounded text-xs font-medium transition-colors flex flex-col items-center ${
                  selectedEmotion === emotion.id
                    ? `${emotion.color} text-white border-2 border-white`
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                }`}
              >
                <span className="text-lg mb-1">{emotion.icon}</span>
                <span>{emotion.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubtitleStylePanel