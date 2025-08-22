import React, { useRef, useState, useEffect } from 'react'
import { useSubtitleEditor } from './hooks/useSubtitleEditor'
import SubtitleHeader from './components/SubtitleHeader'
import RenderModal from './components/RenderModal'
import VideoUploader from './components/VideoUploader'
import MultiSpeakerAudioUploader from './components/MultiSpeakerAudioUploader'
import { Navigation } from '../../../components/gamecast/common/Navigation';
import { useUnifiedGamecast } from '../../../contexts/UnifiedGamecastContext';
import { renderCharacterLayers } from '../../../utils/characterRenderer';

import { PageTransition } from '../../../components/gamecast/common/PageTransition';
import SubtitleEditMainPanel from './components/SubtitleEditMainPanel';
import SubtitleTimelinePanel from './components/SubtitleTimelinePanel';

const SubtitleEditPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [pendingSmallVideoIndex, setPendingSmallVideoIndex] = useState<number | null>(null)
  const { state, actions } = useUnifiedGamecast()
  const { participants } = state
  const {
    // 상태
    subtitleSegments,
    currentTime,
    duration,
    isPlaying,
    selectedSegment,
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
    setShowMultiSpeakerUploader,
    setShowVideoUploader,
    setIsRendering,
    setRenderProgress,
    setDuration,
    setCurrentTime,
    
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
    handleFFmpegRender,
    handleClientSideRender
  } = useSubtitleEditor(timelineRef)

  // 페이지 로드 시 자동으로 데모 모드 활성화 및 SourceSelectionPage에서 다운로드된 영상 로드
  useEffect(() => {
    console.log('🎭 [SubtitleEdit] 데모 모드 자동 활성화');
    actions.enableDemoMode();
    
    // SourceSelectionPage에서 선택된 소스와 다운로드된 파일들 확인
    console.log('📂 [SubtitleEdit] 선택된 소스들:', state.editing.selectedSources);
    console.log('🔽 [SubtitleEdit] 다운로드된 파일들:', Object.keys(state.editing.downloadedFiles));
    
    // 선택된 소스들을 동영상 슬롯에 자동 배치
    if (state.editing.selectedSources.length > 0 && Object.keys(state.editing.downloadedFiles).length > 0) {
      console.log('🎬 [SubtitleEdit] 다운로드된 영상들을 동영상 슬롯에 배치 시작...');
      
      state.editing.selectedSources.forEach((source, index) => {
        const downloadedBlob = state.editing.downloadedFiles[source.videoUrl];
        if (downloadedBlob) {
          const videoUrl = URL.createObjectURL(downloadedBlob);
          const fileName = `${source.participantName}_highlight${source.highlightIndex + 1}.mp4`;
          
          if (index === 0) {
            // 첫 번째 선택된 영상은 메인 동영상(인덱스 0)에 배치
            console.log(`🎥 [SubtitleEdit] 메인 동영상 배치: ${source.participantName} (${source.highlightIndex + 1}번째 하이라이트)`);
            handleVideoUploaded(videoUrl, new File([downloadedBlob], fileName, { type: 'video/mp4' }), 0);
          } else if (index < 15) {
            // 나머지 영상들은 작은 동영상 슬롯(인덱스 1~15)에 배치
            console.log(`📹 [SubtitleEdit] 작은 동영상 ${index} 배치: ${source.participantName} (${source.highlightIndex + 1}번째 하이라이트)`);
            handleVideoUploaded(videoUrl, new File([downloadedBlob], fileName, { type: 'video/mp4' }), index);
          }
        }
      });
      
      console.log('✅ [SubtitleEdit] 모든 다운로드된 영상 배치 완료');
    } else {
      console.log('ℹ️ [SubtitleEdit] 다운로드된 영상이 없어서 배치하지 않음');
    }
  }, [actions, state.editing.selectedSources, state.editing.downloadedFiles, handleVideoUploaded]);

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
    <PageTransition className="min-h-screen w-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden">
      
      {/* 배경 장식 이미지 */}
      <img 
        src="/assets/gamecast/participate/desingBG.png"
        alt="배경 장식"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-60"
      />
      
      {/* 메인페이지 스타일의 그라디언트 원형 배경 효과들 */}
      <div 
        className="absolute w-[1919px] h-[1919px] flex-shrink-0 rounded-full top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 -z-10"
        style={{
          background: 'radial-gradient(50% 50% at 50% 50%, rgba(68, 60, 179, 0.30) 0%, rgba(0, 0, 0, 0.00) 100%)'
        }}
      />
      <div 
        className="absolute w-[1500px] h-[1500px] flex-shrink-0 rounded-full top-3/4 right-1/4 -translate-x-1/2 -translate-y-1/2 -z-10"
        style={{
          background: 'radial-gradient(50% 50% at 50% 50%, rgba(176, 119, 255, 0.25) 0%, rgba(0, 0, 0, 0.00) 100%)'
        }}
      />
      
      <Navigation />
      <div className="min-h-screen text-white relative z-10">
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
              onTimeUpdate={setCurrentTime}
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
              {/* 타임라인 헤더 높이만큼 여백 추가 (헤더: 32.578px + spacer: 12px) */}
              <div style={{ height: '44.578px' }} />
{participants?.slice(0, 3).map((participant, idx) => {
                // 캐릭터 hair 색상을 border 색상으로 사용
                const hairColor = participant?.characterInfo?.selectedColors?.hair;
                let borderColor = `hsl(${idx * 72}, 60%, 60%)`; // 기본 색상
                
                // hair 색상이 있으면 해당 색상 사용
                if (hairColor) {
                  if (hairColor === 'black') borderColor = '#2C2C2C';
                  else if (hairColor === 'yellow') borderColor = '#F7D058';
                  else if (hairColor === 'red') borderColor = '#E74C3C';
                  else if (hairColor === 'blue') borderColor = '#3498DB';
                  else if (hairColor === 'green') borderColor = '#27AE60';
                  else if (hairColor === 'white') borderColor = '#ECF0F1';
                  else if (hairColor.startsWith('#')) borderColor = hairColor;
                  else if (!isNaN(Number(hairColor))) borderColor = `#${hairColor}`;
                }
                
                return (
                  <div key={participant?.guestUserId || idx} className="h-[50px] flex items-center justify-center">
                    {/* 이미지div랑 이름div를 감싸는 div */}
                    <div style={{ width: '31px', height: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      {/* 아바타 이미지 (동그라미) */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: `2px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#000',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {participant?.characterInfo?.isCustomized && 
                         participant.characterInfo?.characterData?.selectedOptions && 
                         participant.characterInfo?.characterData?.selectedColors ? (
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            transform: 'scale(1.2)',
                            transformOrigin: 'center top',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {renderCharacterLayers({
                              selectedOptions: participant.characterInfo.characterData.selectedOptions,
                              selectedColors: participant.characterInfo.characterData.selectedColors,
                              nickname: participant.characterInfo.characterData.nickname
                            })}
                          </div>
                        ) : (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#333',
                            zIndex: 1
                          }}>
                            {participant?.nickname?.charAt(0) || (idx + 1)}
                          </span>
                        )}
                      </div>
                      {/* 유저 이름 */}
                      <div style={{
                        color: '#FFF',
                        textAlign: 'center',
                        fontFamily: '"Rozha One"',
                        fontSize: '10px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '150%', /* 15px */
                        letterSpacing: '-0.19px',
                        alignSelf: 'stretch'
                      }}>
                        {participant?.nickname || `유저${idx + 1}`}
                      </div>
                    </div>
                  </div>
                );
              }) || []}
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
              currentTime={currentTime}
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
        <footer className="footer relative z-10">
          {/* SubtitleHeader를 맨 아래로 이동 */}
          <SubtitleHeader
            showVideoUploader={showVideoUploader}
            showMultiSpeakerUploader={showMultiSpeakerUploader}
            isRendering={isRendering}
            videoUrl={videoUrl}
            onToggleVideoUploader={() => setShowVideoUploader(!showVideoUploader)}
            onToggleMultiSpeakerUploader={() => setShowMultiSpeakerUploader(!showMultiSpeakerUploader)}
            onAddSubtitleSegment={addSubtitleSegment}
            onFFmpegRender={handleFFmpegRender}
            onCanvasRender={handleClientSideRender}
            onMainVideoUpload={() => fileInputRef.current?.click()}
            onMainVideoDelete={() => handleVideoDelete(0)}
          />
        </footer>
      </div>
    </PageTransition>
  )
}

export default SubtitleEditPage 