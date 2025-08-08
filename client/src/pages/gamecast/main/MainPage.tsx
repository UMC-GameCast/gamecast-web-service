import bg_image2 from "../../../assets/gamecast/main/bg_image2.png";
import gamecastLogo from "../../../assets/gamecast/main/Gamecast logo.svg";
import polygonArrow from "../../../assets/gamecast/main/Polygon 9.svg";
import ellipseCircle from "../../../assets/gamecast/main/Ellipse 2263.svg";
import earthImage from "../../../assets/gamecast/main/earth.png";
import screen1Image from "../../../assets/gamecast/main/screen1.png";
import miniScreen1 from "../../../assets/gamecast/main/mini_screen1.png";
import miniScreen2 from "../../../assets/gamecast/main/mini_screen2.png";
import miniScreen3 from "../../../assets/gamecast/main/mini_screen3.png";
import screen3Image from "../../../assets/gamecast/main/screen3.png";
import screen4Image from "../../../assets/gamecast/main/screen4.png";
import screen5Image from "../../../assets/gamecast/main/screen5.png";
import textImage from "../../../assets/gamecast/main/text.png";
import lineImage from "../../../assets/gamecast/main/line.png";
import { CTAButtons } from "../../../components/gamecast/main/CTAButtons";
import { PageTransition } from "../../../components/gamecast/common/PageTransition";

