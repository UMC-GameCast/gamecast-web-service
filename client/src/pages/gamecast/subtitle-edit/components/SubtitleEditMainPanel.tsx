import React from 'react';
import VideoSection from '../components/VideoSection';
import SubtitleStylePanel from '../components/SubtitleStylePanel';

import SmallVideoList from './SmallVideoList';

interface SubtitleEditMainPanelProps {
  videos: any[];
  videoUrl: string | null;
  subtitleSegments: any[];
  speakers: any[];
  emotions: any[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  showVideoUploader: boolean;
  showAudioUploader: boolean;
  activeVideoIndex: number | null;
  handleVideoDelete: (index: number) => void;
  handleVideoUploadStart: (index: number) => void;
  handleMainVideoUploaded: (url: string, file: File) => void;
  handleSubtitlesGenerated: (...args: any[]) => void;
  selectedStyle: any;
  selectedEmphasis: any;
  selectedEmotion: any;
  selectedSegment: string | null;
  updateSubtitleSegment: (...args: any[]) => void;
  deleteSubtitleSegment: (...args: any[]) => void;
  handleStyleChange: (...args: any[]) => void;
  handleEmphasisChange: (...args: any[]) => void;
  handleEmotionChange: (...args: any[]) => void;
  setSelectedSegment: (id: string | null) => void;
  setPendingSmallVideoIndex: (index: number | null) => void;
  onDurationChange: (duration: number) => void;
  onTimeUpdate: (time: number) => void;
}

const SubtitleEditMainPanel: React.FC<SubtitleEditMainPanelProps> = ({
  videos,
  videoUrl,
  subtitleSegments,
  speakers,
  emotions,
  currentTime,
  duration,
  isPlaying,
  showVideoUploader,
  showAudioUploader,
  handleVideoDelete,
  handleVideoUploadStart,
  handleMainVideoUploaded,
  handleSubtitlesGenerated,
  selectedStyle,
  selectedEmphasis,
  selectedEmotion,
  selectedSegment,
  updateSubtitleSegment,
  deleteSubtitleSegment,
  handleStyleChange,
  handleEmphasisChange,
  handleEmotionChange,
  setSelectedSegment,
  setPendingSmallVideoIndex,
  onDurationChange,
  onTimeUpdate,
}) => {

  return (
    <div className="p-4">
      <div className="mb-20 flex h-full" style={{ columnGap: '0px' }}>
        {/* 왼쪽 - 4개의 작은 동영상들 */}
        <div
          style={{
            display: 'flex',
            height: '408.475px',
            padding: '6px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '9.262px',
            borderRadius: '18.525px 18.525px 0 0',
            border: '1.852px solid #94A8DD',
            width: '216.26px',
            marginRight: '19.1px',
            overflow: 'hidden',
          }}
        >
          <SmallVideoList
            videos={videos}
            handleVideoDelete={handleVideoDelete}
            handleVideoUploadStart={handleVideoUploadStart}
            setPendingSmallVideoIndex={setPendingSmallVideoIndex}
          />
        </div>
        {/* 중앙 - 메인 동영상 + 타임바/재생버튼 */}
        <div style={{ width: '569.64px', height: '100%', marginRight: '20px' }} className="flex flex-col items-center">
          <div className="w-full flex flex-col items-center">
            <VideoSection
              videoUrl={videoUrl}
              subtitleSegments={subtitleSegments}
              speakers={speakers}
              emotions={emotions}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              showVideoUploader={showVideoUploader}
              showAudioUploader={showAudioUploader}
              onTimeUpdate={onTimeUpdate}
              onDurationChange={onDurationChange}
              onPlayPause={() => {}}
              onVideoUploaded={handleMainVideoUploaded}
              onSubtitlesGenerated={handleSubtitlesGenerated}
              selectedStyle={selectedStyle}
            />
            {/* 타임바, 시간, 재생버튼 */}
          </div>
        </div>
        {/* 오른쪽 - 자막 스타일 패널 */}
        <div style={{ width: '490px', height: '100%' }}>
          <SubtitleStylePanel
            selectedStyle={selectedStyle}
            selectedEmphasis={selectedEmphasis}
            selectedEmotion={selectedEmotion}
            selectedSegment={selectedSegment ? subtitleSegments.find(s => s.id === selectedSegment) || null : null}
            speakers={speakers}
            emotions={emotions}
            onStyleChange={handleStyleChange}
            onEmphasisChange={handleEmphasisChange}
            onEmotionChange={handleEmotionChange}
            onUpdateSegment={updateSubtitleSegment}
            onDeleteSegment={deleteSubtitleSegment}
            onCloseEdit={() => setSelectedSegment(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default SubtitleEditMainPanel;
