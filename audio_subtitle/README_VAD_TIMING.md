# Whisper 자막 타이밍 개선 (VAD)

## 문제점
- Whisper API가 자막의 끝 시점을 너무 길게 잡는 문제
- 예: "안녕 얘들아" (00:05-00:10) → Whisper 결과 (00:05-00:27)

## 해결책
**무료 VAD(Voice Activity Detection)** 를 사용하여 실제 음성이 끝나는 지점을 정확하게 감지

## 사용법

### 1. 기본 자막 생성 (기존 방식)
```bash
python generate_subtitle.py audio.wav
```

### 2. 타이밍 개선된 자막 생성 (추천)
```bash
python generate_subtitle.py audio.wav --improved-timing
```

## 결과 파일

### 기본 버전
- `audio_subtitle.txt` - 텍스트만

### 개선 버전
- `audio_subtitle_improved.txt` - 텍스트
- `audio_subtitle_improved.srt` - 타이밍 포함 자막 파일

## VAD 개선 효과

### Before (Whisper 원본)
```
1
00:00:05,000 --> 00:00:27,000
안녕 얘들아
```

### After (VAD 개선)
```
1
00:00:05,000 --> 00:00:10,200
안녕 얘들아 [⚡16.8초 단축]
```

## 비용
- **OpenAI Whisper API**: 유료 ($0.006/분)
- **VAD (librosa)**: 완전 무료! 🎉
- 추가 API 호출 없음

## 설치

```bash
pip install -r requirements.txt
```

## 환경변수
`.env` 파일에 추가:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 지원 형식
- 입력: WAV, MP3, M4A 등 대부분의 오디오 형식
- 출력: TXT, SRT

## 원리
1. OpenAI Whisper API로 음성 인식 + 기본 타이밍
2. librosa로 실제 음성 활동 구간 감지 (무료)
3. 두 결과를 결합하여 정확한 타이밍 생성

## 장점
- ✅ 정확한 자막 끝 시점
- ✅ 완전 무료 VAD
- ✅ 기존 Whisper 품질 유지
- ✅ 추가 API 비용 없음