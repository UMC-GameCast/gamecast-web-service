import React from 'react'
import TimelineEditor from './TimelineEditor'
import type { SubtitleSegment, Speaker, Emotion } from '../types'

interface EditorSectionProps {
  videoUrl: string | null
  subtitleSegments: SubtitleSegment[]
  speakers: Speaker[]
  emotions: Emotion[]
  selectedSegment: string | null
  duration: number
  timelineRef: React.RefObject<HTMLDivElement | null>
  onDragStart: (e: React.MouseEvent, segmentId: string) => void
  onResizeStart: (e: React.MouseEvent, segmentId: string, resizeType: 'start' | 'end') => void
  onSegmentClick: (segmentId: string) => void
  onTextChange: (segmentId: string, newText: string) => void
}

const EditorSection: React.FC<EditorSectionProps> = ({
  videoUrl,
  subtitleSegments,
  speakers,
  emotions,
  selectedSegment,
  duration,
  timelineRef,
  onDragStart,
  onResizeStart,
  onSegmentClick,
  onTextChange
}) => {

  return (
    <>
      {/* 메인 편집 영역 */}
      <div className="grid grid-cols-12 gap-4">
        {/* 타임라인 편집 영역만 전체 사용 */}
        <TimelineEditor
          speakers={speakers}
          subtitleSegments={subtitleSegments}
          duration={duration}
          selectedSegment={selectedSegment}
          emotions={emotions}
          videoUrl={videoUrl}
          onDragStart={onDragStart}
          onResizeStart={onResizeStart}
          onSegmentClick={onSegmentClick}
          onTextChange={onTextChange}
          timelineRef={timelineRef}
        />
      </div>

      {/* 미리보기 패널 */}
      {/* <SubtitlePreview
        subtitleSegments={subtitleSegments}
        speakers={speakers}
        emotions={emotions}
        videoUrl={videoUrl}
      /> */}
    </>
  )
}

export default EditorSection 