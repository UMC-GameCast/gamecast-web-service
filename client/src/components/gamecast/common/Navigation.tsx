import Desgin1 from "../../../assets/gamecast/common/navigation/desgin-1.svg?react";
import logo from "../../../assets/gamecast/common/navigation/logo.svg";
import logoicon from "../../../assets/gamecast/common/navigation/logoicon.svg";

interface NavigationProps {
  children?: React.ReactNode;
}

export const Navigation = ({ children }: NavigationProps) => {
  return (
    <header className="relative flex flex-col items-center py-[41px] w-full">
      <div className="h-[29.85px] w-[256.2px] relative flex items-center z-10">
        <img className="h-[29.85px] w-auto mr-2" alt="Logoicon" src={logoicon} />
        <img className="h-[29.85px] w-auto flex-1 object-contain" alt="Logo" src={logo} />
      </div>
      <div className="w-full px-[17.02%] -mt-[10px]">
        <Desgin1
          preserveAspectRatio="none"
          className="w-full h-[59px]"
          aria-hidden="true"
        />
      </div>
      {children}
    </header>
  );
};