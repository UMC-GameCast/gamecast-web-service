import React, { useState, useRef, useEffect } from 'react'

interface SubtitleSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  emotion?: string
  emphasis?: 'normal' | 'emotion'
  emotionStyle?: 'happy' | 'angry' | 'sad' | 'surprised'
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
  const [isDragging, setIsDragging] = useState(false)
  const [mouseDownPos, setMouseDownPos] = useState<{x: number, y: number} | null>(null)
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

  // 마우스 다운 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setIsDragging(false)
  }

  // 마우스 업 핸들러 
  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mouseDownPos && !isEditing) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) + 
        Math.pow(e.clientY - mouseDownPos.y, 2)
      )
      
      // 5픽셀 이하 이동은 클릭으로 간주
      if (distance < 5) {
        onClick()
      }
    }
    setMouseDownPos(null)
    setIsDragging(false)
  }

  // 마우스 무브 핸들러
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseDownPos) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) + 
        Math.pow(e.clientY - mouseDownPos.y, 2)
      )
      
      // 5픽셀 이상 이동하면 드래그 시작
      if (distance >= 5 && !isDragging) {
        setIsDragging(true)
        onDragStart(e, segment.id)
      }
    }
  }

  // 더블클릭 핸들러
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    // 먼저 선택 상태로 만들기
    if (!isSelected) {
      onClick()
    }
    
    // 약간의 지연 후 편집 모드로 진입
    setTimeout(() => {
      setIsEditing(true)
      setEditText(segment.text)
    }, 10)
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

  // 자막 스타일 결정 (일반 자막 vs 감정 강조 자막)
  const getSubtitleStyle = () => {
    const isEmotionEmphasis = segment.emphasis === 'emotion'
    
    if (isEmotionEmphasis) {
      // 감정 강조 자막 디자인
      return {
        border: isSelected ? '2px solid #B3FEB3' : '2px solid #140E33',
        background: isSelected ? 'rgba(174, 239, 176, 0.30)' : 'rgba(238, 232, 255, 0.80)'
      }
    } else {
      // 일반 자막 디자인 (기존 디자인 유지)
      return {
        border: isSelected ? '2px solid #B3FEB3' : '2px solid #140E33', 
        background: isSelected ? 'rgba(174, 239, 176, 0.30)' : 'rgba(107, 102, 178, 0.20)'
      }
    }
  }

  const subtitleStyle = getSubtitleStyle()

  // 텍스트 스타일 결정
  const getTextStyle = () => {
    const isEmotionEmphasis = segment.emphasis === 'emotion'
    
    if (isSelected) {
      // 선택 상태 - 그라디언트 텍스트 (일반/감정 자막 동일)
      return {
        background: 'linear-gradient(97deg, #B3FEB3 8.38%, #4FF062 98.06%)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center' as const,
        fontFamily: 'Pretendard',
        fontSize: '15px',
        fontStyle: 'normal' as const,
        fontWeight: 700,
        lineHeight: '150%',
        letterSpacing: '-0.285px'
      }
    } else {
      // 기본 상태 - 자막 유형에 따라 다른 색상
      if (isEmotionEmphasis) {
        // 감정 강조 자막 - 검은색
        return {
          color: '#1E2656',
          textAlign: 'center' as const,
          fontFamily: 'Pretendard',
          fontSize: '15px',
          fontStyle: 'normal' as const,
          fontWeight: 700,
          lineHeight: '150%',
          letterSpacing: '-0.285px'
        }
      } else {
        // 일반 자막 - 흰색
        return {
          color: '#FFF',
          textAlign: 'center' as const,
          fontFamily: 'Pretendard',
          fontSize: '15px',
          fontStyle: 'normal' as const,
          fontWeight: 700,
          lineHeight: '150%',
          letterSpacing: '-0.285px'
        }
      }
    }
  }

  const textStyle = getTextStyle()

  // 감정 아이콘 렌더링 함수
  const renderEmotionIcon = () => {
    // 감정 강조 자막일 때 특별한 SVG 아이콘 사용
    if (segment.emphasis === 'emotion') {
      // '신남' 감정
      if (segment.emotionStyle === 'happy') {
        if (isSelected) {
          // 선택 상태 - 그라디언트 초록색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
            <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="url(#paint0_linear_1489_23489)"/>
            <circle cx="4.225" cy="6.02187" r="0.975" fill="url(#paint1_linear_1489_23489)"/>
            <circle cx="8.77578" cy="6.02187" r="0.975" fill="url(#paint2_linear_1489_23489)"/>
            <path d="M4 8.5C5.07739 10.2776 7.64548 11.0403 9.35967 8.5" stroke="url(#paint3_linear_1489_23489)"/>
            <defs>
              <linearGradient id="paint0_linear_1489_23489" x1="1.22852" y1="0.499997" x2="14.1656" y2="2.15326" gradientUnits="userSpaceOnUse">
                <stop stopColor="#B3FEB3"/>
                <stop offset="1" stopColor="#4FF062"/>
              </linearGradient>
              <linearGradient id="paint1_linear_1489_23489" x1="3.43428" y1="5.04687" x2="5.37485" y2="5.29486" gradientUnits="userSpaceOnUse">
                <stop stopColor="#B3FEB3"/>
                <stop offset="1" stopColor="#4FF062"/>
              </linearGradient>
              <linearGradient id="paint2_linear_1489_23489" x1="7.98506" y1="5.04687" x2="9.92563" y2="5.29486" gradientUnits="userSpaceOnUse">
                <stop stopColor="#B3FEB3"/>
                <stop offset="1" stopColor="#4FF062"/>
              </linearGradient>
              <linearGradient id="paint3_linear_1489_23489" x1="4.5065" y1="8.5" x2="9.11524" y2="10.4346" gradientUnits="userSpaceOnUse">
                <stop stopColor="#B3FEB3"/>
                <stop offset="1" stopColor="#4FF062"/>
              </linearGradient>
            </defs>
          </svg>
        )
        } else {
          // 기본 상태 - 검은색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="#1E2656"/>
              <circle cx="4.225" cy="6.02187" r="0.975" fill="#1E2656"/>
              <circle cx="8.77578" cy="6.02187" r="0.975" fill="#1E2656"/>
              <path d="M4 8.5C5.07739 10.2776 7.64548 11.0403 9.35967 8.5" stroke="#1E2656"/>
            </svg>
          )
        }
      }
      
      // '놀람' 감정
      if (segment.emotionStyle === 'surprised') {
        if (isSelected) {
          // 선택 상태 - 그라디언트 초록색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="url(#paint0_linear_surprised)"/>
              <circle cx="4.225" cy="6.02578" r="0.975" fill="url(#paint1_linear_surprised)"/>
              <circle cx="8.77578" cy="6.02578" r="0.975" fill="url(#paint2_linear_surprised)"/>
              <ellipse cx="6.5" cy="9" rx="2.5" ry="1.5" fill="url(#paint3_linear_surprised)"/>
              <defs>
                <linearGradient id="paint0_linear_surprised" x1="1.22852" y1="0.499997" x2="14.1656" y2="2.15326" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint1_linear_surprised" x1="3.43428" y1="5.05078" x2="5.37485" y2="5.29877" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint2_linear_surprised" x1="7.98506" y1="5.05078" x2="9.92563" y2="5.29877" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint3_linear_surprised" x1="4.5" y1="9" x2="8.5" y2="10.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
              </defs>
            </svg>
          )
        } else {
          // 기본 상태 - 검은색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="#1E2656"/>
              <circle cx="4.225" cy="6.02578" r="0.975" fill="#1E2656"/>
              <circle cx="8.77578" cy="6.02578" r="0.975" fill="#1E2656"/>
              <ellipse cx="6.5" cy="9" rx="2.5" ry="1.5" fill="#1E2656"/>
            </svg>
          )
        }
      }
      
      // '슬픔' 감정
      if (segment.emotionStyle === 'sad') {
        if (isSelected) {
          // 선택 상태 - 그라디언트 초록색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="url(#paint0_linear_sad)"/>
              <circle cx="4.225" cy="6.02187" r="0.975" fill="url(#paint1_linear_sad)"/>
              <circle cx="8.77578" cy="6.02187" r="0.975" fill="url(#paint2_linear_sad)"/>
              <path d="M9.35938 10.1328C8.28199 8.35522 5.7139 7.59253 3.9997 10.1328" stroke="url(#paint3_linear_sad)"/>
              <defs>
                <linearGradient id="paint0_linear_sad" x1="1.22852" y1="0.499997" x2="14.1656" y2="2.15326" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint1_linear_sad" x1="3.43428" y1="5.04687" x2="5.37485" y2="5.29486" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint2_linear_sad" x1="7.98506" y1="5.04687" x2="9.92563" y2="5.29486" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint3_linear_sad" x1="3.9997" y1="10.1328" x2="9.35938" y2="8.35522" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
              </defs>
            </svg>
          )
        } else {
          // 기본 상태 - 검은색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="#1E2656"/>
              <circle cx="4.225" cy="6.02187" r="0.975" fill="#1E2656"/>
              <circle cx="8.77578" cy="6.02187" r="0.975" fill="#1E2656"/>
              <path d="M9.35938 10.1328C8.28199 8.35522 5.7139 7.59253 3.9997 10.1328" stroke="#1E2656"/>
            </svg>
          )
        }
      }
      
      // '화남' 감정
      if (segment.emotionStyle === 'angry') {
        if (isSelected) {
          // 선택 상태 - 그라디언트 초록색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="url(#paint0_linear_angry)"/>
              <path d="M7.5 6.5L10 4.5" stroke="url(#paint1_linear_angry)"/>
              <path d="M5.5 6.5L3 4.5" stroke="url(#paint2_linear_angry)"/>
              <ellipse cx="6.57031" cy="8.89062" rx="2.5" ry="1.5" fill="url(#paint3_linear_angry)"/>
              <defs>
                <linearGradient id="paint0_linear_angry" x1="1.22852" y1="0.499997" x2="14.1656" y2="2.15326" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint1_linear_angry" x1="7.5" y1="6.5" x2="10" y2="4.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint2_linear_angry" x1="5.5" y1="6.5" x2="3" y2="4.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
                <linearGradient id="paint3_linear_angry" x1="4.57031" y1="8.89062" x2="8.57031" y2="10.39062" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B3FEB3"/>
                  <stop offset="1" stopColor="#4FF062"/>
                </linearGradient>
              </defs>
            </svg>
          )
        } else {
          // 기본 상태 - 검은색
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ width: '13px', height: '13px' }}>
              <path d="M6.5 0.5C10.0899 0.5 13 3.41015 13 7C13 10.5899 10.0899 13.5 6.5 13.5C2.91015 13.5 0 10.5899 0 7C0 3.41015 2.91015 0.5 6.5 0.5ZM6.50098 1.7998C3.6291 1.7998 1.30078 4.12812 1.30078 7C1.30091 9.87177 3.62918 12.2002 6.50098 12.2002C9.37278 12.2002 11.701 9.87177 11.7012 7C11.7012 4.12812 9.37286 1.7998 6.50098 1.7998Z" fill="#1E2656"/>
              <path d="M7.5 6.5L10 4.5" stroke="#1E2656"/>
              <path d="M5.5 6.5L3 4.5" stroke="#1E2656"/>
              <ellipse cx="6.57031" cy="8.89062" rx="2.5" ry="1.5" fill="#1E2656"/>
            </svg>
          )
        }
      }
    }
    
    // 다른 감정이거나 일반 자막일 때는 기존 아이콘 사용
    const tIconStyle: React.CSSProperties = {
      textAlign: 'center',
      fontFamily: '"Rozha One"',
      fontSize: '20px',
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: '150%',
      letterSpacing: '-0.38px'
    }

    // 선택 상태에 따라 색상 스타일 결정
    if (isSelected) {
      // 선택된 상태 - 초록색 그라데이션
      tIconStyle.background = 'linear-gradient(97deg, #B3FEB3 8.38%, #4FF062 98.06%)'
      tIconStyle.backgroundClip = 'text'
      tIconStyle.webkitBackgroundClip = 'text'
      tIconStyle.webkitTextFillColor = 'transparent'
    } else {
      // 기본 상태 - 흰색
      tIconStyle.color = '#FFF'
    }

    return (
      <span 
        className="flex-shrink-0" 
        style={tIconStyle}
      >
        {emotion?.icon || 'T'}
      </span>
    )
  }

  return (
    <div
      className="rounded cursor-move"
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        left: `${startPercent}%`,
        width: isEditing ? 'auto' : `${width}%`,
        height: '30px',
        minWidth: '60px',
        maxWidth: isEditing ? 'none' : undefined,
        whiteSpace: isEditing ? 'nowrap' : 'normal'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
      title={segment.text} // 툴팁으로 전체 텍스트 표시
    >
      <div 
        className="h-full text-xs font-medium relative"
        style={{
          borderRadius: '6px',
          border: subtitleStyle.border,
          background: subtitleStyle.background,
          display: 'inline-flex',
          height: '30px', // 디자인 명세에 맞춰 30px로 변경
          padding: '1px 10px',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          flexShrink: 0
        }}
      >
        {/* 리사이즈 핸들 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(e, segment.id, 'start')}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(e, segment.id, 'end')}
        />
        
        {renderEmotionIcon()}
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditComplete}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-xs font-medium min-w-0"
            style={{
              background: 'rgba(255, 255, 255, 0.11)',
              padding: '9px',
              color: 'inherit',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              width: 'auto',
              minWidth: '100px'
            }}
          />
        ) : (
          <span 
            className="truncate flex-1" 
            title={segment.text}
            style={textStyle}
          >
            {displayText}
          </span>
        )}
      </div>
    </div>
  )
}

export default SubtitleBlock 