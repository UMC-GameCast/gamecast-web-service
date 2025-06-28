import React, { useState } from "react";
import bgImage from "../../../assets/gamecast/participate/participateBG.png";
import participateLogo from "../../../assets/gamecast/participate/participateLogo.svg";
import participatetextinputcardD1 from "../../../assets/gamecast/participate/participateTextInputCard_D1.png";
import { Button1 } from "../common/Button1";

export const ParticipationCodeCard = () => {
  const [inputValue, setInputValue] = useState("");

  const handleParticipate = () => {
    console.log("참가하기 버튼 클릭됨! 입력된 코드:", inputValue);
    // 여기에 실제 참가 로직 추가
  };

  return (
    <div 
      className="w-[560.68px] h-[424.11px] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${bgImage})`
      }}
    >
        <div className="participateLogo mb-[50px]">
            <img src={participateLogo} alt="participateLogo" />
        </div>
        <div className="participateInput w-[307px] h-[44px] relative mb-[70px]">
          <div className="w-[311px] h-[44px] relative">
            <div className="w-[307px] h-[44px] relative">
              <div className="absolute left-[23px] top-0 text-[#e8e6fd] font-bold text-[17.5px] leading-[26.3px] tracking-[-0.33px] text-center whitespace-nowrap h-[26px]">
                입장코드
              </div>
              <div className="absolute left-0 top-[17px] w-[307px] h-[27px]">
                {/* 입력 필드 오버레이 */}
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="텍스트 입력"
                  className="absolute left-[153px] top-0 w-[120px] h-[19px] bg-transparent text-[#e8e6fd] placeholder-[#86868b] font-normal text-[12.6px] leading-[18.8px] tracking-[-0.24px] outline-none border-none text-center"
                />
                {/* 이미지 */}
                <div className="absolute left-0 top-[12px] w-[307px] h-[15px]">
                  <img 
                    className="w-full h-full object-cover"
                    src={participatetextinputcardD1} 
                    alt="participatetextinputcardD1" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Button1 컴포넌트 사용 - 위쪽 여백 추가 */}
        <div>
          <Button1 
            onClick={handleParticipate}
          >
            참가하기
          </Button1>
        </div>
    </div>
  );
}; 

