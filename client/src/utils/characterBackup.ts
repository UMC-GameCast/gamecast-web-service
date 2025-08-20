/**
 * 캐릭터 데이터 백업 및 복원 시스템
 * LocalStorage와 SessionStorage를 활용한 다층 백업 시스템
 */

import type { CharacterData } from '../types/room';

const STORAGE_KEYS = {
  LOCAL_BACKUP: 'gamecast_character_backup',      // 장기 보관용
  SESSION_BACKUP: 'gamecast_character_session',   // 세션 보관용
  LAST_SAVE_TIME: 'gamecast_character_save_time', // 마지막 저장 시간
  BACKUP_METADATA: 'gamecast_character_metadata'  // 백업 메타데이터
} as const;

export interface CharacterBackupMetadata {
  version: string;
  guestUserId: string;
  roomCode?: string;
  createdAt: string;
  lastUpdated: string;
  backupCount: number;
  source: 'manual' | 'auto' | 'emergency';
}

export interface CharacterBackupData {
  data: CharacterData;
  metadata: CharacterBackupMetadata;
}

/**
 * 캐릭터 백업 관리 클래스
 */
export class CharacterBackupManager {
  private static instance: CharacterBackupManager | null = null;
  private readonly version = '1.0.0';

  static getInstance(): CharacterBackupManager {
    if (!CharacterBackupManager.instance) {
      CharacterBackupManager.instance = new CharacterBackupManager();
    }
    return CharacterBackupManager.instance;
  }

