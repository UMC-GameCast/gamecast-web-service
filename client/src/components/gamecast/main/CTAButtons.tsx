import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export const CTAButtons = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string, element: HTMLButtonElement) => {
    element.style.background = 'linear-gradient(135deg, #C83CFF 0%, #7A4DFF 50%, #D8CAFF 100%)';
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <div className="flex justify-center gap-[61.2px]">
      <motion.button 
        className="w-[285.9784px] h-[66.7884px] rounded-[33.39px] bg-black border-[2.59px] border-white text-white font-pretendard text-[27.585px] font-semibold leading-[150%] tracking-[-0.524px] transition-all duration-300 ease-out hover:shadow-[0_0_30px_rgba(200,60,255,0.44),0_0_50px_rgba(122,77,255,0.19),0_0_70px_rgba(216,202,255,0.09)] hover:border-custom-purple"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#FFFFFF';
          e.currentTarget.style.background = 'black';
        }}
        onClick={(e) => handleNavigation('/create', e.currentTarget)}
      >
        방 만들기
      </motion.button>
      
      <motion.button 
        className="w-[285.9784px] h-[66.7884px] rounded-[33.39px] bg-black border-[2.59px] border-white text-white font-pretendard text-[27.585px] font-semibold leading-[150%] tracking-[-0.524px] transition-all duration-300 ease-out hover:shadow-[0_0_30px_rgba(200,60,255,0.44),0_0_50px_rgba(122,77,255,0.19),0_0_70px_rgba(216,202,255,0.09)] hover:border-custom-purple"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#FFFFFF';
          e.currentTarget.style.background = 'black';
        }}
        onClick={(e) => handleNavigation('/participate', e.currentTarget)}
      >
        참여하기
      </motion.button>
    </div>
  );
};