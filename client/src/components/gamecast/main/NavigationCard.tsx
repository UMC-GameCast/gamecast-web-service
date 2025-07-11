import { useNavigate } from 'react-router-dom';

export const NavigationCard = () => {
  const navigate = useNavigate();

  const handleParticipate = () => {
    navigate('/participate');
  };

  const handleCreate = () => {
    navigate('/create');
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
            <h3 className="text-2xl font-bold text-white mb-2">새 방 만들기</h3>
            <p className="text-gray-300">
              새로운 게임 방을 생성하세요
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
    </div>
  );
} 