  /**
   * 캐릭터 데이터를 백업
   */
  backup(
    guestUserId: string,
    characterData: CharacterData,
    options: {
      roomCode?: string;
      source?: 'manual' | 'auto' | 'emergency';
      useSession?: boolean;
    } = {}
  ): boolean {
    try {
      const { roomCode, source = 'auto', useSession = true } = options;
      const now = new Date().toISOString();

      const metadata: CharacterBackupMetadata = {
        version: this.version,
        guestUserId,
        roomCode,
        createdAt: now,
        lastUpdated: now,
        backupCount: this.getBackupCount() + 1,
        source
      };

      const backupData: CharacterBackupData = {
        data: characterData,
        metadata
      };

      // 1. LocalStorage에 백업 (장기 보관)
      localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP, JSON.stringify(backupData));
      localStorage.setItem(STORAGE_KEYS.LAST_SAVE_TIME, now);
      localStorage.setItem(STORAGE_KEYS.BACKUP_METADATA, JSON.stringify(metadata));

      // 2. SessionStorage에도 백업 (세션용)
      if (useSession) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_BACKUP, JSON.stringify(backupData));
      }

      console.log(`💾 [CharacterBackup] 백업 완료:`, {
        guestUserId,
        source,
        backupCount: metadata.backupCount,
        timestamp: now
      });

      return true;

    } catch (error) {
      console.error('❌ [CharacterBackup] 백업 실패:', error);
      return false;
    }
  }

  /**
   * 백업된 캐릭터 데이터 복원
   */
  restore(guestUserId: string): CharacterBackupData | null {
    try {
      // 1. 먼저 SessionStorage에서 시도 (최신 데이터)
      let backupData = this.restoreFromStorage(sessionStorage, STORAGE_KEYS.SESSION_BACKUP);
      
      // 2. SessionStorage에 없으면 LocalStorage에서 시도
      if (!backupData) {
        backupData = this.restoreFromStorage(localStorage, STORAGE_KEYS.LOCAL_BACKUP);
      }

      if (!backupData) {
        console.log('📁 [CharacterBackup] 백업 데이터 없음');
        return null;
      }

      // guestUserId 검증
      if (backupData.metadata.guestUserId !== guestUserId) {
        console.warn('⚠️ [CharacterBackup] guestUserId 불일치:', {
          backup: backupData.metadata.guestUserId,
          current: guestUserId
        });
        return null;
      }

      console.log('📦 [CharacterBackup] 백업 데이터 복원 성공:', {
        guestUserId,
        source: backupData.metadata.source,
        createdAt: backupData.metadata.createdAt,
        backupCount: backupData.metadata.backupCount
      });

      return backupData;

    } catch (error) {
      console.error('❌ [CharacterBackup] 복원 실패:', error);
      return null;
    }
  }

  /**
   * 특정 Storage에서 데이터 복원
   */
  private restoreFromStorage(storage: Storage, key: string): CharacterBackupData | null {
    try {
      const stored = storage.getItem(key);
      if (!stored) return null;

      const backupData: CharacterBackupData = JSON.parse(stored);
      
      // 데이터 검증
      if (!this.validateBackupData(backupData)) {
        console.warn('⚠️ [CharacterBackup] 백업 데이터 검증 실패');
        return null;
      }

      return backupData;

    } catch (error) {
      console.error('❌ [CharacterBackup] Storage 읽기 실패:', error);
      return null;
    }
  }

  /**
   * 백업 데이터 검증
   */
  private validateBackupData(backupData: any): backupData is CharacterBackupData {
    return (
      backupData &&
      typeof backupData === 'object' &&
      backupData.data &&
      backupData.metadata &&
      backupData.metadata.guestUserId &&
      backupData.data.selectedOptions &&
      backupData.data.selectedColors &&
      backupData.data.nickname
    );
  }

  /**
   * 백업 데이터 존재 여부 확인
   */
  hasBackup(guestUserId: string): boolean {
    const backup = this.restore(guestUserId);
    return backup !== null;
  }

  /**
   * 백업 카운트 조회
   */
  private getBackupCount(): number {
    try {
      const metadata = localStorage.getItem(STORAGE_KEYS.BACKUP_METADATA);
      if (!metadata) return 0;

      const parsed: CharacterBackupMetadata = JSON.parse(metadata);
      return parsed.backupCount || 0;

    } catch {
      return 0;
    }
  }

  /**
   * 백업 메타데이터 조회
   */
  getBackupMetadata(): CharacterBackupMetadata | null {
    try {
      const metadata = localStorage.getItem(STORAGE_KEYS.BACKUP_METADATA);
      if (!metadata) return null;

      return JSON.parse(metadata);

    } catch {
      return null;
    }
  }

  /**
   * 백업 데이터 정리
   */
  clearBackups(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP);
      localStorage.removeItem(STORAGE_KEYS.LAST_SAVE_TIME);
      localStorage.removeItem(STORAGE_KEYS.BACKUP_METADATA);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_BACKUP);

      console.log('🗑️ [CharacterBackup] 백업 데이터 정리 완료');

    } catch (error) {
      console.error('❌ [CharacterBackup] 백업 정리 실패:', error);
    }
  }

  /**
   * 백업 상태 정보
   */
  getBackupStatus(guestUserId: string): {
    hasLocalBackup: boolean;
    hasSessionBackup: boolean;
    lastSaveTime: string | null;
    metadata: CharacterBackupMetadata | null;
  } {
    const hasLocalBackup = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP) !== null;
    const hasSessionBackup = sessionStorage.getItem(STORAGE_KEYS.SESSION_BACKUP) !== null;
    const lastSaveTime = localStorage.getItem(STORAGE_KEYS.LAST_SAVE_TIME);
    const metadata = this.getBackupMetadata();

    return {
      hasLocalBackup,
      hasSessionBackup,
      lastSaveTime,
      metadata
    };
  }
}

/**
 * 편의 함수들
 */
export const characterBackup = CharacterBackupManager.getInstance();

export const backupCharacter = (
  guestUserId: string,
  characterData: CharacterData,
  options?: Parameters<CharacterBackupManager['backup']>[2]
) => characterBackup.backup(guestUserId, characterData, options);

export const restoreCharacter = (guestUserId: string) => 
  characterBackup.restore(guestUserId);

export const hasCharacterBackup = (guestUserId: string) => 
  characterBackup.hasBackup(guestUserId);

export const clearCharacterBackups = () => characterBackup.clearBackups();

export const getCharacterBackupStatus = (guestUserId: string) => 
  characterBackup.getBackupStatus(guestUserId);