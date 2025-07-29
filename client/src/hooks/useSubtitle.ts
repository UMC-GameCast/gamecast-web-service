import { useState, useCallback } from 'react';

interface SubtitleData {
  text: string;
  startTime: number;
  endTime: number;
}

interface UseSubtitleReturn {
  subtitles: SubtitleData[];
  isLoading: boolean;
  error: string | null;
  generateSubtitles: (audioFile: File) => Promise<void>;
  clearSubtitles: () => void;
}

export const useSubtitle = (): UseSubtitleReturn => {
  const [subtitles, setSubtitles] = useState<SubtitleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSubtitles = useCallback(async (audioFile: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      // Make API call to our backend server
      const response = await fetch('http://localhost:3001/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate subtitles');
      }
      
      const data = await response.json();
      setSubtitles(data.subtitles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSubtitles = useCallback(() => {
    setSubtitles([]);
    setError(null);
  }, []);

  return {
    subtitles,
    isLoading,
    error,
    generateSubtitles,
    clearSubtitles,
  };
};