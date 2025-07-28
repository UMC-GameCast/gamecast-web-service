import React from "react";

interface ApplicationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicationSelectModal: React.FC<ApplicationSelectModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/50 flex items-center justify-end z-50">
      
      <div
        className="flex flex-col items-center"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '90vw',
          height: 'auto',
          maxHeight: '90vh',
          rowGap: '10px',
          flexWrap: 'wrap',
          aspectRatio: '1337.91/781.87',
          border: '1px solid #fff',
          background: '#181C3Ac2',
          borderRadius: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '40px 48px 32px 48px',
          minHeight: '600px',
          zIndex: 50,
          overflow: 'auto',
        }}
      >
        {/* 닫기 버튼 */}
        <button
          className="absolute top-[30px] right-[30px] cursor-pointer"
          onClick={onClose}
          style={{ zIndex: 10, background: 'transparent', border: 'none', padding: 0 }}
          aria-label="닫기"
        >
          <img src={"/src/assets/gamecast/common/button/cancel.svg"} alt="닫기" style={{ width: 36, height: 36 }} className="transition-transform duration-150 hover:scale-110 hover:shadow-lg" />
        </button>
        {/* 타이틀 */}
        <div className="w-full flex items-center justify-left relative" style={{height: 60}}>
          <img src={"/src/assets/gamecast/participate/underline/namebox-1.png"} alt="타이틀 배경" style={{position: 'absolute', left: 0, top: 0, height: 60, width: 'auto', zIndex: 0}} />
          <span
            className="text-white text-xl font-bold tracking-wide"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-510%, -50%)',
              color: '#fff',
              fontWeight: 700,
              zIndex: 1,
              whiteSpace: 'nowrap'
            }}
          >
            애플리케이션 창
          </span>
        </div>
        {/* 썸네일 그리드 */}
        <div className="grid grid-cols-3 gap-x-[8px] gap-y-[12px] w-full mb-10">
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
                className="rounded-[10px] border-2 border-[#7B6FF7] overflow-hidden mb-2 relative"
                style={{ width: 260, height: 150, background: "#22244A" }}
              >
                <img src={app.src} className="object-cover w-full h-full" />
                {/* namebox-2.svg 오른쪽 아래 */}
                <img src={"/src/assets/gamecast/participate/underline/namebox-2.svg"} alt="장식" style={{position: 'absolute', right: 8, bottom: 8, width: 48, height: 'auto', zIndex: 2}} />
                <span
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    width: 48,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 8,
                    zIndex: 3,
                    pointerEvents: 'none',
                  }}
                >
                  {app.name}
                </span>
              </div>
              </div>
          ))}
        </div>
        {/* 완료 버튼 */}
        <div className="w-full flex justify-center group">
          <button
            className="mt-2 relative flex items-center justify-center transition-transform duration-150 cursor-pointer"
            style={{ border: 'none', background: 'transparent', padding: 0 }}
            onClick={onClose}
          >
            <img src="/src/assets/gamecast/common/button/button3.svg" alt="완료 버튼" style={{ width: 180, height: 56 }} className="transition-transform duration-150 group-hover:scale-105 group-hover:shadow-lg" />
            <span
              className="transition-transform group-hover:scale-105"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: '-0.5px',
                pointerEvents: 'none',
              }}
            >
              완료
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
