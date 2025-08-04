import React from 'react'
import { useSubtitleEditor } from './hooks/useSubtitleEditor'
import SubtitleHeader from './components/SubtitleHeader'
import VideoSection from './components/VideoSection'
import EditorSection from './components/EditorSection'
import SubtitleStylePanel from './components/SubtitleStylePanel'
import RenderModal from './components/RenderModal'

const SubtitleEditPage: React.FC = () => {
  const {
    // 상태
    subtitleSegments,
    currentTime,
    duration,
    isPlaying,
    selectedSegment,
    zoom,
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
    timelineRef,
    selectedStyle,
    selectedEmphasis,
    selectedEmotion,
    
    // 액션
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setSelectedSegment,
    setZoom,
    setShowHelp,
    setShowAudioUploader,
    setShowMultiSpeakerUploader,
    setShowVideoUploader,
    setIsRendering,
    setRenderProgress,
    
    // 이벤트 핸들러
    handleVideoUploaded,
    handleVideoUploadStart,
    handleVideoDelete,
    handleStyleChange,
    handleEmphasisChange,
    handleEmotionChange,
    handleSubtitlesGenerated,
    handleTimelineClick,
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
  } = useSubtitleEditor()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
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
      />

      <div className="max-w-[1600px] mx-auto p-4">
        {/* 비디오 섹션 - 왼쪽 작은 동영상들, 중앙 메인 동영상, 오른쪽 스타일 패널 */}
        <div className="mb-20 flex gap-4">
          {/* 왼쪽 - 4개의 작은 동영상들 */}
          <div className="flex flex-col gap-3 w-64">
            {videos.slice(1).map((video, arrayIndex) => {
              const videoIndex = arrayIndex + 1; // 실제 인덱스 (1,2,3,4)
              return (
                <div key={videoIndex} className="bg-gray-800 rounded-lg p-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-300">{video.name}</div>
                    {video.url && (
                      <button 
                        className="text-red-400 hover:text-red-300 text-xs p-1"
                        onClick={() => handleVideoDelete(videoIndex)}
                        title="동영상 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="aspect-video bg-gray-700 rounded relative overflow-hidden">
                    {video.url ? (
                      <div className="relative group">
                        <video 
                          className="w-full h-full object-cover rounded"
                          src={video.url}
                          controls
                          preload="metadata"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="bg-black bg-opacity-50 text-white p-1 rounded text-xs hover:bg-opacity-75"
                            onClick={() => handleVideoUploadStart(videoIndex)}
                            title="동영상 교체"
                          >
                            교체
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                        <div className="text-center">
                          <div className="mb-2">📹</div>
                          <div className="mb-2">동영상을 업로드하세요</div>
                          <button 
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                            onClick={() => handleVideoUploadStart(videoIndex)}
                          >
                            업로드
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 중앙 - 메인 동영상 */}
          <div className="flex-1">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-200">{videos[0].name}</h2>
                <div className="flex gap-2">
                  {videoUrl ? (
                    <>
                      <button 
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        onClick={() => handleVideoUploadStart(0)}
                      >
                        동영상 교체
                      </button>
                      <button 
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        onClick={() => handleVideoDelete(0)}
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <button 
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      onClick={() => handleVideoUploadStart(0)}
                    >
                      메인 동영상 업로드
                    </button>
                  )}
                </div>
              </div>
            </div>
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
              showMultiSpeakerUploader={showMultiSpeakerUploader}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onPlayPause={togglePlayback}
              onVideoUploaded={handleVideoUploaded}
              onSubtitlesGenerated={handleSubtitlesGenerated}
            />
          </div>

          {/* 오른쪽 - 자막 스타일 패널 */}
          <div className="w-80">
            <SubtitleStylePanel
              selectedStyle={selectedStyle}
              selectedEmphasis={selectedEmphasis}
              selectedEmotion={selectedEmotion}
              selectedSegment={subtitleSegments.find(s => s.id === selectedSegment) || null}
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

        {/* 편집 섹션 */}
        <EditorSection
          videoUrl={videoUrl}
          subtitleSegments={subtitleSegments}
          speakers={speakers}
          emotions={emotions}
          currentTime={currentTime}
          duration={duration}
          zoom={zoom}
          selectedSegment={selectedSegment}
          timelineRef={timelineRef}
          onTimeUpdate={setCurrentTime}
          onZoomChange={setZoom}
          onTimelineClick={handleTimelineClick}
          onDragStart={handleDragStart}
          onResizeStart={handleResizeStart}
          onSegmentClick={setSelectedSegment}
          onTextChange={handleTextChange}
        />

        {/* 렌더링 모달 */}
        <RenderModal
          isRendering={isRendering}
          renderProgress={renderProgress}
          onCancel={() => {
            setIsRendering(false)
            setRenderProgress(0)
          }}
        />
      </div>
    </div>
  )
}

export default SubtitleEditPage 