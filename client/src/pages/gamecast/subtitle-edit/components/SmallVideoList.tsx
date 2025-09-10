import React from 'react';

interface SmallVideoListProps {
  videos: any[];
  handleVideoDelete: (index: number) => void;
  handleVideoUploadStart: (index: number) => void;
  setPendingSmallVideoIndex: (index: number) => void;
}

const SmallVideoList: React.FC<SmallVideoListProps> = ({
  videos,
  handleVideoDelete,
  handleVideoUploadStart,
  setPendingSmallVideoIndex,
}) => {
  return (
    <div className="w-full" style={{ height: '409px', maxWidth: '200px', paddingRight: '2px' }}>
      {/* 스크롤div (15개 동영상 전체 스크롤 영역) */}
      <div className="custom-scrollbar overflow-y-auto overflow-x-hidden" style={{ height: '409px', maxHeight: '409px', paddingRight: '4px' }}>
        {/* 그룹 전체를 감싸는 div (mt, ml 적용) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[0, 1, 2].map((groupIdx) => (
            // 소스1/2/3div (각 5개 동영상 그룹)
            <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {/* 소스N 텍스트 */}
              <div
                style={{
                  borderBottom: '0.863px solid #FFF',
                  display: 'flex',
                  width: '170px',
                  padding: '9px 4px',
                  alignItems: 'center',
                  gap: '8.631px',
                  color: '#FFF',
                  textAlign: 'left',
                  fontFamily: 'Pretendard',
                  fontSize: '13.978px',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '150%',
                  letterSpacing: '-0.266px',
                  justifyContent: 'flex-start',
                }}
              >
                {`소스${groupIdx + 1}`}
              </div>
              {Array.from({ length: 5 }).map((_, i) => {
                const videoIndex = groupIdx * 5 + i + 1; // 1~15
                const video = videos[videoIndex];
                // 동영상 슬롯div
                return (
                  <div key={videoIndex} className="bg-gray-800 rounded-lg p-3 relative" style={{ width: '170px', height: '113.175px' }}>
                    {/* 삭제 버튼과 동영상 N 텍스트 제거 */}
                    <div className="aspect-video bg-gray-700 rounded relative overflow-hidden" style={{ width: '100%', height: '100%' }}>
                      {video && video.url ? (
                        <div className="relative group" style={{ width: '100%', height: '100%' }}>
                          <video 
                            className="w-full h-full object-cover rounded"
                            src={video.url}
                            controls={false}
                            preload="metadata"
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                          <div className="text-center">
                            <div className="mb-2">📹</div>
                            <div className="mb-2">동영상 없음</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmallVideoList;
