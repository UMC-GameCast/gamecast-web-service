import os
import sys
import whisper
from pyannote.audio import Pipeline
from datetime import timedelta

# 사용법 안내
"""
필수 패키지 설치 (Colab/로컬)
!pip install openai-whisper pyannote.audio

HuggingFace 토큰 필요:
- https://huggingface.co/settings/tokens 에서 Access Token 발급
- 환경변수로 설정: export HUGGINGFACE_TOKEN=your_token

실행 예시:
python diarize_with_whisper.py your_audio_file.wav
"""

def format_time(seconds):
    return str(timedelta(seconds=round(seconds)))

def main(audio_path):
    # 1. Whisper로 segment별 자막 추출
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    print("Transcribing with Whisper...")
    result = model.transcribe(audio_path, word_timestamps=True)
    segments = result["segments"]

    # 2. pyannote-audio로 화자 분리
    print("Loading pyannote diarization pipeline...")
    hf_token = os.environ.get("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("[ERROR] HUGGINGFACE_TOKEN 환경변수를 설정하세요.")
        sys.exit(1)
    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
    print("Running diarization...")
    diarization = pipeline(audio_path)

    # 3. segment별로 화자 매칭 (겹치는 경우 가장 많이 겹치는 화자 할당)
    speaker_segments = []
    for seg in segments:
        seg_start = seg["start"]
        seg_end = seg["end"]
        # 해당 구간에 겹치는 화자 찾기
        speakers = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            # 겹치는 시간 비율 계산
            overlap = max(0, min(seg_end, turn.end) - max(seg_start, turn.start))
            if overlap > 0:
                speakers.append((overlap, speaker))
        if speakers:
            # 가장 많이 겹치는 화자 선택
            speaker = max(speakers, key=lambda x: x[0])[1]
        else:
            speaker = "Unknown"
        speaker_segments.append({
            "speaker": speaker,
            "start": seg_start,
            "end": seg_end,
            "text": seg["text"].strip()
        })

    # 4. 결과 출력
    print("\n--- 화자별 자막 ---")
    for seg in speaker_segments:
        print(f"[{seg['speaker']}] {format_time(seg['start'])} ~ {format_time(seg['end'])}: {seg['text']}")

    # 5. SRT 파일로 저장 (옵션)
    srt_path = os.path.splitext(audio_path)[0] + "_diarized.srt"
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(speaker_segments, 1):
            f.write(f"{i}\n{format_time(seg['start'])} --> {format_time(seg['end'])}\n[{seg['speaker']}] {seg['text']}\n\n")
    print(f"\nSRT 파일로 저장됨: {srt_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python diarize_with_whisper.py <audio_file>")
        sys.exit(1)
    main(sys.argv[1]) 