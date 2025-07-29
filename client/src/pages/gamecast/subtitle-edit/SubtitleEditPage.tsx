import React, { useState, useRef } from 'react';
import { useSubtitle } from '../../../hooks/useSubtitle';

const SubtitleEditPage: React.FC = () => {
  const { subtitles, isLoading, error, generateSubtitles, clearSubtitles } = useSubtitle();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      clearSubtitles(); // 기존 자막 초기화
    } else {
      alert('오디오 파일을 선택해주세요.');
    }
  };

  const handleUpload = async () => {
    if (!audioFile) {
      alert('오디오 파일을 먼저 선택해주세요.');
      return;
    }
    await generateSubtitles(audioFile);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">자막 편집 페이지</h1>
        
        {/* 파일 업로드 섹션 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">오디오 파일 업로드</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              파일 선택
            </button>
            {audioFile && (
              <span className="text-green-400">
                선택된 파일: {audioFile.name}
              </span>
            )}
          </div>

          {audioFile && (
            <button
              onClick={handleUpload}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
            >
              {isLoading ? '자막 생성 중...' : '자막 생성'}
            </button>
          )}
        </div>

        {/* 오디오 플레이어 */}
        {audioUrl && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">오디오 플레이어</h2>
            <audio controls className="w-full">
              <source src={audioUrl} type={audioFile?.type} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-8">
            <p className="text-red-200">에러: {error}</p>
          </div>
        )}

        {/* 자막 표시 */}
        {subtitles.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">생성된 자막</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subtitles.map((subtitle, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                    </span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <p 
                    className="text-lg font-medium leading-relaxed"
                    style={{
                      color: 'white',
                      textShadow: `
                        -1px -1px 0 #000,
                        1px -1px 0 #000,
                        -1px 1px 0 #000,
                        1px 1px 0 #000,
                        2px 2px 4px rgba(0,0,0,0.8)
                      `,
                      WebkitTextStroke: '1px black'
                    }}
                  >
                    {subtitle.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">자막을 생성하고 있습니다...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleEditPage; 