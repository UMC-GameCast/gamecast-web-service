import subprocess
import json
import os
from typing import List, Dict
import tempfile

class VideoRenderer:
    def __init__(self):
        self.output_dir = "output"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def create_srt_from_segments(self, segments: List[Dict], output_path: str):
        """자막 세그먼트를 SRT 파일로 변환"""
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(segments, 1):
                start_time = self.format_time(segment['startTime'])
                end_time = self.format_time(segment['endTime'])
                text = segment['text']
                
                f.write(f"{i}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{text}\n\n")
    
    def format_time(self, seconds: float) -> str:
        """초를 SRT 시간 형식으로 변환 (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"
    
    def render_video_with_subtitles(self, video_path: str, segments: List[Dict], output_filename: str) -> str:
        """동영상과 자막을 합쳐서 렌더링"""
        
        # 임시 SRT 파일 생성
        with tempfile.NamedTemporaryFile(mode='w', suffix='.srt', delete=False, encoding='utf-8') as temp_srt:
            self.create_srt_from_segments(segments, temp_srt.name)
            srt_path = temp_srt.name
        
        output_path = os.path.join(self.output_dir, output_filename)
        
        try:
            # FFmpeg 명령어 구성
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-vf', f'subtitles={srt_path}:force_style=\'FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,BackColour=&H80000000,Bold=1,Outline=2\'',
                '-c:a', 'copy',  # 오디오는 그대로 복사
                '-c:v', 'libx264',  # H.264 코덱 사용
                '-preset', 'medium',  # 인코딩 속도/품질 균형
                '-crf', '23',  # 품질 설정 (18-28 권장)
                '-y',  # 기존 파일 덮어쓰기
                output_path
            ]
            
            # FFmpeg 실행
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg 오류: {result.stderr}")
            
            return output_path
            
        finally:
            # 임시 파일 정리
            if os.path.exists(srt_path):
                os.unlink(srt_path)
    
    def render_with_custom_styles(self, video_path: str, segments: List[Dict], output_filename: str, 
                                 font_size: int = 24, font_color: str = 'white', 
                                 bg_color: str = 'black@0.5') -> str:
        """커스텀 스타일로 자막 렌더링"""
        
        output_path = os.path.join(self.output_dir, output_filename)
        
        # 자막 필터 구성
        subtitle_filters = []
        for segment in segments:
            start_time = segment['startTime']
            end_time = segment['endTime']
            text = segment['text'].replace("'", "\\'")
            
            filter_expr = f"drawtext=text='{text}':fontsize={font_size}:fontcolor={font_color}:box=1:boxcolor={bg_color}:x=(w-text_w)/2:y=h-th-10:enable='between(t,{start_time},{end_time})'"
            subtitle_filters.append(filter_expr)
        
        filter_chain = ','.join(subtitle_filters)
        
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vf', filter_chain,
            '-c:a', 'copy',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-y',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg 오류: {result.stderr}")
        
        return output_path

# 사용 예시
if __name__ == "__main__":
    renderer = VideoRenderer()
    
    # 테스트 데이터
    segments = [
        {
            'startTime': 1.8,
            'endTime': 3.2,
            'text': '그짓말 치지 마세요',
            'speaker': 'choroksaengmaesil'
        },
        {
            'startTime': 3.8,
            'endTime': 5.5,
            'text': '자막이 들어가면 늘어나는 형태',
            'speaker': 'choroksaengmaesil'
        }
    ]
    
    # 렌더링 실행
    output_path = renderer.render_video_with_subtitles(
        'input_video.mp4',
        segments,
        'output_with_subtitles.mp4'
    )
    print(f"렌더링 완료: {output_path}") 