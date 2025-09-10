import os
import sys
import whisper
import librosa
import numpy as np
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

def detect_voice_activity_local(audio_path, frame_length=2048, hop_length=512, top_db=25):
    """
    로컬에서 오디오 음성 활동 감지 (VAD)
    """
    try:
        # 오디오 로드
        y, sr = librosa.load(audio_path)
        
        # RMS 에너지 계산
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        
        # 시간 축 생성
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # 음성 활동 임계값 계산 (상위 top_db 이상)
        db_threshold = np.max(librosa.amplitude_to_db(rms)) - top_db
        voice_frames = librosa.amplitude_to_db(rms) > db_threshold
        
        # 연속된 음성 구간 찾기 (최소 0.3초 이상만 유효한 구간으로 간주)
        voice_segments = []
        start_idx = None
        min_duration = 0.3
        
        for i, is_voice in enumerate(voice_frames):
            if is_voice and start_idx is None:
                start_idx = i
            elif not is_voice and start_idx is not None:
                duration = times[i-1] - times[start_idx]
                if duration >= min_duration:
                    voice_segments.append((times[start_idx], times[i-1]))
                start_idx = None
        
        # 마지막 구간 처리
        if start_idx is not None:
            duration = times[-1] - times[start_idx]
            if duration >= min_duration:
                voice_segments.append((times[start_idx], times[-1]))
        
        return voice_segments
    
    except Exception as e:
        print(f"VAD 분석 중 오류: {e}")
        return []

def adjust_whisper_timing(whisper_segments, voice_segments):
    """
    Whisper 결과와 VAD 결과를 결합하여 타이밍 조정
    """
    adjusted_segments = []
    
    for seg in whisper_segments:
        whisper_start = seg["start"]
        whisper_end = seg["end"]
        whisper_text = seg["text"].strip()
        
        # VAD 결과에서 가장 가까운 음성 구간 찾기
        best_match = None
        best_overlap = 0
        
        for voice_start, voice_end in voice_segments:
            # 겹치는 구간 계산
            overlap_start = max(whisper_start, voice_start)
            overlap_end = min(whisper_end, voice_end)
            overlap = max(0, overlap_end - overlap_start)
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_match = (voice_start, voice_end)
        
        # VAD 결과로 타이밍 조정
        if best_match and best_overlap > 0.2:  # 최소 0.2초 겹침
            # 시작점은 더 정확한 것을 선택
            adjusted_start = max(whisper_start, best_match[0])
            # 끝점은 VAD의 실제 음성 끝점 사용 (주요 개선점)
            adjusted_end = min(whisper_end, best_match[1])
            
            adjusted_segments.append({
                "start": adjusted_start,
                "end": adjusted_end,
                "text": whisper_text,
                "original_end": whisper_end,
                "adjusted": True
            })
            
            print(f"  🔧 타이밍 조정: '{whisper_text[:30]}...' {whisper_end:.2f}s → {adjusted_end:.2f}s")
        else:
            # VAD 매칭이 안되면 원본 사용
            adjusted_segments.append({
                "start": whisper_start,
                "end": whisper_end,
                "text": whisper_text,
                "adjusted": False
            })
    
    return adjusted_segments

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