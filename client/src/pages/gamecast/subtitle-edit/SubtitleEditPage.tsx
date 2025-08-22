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
  }, [actions]);

  // 선택된 소스들을 감시하는 별도 useEffect
  useEffect(() => {
    console.log('📂 [SubtitleEdit] Context 상태 확인:');
    console.log('  - 전체 editing 상태:', state.editing);
    console.log('  - 선택된 소스들:', state.editing.selectedSources);
    console.log('  - 다운로드된 파일들:', Object.keys(state.editing.downloadedFiles));
    console.log('  - 다운로드 진행 상태:', state.editing.isDownloading);
    
    // 선택된 소스들을 동영상 슬롯에 자동 배치
    if (state.editing.selectedSources && state.editing.selectedSources.length > 0) {
      console.log('🎬 [SubtitleEdit] 선택된 소스 발견, 다운로드된 파일 확인 중...');
      
      if (Object.keys(state.editing.downloadedFiles).length > 0) {
        console.log('🎬 [SubtitleEdit] 다운로드된 영상들을 동영상 슬롯에 배치 시작...');
        
        state.editing.selectedSources.forEach((source, index) => {
          console.log(`🔍 [SubtitleEdit] 소스 ${index} 처리 중:`, source);
          const downloadedBlob = state.editing.downloadedFiles[source.videoUrl];
          console.log(`🔍 [SubtitleEdit] 다운로드된 Blob 확인:`, downloadedBlob ? 'EXISTS' : 'NOT FOUND');
          
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
          } else {
            console.warn(`⚠️ [SubtitleEdit] 소스 ${index}의 다운로드된 파일을 찾을 수 없음:`, source.videoUrl);
          }
        });
        
        console.log('✅ [SubtitleEdit] 모든 다운로드된 영상 배치 완료');
      } else {
        console.log('⏳ [SubtitleEdit] 다운로드된 파일이 아직 없음, 대기 중...');
      }
    } else {
      console.log('ℹ️ [SubtitleEdit] 선택된 소스가 없음');
    }
  }, [state.editing.selectedSources, state.editing.downloadedFiles, handleVideoUploaded]);

  // 비디오 URL에서 오디오 추출하여 자막 생성하는 함수
  const generateSubtitlesFromVideoURL = async (videoUrl: string) => {
    try {
      console.log('🎵 [SubtitleEdit] 비디오에서 오디오 추출 시작:', videoUrl);
      
      // 비디오에서 오디오 추출
      const audioBlob = await extractAudioFromVideo(videoUrl);
      console.log('🎵 [SubtitleEdit] 오디오 추출 완료, 크기:', audioBlob.size);
      
      // 추출된 오디오로 자막 생성
      await generateSubtitlesFromAudioBlob(audioBlob, 'main-video');
      
    } catch (error) {
      console.error('🎵 [SubtitleEdit] 비디오 오디오 추출 및 자막 생성 실패:', error);
      alert(`오디오 추출 및 자막 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      throw error;
    }
  };

  // 비디오에서 오디오만 추출하는 함수
  const extractAudioFromVideo = async (videoUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 오디오 컨텍스트 생성
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        
        // 오디오만 연결
        source.connect(destination);
        
        // MediaRecorder로 오디오 녹음
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        const audioChunks: BlobPart[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          resolve(audioBlob);
        };
        
        // 비디오 재생 및 녹음 시작
        video.play();
        mediaRecorder.start();
        
        // 비디오 끝나면 녹음 중지
        video.onended = () => {
          mediaRecorder.stop();
        };
        
        // 최대 30초만 녹음 (파일 크기 제한)
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            video.pause();
          }
        }, 30000);
      };
      
      video.onerror = () => {
        reject(new Error('비디오 로드 실패'));
      };
    });
  };

  // 오디오 Blob에서 Whisper AI로 자막 생성하는 함수
  const generateSubtitlesFromAudioBlob = async (audioBlob: Blob, speakerId: string) => {
    try {
      console.log('🤖 [SubtitleEdit] Whisper AI 오디오 자막 생성 시작');
      console.log('🤖 [SubtitleEdit] 오디오 파일 크기:', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'extracted_audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'word');

      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
      }
      
      console.log('🤖 [SubtitleEdit] OpenAI API 요청 시작...');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '음성 변환에 실패했습니다.');
      }

      const data = await response.json();
      console.log('🤖 [SubtitleEdit] Whisper AI 응답:', data);
      
      if (data.segments && data.segments.length > 0) {
        const firstTrackSpeakerId = speakers.length > 0 ? speakers[0].id : 'empty-0';
        console.log('🎯 [SubtitleEdit] 타겟 트랙 speaker ID:', firstTrackSpeakerId);
        console.log('🎯 [SubtitleEdit] 현재 speakers:', speakers);
        
        const segments = data.segments.map((segment: any, index: number) => ({
          id: `whisper-${speakerId}-${index}`,
          speaker: firstTrackSpeakerId, // 첫 번째 트랙(맨 위)에 배치
          text: segment.text.trim(),
          startTime: segment.start,
          endTime: segment.end,
          emotion: 'normal'
        }));
        
        console.log('🤖 [SubtitleEdit] 생성된 자막 세그먼트:', segments.length);
        console.log('🤖 [SubtitleEdit] 자막 세그먼트 상세:', segments);
        handleSubtitlesGenerated(segments);
        alert(`🎉 자막 생성 완료!\n총 ${segments.length}개의 자막 세그먼트가 생성되었습니다.`);
        return segments;
      } else {
        console.log('🤖 [SubtitleEdit] 응답에 자막 세그먼트가 없음');
        alert('음성이 감지되지 않았거나 자막을 생성할 수 없습니다.');
        return [];
      }
      
    } catch (error) {
      console.error('🤖 [SubtitleEdit] Whisper AI 자막 생성 실패:', error);
      alert(`자막 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      throw error;
    }
  };

  // 디버깅용 로그
  console.log('🔍 [SubtitleEdit] videoUrl:', videoUrl);
  console.log('🔍 [SubtitleEdit] videos:', videos);
  console.log('🔍 [SubtitleEdit] subtitleSegments:', subtitleSegments);
  console.log('🔍 [SubtitleEdit] speakers:', speakers);

  // 테스트용 - API에서 직접 영상 로드 (SourceSelection에서 데이터가 없을 때)
  useEffect(() => {
    console.log('🧪 [SubtitleEdit] 현재 상태 확인:', {
      videoUrl,
      hasSelectedSources: state.editing?.selectedSources?.length > 0,
      hasDownloadedFiles: Object.keys(state.editing?.downloadedFiles || {}).length > 0
    });
    
    // SourceSelection에서 오는 데이터가 없거나 메인 영상이 없을 때 테스트용 영상 로드
    if (!videoUrl) {
      console.log('🧪 [SubtitleEdit] 메인 영상이 없어서 테스트용 영상 로드 시도...');
      
      // API에서 하이라이트 영상 URL 가져와서 직접 로드
      fetch('http://3.37.34.211:8889/api/highlights/debug/EHKCSY')
        .then(response => response.json())
        .then(data => {
          console.log('🧪 [SubtitleEdit] API 응답:', data);
          if (data.success && data.highlights && data.highlights.length > 0) {
            const highlights = data.highlights;
            
            // 메인 영상 (첫 번째 하이라이트의 host 영상)
            const firstHighlight = highlights[0];
            const hostVideo = firstHighlight.clip_files?.clips_by_participant?.host?.video?.s3_url;
            
            if (hostVideo) {
              console.log('🧪 [SubtitleEdit] 메인 영상 로드:', hostVideo);
              const testFile = new File([], 'main_video.mp4', { type: 'video/mp4' });
              handleVideoUploaded(hostVideo, testFile, 0);
              
              // 메인 영상이 로드된 후 자동으로 자막 생성 시작
              setTimeout(() => {
                generateSubtitlesFromVideoURL(hostVideo);
              }, 1000);
            }
            
            // 작은 영상들 (여러 하이라이트와 참여자들)
            let videoIndex = 1;
            highlights.forEach((highlight, highlightIdx) => {
              const clips = highlight.clip_files?.clips_by_participant;
              if (clips) {
                // 각 참여자의 영상들을 작은 영상 슬롯에 배치
                Object.entries(clips).forEach(([participantId, participantClip]) => {
                  if (videoIndex < 15 && participantClip?.video?.s3_url) {
                    console.log(`🧪 [SubtitleEdit] 작은 영상 ${videoIndex} 로드:`, participantClip.video.s3_url);
                    const smallFile = new File([], `${participantId}_highlight${highlightIdx + 1}.mp4`, { type: 'video/mp4' });
                    handleVideoUploaded(participantClip.video.s3_url, smallFile, videoIndex);
                    videoIndex++;
                  }
                });
              }
            });
          }
        })
        .catch(error => {
          console.error('🧪 [SubtitleEdit] 테스트 영상 로드 실패:', error);
        });
    }
  }, [videoUrl, handleVideoUploaded]);

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
          
          {/* 자막 생성 버튼 */}
          {videoUrl && (
            <div className="fixed bottom-20 right-5 z-50">
              <button
                onClick={() => {
                  if (videoUrl) {
                    generateSubtitlesFromVideoURL(videoUrl);
                  } else {
                    alert('메인 동영상이 로드되지 않았습니다.');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <span>🤖</span>
                <span>메인 영상 자막 생성</span>
              </button>
            </div>
          )}
        </footer>
      </div>
    </PageTransition>
  )
}

export default SubtitleEditPage 