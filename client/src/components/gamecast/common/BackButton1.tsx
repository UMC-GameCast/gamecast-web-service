import BackButtonIcon from '../../../assets/gamecast/common/button/backbutton.svg?react';

interface BackButton1Props {
  onClick: () => void;
  className?: string;
}

export const BackButton1 = ({ onClick, className = '' }: BackButton1Props) => {
  return (
    <button
      onClick={onClick}
      className={`bg-transparent border-none flex items-center justify-center p-2 transition-transform duration-200 ease-in-out hover:scale-110 active:scale-95 ${className}`}
      aria-label="뒤로 가기"
    >
      <BackButtonIcon />
    </button>
  );
}; 