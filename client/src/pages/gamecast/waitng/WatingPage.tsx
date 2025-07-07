import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { ParticipationCodeCard } from "../../../components/gamecast/participate/ParticipationCodeCard";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useNavigate } from 'react-router-dom'
import fiStar from '../../../assets/gamecast/participate/fi_star.svg'
import Framenotready from '../../../assets/gamecast/participate/Framenotready.png'
import Frameready from '../../../assets/gamecast/participate/Frameready.png'
import button2_default from '../../../assets/gamecast/common/button/button2_default.png'
import { useState } from "react";
import ready1 from '../../../assets/gamecast/participate/frame/ready-1.png';
import ready2 from '../../../assets/gamecast/participate/frame/ready-2.png';
import ready3 from '../../../assets/gamecast/participate/frame/ready-3.png';
import ready4 from '../../../assets/gamecast/participate/frame/ready-4.png';
import ready5 from '../../../assets/gamecast/participate/frame/ready-5.png';
import roomnameUnderline from '../../../assets/gamecast/participate/underline/roomname.png';
import nameUnderline from '../../../assets/gamecast/participate/underline/name.png';
import { ApplicationSelectModal } from './Modal';

/**
 * 게임 참가 페이지 컴포넌트
 * 사용자가 게임에 참가하기 위해 초대 코드를 입력하는 페이지입니다
 * 
 * @returns 참가 페이지 JSX 엘리먼트
 */
export const WatingPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 방 참여 성공 핸들러
  const handleJoinSuccess = () => {
    navigate('/waiting');
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden">
      
      {/* 배경 장식 이미지 */}
      {/* 
        - 화면 전체를 덮는 장식 요소
        - object-fill: 화면 크기에 맞춰 비율 무시하고 늘어남
        - opacity-60: 60% 투명도로 콘텐츠를 가리지 않음
        - pointer-events-none: 클릭 이벤트 차단
        - z-0: 가장 뒤쪽 레이어에 배치
      */}
      <img 
        src="/assets/gamecast/participate/desingBG.png"
        alt="배경 장식"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-60"
      />
      
      {/* 상단 네비게이션 영역 */}
      <Navigation>
        {/* 방제목/입장코드 텍스트와 밑줄 이미지 */}
        <div className="absolute" style={{ left: '50vw', top: '50vh' }}>
          <div className="flex gap-16 items-end">
            <div className="flex flex-col items-center">
              <span className="text-white text-lg font-bold mb-1">방제목</span>
              <img src={roomnameUnderline} alt="방제목 밑줄" className="w-[307px] h-[38px] object-contain" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white text-lg font-bold mb-1">입장코드</span>
              <img src={nameUnderline} alt="입장코드 밑줄" className="w-[365px] h-[46.98px] object-contain" />
            </div>
          </div>
        </div>
        {/* 뒤로가기 버튼 - 메인 페이지로 이동 */}
        <BackButton1
          onClick={() => navigate("/")}
          className="absolute left-[14%] top-[150px] z-20"
        />
      </Navigation>
      
      {/* 메인 콘텐츠 영역 */}
      {/* 
        - flex-1: 사용 가능한 공간을 모두 차지
        - flex items-center justify-center: 수직/수평 중앙 정렬
        - relative z-10: 배경 이미지보다 앞에 표시
      */}

      <main className="flex-1 flex justify-center relative z-10">
        <div>   {/* 참가 코드 입력 카드 */}
          <img
            src={fiStar}
            alt="별 아이콘"
            className="absolute z-10"
            style={{ left: 479.71, top: 337.92, width: 56, height: 57, position: 'absolute' }}
          />
                    {/* 아래 장식용 그라데이션 원 */}
          <div className="absolute mt-[844px] ml-[567px]"
            style={{
              width: '548px',
              height: '76px',
              borderRadius: '547.968px',
              background: 'radial-gradient(55.37% 55.37% at 50% 50%, rgba(32, 35, 245, 0.81) 0%, rgba(134, 219, 255, 0.10) 55.77%, rgba(0, 4, 57, 0.00) 100%)',
              marginTop: '32px',
            }}
          />
        </div>



        <div className="ml-[1126px]">
        <div className="flex flex-col gap-[41px]  items-center">
          <div className="flex flex-col gap-[41px] items-center">  {/* 프레임 전체를 감싸는 div */}
            {/* 예시: 각 프레임의 상태를 하드코딩 배열로 구현 (실제 연동은 추후) */}
            {/* 상태: 'host', 'locked', 'ready', 'character', 'default' */}
            {(() => {
              // 예시: 4개의 프레임 상태를 하드코딩 (실제 로직 연동 필요)
              const frameStates = ['default', 'default', 'default', 'default'];
              const getFrameImage = (state: string) => {
                switch (state) {
                  case 'host': return ready1;
                  case 'locked': return ready2;
                  case 'ready': return ready3;
                  case 'character': return ready4;
                  default: return ready5;
                }
              };
              // 2행 2열(총 4개)만 렌더링
              return [0, 1].map(rowIdx => (
                <div key={rowIdx} className="flex gap-[80px] justify-center items-center">
                  {[0, 1].map(colIdx => {
                    const idx = rowIdx * 2 + colIdx;
                    const state = frameStates[idx] || 'default';
                    return (
                      <img
                        key={colIdx}
                        src={getFrameImage(state)}
                        alt={`프레임 ${state}`}
                        className="w-[232px] h-[335px]"
                      />
                    );
                  })}
                </div>
              ));
            })()}
          </div>
          <div className="flex gap-[24.99px] justify-center items-center mt-8">
            <div
              className="relative w-[174.6px] h-[48px]"
            >
              <img src={button2_default} alt="버튼1" className="w-[174.6px] h-[48px]" />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '150%',
                  letterSpacing: '-0.285px',
                }}
              >캐릭터 설정</span>
            </div>
            <div
              className="relative w-[174.6px] h-[48px] cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              <img src={button2_default} alt="버튼2" className="w-[174.6px] h-[48px]" />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '150%',
                  letterSpacing: '-0.285px',
                }}
              >녹화화면 설정</span>
            </div>
            <div className="relative w-[174.6px] h-[48px]">
              <img src={button2_default} alt="버튼3" className="w-[174.6px] h-[48px]" />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '150%',
                  letterSpacing: '-0.285px',
                }}
              >준비하기</span>
            </div>
          </div>

        </div>
        </div>
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />

      {/* 모달 */}
      <ApplicationSelectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {/* 이름명 아래 name.png 배치 */}
      <div className="absolute left-[50%] bottom-[120px] -translate-x-1/2 flex flex-col items-center z-20">
        <span className="text-white text-xl font-bold mb-2">이름명</span>
        <img src={nameUnderline} alt="이름명 밑줄" className="w-[365px] h-[46.98px] object-contain" />
      </div>
    </div>
  );
}; 
