import React from "react";
import SmallLabelDesign from "../../../assets/gamecast/Room/small_label_Design.svg?react";

interface RoomInfoContainerProps {
  roomName: string;
  entryCode: string;
}

export const RoomInfoContainer = ({ roomName, entryCode }: RoomInfoContainerProps) => (
  <div className="flex h-20 m-2 gap-[23px]">
    {/* 방이름 레이블 */}
    <div className="flex-1" style={{position: 'relative'}}>
      <SmallLabelDesign style={{width: '286px', height: '36.87px'}} />
      <div 
        style={{
          left: '110px', 
          top: '-5px', 
          position: 'absolute', 
          textAlign: 'center', 
          justifyContent: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          color: 'white', 
          fontSize: '25.58px', 
          fontFamily: 'Inter', 
          fontWeight: '500', 
          lineHeight: '38.37px', 
          wordWrap: 'break-word',
          width: '173px'
        }}
      >
        {roomName}
      </div>
    </div>
    {/* 입장코드 레이블 */}
    <div className="flex-1" style={{position: 'relative'}}>
      <SmallLabelDesign style={{width: '286px', height: '36.87px'}} />
      <div 
        style={{
          left: '110px', 
          top: '-5px', 
          position: 'absolute', 
          textAlign: 'center', 
          justifyContent: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          color: 'white', 
          fontSize: '25.58px', 
          fontFamily: 'Inter', 
          fontWeight: '500', 
          lineHeight: '38.37px', 
          wordWrap: 'break-word',
          width: '173px'
        }}
      >
        {entryCode}
      </div>
    </div>
  </div>
); 