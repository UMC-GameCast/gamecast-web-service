import React, { useState, useRef, useEffect } from 'react'

interface SubtitleSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  emotion?: string
}

interface Emotion {
  id: string
  label: string
  icon: string
  color: string
}

interface SubtitleBlockProps {
  segment: SubtitleSegment
  duration: number
  isSelected: boolean
  emotion: Emotion | undefined
  onDragStart: (e: React.MouseEvent, segmentId: string) => void
  onResizeStart: (e: React.MouseEvent, segmentId: string, resizeType: 'start' | 'end') => void
  onClick: () => void
  onTextChange: (segmentId: string, newText: string) => void
}

const SubtitleBlock: React.FC<SubtitleBlockProps> = ({
  segment,
  duration,
  isSelected,
  emotion,
  onDragStart,
  onResizeStart,
  onClick,
  onTextChange
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(segment.text)
  const inputRef = useRef<HTMLInputElement>(null)

  const startPercent = (segment.startTime / duration) * 100
  const endPercent = (segment.endTime / duration) * 100
  const width = endPercent - startPercent

  // 텍스트 축약 함수
  const truncateText = (text: string, maxLength: number = 15): string => {
    if (text.length <= maxLength) return text
    
    // 문장 부호나 공백에서 자르기
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?'),
      truncated.lastIndexOf(','),
      truncated.lastIndexOf(';'),
      truncated.lastIndexOf(':')
    )
    
    const cutPoint = Math.max(lastSpace, lastPunctuation)
    
    if (cutPoint > maxLength * 0.6) {
      return truncated.substring(0, cutPoint) + '...'
    } else {
      return truncated + '...'
    }
  }

  // 더블클릭 핸들러
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditText(segment.text)
  }

  // 편집 완료
  const handleEditComplete = () => {
    if (editText.trim() !== segment.text) {
      onTextChange(segment.id, editText.trim())
    }
    setIsEditing(false)
  }

  // 편집 취소
  const handleEditCancel = () => {
    setEditText(segment.text)
    setIsEditing(false)
  }

  // 키보드 이벤트
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  // 편집 모드 시작 시 input에 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // 블록 너비에 따른 텍스트 길이 조정
  const getMaxTextLength = () => {
    if (width < 10) return 5
    if (width < 20) return 10
    if (width < 30) return 15
    if (width < 50) return 20
    return 25
  }

  const displayText = truncateText(segment.text, getMaxTextLength())

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-move transition-all hover:scale-105 ${
        isSelected 
          ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-700' 
          : ''
      }`}
      style={{
        left: `${startPercent}%`,
        width: `${width}%`,
        minWidth: '60px'
      }}
      onMouseDown={(e) => onDragStart(e, segment.id)}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      title={segment.text} // 툴팁으로 전체 텍스트 표시
    >
      <div className={`h-full rounded px-2 py-1 text-xs font-medium flex items-center space-x-1 ${emotion?.color || 'bg-gray-100 text-gray-800'} relative`}>
        {/* 리사이즈 핸들 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(e, segment.id, 'start')}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(e, segment.id, 'end')}
        />
        
        <span className="text-xs flex-shrink-0">{emotion?.icon || 'T'}</span>
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditComplete}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-xs font-medium min-w-0"
            style={{ color: 'inherit' }}
          />
        ) : (
          <span className="truncate flex-1" title={segment.text}>
            {displayText}
          </span>
        )}
      </div>
    </div>
  )
}

export default SubtitleBlock 