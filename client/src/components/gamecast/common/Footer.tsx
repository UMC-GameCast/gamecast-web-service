import React from "react";
import FooterDesign from "../../../assets/gamecast/common/footer/design.svg?react";

export const Footer = () => {
  return (
    <footer className="relative w-full overflow-hidden">
      {/* 바닥 디자인 이미지 컨테이너 */}
      <div className="w-full px-[17.02%] pt-[24.26px] pb-[24.26px]">
        <FooterDesign
          preserveAspectRatio="none"
          className="w-full h-auto"
          aria-hidden="true"
        />
      </div>
      <div className="absolute bottom-[35px] w-full text-center text-sm left-0">
        <p style={{ color: 'white', fontWeight: 200 }}>&copy; 2024 GAMECAST. All Rights Reserved.</p>
      </div>
    </footer>
  );
}; 