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
    <div
      style={{
        borderRadius: '18.525px',
        border: '3px solid #94A8DD',
        display: 'flex',
        width: '490px',
        height: '409px',
        minWidth: '351.974px',
        minHeight: '306.73px',
        padding: '25px 20px',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '18.525px',
      }}
    >
      {/* 전체 자막 스타일 */}
      <div
        style={{
          display: 'flex',
          minWidth: '291.768px',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '15px',
          alignSelf: 'stretch',
        }}
      >
        <div className="text-center mb-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <h3
            style={{
              color: '#FFF',
              textAlign: 'right',
              fontFamily: 'Pretendard',
              fontSize: '15px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '22.5px',
              letterSpacing: '-0.285px',
              display: 'flex',
              width: '124.117px',
              height: '17.599px',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            전체 자막 스타일
          </h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="202.83" height="6" viewBox="0 0 206 6" fill="none" style={{ marginTop: '4px' }}>
            <path d="M0.00520825 2.68359C0.00520825 4.15635 1.19912 5.35026 2.67188 5.35026C4.14463 5.35026 5.33854 4.15635 5.33854 2.68359C5.33854 1.21083 4.14463 0.016927 2.67188 0.016927C1.19912 0.016927 0.00520825 1.21083 0.00520825 2.68359ZM205.502 2.68359V2.18359H2.67188V2.68359V3.18359H205.502V2.68359Z" fill="#949FCA"/>
          </svg>
        </div>
        <div className="flex gap-2 justify-center" style={{ gap: '15px' }}>
          {styles.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                style={{
                  borderRadius: isSelected ? '9.262px' : '9px',
                  border: isSelected ? '1.292px solid #FFF' : '1.292px solid #6483FF',
                  background: isSelected ? '#1D1F3B' : 'transparent',
                  display: 'flex',
                  width: '110px',
                  height: '46px',
                  padding: '9.262px 0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '38.773px',
                  flex: '1 0 0',
                  color: '#6483FF',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '27px',
                  letterSpacing: '-0.342px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {style.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 자막 편집창 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '9.262px',
          flex: '1 0 0',
          alignSelf: 'stretch',
        }}
      >
        {selectedSegment ? (
          <textarea
            value={selectedSegment.text}
            onChange={(e) => onUpdateSegment(selectedSegment.id, { text: e.target.value })}
            className="resize-none text-sm"
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.11)',
              display: 'flex',
              padding: '9px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '9.262px',
              flex: '1 0 0',
              alignSelf: 'stretch',
              color: 'rgba(255, 255, 255, 0.50)',
              fontFamily: 'Inter',
              fontSize: '18px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '27px',
              letterSpacing: '-0.342px',
              border: 'none',
              borderRadius: 0,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="자막 텍스트를 입력하세요..."
          />
        ) : (
          <div className="text-gray-400 text-center py-8">편집할 자막을 선택하세요.</div>
        )}
      </div>

      {/* 선택 자막 스타일 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '15px',
          alignSelf: 'stretch',
          height: '142px',
        }}
      >
        <div className="text-center mb-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <h3
            style={{
              color: '#FFF',
              textAlign: 'right',
              fontFamily: 'Pretendard',
              fontSize: '15px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '22.5px',
              letterSpacing: '-0.285px',
              display: 'flex',
              width: '124.117px',
              height: '17.599px',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            선택 자막 스타일
          </h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="202.83" height="6" viewBox="0 0 206 6" fill="none" style={{ marginTop: '4px' }}>
            <path d="M0.00520825 2.68359C0.00520825 4.15635 1.19912 5.35026 2.67188 5.35026C4.14463 5.35026 5.33854 4.15635 5.33854 2.68359C5.33854 1.21083 4.14463 0.016927 2.67188 0.016927C1.19912 0.016927 0.00520825 1.21083 0.00520825 2.68359ZM205.502 2.68359V2.18359H2.67188V2.68359V3.18359H205.502V2.68359Z" fill="#949FCA"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {/* 일반/감정 강조 자막 (좌우 배치) */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
            {emphasisOptions.map((option) => {
              const isSelected = selectedEmphasis === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onEmphasisChange(option.id)}
                  style={{
                    width: '217.5px',
                    height: '46px',
                    borderRadius: isSelected ? '9.262px' : '9px',
                    border: isSelected ? '1.292px solid #FFF' : '1.292px solid #6483FF',
                    background: isSelected ? '#1D1F3B' : 'transparent',
                    display: 'flex',
                    padding: '9.262px 0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '38.773px',
                    flex: '1 0 0',
                    color: '#6483FF',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
          {/* 감정 선택 (아래) */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
            {emotionOptions.map((emotion) => {
              const isSelected = selectedEmotion === emotion.id;
              return (
                <button
                  key={emotion.id}
                  onClick={() => onEmotionChange(emotion.id)}
                  style={{
                    width: '101.25px',
                    height: '46px',
                    borderRadius: isSelected ? '9.262px' : '9px',
                    border: isSelected ? '1.292px solid #FFF' : '1.292px solid #6483FF',
                    background: isSelected ? '#1D1F3B' : 'transparent',
                    display: 'flex',
                    padding: '9.262px 0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '38.773px',
                    flex: '1 0 0',
                    color: '#6483FF',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  {emotion.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubtitleStylePanel