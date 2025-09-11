import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUnifiedGamecast } from '../../../contexts/UnifiedGamecastContext'
import { useRoom } from '../../../hooks/useRoom'
import { isDemoMode, isDemoRoomCode } from '../../../constants/demoData'
import { renderCharacterLayers } from '../../../utils/characterRenderer'
import { restoreCharacter, hasCharacterBackup } from '../../../utils/characterBackup'
import { Navigation } from '../../../components/gamecast/common/Navigation'
import { Footer } from '../../../components/gamecast/common/Footer'
import { PageTransition } from '../../../components/gamecast/common/PageTransition'
import { Button1 } from '../../../components/gamecast/common/Button1'

// 선택된 소스 인터페이스
interface SelectedSource {
  id: string; // 고유 식별자 (highlightIndex_participantId)
  highlightIndex: number; // 0, 1, 2
  participantId: string; // 'host', 'user1', 'user2'  
  participantName: string; // '초토로', '소질이', '톰쥬'
  videoUrl: string; // 게임영상 + 게임음성
  audioUrl: string; // 플레이어 목소리
}

export const SourceSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, actions } = useUnifiedGamecast();
  const { currentRoom, currentPlayer, refreshRoomState } = useRoom();
  const [selectedVideos, setSelectedVideos] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);
  const [highlightData, setHighlightData] = useState<any>(null);
  const [roomData, setRoomData] = useState<any>(null);

  // 기본 캐릭터 데이터 (서버 데이터가 없을 때 사용)
  const defaultCharacters = [
    {
      nickname: '소질이',
      characterData: {
        selectedOptions: { face: 'face1', hair: 'hair1', top: 'top1' },
        selectedColors: { face: '21', hair: 'black', top: 'blue' },
        nickname: '소질이'
      }
    },
    {
      nickname: '톰쥬', 
      characterData: {
        selectedOptions: { face: 'face1', hair: 'hair2', top: 'top2' },
        selectedColors: { face: '21', hair: 'yellow', top: 'red' },
        nickname: '톰쥬'
      }
    },
    {
      nickname: '쵸매', 
      characterData: {
        selectedOptions: { face: 'face2', hair: 'hair1', top: 'top1' },
        selectedColors: { face: '21', hair: 'brown', top: 'green' },
        nickname: '쵸매'
      }
    },
    {
      nickname: '닐', 
      characterData: {
        selectedOptions: { face: 'face2', hair: 'hair2', top: 'top2' },
        selectedColors: { face: '21', hair: 'red', top: 'purple' },
        nickname: '닐'
      }
    }
  ];

  // 페이지 로드 시 서버에서 최신 방 데이터 가져오기 (한 번만)
  useEffect(() => {
    const refreshData = async () => {
      try {
        // 이미 데이터가 있으면 추가 요청하지 않음 (429 에러 방지)
        if (currentRoom && state.participants && state.participants.length > 0) {
          console.log('✅ [SourceSelection] 기존 데이터 사용 (중복 요청 방지)');
          return;
        }
        
        await refreshRoomState();
        console.log('✅ [SourceSelection] 서버에서 최신 방 데이터 조회 완료');
      } catch (error) {
        console.error('❌ [SourceSelection] 방 데이터 조회 실패:', error);
        console.log('🔄 [SourceSelection] 기존 데이터로 계속 진행');
      }
    };
    
    refreshData();
  }, []); // 의존성 배열을 비워서 컴포넌트 마운트 시 한 번만 실행

  // API에서 room 정보 가져오기
  const fetchRoomData = async (roomCode: string) => {
    try {
      console.log('🚀 [SourceSelection] 방 정보 조회 시작:', roomCode);
      
      const response = await fetch(`http://3.37.34.211:8889/api/rooms/${roomCode}`);
      const data = await response.json();
      
      console.log('📡 [SourceSelection] Room API 응답:', data);
      
      if (data.resultType === 'SUCCESS' && data.success) {
        setRoomData(data.success);
        console.log('✅ [SourceSelection] 방 정보 저장 완료:', {
          roomCode: data.success.roomCode,
          participantsCount: data.success.participants?.length,
          participants: data.success.participants
        });
        return data.success;
      } else {
        console.error('❌ [SourceSelection] 방 정보 조회 실패:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ [SourceSelection] 방 정보 조회 중 오류:', error);
      return null;
    }
  };

  // API에서 하이라이트 동영상 가져오기
  const fetchHighlightVideos = async () => {
    try {
      setLoading(true);
      console.log('🚀 동영상 데이터 가져오는 중...');
      
      const response = await fetch('http://3.37.34.211:8889/api/highlights/debug/EHKCSY');
      const data = await response.json();
      
      console.log('📡 API 응답 데이터:', data);
      
      if (data.success && data.highlights && data.highlights.length > 0) {
        // 전체 하이라이트 데이터 저장
        setHighlightData(data);
        
        // 첫 번째 하이라이트의 방장 영상들을 미리보기용으로 설정
        const videoUrls: {[key: string]: string} = {};
        data.highlights.forEach((highlight: any, index: number) => {
          const clips = highlight.clip_files.clips_by_participant;
          videoUrls[`screen${index + 1}`] = clips.host?.video?.s3_url || '';
        });
        
        console.log('🎥 설정된 동영상 URLs:', videoUrls);
        setSelectedVideos(videoUrls);
      } else {
        console.error('❌ API 응답에서 하이라이트 데이터를 찾을 수 없습니다:', data);
      }
    } catch (error) {
      console.error('❌ 동영상 데이터 가져오기 실패:', error);
    } finally {
      setLoading(false);
      console.log('✅ 로딩 완료');
    }
  };

  // 방 정보 조회 및 동영상 로드
  useEffect(() => {
    const initializePageData = async () => {
      try {
        // URL 파라미터 확인
        const roomCode = searchParams.get('roomCode');
        const isDemo = isDemoMode(searchParams);
        
        console.log('🔍 [SourceSelection] 초기화 시작:', {
          roomCode,
          isDemo,
          currentRoom: currentRoom?.roomCode,
          participantsCount: currentRoom?.participants?.length
        });
        
        if (isDemo || isDemoRoomCode(roomCode || '')) {
          console.log('🎭 [SourceSelection] 데모 모드 활성화');
          // 데모 모드에서도 하이라이트 동영상 로드
          await fetchHighlightVideos();
        } else if (roomCode) {
          console.log('📋 [SourceSelection] 실제 방 정보 조회 시작:', roomCode);
          
          // API에서 방 정보 가져오기
          const fetchedRoomData = await fetchRoomData(roomCode);
          
          if (fetchedRoomData) {
            console.log('✅ [SourceSelection] 방 정보 조회 성공');
          } else {
            console.warn('⚠️ [SourceSelection] 방 정보 조회 실패, 기존 데이터 사용');
          }
          
          // 하이라이트 동영상 가져오기
          await fetchHighlightVideos();
        } else {
          console.warn('⚠️ [SourceSelection] roomCode가 없습니다');
          // roomCode가 없어도 기본 동영상은 로드
          await fetchHighlightVideos();
        }
      } catch (error) {
        console.error('❌ [SourceSelection] 초기화 실패:', error);
        // 에러가 발생해도 기본 동영상은 로드
        await fetchHighlightVideos();
      }
    };

    initializePageData();
  }, [searchParams, currentRoom, state.participants]);


  // 참여자 ID를 이름으로 변환
  const getParticipantName = (participantId: string) => {
    if (participantId === 'host') {
      return state.participants?.find(p => p.isHost)?.nickname || '호스트';
    }
    const participant = state.participants?.find(p => p.guestUserId === participantId);
    return participant?.nickname || participantId;
  };

  // 소스 선택/해제 함수
  const toggleSourceSelection = (highlightIndex: number, participantId: string) => {
    console.log('🚀 [toggleSourceSelection] 호출됨:', { highlightIndex, participantId, highlightData: !!highlightData });
    
    if (!highlightData) {
      console.warn('❌ [toggleSourceSelection] highlightData가 없습니다');
      return;
    }

    const sourceId = `${highlightIndex}_${participantId}`;
    const existingIndex = selectedSources.findIndex(source => source.id === sourceId);

    console.log('🔍 [toggleSourceSelection] 선택 상태:', { sourceId, existingIndex, currentSelections: selectedSources });

    if (existingIndex >= 0) {
      // 이미 선택된 소스라면 제거
      console.log('❌ [toggleSourceSelection] 소스 제거');
      setSelectedSources(prev => prev.filter(source => source.id !== sourceId));
    } else {
      // 새로운 소스 선택
      const highlight = highlightData.highlights[highlightIndex];
      const clips = highlight.clip_files.clips_by_participant;
      
      console.log('📂 [toggleSourceSelection] 클립 데이터 구조:', { 
        highlightIndex, 
        participantId,
        availableClips: Object.keys(clips),
        clips 
      });

      // participantId를 clips의 키와 매칭 시도
      let participantClip = clips[participantId as keyof typeof clips];
      
      // 직접 매칭이 안 되면 순서대로 매칭
      if (!participantClip) {
        const guestPlayers = getGuestPlayers();
        const playerIndex = guestPlayers.findIndex(p => p.guestUserId === participantId);
        
        if (playerIndex >= 0) {
          const clipKeys = Object.keys(clips);
          console.log('🔄 [toggleSourceSelection] 순서 기반 매칭 시도:', { 
            playerIndex, 
            clipKeys,
            targetKey: clipKeys[playerIndex + 1] // +1 because index 0 is usually 'host'
          });
          
          // host 다음부터 게스트들의 클립
          const guestClipKey = clipKeys[playerIndex + 1]; // host가 0번이므로 +1
          if (guestClipKey && clips[guestClipKey]) {
            participantClip = clips[guestClipKey];
            console.log('✅ [toggleSourceSelection] 순서 기반 매칭 성공:', guestClipKey);
          }
        }
      }

      if (participantClip) {
        const newSource: SelectedSource = {
          id: sourceId,
          highlightIndex,
          participantId,
          participantName: getParticipantName(participantId),
          videoUrl: participantClip.video.s3_url,
          audioUrl: participantClip.audio.s3_url
        };
        console.log('✅ [toggleSourceSelection] 새 소스 추가:', newSource);
        setSelectedSources(prev => [...prev, newSource]);
      } else {
        console.warn('❌ [toggleSourceSelection] participantClip을 찾을 수 없습니다');
        console.warn('사용 가능한 클립 키:', Object.keys(clips));
      }
    }
  };

  // 소스가 선택되었는지 확인
  const isSourceSelected = (highlightIndex: number, participantId: string) => {
    const sourceId = `${highlightIndex}_${participantId}`;
    return selectedSources.some(source => source.id === sourceId);
  };


  const handleScreenSelect = (screenId: string) => {
    const highlightIndex = parseInt(screenId.replace('screen', '')) - 1; // screen1 -> 0, screen2 -> 1, screen3 -> 2
    toggleSourceSelection(highlightIndex, 'host');
  };

  const handleComplete = async () => {
    if (selectedSources.length === 0) {
      alert('편집할 영상을 선택해주세요.');
      return;
    }

    try {
      console.log('🚀 [SourceSelection] 편집 시작 - 선택된 소스:', selectedSources.length);
      console.log('🚀 [SourceSelection] 선택된 소스들 상세:', selectedSources);
      
      // Context에 선택된 소스 저장
      console.log('📂 [SourceSelection] Context에 소스 저장 중...');
      actions.setEditingSources(selectedSources);
      
      // 파일 다운로드 시작
      console.log('🔽 [SourceSelection] 파일 다운로드 시작...');
      const downloadSuccess = await actions.downloadFiles(selectedSources);
      
      console.log('🔽 [SourceSelection] 다운로드 결과:', downloadSuccess);
      
      if (downloadSuccess) {
        console.log('✅ [SourceSelection] 파일 다운로드 완료, 편집 페이지로 이동');
        console.log('✅ [SourceSelection] Context 상태 확인:', {
          selectedSources: state.editing.selectedSources,
          downloadedFiles: Object.keys(state.editing.downloadedFiles)
        });
        navigate('/gamecast/subtitle-edit');
      } else {
        console.error('❌ [SourceSelection] 다운로드 실패');
        alert('파일 다운로드에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('❌ [SourceSelection] 편집 시작 실패:', error);
      alert('편집 시작 중 오류가 발생했습니다.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  // 게스트 플레이어 가져오기 (호스트 제외) - API에서 가져온 실제 room 참여자만 표시
  const getGuestPlayers = () => {
    // API에서 가져온 room 데이터 우선 사용 (호스트 제외 필터링)
    const apiParticipants = (roomData?.participants || []).filter(p => 
      p.role !== 'host' && 
      p.guestUserId !== roomData?.hostGuestId
    );
    const contextParticipants = state.participants?.filter(p => !p.isHost) || [];
    const roomParticipants = currentRoom?.participants?.filter(p => !p.isHost) || [];
    
    // 우선순위: API 데이터 > Context 데이터 > Room 데이터
    let serverGuests = apiParticipants;
    if (serverGuests.length === 0) {
      serverGuests = contextParticipants.length > 0 ? contextParticipants : roomParticipants;
    }
    
    console.log('🔍 [getGuestPlayers] 전체 데이터 상세 확인:', {
      rawApiParticipants: roomData?.participants || [],
      hostGuestId: roomData?.hostGuestId,
      filteredApiParticipants: {
        length: apiParticipants.length,
        data: apiParticipants
      },
      contextParticipants: {
        length: contextParticipants.length,
        data: contextParticipants
      },
      roomParticipants: {
        length: roomParticipants.length,
        data: roomParticipants
      },
      finalSelectedGuests: {
        length: serverGuests.length,
        data: serverGuests
      }
    });
    
    // 실제 서버에 있는 게스트만 표시 (기본값 채우지 않음)
    const players = [];
    
    for (let i = 0; i < serverGuests.length; i++) {
      const serverPlayer = serverGuests[i];
      
      console.log(`🔍 [getGuestPlayers] 게스트 ${i + 1} 데이터:`, {
        nickname: serverPlayer.nickname,
        guestUserId: serverPlayer.guestUserId,
        hasCharacterInfo: !!serverPlayer.characterInfo,
        isCustomized: serverPlayer.characterInfo?.isCustomized
      });

      // 캐릭터 데이터 결정
      let characterInfo = null;
      
      // 1. 서버에서 캐릭터 확인
      if (serverPlayer.characterInfo?.isCustomized) {
        console.log(`🌐 [getGuestPlayers] 게스트 ${i + 1} 서버 데이터 사용`);
        characterInfo = serverPlayer.characterInfo;
      }
      // 2. 서버 데이터가 없으면 guestUserId로 백업 확인
      else if (serverPlayer.guestUserId && hasCharacterBackup(serverPlayer.guestUserId)) {
        const backupData = restoreCharacter(serverPlayer.guestUserId);
        if (backupData?.data) {
          console.log(`💾 [getGuestPlayers] 게스트 ${i + 1} 백업 데이터 사용:`, backupData.data);
          characterInfo = {
            isCustomized: true,
            characterData: backupData.data
          };
        }
      }

      // 3. 둘 다 없으면 기본값 사용
      if (!characterInfo) {
        console.log(`🎭 [getGuestPlayers] 게스트 ${i + 1} 기본값 사용`);
        characterInfo = {
          isCustomized: true,
          characterData: defaultCharacters[i % defaultCharacters.length].characterData
        };
      }
      
      players.push({
        ...serverPlayer,
        characterInfo,
        nickname: serverPlayer.nickname || `게스트${i + 1}`
      });
    }
    
    return players;
  };

  // 화면 컴포넌트
  const ScreenItem: React.FC<{ highlightIndex: number }> = ({ highlightIndex }) => {
    const screenId = `screen${highlightIndex + 1}`;
    const videoUrl = selectedVideos[screenId] || '';
    
    return (
      <div className="w-fit h-fit relative">
        {/* 영상화면과 버튼 컨테이너 */}
        <div style={{ position: 'relative', width: '407.865px', height: '280px' }}>
          {/* 영상화면 div */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '0', 
              left: '0', 
              width: '407.865px', 
              height: '249.672px', 
              flexShrink: 0,
              transition: 'transform 0.3s ease',
              transformOrigin: 'center center'
            }}
            className="cursor-pointer"
            onClick={() => handleScreenSelect(screenId)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.zIndex = '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.zIndex = '2';
            }}
          >
            {/* 영상 내용 - 맨 뒤 레이어 */}
            <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
              {loading ? (
                <span style={{ fontSize: '14px', opacity: 0.7 }}>동영상 로딩 중...</span>
              ) : videoUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  <video 
                    src={videoUrl} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      mask: `url(#controller-mask-${highlightIndex + 1})`,
                      WebkitMask: `url(#controller-mask-${highlightIndex + 1})`
                    }} 
                    muted 
                    autoPlay 
                    loop 
                  />
                  <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                      <mask id={`controller-mask-${highlightIndex + 1}`}>
                        <rect width="100%" height="100%" fill="black"/>
                        <path d="M108.125 252.672H34.3353L5.52704 224.874V191.517L19.6785 170.796V80.8329L3 70.7247V31.8083L34.8407 3H374.475L408.338 28.7758L409.854 68.7031L396.713 77.8004V170.29L410.865 187.474V223.863L381.551 252.672H307.256L283.502 220.831H130.363L108.125 252.672Z" fill="white" transform="scale(0.984, 0.98)"/>
                      </mask>
                    </defs>
                  </svg>
                </div>
              ) : (
                <span style={{ fontSize: '14px', opacity: 0.7 }}>동영상을 불러올 수 없습니다</span>
              )}
            </div>

            {/* SVG 테두리 - 앞 레이어 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="414" height="255" viewBox="0 0 414 255" fill="none" style={{ position: 'absolute', top: '0', left: '0', width: '407.865px', height: '249.672px', zIndex: 2 }}>
              <path d="M108.125 252.672H34.3353L5.52704 224.874V191.517L19.6785 170.796V80.8329L3 70.7247V31.8083L34.8407 3H374.475L408.338 28.7758L409.854 68.7031L396.713 77.8004V170.29L410.865 187.474V223.863L381.551 252.672H307.256L283.502 220.831H130.363L108.125 252.672Z" stroke={isSourceSelected(highlightIndex, 'host') ? `url(#paint0_linear_1960_31730_${highlightIndex + 1}_selected)` : `url(#paint0_linear_1960_31730_${highlightIndex + 1})`} strokeWidth="4.66"/>
              <defs>
                <linearGradient id={`paint0_linear_1960_31730_${highlightIndex + 1}`} x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3170FF"/>
                  <stop offset="1" stopColor="#A2D2FF"/>
                </linearGradient>
                <linearGradient id={`paint0_linear_1960_31730_${highlightIndex + 1}_selected`} x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B2FEB4"/>
                  <stop offset="1" stopColor="#2FEB49"/>
                </linearGradient>
              </defs>
            </svg>
            
            {/* 오버레이 원형 아이콘 - 최상위 레이어 */}
            <div style={{ position: 'absolute', top: '22px', right: '40px', width: '30.988px', height: '30.988px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', width: '30.988px', height: '30.988px' }}>
                <circle cx="15.8064" cy="15.9978" r="14.1324" stroke={isSourceSelected(highlightIndex, 'host') ? "#2FEB49" : "white"} strokeWidth="2.723"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ position: 'relative', zIndex: 10, width: '13.063px', height: '8.826px' }}>
                <path d="M1.27734 6.33706L5.40236 10.4105L14.3399 1.58472" stroke={isSourceSelected(highlightIndex, 'host') ? "#2FEB49" : "white"} strokeWidth="2.269" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          
          {/* 하단 버튼 오버레이 */}
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="179" height="31" viewBox="0 0 180 31" fill="none" style={{ width: '178.943px', height: '30.29px', flexShrink: 0 }}>
              <path d="M159.491 0.40625H20.1578L0.585938 30.696H179.529L159.491 0.40625Z" fill={isSourceSelected(highlightIndex, 'host') ? `url(#paint0_linear_1958_9666_${highlightIndex + 1}_selected)` : `url(#paint0_linear_1958_9666_${highlightIndex + 1})`}/>
              <defs>
                <linearGradient id={`paint0_linear_1958_9666_${highlightIndex + 1}`} x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#717DFF"/>
                  <stop offset="1" stopColor="#340E82"/>
                </linearGradient>
                <linearGradient id={`paint0_linear_1958_9666_${highlightIndex + 1}_selected`} x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B2FEB4"/>
                  <stop offset="1" stopColor="#2FEB49"/>
                </linearGradient>
              </defs>
              <text x="90" y="20" textAnchor="middle" fill="white" fontSize="14" fontFamily="Noto Sans, sans-serif" fontWeight="600">
                화면 {highlightIndex + 1}
              </text>
            </svg>
          </div>
        </div>
        
        {/* 프로필 게스트 div */}
        <div className="프로필게스트 flex justify-center items-center gap-[28px] mt-[10px]">
          {getGuestPlayers().map((_, index) => (
            <ProfileItem key={index + 1} screenId={screenId} itemIndex={index + 1} />
          ))}
        </div>
      </div>
    );
  };

  // 프로필 아이템 컴포넌트
  const ProfileItem: React.FC<{ screenId: string; itemIndex: number }> = ({ screenId, itemIndex }) => {
    const guestPlayers = getGuestPlayers();
    const player = guestPlayers[itemIndex - 1]; // 1-based index를 0-based로 변환
    const highlightIndex = parseInt(screenId.replace('screen', '')) - 1; // screen1 -> 0, screen2 -> 1, screen3 -> 2
    const participantId = player?.guestUserId || `user${itemIndex}`;
    const isSelected = isSourceSelected(highlightIndex, participantId);
    
    console.log(`🎯 [ProfileItem] 아이템 ${itemIndex} 클릭 정보:`, {
      screenId,
      itemIndex,
      highlightIndex,
      player,
      participantId,
      isSelected,
      clickFunction: 'toggleSourceSelection(' + highlightIndex + ', ' + participantId + ')'
    });
    
    return (
      <div 
        style={{
          width: '68.229px',
          height: '73.885px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        className="group"
        onClick={() => toggleSourceSelection(highlightIndex, participantId)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.2)';
          e.currentTarget.style.zIndex = '10';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.zIndex = '1';
        }}
      >
      {/* 배경 SVG - 모든 아이템에 표시 */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="64" 
        height="63" 
        viewBox="0 0 64 63" 
        fill="none"
        style={{
          position: 'absolute',
          width: '62.664px',
          height: '62.518px',
          flexShrink: 0,
          zIndex: 1
        }}
      >
        <path d="M55.3314 62.7102H0.900391V8.61203L9.32679 0.192139H63.564V54.8712L55.3314 62.7102Z" fill="#2B2968" fillOpacity="0.37"/>
      </svg>
      
      {/* 플레이어 캐릭터 렌더링 */}
      {player && player.characterInfo?.isCustomized && player.characterInfo?.characterData && (
        <div 
          style={{
            position: 'absolute',
            width: '50px',
            height: '50px',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {renderCharacterLayers(player.characterInfo.characterData)}
        </div>
      )}
      
      {/* API 응답 구조에 맞는 캐릭터 렌더링 (characterInfo가 직접 selectedOptions, selectedColors를 가지는 경우) */}
      {player && player.characterInfo?.isCustomized && player.characterInfo?.selectedOptions && !player.characterInfo?.characterData && (
        <div 
          style={{
            position: 'absolute',
            width: '50px',
            height: '50px',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {renderCharacterLayers({
            selectedOptions: player.characterInfo.selectedOptions,
            selectedColors: player.characterInfo.selectedColors,
            nickname: player.nickname
          })}
        </div>
      )}
      
      {/* 호버시 표시되는 닉네임과 추가하기 텍스트 */}
      {player && (
        <div 
          className="group-hover:block hidden"
          style={{
            position: 'absolute',
            bottom: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 15,
            textAlign: 'center',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
          }}
        >
          <div 
            style={{
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              lineHeight: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            {player.nickname} 시점
          </div>
          <div 
            style={{
              color: 'white',
              fontSize: '10px',
              fontWeight: '500',
              lineHeight: '12px',
              marginTop: '2px'
            }}
          >
            추가하기
          </div>
        </div>
      )}
      
      {/* 테두리 SVG - 배경보다 위에 표시 */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="75" 
        height="75" 
        viewBox="0 0 75 75" 
        fill="none"
        style={{
          position: 'relative',
          zIndex: 2
        }}
      >
        <path d="M70.6436 13.9504L73.9404 15.8704L74.1006 15.9631V59.1946L73.9287 59.2854L70.6436 61.0159V71.2092H2.88574V60.9954L0.24707 59.2698L0.101562 59.1741V15.9836L0.235352 15.8879L2.88574 13.9709V2.98071H70.6436V13.9504ZM14.4521 6.19263L14.3584 6.28638L6.00488 14.6272L5.91016 14.7219V68.7649H60.3213L60.4141 68.676L68.5752 60.9114L68.6758 60.8157V6.19263H14.4521Z" fill={isSelected ? `url(#paint0_linear_1958_5626_${screenId}_${itemIndex}_selected)` : `url(#paint0_linear_1958_5626_${screenId}_${itemIndex})`}/>
        <defs>
          <linearGradient id={`paint0_linear_1958_5626_${screenId}_${itemIndex}`} x1="37.1008" y1="0.153044" x2="37.1008" y2="74.0375" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6B65CF"/>
            <stop offset="1" stopColor="#B3AAFF"/>
          </linearGradient>
          <linearGradient id={`paint0_linear_1958_5626_${screenId}_${itemIndex}_selected`} x1="37.1008" y1="0.153044" x2="37.1008" y2="74.0375" gradientUnits="userSpaceOnUse">
            <stop stopColor="#26F375"/>
            <stop offset="1" stopColor="#BFFFD8"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

  return (
    <PageTransition className="min-h-screen w-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative">
      {/* Navigation Header */}
      <Navigation />
      
      
      {/* 메인 컨텐츠 컨테이너 - 중앙 배치 */}
      <div className="flex-1 flex flex-col justify-center items-center px-4">
        <div className="w-fit">
          {/* Header Text */}
          <div className="pb-[50px]">
            <h1 
              style={{
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '35px',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: '150%', /* 52.5px */
                letterSpacing: '-0.665px'
              }}
            >
              재밌는 소스를 찾았어요!<br />
              자막을 생성할 영상을 골라주세요!
            </h1>
          </div>
          
          {/* Main Content */}
          <main className="relative z-10 py-10">
        <motion.div 
          className="w-fit mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* 전체 영상 div - 동적 렌더링 */}
          <div className="flex justify-center items-start gap-[45px] w-fit">
            {highlightData && highlightData.highlights.map((_: any, index: number) => (
              <ScreenItem key={index} highlightIndex={index} />
            ))}
          </div>
        </motion.div>
          </main>

          {/* 다운로드 진행률 */}
          {state.editing.isDownloading && (
            <div className="mt-4 mb-6">
              <div className="text-white text-center mb-2">
                파일 다운로드 중... {Math.round(state.editing.downloadProgress)}%
              </div>
              <div className="bg-gray-700 rounded-full h-2 max-w-md mx-auto">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.editing.downloadProgress}%` }}
                />
              </div>
            </div>
          )}


          {/* Button */}
          <div className="flex justify-center py-8">
            <div style={{
                opacity: (selectedSources.length === 0 || state.editing.isDownloading) ? 0.5 : 1,
                cursor: (selectedSources.length === 0 || state.editing.isDownloading) ? 'not-allowed' : 'pointer'
              }}>
              <Button1 
                onClick={handleComplete}
                disabled={selectedSources.length === 0 || state.editing.isDownloading}
              >
                {state.editing.isDownloading 
                  ? '다운로드 중...' 
                  : `완료 ${selectedSources.length > 0 ? `(${selectedSources.length}개 선택됨)` : ''}`
                }
              </Button1>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </PageTransition>
  )
}

