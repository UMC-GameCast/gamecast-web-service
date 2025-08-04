import React from 'react'
import VideoPlayer from './VideoPlayer'
import VideoUploader from './VideoUploader'
import AudioUploader from './AudioUploader'
import MultiSpeakerAudioUploader from './MultiSpeakerAudioUploader'
import type { SubtitleSegment, Speaker, Emotion } from '../types'

interface VideoSectionProps {
  videoUrl: string | null
  subtitleSegments: SubtitleSegment[]
  speakers: Speaker[]
  emotions: Emotion[]
  currentTime: number
  duration: number
  isPlaying: boolean
  showVideoUploader: boolean
  showAudioUploader: boolean
  showMultiSpeakerUploader: boolean
  onTimeUpdate: (time: number) => void
  onDurationChange: (duration: number) => void
  onPlayPause: () => void
  onVideoUploaded: (url: string, file: File) => void
  onSubtitlesGenerated: (segments: SubtitleSegment[]) => void
}

const VideoSection: React.FC<VideoSectionProps> = ({
  videoUrl,
  subtitleSegments,
  speakers,
  emotions,
  currentTime,
  duration,
  isPlaying,
  showVideoUploader,
  showAudioUploader,
  showMultiSpeakerUploader,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  onVideoUploaded,
  onSubtitlesGenerated
}) => {
  return (
    <>
      {/* 동영상 업로더 */}
      {showVideoUploader && (
        <VideoUploader onVideoUploaded={onVideoUploaded} />
      )}

      {/* 오디오 업로더 */}
      {showAudioUploader && (
        <AudioUploader onSubtitlesGenerated={onSubtitlesGenerated} />
      )}

      {/* 다중 화자 오디오 업로더 */}
      {showMultiSpeakerUploader && (
        <MultiSpeakerAudioUploader 
          speakers={speakers} 
          onSubtitlesGenerated={onSubtitlesGenerated} 
        />
      )}

      {/* 동영상 플레이어 */}
      <div className="mb-20 flex justify-center">
        <div className="max-w-3xl">
          <VideoPlayer
            videoUrl={videoUrl}
            subtitleSegments={subtitleSegments}
            speakers={speakers}
            emotions={emotions}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onTimeUpdate={onTimeUpdate}
            onDurationChange={onDurationChange}
            onPlayPause={onPlayPause}
          />
        </div>
      </div>
    </>
  )
}

export default VideoSection 