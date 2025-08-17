import React from "react";

interface GamecastProps {
  className?: string;
}

export const Gamecast: React.FC<GamecastProps> = ({ className }) => {
  return (
    <div className={className}>
      <svg viewBox="0 0 427 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="text-white text-4xl font-bold"
          fill="white"
        >
          GameCast
        </text>
      </svg>
    </div>
  );
};