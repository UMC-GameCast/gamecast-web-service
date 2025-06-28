import React from "react";

interface NavigationCardProps {
  onNavigate?: (page: 'main' | 'participate' | 'create') => void;
}

export const NavigationCard = ({ onNavigate }: NavigationCardProps) => {
  const handleParticipate = () => {
    console.log("참여하기 버튼 클릭됨!", onNavigate);
    if (onNavigate) {
      console.log("onNavigate 함수 호출 중...");
      onNavigate('participate');
    } else {
      console.log("onNavigate 함수가 없습니다");
      alert("참여하기 페이지로 이동합니다!");
    }
  };

  const handleCreate = () => {
    console.log("방 만들기 버튼 클릭됨!", onNavigate);
    if (onNavigate) {
      console.log("onNavigate 함수 호출 중...");
      onNavigate('create');
    } else {
      console.log("onNavigate 함수가 없습니다");
      alert("방 만들기 페이지로 이동합니다!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* 참여하기 카드 */}
        <div 
          onClick={handleParticipate}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center group hover:bg-white/15 transition-all duration-300 cursor-pointer border border-white/20 hover:border-white/40"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">방 참여하기</h3>
            <p className="text-gray-300">
              입장코드를 입력하여<br />
              이미 만들어진 방에 참여하세요
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleParticipate();
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 group-hover:shadow-lg"
          >
            참여하기
          </button>
        </div>

        {/* 방 만들기 카드 */}
        <div 
          onClick={handleCreate}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center group hover:bg-white/15 transition-all duration-300 cursor-pointer border border-white/20 hover:border-white/40"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">새 방 만들기</h3>
            <p className="text-gray-300">
              새로운 게임 방을 만들어<br />
              친구들을 초대해보세요
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleCreate();
            }}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 group-hover:shadow-lg"
          >
            방 만들기
          </button>
        </div>
      </div>

      {/* 추가 안내 */}
      <div className="text-center mt-12">
        <div className="bg-white/5 backdrop-blur rounded-lg p-6 max-w-2xl mx-auto">
          <h4 className="text-lg font-semibold text-white mb-2">🎮 게임캐스트란?</h4>
          <p className="text-gray-300 text-sm">
            실시간으로 친구들과 함께 게임을 즐길 수 있는 플랫폼입니다. 
            방을 만들거나 참여하여 특별한 게임 경험을 시작해보세요!
          </p>
        </div>
      </div>
    </div>
  );
}; 