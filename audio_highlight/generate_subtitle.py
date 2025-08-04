import sys
import openai
import os
import librosa
import numpy as np
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# OpenAI API 키 설정
openai.api_key = os.getenv("OPENAI_API_KEY")

def detect_voice_activity(audio_path, frame_length=2048, hop_length=512, top_db=30):
    """
    오디오에서 음성 활동 구간을 감지하여 정확한 시작/끝 시점 반환
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
        
        # 연속된 음성 구간 찾기
        voice_segments = []
        start_idx = None
        
        for i, is_voice in enumerate(voice_frames):
            if is_voice and start_idx is None:
                start_idx = i
            elif not is_voice and start_idx is not None:
                voice_segments.append((times[start_idx], times[i-1]))
                start_idx = None
        
        # 마지막 구간 처리
        if start_idx is not None:
            voice_segments.append((times[start_idx], times[-1]))
        
        return voice_segments
    
    except Exception as e:
        print(f"VAD 분석 중 오류: {e}")
        return []

def transcribe_with_api_and_timing(audio_path, model="whisper-1"):
    """
    OpenAI Whisper API를 사용하여 음성을 텍스트로 변환하고 VAD로 타이밍 조정
    """
    try:
        with open(audio_path, "rb") as audio_file:
            response = openai.Audio.transcribe(
                model=model,
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
        
        # VAD로 음성 활동 구간 감지
        voice_segments = detect_voice_activity(audio_path)
        
        # Whisper 결과와 VAD 결과를 결합하여 정확한 타이밍 조정
        adjusted_segments = []
        
        if "segments" in response:
            for whisper_seg in response["segments"]:
                whisper_start = whisper_seg["start"]
                whisper_end = whisper_seg["end"]
                whisper_text = whisper_seg["text"].strip()
                
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
                if best_match and best_overlap > 0.1:  # 최소 0.1초 겹침
                    # 시작점은 Whisper와 VAD 중 더 늦은 시점
                    adjusted_start = max(whisper_start, best_match[0])
                    # 끝점은 VAD의 실제 음성 끝점 사용
                    adjusted_end = min(whisper_end, best_match[1])
                    
                    adjusted_segments.append({
                        "start": adjusted_start,
                        "end": adjusted_end,
                        "text": whisper_text,
                        "original_end": whisper_end,  # 원본 끝점 기록
                        "adjusted": True
                    })
                else:
                    # VAD 매칭이 안되면 원본 사용
                    adjusted_segments.append({
                        "start": whisper_start,
                        "end": whisper_end,
                        "text": whisper_text,
                        "adjusted": False
                    })
        
        return {
            "text": response.get("text", ""),
            "segments": adjusted_segments,
            "voice_activity_segments": voice_segments
        }
        
    except Exception as e:
        print(f"Error during transcription: {e}")
        return None

def transcribe_with_api(audio_path, model="whisper-1"):
    """
    OpenAI Whisper API를 사용하여 음성을 텍스트로 변환 (기존 호환성 유지)
    """
    try:
        with open(audio_path, "rb") as audio_file:
            response = openai.Audio.transcribe(
                model=model,
                file=audio_file
            )
        return response["text"]
    except Exception as e:
        print(f"Error during transcription: {e}")
        return None



def save_txt(text, out_path):
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)

def save_srt(segments, out_path):
    """
    세그먼트를 SRT 파일로 저장
    """
    with open(out_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments, 1):
            start_time = format_srt_time(segment["start"])
            end_time = format_srt_time(segment["end"])
            text = segment["text"]
            
            # 조정 여부 표시 (디버깅용)
            if segment.get("adjusted"):
                original_end = format_srt_time(segment.get("original_end", segment["end"]))
                text += f" [조정됨: {original_end}→{end_time}]"
            
            f.write(f"{i}\n{start_time} --> {end_time}\n{text}\n\n")

def format_srt_time(seconds):
    """
    초를 SRT 시간 형식으로 변환 (HH:MM:SS,mmm)
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_subtitle.py <audio_file> [--improved-timing]")
        print("  --improved-timing: VAD를 사용하여 타이밍 개선")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    use_improved_timing = "--improved-timing" in sys.argv
    
    # API 키 확인
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OpenAI API 키가 설정되지 않았습니다.")
        print("   .env 파일에 OPENAI_API_KEY를 설정하세요.")
        sys.exit(1)
    
    if use_improved_timing:
        print("🔍 OpenAI Whisper API + VAD 타이밍 개선으로 변환 중...")
        result = transcribe_with_api_and_timing(audio_file)
        
        if result:
            # 텍스트 파일 저장
            txt_path = os.path.splitext(audio_file)[0] + "_subtitle_improved.txt"
            save_txt(result["text"], txt_path)
            
            # SRT 파일 저장
            srt_path = os.path.splitext(audio_file)[0] + "_subtitle_improved.srt"
            save_srt(result["segments"], srt_path)
            
            print(f"✅ 개선된 자막이 저장되었습니다:")
            print(f"   📄 텍스트: {txt_path}")
            print(f"   🎬 SRT: {srt_path}")
            
            # 개선 결과 요약
            adjusted_count = sum(1 for seg in result["segments"] if seg.get("adjusted"))
            total_count = len(result["segments"])
            print(f"📊 타이밍 개선: {adjusted_count}/{total_count} 세그먼트")
            
            # VAD 결과 표시
            vad_segments = result.get("voice_activity_segments", [])
            print(f"🎤 감지된 음성 구간: {len(vad_segments)}개")
            
        else:
            print("❌ 음성 변환에 실패했습니다.")
            
    else:
        print("🔍 OpenAI Whisper API로 음성을 텍스트로 변환 중...")
        text = transcribe_with_api(audio_file)
        
        if text:
            out_path = os.path.splitext(audio_file)[0] + "_subtitle.txt"
            save_txt(text, out_path)
            print(f"✅ 자막이 저장되었습니다: {out_path}")
            print(f"📝 변환된 텍스트: {text[:100]}...")
            print("\n💡 팁: --improved-timing 옵션으로 타이밍 개선 가능")
        else:
            print("❌ 음성 변환에 실패했습니다.")
