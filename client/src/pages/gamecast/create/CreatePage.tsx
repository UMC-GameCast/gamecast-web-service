// 필요한 컴포넌트들을 import
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { CreateRoomCard } from "../../../components/gamecast/create/CreateRoomCard";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useNavigate } from 'react-router-dom'

/**
 * 게임 방 생성 페이지 컴포넌트
 * 사용자가 새로운 게임 방을 생성하는 페이지입니다
 * 
 * @returns 방 생성 페이지 JSX 엘리먼트
 */
export const CreatePage = () => {
  const navigate = useNavigate();
  
  // 방 생성 성공 핸들러
  const handleCreateSuccess = () => {
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
      <main className="flex-1 flex items-center justify-center relative z-10">
        {/* 방 생성 카드 */}
        <CreateRoomCard onCreateSuccess={handleCreateSuccess} />
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />
    </div>
  );
}; 