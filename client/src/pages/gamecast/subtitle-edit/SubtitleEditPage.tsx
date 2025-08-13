import React, { useRef, useState } from 'react'
import { useSubtitleEditor } from './hooks/useSubtitleEditor'
import SubtitleHeader from './components/SubtitleHeader'
import RenderModal from './components/RenderModal'
import VideoUploader from './components/VideoUploader'
import MultiSpeakerAudioUploader from './components/MultiSpeakerAudioUploader'
import { Navigation } from '../../../components/gamecast/common/Navigation';
import SubtitleEditMainPanel from './components/SubtitleEditMainPanel';
import SubtitleTimelinePanel from './components/SubtitleTimelinePanel';

const SubtitleEditPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [pendingSmallVideoIndex, setPendingSmallVideoIndex] = useState<number | null>(null)
  const {
    // 상태
    subtitleSegments,
    currentTime,
    duration,
    isPlaying,
    selectedSegment,
    showHelp,
    showAudioUploader,
    showMultiSpeakerUploader,
    showVideoUploader,
    videoUrl,
    videos,
    activeVideoIndex,
    isRendering,
    renderProgress,
    speakers,
    emotions,
    selectedStyle,
    selectedEmphasis,
    selectedEmotion,
    
    // 액션
    setSelectedSegment,
    setShowHelp,
    setShowAudioUploader,
    setShowMultiSpeakerUploader,
    setShowVideoUploader,
    setIsRendering,
    setRenderProgress,
    setDuration,
    
    // 이벤트 핸들러
    handleVideoUploaded,
    handleVideoUploadStart,
    handleVideoDelete,
    handleStyleChange,
    handleEmphasisChange,
    handleEmotionChange,
    handleSubtitlesGenerated,
    handleDragStart,
    handleResizeStart,
    addSubtitleSegment,
    deleteSubtitleSegment,
    updateSubtitleSegment,
    handleTextChange,
    togglePlayback,
    exportSubtitles,
    importSubtitles,
    handleFFmpegRender,
    handleClientSideRender
  } = useSubtitleEditor(timelineRef)

  // 디버깅용 로그
  console.log('videoUrl:', videoUrl);
  console.log('videos:', videos);

  // VideoSection에 맞는 업로드 핸들러 래퍼
  const handleMainVideoUploaded = (url: string, file: File) => {
    handleVideoUploaded(url, file, 0)
  }

  // 파일 선택 핸들러 (메인)
  const handleMainVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    handleVideoUploaded(url, file, 0)
    e.target.value = ''
  }
  // 파일 선택 핸들러 (작은 동영상)
  const handleSmallVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || pendingSmallVideoIndex === null) return
    const url = URL.createObjectURL(file)
    handleVideoUploaded(url, file, pendingSmallVideoIndex)
    setPendingSmallVideoIndex(null)
    e.target.value = ''
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen text-white" style={{ backgroundColor: '#87CEEB' }}>
        {/* 숨겨진 메인 동영상 업로드용 file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleMainVideoFileChange}
        />
        {/* 숨겨진 작은 동영상 업로드용 file input (공용) */}
        <input
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleSmallVideoFileChange}
          id="small-video-file-input"
        />
        {/* VideoUploader를 모든 동영상 업로드에 대해 조건부 렌더링 */}
        {showVideoUploader && activeVideoIndex !== null && (
          <VideoUploader
            onVideoUploaded={handleVideoUploaded}
            videoIndex={activeVideoIndex}
          />
        )}
        <div className="main mx-auto" style={{ width: 1315 }}>
          {/* 상단 div: 4개 동영상, 메인 동영상, 자막 스타일 */}
          <div className="w-full" style={{ height: 409, marginBottom: 35 }}>
            <SubtitleEditMainPanel
              videos={videos}
              videoUrl={videoUrl}
              subtitleSegments={subtitleSegments}
              speakers={speakers}
              emotions={emotions}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              showVideoUploader={showVideoUploader}
              showAudioUploader={showAudioUploader}
              activeVideoIndex={activeVideoIndex}
              handleVideoDelete={handleVideoDelete}
              handleVideoUploadStart={handleVideoUploadStart}
              handleMainVideoUploaded={handleMainVideoUploaded}
              handleSubtitlesGenerated={handleSubtitlesGenerated}
              selectedStyle={selectedStyle}
              selectedEmphasis={selectedEmphasis}
              selectedEmotion={selectedEmotion}
              selectedSegment={selectedSegment}
              updateSubtitleSegment={updateSubtitleSegment}
              deleteSubtitleSegment={deleteSubtitleSegment}
              handleStyleChange={handleStyleChange}
              handleEmphasisChange={handleEmphasisChange}
              handleEmotionChange={handleEmotionChange}
              setSelectedSegment={setSelectedSegment as (id: string | null) => void}
              setPendingSmallVideoIndex={setPendingSmallVideoIndex as (index: number | null) => void}
              onDurationChange={setDuration}
            />
          </div>
          {/* 구분선 */}
          {/* <div className="my-8 border-t border-gray-600 w-full" /> */}
          {/* 하단 div: 유저 리스트 + 자막 시간/편집 (타임라인) */}
          <div
            style={{
              borderRadius: '14.633px',
              border: '0.457px solid #FFF',
              background: 'rgba(65, 78, 145, 0.25)',
              display: 'flex',
              width: '1315px',
              padding: '15px 35px',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {/* 유저 리스트 */}
            <div className="flex flex-col" style={{ width: 80 }}>
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="h-[50px] flex items-center justify-center text-sm font-semibold text-gray-300">
                  {`유저${idx + 1}`}
                </div>
              ))}
            </div>
            {/* 타임라인 */}
            <div className="flex-1">
              <SubtitleTimelinePanel
                videoUrl={videoUrl}
                subtitleSegments={subtitleSegments}
                speakers={speakers}
                emotions={emotions}
                selectedSegment={selectedSegment}
                duration={duration}
                timelineRef={timelineRef as React.RefObject<HTMLDivElement | null>}
                handleDragStart={handleDragStart}
                handleResizeStart={handleResizeStart}
                setSelectedSegment={setSelectedSegment as (id: string | null) => void}
                handleTextChange={handleTextChange}
              />
            </div>
          </div>
          {/* 렌더링 모달 */}
          <RenderModal
            isRendering={isRendering}
            renderProgress={renderProgress}
            onCancel={() => {
              setIsRendering(false)
              setRenderProgress(0)
            }}
          />
          {/* 다중 화자 오디오 업로더 */}
          {showMultiSpeakerUploader && (
            <div className="max-w-[1600px] mx-auto p-4">
              <MultiSpeakerAudioUploader
                speakers={speakers}
                onSubtitlesGenerated={handleSubtitlesGenerated}
              />
            </div>
          )}
        </div>
        <footer className="footer">
          {/* SubtitleHeader를 맨 아래로 이동 */}
          <SubtitleHeader
            showHelp={showHelp}
            showVideoUploader={showVideoUploader}
            showAudioUploader={showAudioUploader}
            showMultiSpeakerUploader={showMultiSpeakerUploader}
            isRendering={isRendering}
            videoUrl={videoUrl}
            onToggleHelp={() => setShowHelp(!showHelp)}
            onToggleVideoUploader={() => setShowVideoUploader(!showVideoUploader)}
            onToggleAudioUploader={() => setShowAudioUploader(!showAudioUploader)}
            onToggleMultiSpeakerUploader={() => setShowMultiSpeakerUploader(!showMultiSpeakerUploader)}
            onImportSubtitles={importSubtitles}
            onExportSubtitles={exportSubtitles}
            onAddSubtitleSegment={addSubtitleSegment}
            onTogglePlayback={togglePlayback}
            onFFmpegRender={handleFFmpegRender}
            onCanvasRender={handleClientSideRender}
            onMainVideoUpload={() => fileInputRef.current?.click()}
            onMainVideoDelete={() => handleVideoDelete(0)}
          />
        </footer>
      </div>
    </>
  )
}

export default SubtitleEditPage 