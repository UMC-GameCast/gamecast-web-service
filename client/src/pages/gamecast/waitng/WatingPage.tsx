import { Footer } from "../../../components/gamecast/common/Footer";
import { ParticipationCodeCard } from "../../../components/gamecast/participate/ParticipationCodeCard";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useNavigate } from 'react-router-dom'
import { Navigation } from "../../../components/gamecast/common/Navigation";
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
import { FrameAndButtons } from './FrameAndButtons';
import { CodeCardAndName } from './CodeCardAndName';

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
    navigate('/waiting');ㄴ
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative">
      
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

      {/* 오버레이: 모달이 열릴 때만 표시 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-red-500 z-40"
          style={{ opacity: 0.56}}
        />
      )}
      
      {/* 상단 네비게이션 영역 */}
      <Navigation>
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

      <main className="flex flex-row w-full h-full relative z-10">
        {/* 왼쪽 영역 */}
        <div className="flex-1 flex items-start justify-center relative" style={{ paddingLeft: "30px" }}>
          <CodeCardAndName />
        </div>
        {/* 오른쪽 영역 */}
        <div className="flex-1 flex items-start mt-[50px] justify-center relative">
          <FrameAndButtons />
        </div>
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />

      {/* 모달 */}
      <ApplicationSelectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {/* 이름명 아래 name.png 배치 (이전 코드 삭제됨, CodeCardAndName에서 렌더링됨) */}
    </div>
  );
}; 
