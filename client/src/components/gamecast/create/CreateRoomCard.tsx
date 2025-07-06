import React, { useState } from "react";
import bgImage from "../../../assets/gamecast/participate/participateBG.png";
import participateLogo from "../../../assets/gamecast/participate/participateLogo.svg";
import participatetextinputcardD1 from "../../../assets/gamecast/participate/participateTextInputCard_D1.png";
import { Button1 } from "../common/Button1";
import { ErrorMessage } from "../common/ErrorMessage";
import { createRoom } from "../../../utils/roomManager";

interface Props {
  onCreateSuccess?: () => void;
}

/**
 * 방 생성 카드 컴포넌트
 * 방 이름 입력과 인원 수 설정을 통해 새로운 게임 방을 생성하는 카드입니다
 */
export const CreateRoomCard = ({ onCreateSuccess }: Props) => {
  // 방 이름 상태 관리
  const [roomName, setRoomName] = useState("");
  
  // 인원 수 상태 관리 (기본값: 2명, 최소 2명, 최대 5명)
  const [playerCount, setPlayerCount] = useState(2);
  const minPlayers = 2;
  const maxPlayers = 5;
  
  // 에러 메시지 상태
  const [error, setError] = useState("");
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [externalErrorTrigger, setExternalErrorTrigger] = useState(false);

  // 클릭 시 유효성 검사 함수
  const validateInput = (): string | null => {
    console.log("🔍 CreateRoom validation - roomName:", `"${roomName}"`);
    
    // 1. 빈 문자열 체크
    if (!roomName) {
      return "방 이름을 입력해주세요.";
    }
    
    // 2. 공백만 있는 경우 체크
    if (!roomName.trim()) {
      return "방 이름을 입력해주세요.";
    }
    
    // 3. 너무 짧은 경우 체크
    if (roomName.trim().length < 2) {
      return "방 이름은 최소 2글자 이상이어야 합니다.";
    }
    
    // 4. 너무 긴 경우 체크
    if (roomName.trim().length > 15) {
      return "방 이름은 최대 15글자까지 가능합니다.";
    }
    
    console.log("✅ CreateRoom validation passed");
    return null;
  };

  // 에러 메시지 처리 함수
  const handleValidationError = (message: string) => {
    console.log("🔴 CreateRoom error:", message);
    setError(message);
    // 에러 메시지를 조금 더 오래 유지
    setTimeout(() => {
      console.log("🕒 Error message will persist until resolved");
    }, 100);
  };

  // 방 생성 핸들러
  const handleCreateRoom = async () => {
    // 유효성 검사는 Button1 내부에서 처리됨
    setIsLoading(true);
    setError("");
    
    try {
      const result = createRoom({
        roomName: roomName.trim(),
        maxPlayers: playerCount
        // hostName 제거 - 자동으로 "Nickname1"로 설정됨
      });
      
      if (result.success) {
        console.log("방 생성 성공:", result.room);
        onCreateSuccess?.();
      } else {
        const errorMessage = result.error || "방 생성에 실패했습니다.";
        console.log("🔴 CreateRoom API error:", errorMessage);
        setError(errorMessage);
        // API 에러 시에도 진동 효과 트리거
        triggerExternalError();
      }
    } catch {
      const errorMessage = "방 생성 중 오류가 발생했습니다.";
      console.log("🔴 CreateRoom exception:", errorMessage);
      setError(errorMessage);
      // Exception 시에도 진동 효과 트리거
      triggerExternalError();
    } finally {
      setIsLoading(false);
    }
  };

  // 외부 에러 트리거 함수
  const triggerExternalError = () => {
    setExternalErrorTrigger(true);
    // 즉시 false로 초기화하여 다음 에러에도 트리거 가능하게 함
    setTimeout(() => setExternalErrorTrigger(false), 50);
  };

  // 인원 수 증가 핸들러
  const incrementPlayerCount = () => {
    if (playerCount < maxPlayers) {
      setPlayerCount(playerCount + 1);
    }
  };

  // 인원 수 감소 핸들러
  const decrementPlayerCount = () => {
    if (playerCount > minPlayers) {
      setPlayerCount(playerCount - 1);
    }
  };

  // 방 이름 입력 핸들러
  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 15) { // 방 이름 15자리 제한
      setRoomName(value);
      if (error) {
        console.log("🟢 CreateRoom error cleared by input change");
        setError(""); // 입력 시 에러 메시지 초기화
      }
    }
  };

  return (
    <div 
      className="w-[560px] h-[425px] bg-center bg-no-repeat flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: '100% 100%'
      }}
    >
      {/* 로고 영역 */}
      <div className="participateLogo mb-[30px]">
        <img src={participateLogo} alt="participateLogo" />
      </div>

      {/* 방 이름 입력 영역 */}
      <div className="roomNameInput w-[307px] h-[44px] relative mb-[40px]">
        <div className="w-[311px] h-[44px] relative">
          <div className="w-[307px] h-[44px] relative">
            <div className="absolute left-[23px] top-0 text-[#e8e6fd] font-bold text-[17.5px] leading-[26.3px] tracking-[-0.33px] text-center whitespace-nowrap h-[26px]">
              방 이름
            </div>
            <div className="absolute left-0 top-[17px] w-[307px] h-[27px]">
              {/* 방 이름 입력 필드 */}
              <input
                type="text"
                value={roomName}
                onChange={handleRoomNameChange}
                maxLength={15}
                placeholder="방 이름 입력"
                className="absolute left-[143px] top-0 w-[120px] h-[19px] bg-transparent text-[#e8e6fd] placeholder-[#86868b] font-normal text-[12.6px] leading-[18.8px] tracking-[-0.24px] outline-none border-none text-center"
              />
              {/* 입력 필드 배경 이미지 */}
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
        
        {/* 에러 메시지 - 방 이름 입력 영역 아래 */}
        <div className="absolute right-[0px] top-[53px]">
          <ErrorMessage 
            message={error}
            show={!!error}
          />
        </div>
      </div>

      {/* 인원 수 조절 스템퍼 영역 */}
      <div className="playerCountStepper w-[307px] h-[44px] relative mb-[40px]">
        <div className="w-[311px] h-[44px] relative">
          <div className="w-[307px] h-[44px] relative">
            {/* 인원 수 라벨 */}
            <div className="absolute left-[23px] top-0 text-[#e8e6fd] font-bold text-[17.5px] leading-[26.3px] tracking-[-0.33px] text-center whitespace-nowrap h-[26px]">
              인원 수
            </div>
            <div className="absolute left-0 top-[17px] w-[307px] h-[27px]">
              {/* 스템퍼 컨트롤 */}
              <div className="absolute left-[135px] bottom-[15px] w-[147px] h-[19px] flex items-center justify-center gap-[45px]">
                {/* 감소 버튼 */}
                <button
                  onClick={decrementPlayerCount}
                  disabled={playerCount <= minPlayers}
                  className="w-[25px] h-[25px] bg-[#272A5E] text-[#e8e6fd] border border-[#6b6bb8] rounded-full font-bold text-[16px] flex items-center justify-center hover:bg-[#3a3a7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ minWidth: '25px', minHeight: '25px' }}
                >
                  -
                </button>
                
                {/* 인원 수 표시 */}
                <span className="text-[#e8e6fd] font-bold text-[14px] min-w-[30px] text-center">
                  {playerCount}명
                </span>
                
                {/* 증가 버튼 */}
                <button
                  onClick={incrementPlayerCount}
                  disabled={playerCount >= maxPlayers}
                  className="w-[25px] h-[25px] bg-[#272A5E] text-[#e8e6fd] border border-[#6b6bb8] rounded-full font-bold text-[16px] flex items-center justify-center hover:bg-[#3a3a7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ minWidth: '25px', minHeight: '25px' }}
                >
                  +
                </button>
              </div>
              
              {/* 배경 이미지 */}
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

      {/* 방 생성 버튼 */}
      <div>
        <Button1 
          onClick={handleCreateRoom}
          disabled={isLoading}
          loading={isLoading}
          onValidate={validateInput}
          onError={handleValidationError}
          externalError={externalErrorTrigger}
        >
          {isLoading ? "생성 중..." : "방 생성하기"}
        </Button1>
      </div>
    </div>
  );
}; 