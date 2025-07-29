# GameCast Backend API

AI 기능을 위한 백엔드 API 서버입니다.

## 설치 및 실행

### 1. 의존성 설치
```bash
cd backend-api
npm install
```

### 2. 환경 변수 설정
```bash
cp env.example .env
```
`.env` 파일을 열고 OpenAI API 키를 설정하세요:
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. 서버 실행
```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

## API 엔드포인트

### Health Check
- **GET** `/health`
- 서버 상태 확인

### Audio Transcription
- **POST** `/api/transcribe`
- 오디오 파일을 텍스트로 변환
- 파일 업로드 필요 (audio 파일)

### Subtitle Generation
- **POST** `/api/generate-subtitles`
- 텍스트를 자막 형식으로 변환
- JSON body: `{ "text": "변환할 텍스트" }`

## 사용 예시

### 오디오 파일 업로드
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

const response = await fetch('http://localhost:3001/api/transcribe', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.subtitles);
```

### 자막 생성
```javascript
const response = await fetch('http://localhost:3001/api/generate-subtitles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "변환할 텍스트"
  })
});

const result = await response.json();
console.log(result.subtitles);
```

## 포트 설정
기본 포트: 3001
환경 변수 `PORT`로 변경 가능 