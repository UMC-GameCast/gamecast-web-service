import { useState, useEffect } from 'react';
import { backupCharacter, restoreCharacter, clearCharacterBackups, getCharacterBackupStatus } from '../../../utils/characterBackup';
import type { CharacterData } from '../../../types/room';

interface BackupControlsProps {
  guestUserId: string;
  characterData: CharacterData | null;
  onRestore?: (restoredData: CharacterData) => void;
  className?: string;
}

/**
 * 캐릭터 백업/복원 컨트롤 컴포넌트
 * 사용자가 수동으로 백업하고 복원할 수 있는 UI 제공
 */
export const BackupControls = ({ 
  guestUserId, 
  characterData, 
  onRestore, 
  className = '' 
}: BackupControlsProps) => {
  const [backupStatus, setBackupStatus] = useState(getCharacterBackupStatus(guestUserId));
  const [isProcessing, setIsProcessing] = useState(false);

  // 백업 상태 주기적 업데이트
  useEffect(() => {
    const updateStatus = () => {
      setBackupStatus(getCharacterBackupStatus(guestUserId));
    };

    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, [guestUserId]);

  const handleManualBackup = async () => {
    if (!characterData) return;

    setIsProcessing(true);
    try {
      const success = backupCharacter(guestUserId, characterData, { 
        source: 'manual' 
      });
      
      if (success) {
        setBackupStatus(getCharacterBackupStatus(guestUserId));
      }
    } catch (error) {
      console.error('Manual backup failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = () => {
    const backupData = restoreCharacter(guestUserId);
    if (backupData && onRestore) {
      onRestore(backupData.data);
      setBackupStatus(getCharacterBackupStatus(guestUserId));
    }
  };

  const handleClearBackups = () => {
    if (window.confirm('모든 백업 데이터를 삭제하시겠습니까?')) {
      clearCharacterBackups();
      setBackupStatus(getCharacterBackupStatus(guestUserId));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-gray-800 bg-opacity-70 rounded-lg p-4 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">백업 관리</h3>
        <div className="flex space-x-1">
          {backupStatus.hasLocalBackup && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">로컬</span>
          )}
          {backupStatus.hasSessionBackup && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">세션</span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-300 mb-3">
        <div>최종 백업: {formatDate(backupStatus.lastSaveTime)}</div>
        {backupStatus.metadata && (
          <div>백업 횟수: {backupStatus.metadata.backupCount}회</div>
        )}
      </div>

      <div className="flex space-x-2">
        {/* 수동 백업 버튼 */}
        <button
          onClick={handleManualBackup}
          disabled={!characterData || isProcessing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                   text-white text-xs py-2 px-3 rounded transition-colors"
        >
          {isProcessing ? '저장중...' : '수동 백업'}
        </button>

        {/* 복원 버튼 */}
        <button
          onClick={handleRestore}
          disabled={!backupStatus.hasLocalBackup && !backupStatus.hasSessionBackup}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                   text-white text-xs py-2 px-3 rounded transition-colors"
        >
          복원
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={handleClearBackups}
          disabled={!backupStatus.hasLocalBackup && !backupStatus.hasSessionBackup}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 
                   text-white text-xs py-1 px-2 rounded transition-colors"
          title="백업 삭제"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};