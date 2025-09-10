# 🎮 GameCast Web Service

> **실시간 게임 스트리밍 및 하이라이트 자동 생성 서비스**

GameCast는 실시간 WebRTC 기반 게임 스트리밍과 AI 기반 하이라이트 자동 생성 기능을 제공하는 웹 서비스입니다.

## 🌟 주요 기능

### 🎯 실시간 스트리밍
- **WebRTC P2P 음성 통신**: 지연 시간 최소화된 실시간 음성 채팅
- **Socket.IO 시그널링**: 안정적인 연결 관리 및 방 시스템
- **6자리 방 코드**: 간편한 방 생성 및 참여 시스템

### 🎨 캐릭터 커스터마이징
- **실시간 캐릭터 에디터**: 얼굴, 헤어, 의상, 액세서리 커스터마이징
- **색상 팔레트**: 다양한 색상 옵션으로 개성 표현
- **실시간 프리뷰**: 변경사항 즉시 반영

### 🎬 하이라이트 시스템
- **다중 소스 선택**: 호스트 및 게스트 시점 영상 선택
- **자동 다운로드**: S3 기반 영상/음성 파일 자동 다운로드
- **진행률 추적**: 실시간 다운로드 진행률 표시

### 📝 자막 편집
- **AI 기반 자막 생성**: Whisper 모델 기반 음성 인식
- **실시간 편집**: 브라우저에서 바로 자막 편집
- **다중 참가자 지원**: 여러 참가자의 음성 분리 및 자막 생성

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Node.js Server │◄──►│  Python API     │
│   (Frontend)    │    │  (Realtime)     │    │  (Processing)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    WebRTC P2P   │    │   Socket.IO     │    │   Whisper AI    │
│   Audio Streams │    │   Signaling     │    │   Audio Analysis│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 📂 프로젝트 구조

```
gamecast-web-service/
├── client/                 # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/     # 재사용 가능한 UI 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── contexts/       # React Context (상태 관리)
│   │   ├── utils/          # 유틸리티 함수
│   │   ├── types/          # TypeScript 타입 정의
│   │   └── constants/      # 상수 및 설정
│   └── package.json
├── backend-realtime/       # Node.js + Socket.IO Server
│   ├── server.js          # 메인 서버 파일
│   └── package.json
├── backend-processing/     # Python FastAPI Server
│   ├── main_api.py        # 메인 API 서버
│   └── requirements.txt
└── audio_highlight/        # AI 음성 처리 모듈
    ├── analyze_audio.py   # 음성 분석
    ├── diarize_with_whisper.py  # 화자 분리
    └── generate_subtitle.py     # 자막 생성
```

## 🚀 기술 스택

### Frontend
- **React 19** + **TypeScript**: 모던 프론트엔드 프레임워크
- **Vite**: 빠른 개발 서버 및 빌드 도구
- **TailwindCSS**: 유틸리티 우선 CSS 프레임워크
- **Framer Motion**: 부드러운 애니메이션
- **Socket.IO Client**: 실시간 통신

### Backend
- **Node.js** + **Express**: 백엔드 서버
- **Socket.IO**: 실시간 양방향 통신
- **WebRTC**: P2P 음성 스트리밍
- **Python FastAPI**: 음성 처리 API

### AI & Processing
- **OpenAI Whisper**: 음성 인식 및 자막 생성
- **PyDub**: 오디오 파일 처리
- **FFmpeg**: 비디오/오디오 변환

### Infrastructure
- **AWS S3**: 미디어 파일 저장
- **WebRTC STUN**: NAT 통과를 위한 서버

## 🛠️ 개발 환경 설정

### 필수 요구사항
- **Node.js** >= 18.0.0
- **Python** >= 3.8
- **FFmpeg** (오디오/비디오 처리)

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/UMC-GameCast/gamecast-web-service.git
cd gamecast-web-service
```

2. **프론트엔드 실행**
```bash
cd client
npm install
npm run dev  # http://localhost:3000
```

3. **백엔드 서버 실행** (별도 환경)
```bash
cd backend-realtime
npm install
npm start  # http://localhost:8889
```

4. **Python 처리 서버 실행** (별도 환경)
```bash
pip install -r requirements.txt
pip install -r audio_highlight/requirements.txt
python backend-processing/main_api.py
```

### 환경 변수
```bash
# client/.env
VITE_API_BASE_URL=http://localhost:8889
VITE_SOCKET_URL=http://localhost:8889
VITE_MODE=development
```

## 🎯 주요 워크플로우

### 1. 방 생성 및 참여
```
사용자 → 방 생성 → 6자리 코드 생성 → 다른 사용자 참여
```

### 2. 캐릭터 설정
```
캐릭터 에디터 → 커스터마이징 → 서버 저장 → 실시간 동기화
```

### 3. 게임 세션
```
음성 연결 → WebRTC P2P → 실시간 통신 → 음성 녹화
```

### 4. 하이라이트 생성
```
음성 분석 → 하이라이트 추출 → 영상 편집 → 자막 생성
```

### 5. 소스 선택 및 편집
```
하이라이트 선택 → 다중 시점 선택 → 파일 다운로드 → 자막 편집
```

## 🔧 개발 가이드

### Git 워크플로우
- **메인 브랜치**: `main` (프로덕션)
- **개발 브랜치**: `develop` (통합)
- **기능 브랜치**: `feature/(기능명)`

### 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드, 설정 관련
```

### 코드 스타일
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅
- **TypeScript**: 타입 안전성

## 📱 지원 기능

### 실시간 통신
- ✅ Socket.IO 기반 시그널링
- ✅ WebRTC P2P 음성 스트리밍
- ✅ 자동 재연결 및 오류 복구

### UI/UX
- ✅ 반응형 디자인
- ✅ 다크 테마
- ✅ 부드러운 애니메이션
- ✅ 접근성 준수

### 미디어 처리
- ✅ 실시간 음성 녹화
- ✅ S3 기반 파일 저장
- ✅ 자동 하이라이트 추출
- ✅ AI 기반 자막 생성

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👥 팀

- **Frontend**: React + TypeScript 개발
- **Backend**: Node.js + Python 개발  
- **AI/ML**: Whisper 기반 음성 처리
- **DevOps**: AWS 인프라 관리

---

> **GameCast Team** - 실시간 게임 스트리밍의 새로운 경험을 만들어갑니다. 🎮✨