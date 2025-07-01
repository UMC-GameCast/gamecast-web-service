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
          <div className="flex gap-[80px] justify-center items-center">
            <img src={Framenotready} alt="프레임 준비 안됨" className="w-[232px] h-[335px]" />
            <img src={Framenotready} alt="프레임 준비 안됨" className="w-[232px] h-[335px]" />
          </div>
          <div className="flex gap-[80px] justify-center items-center">
            <img src={Framenotready} alt="프레임 준비 안됨" className="w-[232px] h-[335px]" />
            <img src={Framenotready} alt="프레임 준비 안됨" className="w-[232px] h-[335px]" />
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div
            className="relative rounded-2xl shadow-2xl flex flex-col items-center"
            style={{
              background: "#181C3A",
              width: 900,
              minHeight: 600,
              padding: "40px 48px 32px 48px",
              borderRadius: "32px",
            }}
          >
            {/* 닫기 버튼 */}
            <button
              className="absolute top-6 right-6 text-white text-3xl hover:text-blue-300"
              onClick={() => setIsModalOpen(false)}
              style={{ zIndex: 10 }}
              aria-label="닫기"
            >
              ×
            </button>
            {/* 타이틀 */}
            <div className="w-full flex items-center mb-8">
              <div className="text-white text-xl font-bold tracking-wide border-b-4 border-[#7B6FF7] pb-2 pl-2 pr-6" style={{borderRadius: "8px 8px 0 0", display: "inline-block"}}>
                애플리케이션 창
              </div>
            </div>
            {/* 썸네일 그리드 */}
            <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full mb-10">
              {/* 각 썸네일 */}
              {[
                { name: "오버워치", src: "https://via.placeholder.com/260x150?text=오버워치" },
                { name: "배틀그라운드", src: "https://via.placeholder.com/260x150?text=배틀그라운드" },
                { name: "전북대", src: "https://via.placeholder.com/260x150?text=전북대" },
                { name: "미드저니", src: "https://via.placeholder.com/260x150?text=미드저니" },
                { name: "구글", src: "https://via.placeholder.com/260x150?text=구글" },
                { name: "유튜브", src: "https://via.placeholder.com/260x150?text=유튜브" },
              ].map((app, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className="rounded-xl border-2 border-[#7B6FF7] overflow-hidden mb-2"
                    style={{ width: 260, height: 150, background: "#22244A" }}
                  >
                    <img src={app.src} alt={app.name} className="object-cover w-full h-full" />
                  </div>
                  <div
                    className="bg-[#7B6FF7] text-white text-sm font-semibold rounded-b-lg px-4 py-1"
                    style={{ minWidth: 80, textAlign: "center", marginTop: "-8px" }}
                  >
                    {app.name}
                  </div>
                </div>
              ))}
            </div>
            {/* 완료 버튼 */}
            <button
              className="mt-2 px-16 py-3 rounded-lg text-lg font-bold"
              style={{
                background: "#23265A",
                color: "#fff",
                border: "2px solid #7B6FF7",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
              onClick={() => setIsModalOpen(false)}
            >
              완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 
