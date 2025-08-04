import React from 'react'

interface SubtitleSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  emotion?: string
}

interface Speaker {
  id: string
  name: string
  color: string
  avatar: string
}

interface Emotion {
  id: string
  label: string
  icon: string
  color: string
}

interface SubtitleEditPanelProps {
  segment: SubtitleSegment | null
  speakers: Speaker[]
  emotions: Emotion[]
  onUpdateSegment: (id: string, updates: Partial<SubtitleSegment>) => void
  onDeleteSegment: (id: string) => void
  onClose: () => void
}

const SubtitleEditPanel: React.FC<SubtitleEditPanelProps> = ({
  segment,
  speakers,
  emotions,
  onUpdateSegment,
  onDeleteSegment,
  onClose
}) => {
  if (!segment) return null

  return (
    <div className="mt-4 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">자막 편집</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">스피커</label>
          <select
            value={segment.speaker}
            onChange={(e) => onUpdateSegment(segment.id, { speaker: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {speakers.map(speaker => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">감정</label>
          <select
            value={segment.emotion}
            onChange={(e) => onUpdateSegment(segment.id, { emotion: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {emotions.map(emotion => (
              <option key={emotion.id} value={emotion.id}>
                {emotion.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">시작 시간</label>
          <input
            type="number"
            step="0.1"
            value={segment.startTime}
            onChange={(e) => onUpdateSegment(segment.id, { startTime: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">종료 시간</label>
          <input
            type="number"
            step="0.1"
            value={segment.endTime}
            onChange={(e) => onUpdateSegment(segment.id, { endTime: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">자막 텍스트</label>
          <textarea
            value={segment.text}
            onChange={(e) => onUpdateSegment(segment.id, { text: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-20 resize-none"
          />
        </div>
        
        <div className="col-span-2 flex justify-end space-x-2">
          <button
            onClick={() => onDeleteSegment(segment.id)}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium transition-colors"
          >
            삭제
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubtitleEditPanel 