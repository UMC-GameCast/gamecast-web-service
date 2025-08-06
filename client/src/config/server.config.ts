/**
 * 서버 연결 설정
 * 환경에 따라 쉽게 변경할 수 있도록 중앙집중화된 설정 파일
 */

interface ServerConfig {
  // REST API 서버 URL
  API_BASE_URL: string;
  // Socket.IO 서버 URL
  SOCKET_URL: string;
  // 개발 모드 여부
  IS_DEVELOPMENT: boolean;
}

// 환경별 서버 설정
const SERVER_CONFIGS = {
  // 로컬 개발 환경
  development: {
    API_BASE_URL: 'http://localhost:8002/api',
    SOCKET_URL: 'http://localhost:8002',
    IS_DEVELOPMENT: true,
  },
  
  // 프로덕션 환경 (실제 배포 서버)
  production: {
    API_BASE_URL: 'https://api.gamecast.com/api', // 실제 서버 URL로 변경 필요
    SOCKET_URL: 'https://api.gamecast.com',
    IS_DEVELOPMENT: false,
  },
  
  // 스테이징 환경 (테스트 서버)
  staging: {
    API_BASE_URL: 'https://staging-api.gamecast.com/api',
    SOCKET_URL: 'https://staging-api.gamecast.com', 
    IS_DEVELOPMENT: false,
  }
} as const;

// 현재 환경 감지
function getCurrentEnvironment(): keyof typeof SERVER_CONFIGS {
  // Vite 환경변수 확인
  if (import.meta.env?.MODE) {
    const mode = import.meta.env.MODE;
    if (mode === 'production') return 'production';
    if (mode === 'staging') return 'staging';
    return 'development';
  }
  
  // 호스트네임으로 환경 감지
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  if (hostname === 'gamecast.com' || hostname.endsWith('.gamecast.com')) {
    return 'production';
  }
  
  if (hostname.includes('staging')) {
    return 'staging';
  }
  
  return 'development';
}

// 현재 환경의 서버 설정 내보내기
const currentEnv = getCurrentEnvironment();
export const SERVER_CONFIG: ServerConfig = SERVER_CONFIGS[currentEnv];

// 개별 설정값들을 편의를 위해 개별 내보내기
export const API_BASE_URL = SERVER_CONFIG.API_BASE_URL;
export const SOCKET_URL = SERVER_CONFIG.SOCKET_URL;
export const IS_DEVELOPMENT = SERVER_CONFIG.IS_DEVELOPMENT;

// 디버깅을 위한 현재 설정 로그
if (IS_DEVELOPMENT) {
  console.log('🔧 [Server Config] 현재 환경:', currentEnv);
  console.log('🔧 [Server Config] API URL:', API_BASE_URL);
  console.log('🔧 [Server Config] Socket URL:', SOCKET_URL);
}

// 설정 변경을 위한 유틸리티 함수 (개발용)
export function logServerConfig() {
  console.table({
    '현재 환경': currentEnv,
    'API URL': API_BASE_URL,
    'Socket URL': SOCKET_URL,
    '개발 모드': IS_DEVELOPMENT
  });
}

// 서버 연결 상태 확인 함수
export async function checkServerConnection(): Promise<{
  api: boolean;
  message: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    } as any);
    
    if (response.ok) {
      const data = await response.json();
      return {
        api: true,
        message: `서버 연결 성공 - ${data.status} (${new Date(data.timestamp).toLocaleTimeString()})`
      };
    } else {
      return {
        api: false,
        message: `서버 응답 오류: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      api: false,
      message: `서버 연결 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}