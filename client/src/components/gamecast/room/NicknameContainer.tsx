import React from "react";
import BigLabelDesign from "../../../assets/gamecast/Room/big_label_Design.svg?react";

interface NicknameContainerProps {
  nickname: string;
}

export const NicknameContainer = ({ nickname }: NicknameContainerProps) => (
  <div className="flex justify-center items-center m-2">
    <div style={{position: 'relative', width: '371px', height: '43.8px'}}>
      <BigLabelDesign style={{width: '371px', height: '43.8px'}} />
      <div 
        style={{
          left: '68%', 
          top: '-13px', 
          transform: 'translateX(-50%)',
          position: 'absolute', 
          textAlign: 'center', 
          justifyContent: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          color: '#E8E6FD', 
          fontSize: '28.75px', 
          fontFamily: 'Inter', 
          fontWeight: '500', 
          lineHeight: '43.12px', 
          wordWrap: 'break-word',
          width: '208px'
        }}
      >
        {nickname}
      </div>
    </div>
  </div>
); 