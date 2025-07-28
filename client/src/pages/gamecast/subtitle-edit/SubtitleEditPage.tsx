import { useState, useRef, useEffect } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";

interface SubtitleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export const SubtitleEditPage = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [whisperModel, setWhisperModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Whisper 모델 로드
  useEffect(() => {
    const loadWhisperModel = async () => {
      try {
        setIsModelLoading(true);
        console.log('Whisper 모델 로딩 시작...');
        
        // @ts-ignore - Transformers.js는 동적으로 로드됨
        const { pipeline } = await import('@xenova/transformers');
        console.log('Transformers.js 로드 완료');
        
        const model = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
        console.log('Whisper 모델 로드 완료');
        setWhisperModel(model);
      } catch (err: any) {
        console.error('Whisper 모델 로드 실패:', err);
        alert(`Whisper 모델을 로드할 수 없습니다: ${err.message}`);
      } finally {
        setIsModelLoading(false);
      }
    };

    loadWhisperModel();
  }, []);

  const handleWebmUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // webm 또는 mp3 파일 체크
    if (!file.name.endsWith('.webm') && !file.name.endsWith('.mp3')) {
      alert('webm 또는 mp3 파일만 업로드 가능합니다.');
      return;
    }

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setIsProcessing(true);

    try {
      if (whisperModel) {
        // Whisper로 음성 인식 실행
        const result = await whisperModel(file, {
          language: 'ko', // 한국어로 설정
          task: 'transcribe',
          chunk_length_s: 30, // 청크 길이
          stride_length_s: 5,  // 스트라이드 길이
          return_timestamps: true
        });

        // 결과를 자막 형식으로 변환
        const segments = result.chunks?.map((chunk: any, index: number) => ({
          id: index + 1,
          start: chunk.timestamp[0],
          end: chunk.timestamp[1],
          text: chunk.text.trim()
        })) || [];

        setSubtitles(segments);
      } else {
        // Whisper 모델이 없으면 임시 샘플 데이터 사용
        const sampleSubtitles = [
          { id: 1, start: 0, end: 3, text: "안녕하세요, 테스트 자막입니다." },
          { id: 2, start: 3, end: 6, text: "이것은 임시 샘플 데이터입니다." },
          { id: 3, start: 6, end: 9, text: "Whisper 모델이 로드되지 않았을 때 표시됩니다." }
        ];
        setSubtitles(sampleSubtitles);
        alert('Whisper 모델이 로드되지 않아 샘플 데이터를 표시합니다.');
      }
    } catch (err) {
      console.error('음성 인식 실패:', err);
      alert('음성 인식에 실패했습니다. 파일을 다시 확인해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]" style={{ minWidth: '1821px', minHeight: '1064px' }}>
      <Navigation />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 w-full max-w-6xl">
          <h1 className="text-3xl font-bold text-white text-center mb-8">음성 파일 자막 분석</h1>
          
          {/* Model Loading Status */}
          {isModelLoading && (
            <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-300">Whisper 모델을 로드하고 있습니다... (처음 로드 시 시간이 걸릴 수 있습니다)</p>
            </div>
          )}
          
          <div className="mb-8">
            <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".webm,.mp3"
                onChange={handleWebmUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isModelLoading || !whisperModel}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {isModelLoading ? '모델 로딩 중...' : 
                 isProcessing ? '음성 분석 중...' : 
                 !whisperModel ? '모델 준비 중...' : 'WEBM/MP3 파일 선택'}
              </button>
              <p className="text-white/70 mt-2">
                Whisper.js를 사용하여 브라우저에서 직접 자막을 생성합니다
              </p>
              {!whisperModel && !isModelLoading && (
                <p className="text-yellow-300 mt-2">모델 로드에 실패했습니다. 페이지를 새로고침해주세요.</p>
              )}
            </div>
            {uploadedFile && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p className="text-white">선택된 파일: {uploadedFile.name}</p>
              </div>
            )}
          </div>

          {/* 비디오/오디오 플레이어 */}
          {videoUrl && (
            <div className="flex flex-col items-center mb-8">
              <video
                src={videoUrl}
                controls
                width={800}
                onTimeUpdate={e => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
                style={{ background: 'black', borderRadius: '12px' }}
              />
              <div className="mt-2 text-white">
                현재 재생 시간: {currentTime.toFixed(2)} / {duration.toFixed(2)}초
              </div>
            </div>
          )}

          {/* 자막 표시 */}
          {subtitles.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">생성된 자막</h2>
              <div className="max-h-96 overflow-y-auto bg-black/30 rounded-lg p-4">
                {subtitles.map((subtitle) => (
                  <div key={subtitle.id} className="mb-3 p-3 bg-white/5 rounded">
                    <div className="text-yellow-300 font-mono text-sm mb-1">
                      [{formatTime(subtitle.start)} ~ {formatTime(subtitle.end)}]
                    </div>
                    <div className="text-white">{subtitle.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};
