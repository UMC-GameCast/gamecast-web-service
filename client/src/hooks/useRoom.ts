import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentRoom,
  getCurrentUserId,
  leaveRoom,
  getRoomInfo,
} from "../utils/roomManager";
import type { Room, Player } from "../types/room";

export const useRoom = () => {
  const navigate = useNavigate();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRoomState = async () => {
    const room = getCurrentRoom();
    const userId = getCurrentUserId();

    if (room && userId) {
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          setCurrentRoom(result.room);
          
          // 🔍 디버깅: 서버에서 받아온 방 정보 전체 구조 확인
          console.log('🔍 [useRoom] 서버에서 받아온 방 정보:', {
            room: result.room,
            participants: result.room.participants,
            participantsLength: result.room.participants?.length || 0
          });
          
          // 서버 데이터 우선 사용 (ID 매칭 개선)
          // guestUserId 우선 매칭 (서버 응답 구조에 맞춘 수정)
          let serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
          if (!serverPlayer) {
            serverPlayer = result.room.participants?.find(p => p.id === userId);
          }
          
          // 🔍 디버깅: ID 매칭 상황 확인
          console.log('🔍 [useRoom] ID 매칭 상황:', {
            userId,
            participantIds: result.room.participants?.map(p => ({ 
              id: p.id, 
              guestUserId: p.guestUserId, 
              nickname: p.nickname,
              hasCharacterInfo: !!p.characterInfo,
              characterInfoCustomized: p.characterInfo?.isCustomized
            })),
            foundServerPlayer: !!serverPlayer,
            matchedById: result.room.participants?.some(p => p.id === userId),
            matchedByGuestUserId: result.room.participants?.some(p => p.guestUserId === userId)
          });
          
          // 🔧 매칭 실패시 첫 번째 참가자를 사용 (임시 해결책)
          if (!serverPlayer && result.room.participants && result.room.participants.length > 0) {
            serverPlayer = result.room.participants[0];
            console.log('⚠️ [useRoom] ID 매칭 실패, 첫 번째 참가자 사용:', {
              originalUserId: userId,
              selectedPlayer: serverPlayer,
              selectedPlayerId: serverPlayer.id || serverPlayer.guestUserId,
              hasCharacterInfo: !!serverPlayer.characterInfo
            });
          }
          
          // 🔍 디버깅: 찾아진 서버 플레이어 정보 상세 확인
          console.log('🔍 [useRoom] 서버 플레이어 정보 상세:', {
            userId,
            serverPlayer,
            serverPlayerKeys: serverPlayer ? Object.keys(serverPlayer) : [],
            characterInfo: serverPlayer?.characterInfo,
            hasCharacterInfo: !!serverPlayer?.characterInfo,
            characterInfoKeys: serverPlayer?.characterInfo ? Object.keys(serverPlayer.characterInfo) : []
          });
          
          if (serverPlayer) {
            // 🔍 디버깅: characterInfo 복사 전후 비교
            console.log('🔍 [useRoom] characterInfo 복사 과정:', {
              beforeCopy: {
                serverPlayerCharacterInfo: serverPlayer.characterInfo,
                hasServerCharacterInfo: !!serverPlayer.characterInfo,
                serverCharacterInfoKeys: serverPlayer.characterInfo ? Object.keys(serverPlayer.characterInfo) : []
              }
            });
            
            const playerInfo: Player = {
              ...serverPlayer,
              guestUserId: serverPlayer.guestUserId || serverPlayer.id,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false
              },
              isHost: serverPlayer.role === 'host',
              character: serverPlayer.character || null, // 레거시 필드
              characterInfo: serverPlayer.characterInfo || null // 서버에서 보내주는 캐릭터 정보
            };
            
            // 🔍 디버깅: 복사 후 상태 확인
            console.log('🔍 [useRoom] characterInfo 복사 후:', {
              afterCopy: {
                playerInfoCharacterInfo: playerInfo.characterInfo,
                hasPlayerInfoCharacterInfo: !!playerInfo.characterInfo,
                playerInfoCharacterInfoKeys: playerInfo.characterInfo ? Object.keys(playerInfo.characterInfo) : []
              }
            });
            
            setCurrentPlayer(playerInfo);
            
            console.log('✅ [useRoom] 플레이어 정보 설정:', {
              playerInfo,
              guestUserId: playerInfo.guestUserId,
              id: playerInfo.id,
              characterInfo: playerInfo.characterInfo,
              hasCharacterInfo: !!playerInfo.characterInfo,
              isCustomized: playerInfo.characterInfo?.isCustomized
            });
          }
        } else {
          setError(result.error || '방 정보를 불러올 수 없습니다.');
        }
      } catch (error) {
        console.error('방 정보 새로고침 실패:', error);
        setError('방 정보 새로고침 중 오류가 발생했습니다.');
      }
    }
  };

  useEffect(() => {
    const initializeRoom = async () => {
      const room = getCurrentRoom();
      const userId = getCurrentUserId();

      if (!room || !userId) {
        navigate("/");
        return;
      }

      setCurrentRoom(room);
      
      // 서버에서 최신 방 정보 조회 (서버 우선)
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          setCurrentRoom(result.room);
          
          // 서버 데이터 우선 사용 (ID 매칭 개선)
          // guestUserId 우선 매칭 (refreshRoomState와 동일한 로직)
          let serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
          if (!serverPlayer) {
            serverPlayer = result.room.participants?.find(p => p.id === userId);
          }
          
          // 🔍 디버깅: 초기 로드 ID 매칭 상황 확인
          console.log('🔍 [useRoom] 초기 로드 ID 매칭 상황:', {
            userId,
            participantIds: result.room.participants?.map(p => ({ 
              id: p.id, 
              guestUserId: p.guestUserId, 
              nickname: p.nickname,
              hasCharacterInfo: !!p.characterInfo,
              characterInfoCustomized: p.characterInfo?.isCustomized
            })),
            foundServerPlayer: !!serverPlayer,
            serverPlayerCharacterInfo: serverPlayer?.characterInfo
          });
          
          if (serverPlayer) {
            const playerInfo: Player = {
              ...serverPlayer,
              guestUserId: serverPlayer.guestUserId || serverPlayer.id,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false
              },
              isHost: serverPlayer.role === 'host',
              character: serverPlayer.character || null, // 레거시 필드
              characterInfo: serverPlayer.characterInfo || null // 서버에서 보내주는 캐릭터 정보
            };
            setCurrentPlayer(playerInfo);
            
            console.log('✅ [useRoom] 플레이어 정보 설정 (초기 로드):', {
              playerInfo,
              guestUserId: playerInfo.guestUserId,
              id: playerInfo.id,
              hasCharacterInfo: !!playerInfo.characterInfo,
              characterInfo: playerInfo.characterInfo,
              isCustomized: playerInfo.characterInfo?.isCustomized
            });
          } else {
            // 폴백: 로컬 정보 생성 (서버 데이터 우선, 없을 때만 사용)
            const fallbackPlayer: Player = {
              id: userId,
              guestUserId: userId,
              nickname: room.hostGuestId === userId ? "Nickname1" : "Nickname2", // 역할에 따른 기본 닉네임
              role: room.hostGuestId === userId ? 'host' : 'participant',
              joinedAt: new Date().toISOString(),
              preparationStatus: {
                characterSetup: false,
                screenSetup: false
              },
              isHost: room.hostGuestId === userId
            };
            setCurrentPlayer(fallbackPlayer);
          }
        } else {
          console.log('⚠️ 서버 조회 실패, 로컬 정보 사용:', result.error);
          // 서버 조회 실패 시 로컬 정보 사용
          const fallbackPlayer: Player = {
            id: userId,
            guestUserId: userId,
            nickname: room.hostGuestId === userId ? "Nickname1" : "Nickname2", // 역할에 따른 기본 닉네임
            role: room.hostGuestId === userId ? 'host' : 'participant',
            joinedAt: new Date().toISOString(),
            preparationStatus: {
              characterSetup: false,
              screenSetup: false
            },
            isHost: room.hostGuestId === userId
          };
          setCurrentPlayer(fallbackPlayer);
        }
      } catch (error) {
        console.error('🚨 서버 조회 중 오류, 로컬 정보 사용:', error);
        // 서버 조회 실패 시 로컬 정보 사용
        const fallbackPlayer: Player = {
          id: userId,
          guestUserId: userId,
          nickname: room.hostGuestId === userId ? "Nickname1" : "Nickname2", // 역할에 따른 기본 닉네임
          role: room.hostGuestId === userId ? 'host' : 'participant',
          joinedAt: new Date().toISOString(),
          preparationStatus: {
            characterSetup: false,
            screenSetup: false
          },
          isHost: room.hostGuestId === userId
        };
        setCurrentPlayer(fallbackPlayer);
      }
      
      console.log('🏁 useRoom 초기화 완료');
      setLoading(false);
    };

    initializeRoom();
  }, [navigate]);

  const handleLeaveRoom = async (realtimeLeaveCallback?: () => void) => {
    try {
      // 실시간 연결 정리 (있는 경우)
      if (realtimeLeaveCallback) {
        realtimeLeaveCallback();
      }
      
      await leaveRoom();
      navigate("/");
    } catch (error) {
      console.error('방 나가기 실패:', error);
      // 에러가 발생해도 메인 페이지로 이동
      navigate("/");
    }
  };

  return { 
    currentRoom, 
    currentPlayer, 
    loading, 
    error, 
    refreshRoomState, 
    handleLeaveRoom 
  };
}; 