import os
import numpy as np
from pydub import AudioSegment
import moviepy.editor as mp
import whisper
import ffmpeg

INPUT_DIR = "input"
OUTPUT_DIR = "output"
HIGHLIGHT_DURATION = 80  # 1분 20초
HIGHLIGHT_BEFORE = 20    # 하이라이트 포인트 전 20초
HIGHLIGHT_AFTER = 60     # 하이라이트 포인트 후 60초

def extract_audio(input_video, output_audio):
    video = mp.VideoFileClip(input_video)
    video.audio.write_audiofile(output_audio, logger=None)

def find_loudest_point(audio_path):
    audio = AudioSegment.from_file(audio_path)
    samples = np.array(audio.get_array_of_samples())
    frame_rate = audio.frame_rate
    window_size = frame_rate * 2  # 2초 단위
    max_energy = 0
    max_time = 0
    for i in range(0, len(samples) - window_size, frame_rate // 2):
        window = samples[i:i+window_size]
        energy = np.sum(np.abs(window))
        if energy > max_energy:
            max_energy = energy
            max_time = i // frame_rate
    return max_time

def cut_video(input_video, output_video, start_time, duration):
    (
        ffmpeg
        .input(input_video, ss=start_time, t=duration)
        .output(output_video, codec="copy")
        .run(overwrite_output=True, quiet=True)
    )

def generate_subtitle(audio_path, srt_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    with open(srt_path, "w") as f:
        f.write(result["text"])

def add_subtitle(video_path, srt_path, output_path):
    (
        ffmpeg
        .input(video_path)
        .output(output_path, vf=f"subtitles={srt_path}")
        .run(overwrite_output=True, quiet=True)
    )

def process_file(filename):
    basename = os.path.splitext(filename)[0]
    input_video = os.path.join(INPUT_DIR, filename)
    audio_path = os.path.join(OUTPUT_DIR, f"{basename}.wav")
    extract_audio(input_video, audio_path)
    print(f"[{filename}] 오디오 추출 완료")

    highlight_point = find_loudest_point(audio_path)
    print(f"[{filename}] 하이라이트 포인트: {highlight_point}초")

    start_time = max(0, highlight_point - HIGHLIGHT_BEFORE)
    output_highlight = os.path.join(OUTPUT_DIR, f"{basename}_highlight.mp4")
    cut_video(input_video, output_highlight, start_time, HIGHLIGHT_DURATION)
    print(f"[{filename}] 하이라이트 영상 추출 완료")

    highlight_audio = os.path.join(OUTPUT_DIR, f"{basename}_highlight.wav")
    extract_audio(output_highlight, highlight_audio)
    srt_path = os.path.join(OUTPUT_DIR, f"{basename}_highlight.srt")
    generate_subtitle(highlight_audio, srt_path)
    print(f"[{filename}] 자막 생성 완료")

    final_output = os.path.join(OUTPUT_DIR, f"{basename}_final.mp4")
    add_subtitle(output_highlight, srt_path, final_output)
    print(f"[{filename}] 자막 입힌 영상 생성 완료")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".mp4")]
    for f in files:
        process_file(f)
    print("모든 작업 완료!")

if __name__ == "__main__":
    main()
