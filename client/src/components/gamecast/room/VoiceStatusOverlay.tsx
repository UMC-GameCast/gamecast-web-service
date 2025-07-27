import React from 'react';
import type { Player } from '../../../types/room';
import { VoiceIndicator } from '../common/VoiceIndicator';

// 오버레이에 전달될 데이터 타입을 정의합니다.
export interface PlayerWithStream {
  player: Player;
  stream: MediaStream | null;
  isLocalPlayer: boolean;
}

interface VoiceStatusOverlayProps {
  playersWithStreams: PlayerWithStream[];
}

export const VoiceStatusOverlay: React.FC<VoiceStatusOverlayProps> = ({ playersWithStreams }) => {
  return (
    <div
      className="fixed top-28 right-8 bg-black bg-opacity-50 backdrop-blur-md p-4 rounded-lg shadow-lg z-50"
      style={{
        width: '250px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <h3
        className="text-lg font-bold mb-3 border-b border-gray-600 pb-2"
        style={{ color: 'white' }}
      >
        Voice Activity
      </h3>
      <div className="flex flex-col gap-3">
        {playersWithStreams.map(({ player, stream, isLocalPlayer }) => (
          <div key={player.id} className="flex items-center justify-between h-6">
            <span
              className={`truncate ${isLocalPlayer ? 'font-bold' : ''}`}
              style={{ color: isLocalPlayer ? '#86efac' : 'white' }}
            >
              {player.name} {isLocalPlayer && '(You)'}
            </span>
            {stream ? (
              <VoiceIndicator stream={stream} />
            ) : (
              // 스트림이 아직 없을 때를 위한 플레이스홀더 (옵션)
              <div className="w-6 h-6 rounded-full bg-gray-600 opacity-50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 