import React, { useState } from "react";
import bgImage from "../../../assets/gamecast/participate/participateBG.png";
import participateLogo from "../../../assets/gamecast/participate/participateLogo.svg";
import participatetextinputcardD1 from "../../../assets/gamecast/participate/participateTextInputCard_D1.png";
import { Button1 } from "../common/Button1";
import { ErrorMessage } from "../common/ErrorMessage";
import { joinRoom, getRoomInfo } from "../../../utils/roomManager";

interface Props {
  onJoinSuccess?: () => void;
}

export const ParticipationCodeCard = ({ onJoinSuccess }: Props) => {
  const [entryCode, setEntryCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [externalErrorTrigger, setExternalErrorTrigger] = useState(false);

  // 클릭 시 유효성 검사 함수
  const validateInput = (): string | null => {
    console.log("🔍 Participate validation - entryCode:", `"${entryCode}"`);
    
    // 1. 빈 문자열 체크
    if (!entryCode) {
      return "입장코드를 입력해주세요.";
    }
    
    // 2. 공백만 있는 경우 체크
    if (!entryCode.trim()) {
      return "입장코드를 입력해주세요.";
    }
    
    // 3. 길이 체크 (6자리)
    if (entryCode.trim().length !== 6) {
      return "입장코드는 6자리여야 합니다.";
    }
    
    // 4. 영숫자만 허용
    const validPattern = /^[A-Z0-9]+$/;
    if (!validPattern.test(entryCode.trim().toUpperCase())) {
      return "입장코드는 영문과 숫자만 가능합니다.";
    }
    
    console.log("✅ Participate validation passed");
    return null;
  };

  // 에러 메시지 처리 함수
  const handleValidationError = (message: string) => {
    console.log("🔴 Participate error:", message);
    setError(message);
    // 에러 메시지를 조금 더 오래 유지
    setTimeout(() => {
      console.log("🕒 Error message will persist until resolved");
    }, 100);
  };

  const handleParticipate = async () => {
    // 유효성 검사는 Button1 내부에서 처리됨
    setIsLoading(true);
    setError("");
    
    try {
      // 1단계: 방 정보 조회하여 현재 참여자 수 확인
      const roomInfo = await getRoomInfo(entryCode.trim().toUpperCase());
      
      if (!roomInfo.success || !roomInfo.room) {
        const errorMessage = roomInfo.error || "방을 찾을 수 없습니다.";
        console.log("🔴 RoomInfo error:", errorMessage);
        setError(errorMessage);
        triggerExternalError();
        return;
      }
      
      // 2단계: 현재 참여자 수에 따라 순차적 닉네임 생성
      const currentCapacity = roomInfo.room.currentCapacity || 0;
      const nextNicknameNumber = currentCapacity + 1;
      const nickname = `Nickname${nextNicknameNumber}`;
      
      console.log(`🏷️ 자동 닉네임 생성: ${nickname} (현재 참여자: ${currentCapacity}명)`);
      
      // 3단계: 생성된 닉네임으로 방 참여
      const result = await joinRoom({
        roomCode: entryCode.trim().toUpperCase(),
        nickname: nickname // 순차적 닉네임 (Nickname2, Nickname3, ...)
      });
      
      if (result.success) {
        console.log("방 참여 성공:", result.room);
        onJoinSuccess?.();
      } else {
        const errorMessage = result.error || "방 참여에 실패했습니다.";
        console.log("🔴 JoinRoom API error:", errorMessage);
        setError(errorMessage);
        // API 에러 시에도 진동 효과 트리거
        triggerExternalError();
      }
    } catch (error) {
      let errorMessage = "방 참여 중 오류가 발생했습니다.";
      
      // 에러 객체에서 더 구체적인 메시지 추출
      if (error instanceof Error) {
        if (error.message.includes('CONFLICT')) {
          errorMessage = "방 인원이 가득 찼습니다.";
        } else if (error.message.includes('NOT_FOUND')) {
          errorMessage = "존재하지 않는 방입니다.";
        } else if (error.message.includes('NETWORK_ERROR')) {
          errorMessage = "네트워크 연결을 확인해주세요.";
        } else if (error.message.includes('CORS')) {
          errorMessage = "서버 접근 권한 오류가 발생했습니다.";
        } else {
          // 기타 에러 메시지 그대로 사용
          errorMessage = error.message || errorMessage;
        }
      }
      
      console.log("🔴 JoinRoom exception:", error, "→ 사용자 메시지:", errorMessage);
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

  // 입장코드 입력값 변경 핸들러 - 6자리 제한
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 6) {
      setEntryCode(value);
      if (error) {
        console.log("🟢 Participate error cleared by input change");
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
      <div className="participateLogo mb-[40px]">
        <img src={participateLogo} alt="participateLogo" />
      </div>
      
      {/* 입장코드 입력 영역 */}
      <div className="participateInput w-[307px] h-[44px] relative mb-[50px]">
        <div className="w-[311px] h-[44px] relative">
          <div className="w-[307px] h-[44px] relative">
            <div className="absolute left-[23px] top-0 text-[#e8e6fd] font-bold text-[17.5px] leading-[26.3px] tracking-[-0.33px] text-center whitespace-nowrap h-[26px]">
              입장코드
            </div>
            <div className="absolute left-0 top-[17px] w-[307px] h-[27px]">
              <input
                type="text"
                value={entryCode}
                onChange={handleCodeChange}
                maxLength={6}
                placeholder="입장코드 입력"
                className="absolute left-[153px] top-0 w-[120px] h-[19px] bg-transparent text-[#e8e6fd] placeholder-[#86868b] font-normal text-[16px] leading-[18.8px] tracking-[-0.24px] outline-none border-none text-center"
              />
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
        
        {/* 에러 메시지 - 입력 영역 오른쪽 아래 */}
        <div className="absolute right-[0px] top-[53px]">
          <ErrorMessage 
            message={error}
            show={!!error}
          />
        </div>
      </div>

      {/* 참가 버튼 */}
      <div className="mt-[20px]">
        <Button1 
          onClick={handleParticipate}
          disabled={isLoading}
          loading={isLoading}
          onValidate={validateInput}
          onError={handleValidationError}
          externalError={externalErrorTrigger}
        >
          {isLoading ? "참가 중..." : "참가하기"}
        </Button1>
      </div>
    </div>
  );
}; 

