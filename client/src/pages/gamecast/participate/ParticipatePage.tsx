import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { ParticipationCodeCard } from "../../../components/gamecast/participate/ParticipationCodeCard";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";

/**
 * ParticipatePage Props 인터페이스
 * 페이지 전환을 위한 setPage 함수를 받습니다
 */
interface Props {
  setPage: (page: "main" | "participate" | "create" | "room") => void;
}

/**
 * 게임 참가 페이지 컴포넌트
 * 사용자가 게임에 참가하기 위해 초대 코드를 입력하는 페이지입니다
 * 
 * @param setPage - 페이지 전환을 위한 함수
 * @returns 참가 페이지 JSX 엘리먼트
 */
export const ParticipatePage = ({ setPage }: Props) => {
  
  // 방 참여 성공 핸들러
  const handleJoinSuccess = () => {
    setPage("room");
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden" style={{ minWidth: '1821px', minHeight: '1064px' }}>
      
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
          onClick={() => setPage("main")}
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
        {/* 참가 코드 입력 카드 */}
        <ParticipationCodeCard onJoinSuccess={handleJoinSuccess} />
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />
    </div>
  );
}; 