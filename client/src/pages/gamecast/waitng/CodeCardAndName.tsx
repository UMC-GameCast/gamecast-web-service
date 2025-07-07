import React from "react";
import fiStar from '../../../assets/gamecast/participate/fi_star.svg';
import nameUnderline from '../../../assets/gamecast/participate/underline/name.png';
import roomnameUnderline from '../../../assets/gamecast/participate/underline/roomname.png';

export const CodeCardAndName: React.FC = () => {
  return (
    <div className="relative w-[400px] h-full flex flex-col">
      {/* 방제목/입장코드 */}
      <div className="mt-12 ml-16 z-10">
        <div className="flex gap-x-12 items-end">
          <div className="flex flex-col items-center">
            <span className="text-white text-xl font-bold mb-1">방제목</span>
            <img src={roomnameUnderline} alt="방제목 밑줄" className="w-[287px] h-[35.5px] object-contain" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white text-xl font-bold mb-1">입장코드</span>
            <img src={nameUnderline} alt="입장코드 밑줄" className="w-[287px] h-[35.5px] object-contain" />
          </div>
        </div>
      </div>


      <div className="flex h-[600px]">
              {/* 별 아이콘 */}
        <img
          src={fiStar}
          alt="별 아이콘"
          className="absolute left-[0px] top-[80px] z-10"
        />

        {/* 그라데이션 원 */}
        <div
          className="absolute left-[-100px] bottom-[200px] z-0"
          style={{
            width: '512px',
            height: '71.1px',
            borderRadius: '300px',
            background: 'radial-gradient(55.37% 55.37% at 50% 50%, rgba(32, 35, 245, 0.81) 0%, rgba(134, 219, 255, 0.10) 55.77%, rgba(0, 4, 57, 0.00) 100%)',
            filter: 'blur(2px)',
          }}
        />
      </div>

      {/* 이름명 */}
      <div className="flex z-20">
        <span className="text-white text-xl font-bold mb-2">이름명</span>
        <img src={nameUnderline} alt="이름명 밑줄" className="w-[341px] h-[43.9px] object-contain" />
      </div>
    </div>
  );
};
