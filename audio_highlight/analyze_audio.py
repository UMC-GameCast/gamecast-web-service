import sys
import librosa
import numpy as np
import matplotlib.pyplot as plt

# 오디오 파일에서 재미 포인트(음량 피크) 탐지
def find_funny_points(audio_path, frame_length=2048, hop_length=512, plot=False):
    y, sr = librosa.load(audio_path, sr=None)
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)

    # 음량이 급격히 커지는 지점 찾기 (피크)
    diff = np.diff(rms)
    threshold = np.percentile(diff, 95)  # 상위 5%만
    peaks = np.where(diff > threshold)[0]

    # 타임스탬프 반환
    peak_times = times[peaks]

    if plot:
        plt.figure(figsize=(10, 4))
        plt.plot(times, rms, label='RMS Energy')
        plt.scatter(peak_times, rms[peaks], color='red', label='Funny Points')
        plt.xlabel('Time (s)')
        plt.ylabel('RMS')
        plt.title('Audio RMS & Funny Points')
        plt.legend()
        plt.show()

    return peak_times

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_audio.py <audio_file>")
        sys.exit(1)
    audio_file = sys.argv[1]
    peaks = find_funny_points(audio_file, plot=True)
    print("Detected funny points (seconds):", peaks)
