import React, { useState } from "react";
import ready1 from '../../../assets/gamecast/participate/frame/ready-1.png';
import ready2 from '../../../assets/gamecast/participate/frame/ready-2.png';
import ready3 from '../../../assets/gamecast/participate/frame/ready-3.png';
import ready4 from '../../../assets/gamecast/participate/frame/ready-4.png';
import ready5 from '../../../assets/gamecast/participate/frame/ready-5.png';
import button2_default from '../../../assets/gamecast/common/button/button2_default.png';
import { ApplicationSelectModal } from './Modal';

export const FrameAndButtons: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 프레임 상태 하드코딩 예시
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

  return (
    <div className="flex flex-col gap-[41px] items-center">
      <div className="flex flex-col gap-[41px] items-center">
        {/* 프레임 4개 렌더링 */}
        {[0, 1].map(rowIdx => (
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
        ))}
      </div>
      <div className="flex gap-[24.99px] justify-center items-center mt-8">
        <div className="relative w-[174.6px] h-[48px]">
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
      {/* 모달 */}
      <ApplicationSelectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
