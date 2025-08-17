// API 서비스 레이어 - 서버와의 HTTP 통신 담당

import type {
  APIResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomInfoResponse,
  CharacterSetupRequest,
  CharacterSetupResponse,
  PreparationStatusRequest,
  PreparationStatusResponse
} from '../types/api';
import { API_BASE_URL } from '../config/server.config';

class APIService {
  private async fetchAPI<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // 방 생성
  async createRoom(request: CreateRoomRequest): Promise<APIResponse<CreateRoomResponse>> {
    return this.fetchAPI<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 방 참여
  async joinRoom(request: JoinRoomRequest): Promise<APIResponse<JoinRoomResponse>> {
    return this.fetchAPI<JoinRoomResponse>('/api/rooms/join', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 방 정보 조회
  async getRoomInfo(roomCode: string): Promise<APIResponse<RoomInfoResponse>> {
    return this.fetchAPI<RoomInfoResponse>(`/api/rooms/${roomCode}`);
  }

  // 방 나가기
  async leaveRoom(guestUserId: string): Promise<APIResponse<{ message: string }>> {
    return this.fetchAPI<{ message: string }>('/api/rooms/leave', {
      method: 'POST',
      body: JSON.stringify({ guestUserId }),
    });
  }

  // 캐릭터 설정
  async setupCharacter(request: CharacterSetupRequest): Promise<APIResponse<CharacterSetupResponse>> {
    return this.fetchAPI<CharacterSetupResponse>('/api/character/setup', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 준비 상태 업데이트
  async updatePreparationStatus(request: PreparationStatusRequest): Promise<APIResponse<PreparationStatusResponse>> {
    return this.fetchAPI<PreparationStatusResponse>('/api/rooms/preparation-status', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // 방 종료 (방장만 가능)
  async endRoom(hostGuestId: string): Promise<APIResponse<{ message: string }>> {
    return this.fetchAPI<{ message: string }>('/api/rooms/end', {
      method: 'POST',
      body: JSON.stringify({ hostGuestId }),
    });
  }

  // 건강 상태 확인
  async healthCheck(): Promise<APIResponse<{ status: string; timestamp: string }>> {
    return this.fetchAPI<{ status: string; timestamp: string }>('/api/health');
  }

  // 현재 사용자 세션 정보 조회
  async getCurrentSession(sessionId: string): Promise<APIResponse<{ 
    guestUserId: string;
    nickname: string;
    currentRoom?: string;
  }>> {
    return this.fetchAPI<{ 
      guestUserId: string;
      nickname: string;
      currentRoom?: string;
    }>(`/api/sessions/${sessionId}`);
  }
}

// 싱글톤 인스턴스 내보내기
export const apiService = new APIService();
export default apiService;