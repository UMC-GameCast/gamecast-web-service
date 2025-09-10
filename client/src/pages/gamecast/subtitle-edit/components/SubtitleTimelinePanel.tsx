import React from 'react';
import EditorSection from '../components/EditorSection';

interface SubtitleTimelinePanelProps {
  videoUrl: string | null;
  subtitleSegments: any[];
  speakers: any[];
  emotions: any[];
  selectedSegment: string | null;
  duration: number;
  currentTime: number;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (...args: any[]) => void;
  handleResizeStart: (...args: any[]) => void;
  setSelectedSegment: (id: string | null) => void;
  handleTextChange: (...args: any[]) => void;
  onTimeSeek: (time: number) => void;
}

const SubtitleTimelinePanel: React.FC<SubtitleTimelinePanelProps> = ({
  videoUrl,
  subtitleSegments,
  speakers,
  emotions,
  selectedSegment,
  duration,
  currentTime,
  timelineRef,
  handleDragStart,
  handleResizeStart,
  setSelectedSegment,
  handleTextChange,
  onTimeSeek,
}) => {
  return (
    <div className="w-full">
      <EditorSection
        videoUrl={videoUrl}
        subtitleSegments={subtitleSegments}
        speakers={speakers}
        emotions={emotions}
        selectedSegment={selectedSegment}
        duration={duration}
        currentTime={currentTime}
        timelineRef={timelineRef}
        onDragStart={handleDragStart}
        onResizeStart={handleResizeStart}
        onSegmentClick={setSelectedSegment}
        onTextChange={handleTextChange}
        onTimeSeek={onTimeSeek}
      />
    </div>
  );
};

export default SubtitleTimelinePanel;
