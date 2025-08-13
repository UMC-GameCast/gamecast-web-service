import React from 'react';
import EditorSection from '../components/EditorSection';

interface SubtitleTimelinePanelProps {
  videoUrl: string;
  subtitleSegments: any[];
  speakers: any[];
  emotions: any[];
  selectedSegment: string | null;
  duration: number;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (...args: any[]) => void;
  handleResizeStart: (...args: any[]) => void;
  setSelectedSegment: (id: string | null) => void;
  handleTextChange: (...args: any[]) => void;
}

const SubtitleTimelinePanel: React.FC<SubtitleTimelinePanelProps> = ({
  videoUrl,
  subtitleSegments,
  speakers,
  emotions,
  selectedSegment,
  duration,
  timelineRef,
  handleDragStart,
  handleResizeStart,
  setSelectedSegment,
  handleTextChange,
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
        timelineRef={timelineRef}
        onDragStart={handleDragStart}
        onResizeStart={handleResizeStart}
        onSegmentClick={setSelectedSegment}
        onTextChange={handleTextChange}
      />
    </div>
  );
};

export default SubtitleTimelinePanel;
