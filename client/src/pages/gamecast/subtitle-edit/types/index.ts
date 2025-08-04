export interface SubtitleSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  emotion?: string
  // 자막 스타일 정보
  subtitleStyle?: number // 1, 2, 3
  emphasis?: 'normal' | 'emotion'
  emotionStyle?: 'happy' | 'angry' | 'sad' | 'surprised'
}

export interface Speaker {
  id: string
  name: string
  color: string
  avatar: string
}

export interface Emotion {
  id: string
  label: string
  icon: string
  color: string
} 