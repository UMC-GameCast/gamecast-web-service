import React from "react";
import desgin1 from "../../../assets/gamecast/common/header/desgin-1.svg";
import logo from "../../../assets/gamecast/common/header/logo.svg";
import logoicon from "../../../assets/gamecast/common/header/logoicon.svg";

export const Header = () => {
  return (
    <div className="flex flex-col items-center py-[45px] px-[166px] relative">
      <div className="h-8 w-[256.2px] relative flex items-center">
        <img className="h-8 w-auto mr-2" alt="Logoicon" src={logoicon} />
        <img className="h-[26px] w-auto flex-1" alt="Logo" src={logo} />
      </div>
      <img className="h-[60.49px] w-[1356.83px] -mt-[10px] relative" alt="Header" src={desgin1} />
    </div>
  );
}; 