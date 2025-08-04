# OpenAI Whisper API 연동 가이드

이 프로젝트는 OpenAI Whisper API를 사용하여 음성 파일을 텍스트로 변환하는 기능을 제공합니다.

## 설치 및 설정

### 1. 필요한 패키지 설치
```bash
cd audio_subtitle
pip install -r requirements.txt
```

### 2. OpenAI API 키 설정
1. [OpenAI Platform](https://platform.openai.com/account/api-keys)에서 API 키를 발급받으세요
2. `.env.example` 파일을 `.env`로 복사하고 API 키를 입력하세요:
```bash
cp .env.example .env
```

3. `.env` 파일을 편집하여 실제 API 키를 입력:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## 사용 방법

### 1. 명령줄에서 사용
```bash
# 음성 파일을 텍스트로 변환
python generate_subtitle.py your_audio_file.mp3
```

### 2. FastAPI 서버 실행
```bash
# 서버 시작
python whisper_api_server.py
```

서버가 실행되면 다음 엔드포인트를 사용할 수 있습니다:
- `GET /` - 서버 상태 확인
- `POST /transcribe/` - 음성 파일 업로드 및 변환
- `GET /health` - 서버 상태 및 API 키 설정 확인

### 3. API 사용 예시 (curl)
```bash
# 음성 파일 업로드 및 변환
curl -X POST "http://localhost:8000/transcribe/" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@your_audio_file.mp3"
```

## 지원 파일 형식
- .mp3, .mp4, .mpeg, .mpga, .wav, .webm, .m4a
- 최대 파일 크기: 25MB

## 요금 정보
- OpenAI Whisper API 요금: 0.006 USD / 1분 (2025년 기준)
- 과금 기준: 업로드된 음성 파일의 전체 길이

## 보안 주의사항
- API 키는 절대 코드에 직접 입력하지 마세요
- `.env` 파일은 `.gitignore`에 포함되어 있는지 확인하세요
- 프로덕션 환경에서는 환경변수나 시크릿 매니저를 사용하세요

## 참고 자료
- [OpenAI Whisper API 문서](https://platform.openai.com/docs/guides/speech-to-text)
- [원본 블로그 글](https://bcuts.tistory.com/205) 