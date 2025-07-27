import sys
import whisper
import os

def transcribe(audio_path, model_size="base"):
    model = whisper.load_model(model_size)
    result = model.transcribe(audio_path)
    return result['text']

def save_txt(text, out_path):
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_subtitle.py <audio_file>")
        sys.exit(1)
    audio_file = sys.argv[1]
    text = transcribe(audio_file)
    out_path = os.path.splitext(audio_file)[0] + "_subtitle.txt"
    save_txt(text, out_path)
    print(f"Subtitle saved to {out_path}")