export const MainPage = () => {


  return (
    <PageTransition className="w-full min-h-screen bg-black relative overflow-hidden">

      {/* 메인 콘텐츠 - 스크롤 가능 */}
      <div className="relative z-10">
        
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 relative">
          {/* Earth Background Image */}
          <div 
            className="absolute bottom-0 left-0 w-full h-1/2 bg-contain bg-center bg-bottom bg-no-repeat z-[1]"
            style={{
              backgroundImage: `url(${earthImage})`
            }}
          ></div>
          
          <div className="max-w-[1440px] mx-auto text-center relative z-10">
            {/* 로고 */}
            <div className="mb-[134px]">
              <img src={gamecastLogo} alt="GAMECAST" className="mx-auto" />
            </div>
            
            {/* 메인 타이틀 */}
            <div className="relative mb-[74px]">
              {/* 그라데이션 원 배경 */}
              <div 
                className="absolute w-[1919px] h-[1919px] flex-shrink-0 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"
                style={{
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(68, 60, 179, 0.50) 0%, rgba(0, 0, 0, 0.00) 100%)'
                }}
              ></div>
              
              <h1 className="text-[48px] font-bold text-white leading-tight relative z-10">
                함께 플레이 하고 재미있는 영상을 만들자!
              </h1>
            </div>
            
            {/* 서브타이틀 */}
            <div className="text-[18px] text-white mb-[93px] space-y-1 leading-[150%] font-pretendard">
              <div>
                <span className="font-light">GameCast는 여러 명의 지인들과 게임을 함께 즐기고, </span>
                <span className="font-bold">AI를 통해 자동으로 편집해 주는 웹 서비스</span>
                <span className="font-light">에요</span>
              </div>
              <div>
                <span className="font-light">플레이어별로 </span>
                <span className="font-bold">캐릭터를 커스터마이징하여 개인화된 자막을 제공</span>
                <span className="font-light">하고 3가지의 자막 형태로</span>
                <span className="font-bold">역동적인 영상미를 제공 합니다!</span>
              </div>
              <div>
                
                <span className="font-light">지금 바로 친구와 함께 플레이하고 수익으로 연결되는 재밌는 소스를 얻어 가세요!</span>
              </div>
            </div>
            
            {/* CTA 버튼들 */}
            <CTAButtons />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-[200px] border-b border-[#A6A6A6]">
          <div className="max-w-[1440px] mx-auto text-center">
            <h2 className="text-white mb-4 text-center font-pretendard text-[47.412px] font-bold leading-[150%]" style={{letterSpacing: '0.948px'}}>
              GameCast에서 쉽게 영상을 만들고<br/>
              업로드하여 <span className="text-custom-pink">수익</span>까지 나아가보세요!
            </h2>
            
            <div className="flex flex-wrap justify-center items-center gap-8 mt-[130px]">
              {/* 첫 3개 원형을 묶은 그룹 */}
              <div className="flex gap-0">
                <div className="relative flex items-center justify-center flex-shrink-0 w-[206.497px] h-[206.497px]">
                  <img 
                    src={ellipseCircle} 
                    alt="원형 테두리" 
                    className="absolute inset-0 w-full h-full"
                  />
                  <span 
                    className="relative z-10 ilsang-font text-white text-center text-[20.394px] font-normal leading-[150%]"
                    style={{
                      fontFamily: '"87MM ILSANG", "Jua", "Noto Sans KR", Pretendard, sans-serif',
                      letterSpacing: '-0.387px'
                    }}
                  >
                    재밌는 소스<br/>자동 추출
                  </span>
                </div>
                <div className="relative flex items-center justify-center flex-shrink-0 w-[206.497px] h-[206.497px]">
                  <img 
                    src={ellipseCircle} 
                    alt="원형 테두리" 
                    className="absolute inset-0 w-full h-full"
                  />
                  <span 
                    className="relative z-10 ilsang-font text-white text-center text-[20.394px] font-normal leading-[150%]"
                    style={{
                      fontFamily: '"87MM ILSANG", "Jua", "Noto Sans KR", Pretendard, sans-serif',
                      letterSpacing: '-0.387px'
                    }}
                  >
                    플레이어 별<br/>자동 자막 생성
                  </span>
                </div>
                <div className="relative flex items-center justify-center flex-shrink-0 w-[206.497px] h-[206.497px]">
                  <img 
                    src={ellipseCircle} 
                    alt="원형 테두리" 
                    className="absolute inset-0 w-full h-full"
                  />
                  <span 
                    className="relative z-10 ilsang-font text-white text-center text-[20.394px] font-normal leading-[150%]"
                    style={{
                      fontFamily: '"87MM ILSANG", "Jua", "Noto Sans KR", Pretendard, sans-serif',
                      letterSpacing: '-0.387px'
                    }}
                  >
                    감정 강조 자막으로<br/>풍부한 영상
                  </span>
                </div>
              </div>
              
              {/* 화살표 */}
              <img 
                src={polygonArrow} 
                alt="화살표"
                className="flex-shrink-0"
                style={{
                  width: '55.996px',
                  height: '47.01px',
                  // transform: 'rotate(90deg)'
                }}
              />
              
              {/* 4번째 원형 */}
              <div className="relative flex items-center justify-center flex-shrink-0" style={{width: '206.497px', height: '206.497px'}}>
                <img 
                  src={ellipseCircle} 
                  alt="원형 테두리" 
                  className="absolute inset-0 w-full h-full"
                />
                <span 
                  className="relative z-10 ilsang-font"
                  style={{
                    color: '#FFF',
                    textAlign: 'center',
                    fontFamily: '"87MM ILSANG", "Jua", "Noto Sans KR", Pretendard, sans-serif',
                    fontSize: '20.394px',
                    fontStyle: 'normal',
                    fontWeight: '400',
                    lineHeight: '150%',
                    letterSpacing: '-0.387px'
                  }}
                >
                  Youtube<br/>TikTok<br/>Instagram
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Voice Chat Section */}
        <section className="py-[200px] border-b border-[#A6A6A6]">
          <div className="max-w-[1440px] mx-auto flex flex-col items-left">
            {/* 텍스트 영역 - 좌측 정렬 */}
            <div className="text-left mb-[74px]">
              <h2 className="text-white font-pretendard text-[50px] font-bold leading-[150%] mb-[74px]">
                따로 <span className="text-[#E338FF]">음성 채팅에 참가</span>하고<br/>
                녹화를 안해도 괜찮아요!
              </h2>
              <p className="text-[#E338FF] font-pretendard text-[30px] font-bold leading-[106%] mb-[23px]">
                "음성채팅도 들어오고 녹화도 각자해서 보내줘"
              </p>
              <p className="text-white font-pretendard text-[25px] font-light leading-[106%]">
                짧은 영상을 만들기 위해 귀찮았던 과정은 이제 그만! 간단하게 방을 만들고 참여하여 실시간 음성 채팅부터 화면 녹화까지 쉽게 진행해요!
              </p>
            </div>
            
            {/* 이미지 영역 */}
            <div className="w-full flex justify-center relative">
              {/* 큰 그라데이션 원 배경 - 이미지 중앙 세로축에 좌측 끝이 닿도록 배치 */}
              <div 
                className="absolute w-[3411.236px] h-[3411.236px] flex-shrink-0 rounded-full top-1/2 -translate-y-1/2 -z-20"
                style={{
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(176, 119, 255, 0.40) 18.75%, rgba(0, 0, 0, 0.00) 100%)',
                  left: 'calc(250% - 1705.618px - 25vw)'
                }}
              ></div>
              
              {/* 작은 그라데이션 원 배경 */}
              <div 
                className="absolute w-[1919px] h-[1919px] flex-shrink-0 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"
                style={{
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(68, 60, 179, 0.50) 0%, rgba(0, 0, 0, 0.00) 100%)'
                }}
              ></div>
              
              <img 
                src={screen1Image} 
                alt="음성 채팅 화면" 
                className="max-w-full h-auto relative z-10"
              />
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="py-[200px] text-center border-b border-[#A6A6A6]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-white text-center font-pretendard text-[50px] font-bold leading-[150%] mb-[70px] " style={{letterSpacing: '1px'}}>
              AI가 재밌는 소스를 추출하고, 사용자별로 <span className="text-[#E338FF]">자막을 생성</span>해요
            </h2>
            <p className="text-center font-pretendard text-[30px] font-bold leading-[106%] mb-[34px]" style={{color: 'rgba(227, 56, 255, 0.70)'}}>
              "언제 2시간 영상 다 보고 자막은 언제 넣지..."
            </p>
            <p className="text-white text-center font-pretendard text-[25px] font-light leading-[150%] mb-[82px]">
              AI를 통해 재밌는 소스를 추출해 주고 자막을 달아주기 때문에 <br/>
              영상 전체를 보는 시간을 없애고, 자막을 일일이 생성하지 않아도 돼요
            </p>
            {/* AI 이미지 영역 - 3개 이미지 flex 배치 */}
            <div className="flex justify-center items-center gap-auto mb-[px] max-w-[1009px] mx-auto">
              {/* 첫 번째 작은 이미지 */}
              <div style={{width: '171.46px', height: '166.33px'}}>
                <img 
                  src={miniScreen2} 
                  alt="AI 미니 스크린 1" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              {/* 큰 중앙 이미지 */}
              <div 
                className="mx-auto"
                style={{width: '227.62px'}}
              >
                <img 
                  src={miniScreen1} 
                  alt="AI 메인 스크린" 
                  className="w-full h-auto rounded-lg"
                />
              </div>
              
              {/* 두 번째 작은 이미지 */}
              <div style={{width: '171.46px', height: '166.33px'}}>
                <img 
                  src={miniScreen3} 
                  alt="AI 미니 스크린 3" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
            
            {/* 하단 큰 이미지 */}
            <div className="flex justify-center mt-8 relative">
              {/* 그라데이션 원 배경 - 하단 이미지 중심에서 오른쪽 100px 지점에 우측 끝이 닿도록 배치 */}
              <div 
                className="absolute w-[3411.236px] h-[3411.236px] flex-shrink-0 rounded-full top-1/2 -translate-y-1/2 -z-10"
                style={{
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(68, 60, 179, 0.50) 0%, rgba(0, 0, 0, 0.00) 100%)',
                  left: 'calc(50% + 200px - 3411.236px)'
                }}
              ></div>
              
              <div style={{width: '1009px'}}>
                <img 
                  src={screen3Image} 
                  alt="AI 전체 스크린" 
                  className="w-full h-auto rounded-lg relative z-10"
                />
              </div>
            </div>
          </div>
        </section>

                {/* Character Section */}
        <section className="py-[200px] relative">
          {/* 배경 이미지 - Character Section 중앙 아래 100px, 1:1 비율로 섹션 가로와 일치 */}
          <div 
            className="absolute left-1/2 -z-50"
            style={{
              backgroundImage: `url(${bg_image2})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              width: '100%',
              aspectRatio: '1/1',
              top: 'calc(50% + 100px)',
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
          
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 mb-[130px]">
              {/* 이미지 영역 */}
              <div className="flex-1">
                <div style={{width: '829.404px'}}>
                  <img 
                    src={screen4Image} 
                    alt="캐릭터 커스터마이징" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
              
              {/* 텍스트 영역 */}
              <div className="flex-1">
                <h2 className="text-white text-right font-pretendard text-[50px] font-bold leading-[150%] mb-[84px]" style={{letterSpacing: '-0.95px'}}>
                  플레이어별 캐릭터 자막으로<br/>
                  <span className="text-[#E338FF]">풍부한 영상미</span>를 제공해요
                </h2>
                <p className="text-right font-pretendard text-[30px] font-bold leading-[180%] mb-[30px]" style={{color: 'rgba(227, 56, 255, 0.70)'}}>
                  "누구 캐릭터 그릴 수 있는 사람 있어?"
                </p>
                <p className="text-white font-pretendard text-[25px] font-light leading-[180%] text-right">
                  협동 플레이 영상을 더 풍부하게 만들어주는 캐릭터 요소<br/>
                  게임할 시간도 없는데 언제 캐릭터 만들지 고민했던 지난날! 간단한 클릭으로 나만의 캐릭터를 만들 수 있어요
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 mb-[130px]">
              {/* 텍스트 영역 */}
              <div className="flex-1 mt-[200px]">
                <p className="text-left font-pretendard text-[30px] font-bold leading-[180%] mb-[30px]" style={{color: 'rgba(227, 56, 255, 0.70)'}}>
                  "이 부분... 더 재밌게 표현 할 수 없나?"
                </p>
                <p className="text-white font-pretendard text-[25px] font-light leading-[180%] text-left">
                영상 상황에 따라서 감정 강조 자막으로<br/> 
                자막 형태를 전환하여,플레이 할 때의 감정을<br/>
                영상으로 생생하게 전달 할 수 있어요
                </p>
              </div>
              
              {/* 이미지 영역 */}
              <div className="flex-1 relative">
                <div style={{width: '917px'}}>
                  <img 
                    src={screen5Image} 
                    alt="감정 강조 자막" 
                    className="w-full h-auto"
                  />
                </div>
                {/* 텍스트 이미지 오버레이 */}
                <div className="absolute top-[50px] left-[0px]">
                  <img 
                    src={textImage} 
                    alt="텍스트 오버레이" 
                    style={{width: '540px'}}
                    className="h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
          
        </section>


        {/* Footer Section */}
        <footer className="py-[130px] relative">
          {/* 상단 라인 이미지 */}
          <div 
            className="absolute top-0 left-0 w-full"
            style={{
              height: '60px',
              backgroundImage: `url(${lineImage})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          ></div>
          
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-8">
              <p className="text-gray-400 text-[16px]">Developer : 토토로, 톰, 초매</p>
              <p className="text-gray-400 text-[16px]">Design : 김모질, 맥쥬, 소정양주</p>
              <p className="text-gray-400 text-[16px]">PM : 초매</p>
            </div>
            <p className="text-white text-[16px] opacity-80">© 2025 UMC Project MARU</p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};