import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUnifiedGamecast } from '../../../contexts/UnifiedGamecastContext'
import { Navigation } from '../../../components/gamecast/common/Navigation'
import { Footer } from '../../../components/gamecast/common/Footer'
import { PageTransition } from '../../../components/gamecast/common/PageTransition'
import { Button1 } from '../../../components/gamecast/common/Button1'

export const SourceSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, actions } = useUnifiedGamecast();
  const [selectedVideos, setSelectedVideos] = useState<{[key: string]: string}>({});
  const [selectedScreens, setSelectedScreens] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProfiles, setSelectedProfiles] = useState<{[key: string]: boolean}>({});

  // API에서 하이라이트 동영상 가져오기
  const fetchHighlightVideos = async () => {
    try {
      setLoading(true);
      console.log('🚀 동영상 데이터 가져오는 중...');
      
      const response = await fetch('http://3.37.34.211:8889/api/highlights/debug/EHKCSY');
      const data = await response.json();
      
      console.log('📡 API 응답 데이터:', data);
      
      if (data.success && data.highlights && data.highlights.length > 0) {
        const firstHighlight = data.highlights[0];
        const clips = firstHighlight.clip_files.clips_by_participant;
        
        const videoUrls = {
          screen1: clips.host?.video?.s3_url || '',
          screen2: clips.user1?.video?.s3_url || '',
          screen3: clips.user2?.video?.s3_url || ''
        };
        
        console.log('🎥 설정된 동영상 URLs:', videoUrls);
        
        // 각 화면에 해당하는 동영상 URL 설정
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
        // URL에서 roomCode 파라미터 확인
        const roomCode = searchParams.get('roomCode');
        
        if (roomCode) {
          console.log('📋 [SourceSelection] 방 정보 조회 시작:', roomCode);
          
          // Context를 통해 방 정보 조회
          await actions.loadRoomDataForEditing(roomCode);
          
          console.log('✅ [SourceSelection] 방 정보 조회 완료:', {
            currentRoom: state.currentRoom,
            participants: state.participants
          });
          
          // 하이라이트 동영상 가져오기 (방 코드 기반으로)
          await fetchHighlightVideos();
        } else {
          console.warn('⚠️ [SourceSelection] roomCode 파라미터가 없습니다');
          // roomCode가 없는 경우 기본 동영상 로드
          await fetchHighlightVideos();
        }
      } catch (error) {
        console.error('❌ [SourceSelection] 초기화 실패:', error);
        // 에러가 발생해도 기본 동영상은 로드
        await fetchHighlightVideos();
      }
    };

    initializePageData();
  }, [searchParams, actions.loadRoomDataForEditing]);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>, screenId: string) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setSelectedVideos(prev => ({ ...prev, [screenId]: videoUrl }));
    }
  };

  const handleScreenSelect = (screenId: string) => {
    setSelectedScreens(prev => ({
      ...prev,
      [screenId]: !prev[screenId]
    }));
  };

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfiles(prev => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  const handleComplete = () => {
    navigate('/gamecast/subtitle-edit');
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

  // 프로필 아이템 컴포넌트
  const ProfileItem: React.FC<{ screenId: string; itemIndex: number }> = ({ screenId, itemIndex }) => {
    const profileId = `${screenId}_profile_${itemIndex}`;
    const isSelected = selectedProfiles[profileId];
    
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
          cursor: 'pointer'
        }}
        onClick={() => handleProfileSelect(profileId)}
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
      
      {/* 플레이어 정보 디버그 섹션 */}
      {state.currentRoom && (
        <div style={{ 
          backgroundColor: 'rgba(0,0,0,0.3)', 
          margin: '20px', 
          padding: '15px', 
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px'
        }}>
          <h3>📋 방 정보 (편집용)</h3>
          <p>방 코드: {state.currentRoom.roomCode}</p>
          <p>참여자 수: {state.participants?.length || 0}명</p>
          {state.participants?.map((participant, index) => (
            <div key={participant.guestUserId} style={{ marginLeft: '10px', marginTop: '5px' }}>
              <span>👤 {participant.nickname || participant.name} </span>
              <span>({participant.isHost ? '호스트' : '게스트'}) </span>
              <span>ID: {participant.guestUserId}</span>
              {participant.characterInfo?.isCustomized && (
                <span> 🎭 캐릭터 설정됨</span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Header Text - 70px below navigation */}
      <div className="pt-[28px] pb-[30px]">
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
      <main className="flex-1 relative z-10 px-4 pb-20">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* 전체 영상 div */}
          <div className="flex justify-center gap-[45px]">
            {/* 화면1 div */}
            <div className="w-[488px] h-[448px] relative">
              {/* 영상화면과 버튼 컨테이너 */}
              <div style={{ position: 'relative', width: '407.865px', height: '280px' }}>
                {/* 영상화면 div */}
                <div 
                  style={{ position: 'absolute', top: '0', left: '0', width: '407.865px', height: '249.672px', flexShrink: 0 }}
                  onClick={() => handleScreenSelect('screen1')}
                  className="cursor-pointer"
                >
                  {/* 영상 내용 - 맨 뒤 레이어 */}
                  <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
                    {loading ? (
                      <span style={{ fontSize: '14px', opacity: 0.7 }}>동영상 로딩 중...</span>
                    ) : selectedVideos['screen1'] ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                        <video 
                          src={selectedVideos['screen1']} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            mask: 'url(#controller-mask-1)',
                            WebkitMask: 'url(#controller-mask-1)'
                          }}
                          autoPlay
                          muted
                          loop
                        />
                        <svg width="0" height="0" style={{ position: 'absolute' }}>
                          <defs>
                            <mask id="controller-mask-1">
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
                    <path d="M108.125 252.672H34.3353L5.52704 224.874V191.517L19.6785 170.796V80.8329L3 70.7247V31.8083L34.8407 3H374.475L408.338 28.7758L409.854 68.7031L396.713 77.8004V170.29L410.865 187.474V223.863L381.551 252.672H307.256L283.502 220.831H130.363L108.125 252.672Z" stroke={selectedScreens['screen1'] ? "url(#paint0_linear_1960_31730_1_selected)" : "url(#paint0_linear_1960_31730_1)"} strokeWidth="4.66"/>
                    <defs>
                      <linearGradient id="paint0_linear_1960_31730_1" x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3170FF"/>
                        <stop offset="1" stopColor="#A2D2FF"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_1960_31730_1_selected" x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B2FEB4"/>
                        <stop offset="1" stopColor="#2FEB49"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* 오버레이 원형 아이콘 - 최상위 레이어 */}
                  <div style={{ position: 'absolute', top: '22px', right: '40px', width: '30.988px', height: '30.988px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                    {/* 원형 배경 */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', width: '30.988px', height: '30.988px' }}>
                      <circle cx="15.8064" cy="15.9978" r="14.1324" stroke={selectedScreens['screen1'] ? "#2FEB49" : "white"} strokeWidth="2.723"/>
                    </svg>
                    {/* 체크마크 중앙 배치 */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ position: 'relative', zIndex: 10, width: '13.063px', height: '8.826px' }}>
                      <path d="M1.27734 6.33706L5.40236 10.4105L14.3399 1.58472" stroke={selectedScreens['screen1'] ? "#2FEB49" : "white"} strokeWidth="2.269" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                
                {/* 하단 버튼 오버레이 */}
                <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="179" height="31" viewBox="0 0 180 31" fill="none" style={{ width: '178.943px', height: '30.29px', flexShrink: 0 }}>
                    <path d="M159.491 0.40625H20.1578L0.585938 30.696H179.529L159.491 0.40625Z" fill={selectedScreens['screen1'] ? "url(#paint0_linear_1958_9666_1_selected)" : "url(#paint0_linear_1958_9666_1)"}/>
                    <defs>
                      <linearGradient id="paint0_linear_1958_9666_1" x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#717DFF"/>
                        <stop offset="1" stopColor="#340E82"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_1958_9666_1_selected" x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B2FEB4"/>
                        <stop offset="1" stopColor="#2FEB49"/>
                      </linearGradient>
                    </defs>
                    <text x="90" y="20" textAnchor="middle" fill="white" fontSize="14" fontFamily="Noto Sans, sans-serif" fontWeight="600">
                      화면 1
                    </text>
                  </svg>
                </div>
              </div>
              
              {/* 프로필 게스트 div */}
              <div className="프로필게스트 flex justify-center items-center gap-[28px] mt-[10px]">
                {/* 프로필 아이템 4개 */}
                {[1, 2, 3, 4].map((index) => (
                  <ProfileItem key={index} screenId="screen1" itemIndex={index} />
                ))}
              </div>
            </div>
            
            {/* 화면2 div */}
            <div className="w-[488px] h-[448px]  rounded-lg relative">
              {/* 영상화면과 버튼 컨테이너 */}
              <div style={{ position: 'relative', width: '407.865px', height: '280px' }}>
                {/* 영상화면 div */}
                <div 
                  style={{ position: 'absolute', top: '0', left: '0', width: '407.865px', height: '249.672px', flexShrink: 0 }}
                  onClick={() => handleScreenSelect('screen2')}
                  className="cursor-pointer"
                >
                  {/* 영상 내용 - 맨 뒤 레이어 */}
                  <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
                    {loading ? (
                      <span style={{ fontSize: '14px', opacity: 0.7 }}>동영상 로딩 중...</span>
                    ) : selectedVideos['screen2'] ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                        <video 
                          src={selectedVideos['screen2']} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            mask: 'url(#controller-mask-2)',
                            WebkitMask: 'url(#controller-mask-2)'
                          }}
                          autoPlay
                          muted
                          loop
                        />
                        <svg width="0" height="0" style={{ position: 'absolute' }}>
                          <defs>
                            <mask id="controller-mask-2">
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
                    <path d="M108.125 252.672H34.3353L5.52704 224.874V191.517L19.6785 170.796V80.8329L3 70.7247V31.8083L34.8407 3H374.475L408.338 28.7758L409.854 68.7031L396.713 77.8004V170.29L410.865 187.474V223.863L381.551 252.672H307.256L283.502 220.831H130.363L108.125 252.672Z" stroke={selectedScreens['screen2'] ? "url(#paint0_linear_1960_31730_2_selected)" : "url(#paint0_linear_1960_31730_2)"} strokeWidth="4.66"/>
                    <defs>
                      <linearGradient id="paint0_linear_1960_31730_2" x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3170FF"/>
                        <stop offset="1" stopColor="#A2D2FF"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_1960_31730_2_selected" x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B2FEB4"/>
                        <stop offset="1" stopColor="#2FEB49"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* 오버레이 원형 아이콘 - 최상위 레이어 */}
                  <div style={{ position: 'absolute', top: '22px', right: '40px', width: '30.988px', height: '30.988px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                    {/* 원형 배경 */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', width: '30.988px', height: '30.988px' }}>
                      <circle cx="15.8064" cy="15.9978" r="14.1324" stroke={selectedScreens['screen2'] ? "#2FEB49" : "white"} strokeWidth="2.723"/>
                    </svg>
                    {/* 체크마크 중앙 배치 */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ position: 'relative', zIndex: 10, width: '13.063px', height: '8.826px' }}>
                      <path d="M1.27734 6.33706L5.40236 10.4105L14.3399 1.58472" stroke={selectedScreens['screen2'] ? "#2FEB49" : "white"} strokeWidth="2.269" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                
                {/* 하단 버튼 오버레이 */}
                <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="179" height="31" viewBox="0 0 180 31" fill="none" style={{ width: '178.943px', height: '30.29px', flexShrink: 0 }}>
                    <path d="M159.491 0.40625H20.1578L0.585938 30.696H179.529L159.491 0.40625Z" fill={selectedScreens['screen2'] ? "url(#paint0_linear_1958_9666_2_selected)" : "url(#paint0_linear_1958_9666_2)"}/>
                    <defs>
                      <linearGradient id="paint0_linear_1958_9666_2" x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#717DFF"/>
                        <stop offset="1" stopColor="#340E82"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_1958_9666_2_selected" x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B2FEB4"/>
                        <stop offset="1" stopColor="#2FEB49"/>
                      </linearGradient>
                    </defs>
                    <text x="90" y="20" textAnchor="middle" fill="white" fontSize="14" fontFamily="Noto Sans, sans-serif" fontWeight="600">
                      화면 2
                    </text>
                  </svg>
                </div>
              </div>
              
              {/* 프로필 게스트 div */}
              <div className="프로필게스트 flex justify-center items-center gap-[28px] mt-[10px]">
                {/* 프로필 아이템 4개 */}
                {[1, 2, 3, 4].map((index) => (
                  <ProfileItem key={index} screenId="screen2" itemIndex={index} />
                ))}
              </div>
            </div>
            
            {/* 화면3 div */}
            <div className="w-[488px] h-[448px]  rounded-lg relative">
              {/* 영상화면과 버튼 컨테이너 */}
              <div style={{ position: 'relative', width: '407.865px', height: '280px' }}>
                {/* 영상화면 div */}
                <div 
                  style={{ position: 'absolute', top: '0', left: '0', width: '407.865px', height: '249.672px', flexShrink: 0 }}
                  onClick={() => handleScreenSelect('screen3')}
                  className="cursor-pointer"
                >
                  {/* 영상 내용 - 맨 뒤 레이어 */}
                  <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
                    {loading ? (
                      <span style={{ fontSize: '14px', opacity: 0.7 }}>동영상 로딩 중...</span>
                    ) : selectedVideos['screen3'] ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                        <video 
                          src={selectedVideos['screen3']} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            mask: 'url(#controller-mask-3)',
                            WebkitMask: 'url(#controller-mask-3)'
                          }}
                          autoPlay
                          muted
                          loop
                        />
                        <svg width="0" height="0" style={{ position: 'absolute' }}>
                          <defs>
                            <mask id="controller-mask-3">
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
                    <path d="M108.125 252.672H34.3353L5.52704 224.874V191.517L19.6785 170.796V80.8329L3 70.7247V31.8083L34.8407 3H374.475L408.338 28.7758L409.854 68.7031L396.713 77.8004V170.29L410.865 187.474V223.863L381.551 252.672H307.256L283.502 220.831H130.363L108.125 252.672Z" stroke={selectedScreens['screen3'] ? "url(#paint0_linear_1960_31730_3_selected)" : "url(#paint0_linear_1960_31730_3)"} strokeWidth="4.66"/>
                    <defs>
                      <linearGradient id="paint0_linear_1960_31730_3" x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3170FF"/>
                        <stop offset="1" stopColor="#A2D2FF"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_1960_31730_3_selected" x1="206.932" y1="3" x2="206.932" y2="252.672" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B2FEB4"/>
                        <stop offset="1" stopColor="#2FEB49"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* 오버레이 원형 아이콘 - 최상위 레이어 */}
                  <div style={{ position: 'absolute', top: '22px', right: '40px', width: '30.988px', height: '30.988px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                    {/* 원형 배경 */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', width: '30.988px', height: '30.988px' }}>
                      <circle cx="15.8064" cy="15.9978" r="14.1324" stroke={selectedScreens['screen3'] ? "#2FEB49" : "white"} strokeWidth="2.723"/>
                    </svg>
                    {/* 체크마크 중앙 배치 */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ position: 'relative', zIndex: 10, width: '13.063px', height: '8.826px' }}>
                      <path d="M1.27734 6.33706L5.40236 10.4105L14.3399 1.58472" stroke={selectedScreens['screen3'] ? "#2FEB49" : "white"} strokeWidth="2.269" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                
                {/* 하단 버튼 오버레이 */}
                <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="179" height="31" viewBox="0 0 180 31" fill="none" style={{ width: '178.943px', height: '30.29px', flexShrink: 0 }}>
                    <path d="M159.491 0.40625H20.1578L0.585938 30.696H179.529L159.491 0.40625Z" fill={selectedScreens['screen3'] ? "url(#paint0_linear_1958_9666_3_selected)" : "url(#paint0_linear_1958_9666_3)"}/>
                    <defs>
                      <linearGradient id="paint0_linear_1958_9666_3" x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#717DFF"/>
                        <stop offset="1" stopColor="#340E82"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_1958_9666_3_selected" x1="90.0573" y1="0.40625" x2="90.0573" y2="30.696" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B2FEB4"/>
                        <stop offset="1" stopColor="#2FEB49"/>
                      </linearGradient>
                    </defs>
                    <text x="90" y="20" textAnchor="middle" fill="white" fontSize="14" fontFamily="Noto Sans, sans-serif" fontWeight="600">
                      화면 3
                    </text>
                  </svg>
                </div>
              </div>
              
              {/* 프로필 게스트 div */}
              <div className="프로필게스트 flex justify-center items-center gap-[28px] mt-[10px]">
                {/* 프로필 아이템 4개 */}
                {[1, 2, 3, 4].map((index) => (
                  <ProfileItem key={index} screenId="screen3" itemIndex={index} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Button before Footer */}
      <div className="flex justify-center pb-8">
        <Button1 onClick={handleComplete}>
          완료
        </Button1>
      </div>

      {/* Footer */}
      <Footer />
      
      {/* 동영상 업로드 버튼들 */}
      <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '12px' }}>
        {/* 화면1 업로드 */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleVideoUpload(e, 'screen1')}
          style={{ display: 'none' }}
          id="video-upload-1"
        />
        <label
          htmlFor="video-upload-1"
          style={{
            display: 'inline-block',
            padding: '12px 20px',
            backgroundColor: '#717DFF',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            boxShadow: '0 4px 12px rgba(113, 125, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5a67d8';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#717DFF';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📹 화면1
        </label>

        {/* 화면2 업로드 */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleVideoUpload(e, 'screen2')}
          style={{ display: 'none' }}
          id="video-upload-2"
        />
        <label
          htmlFor="video-upload-2"
          style={{
            display: 'inline-block',
            padding: '12px 20px',
            backgroundColor: '#717DFF',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            boxShadow: '0 4px 12px rgba(113, 125, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5a67d8';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#717DFF';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📹 화면2
        </label>

        {/* 화면3 업로드 */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleVideoUpload(e, 'screen3')}
          style={{ display: 'none' }}
          id="video-upload-3"
        />
        <label
          htmlFor="video-upload-3"
          style={{
            display: 'inline-block',
            padding: '12px 20px',
            backgroundColor: '#717DFF',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            boxShadow: '0 4px 12px rgba(113, 125, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5a67d8';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#717DFF';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📹 화면3
        </label>
      </div>
    </PageTransition>
  )
}

