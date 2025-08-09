import React, { createContext, useContext, useState, ReactNode } from 'react';

// 간단한 상태 관리 Context
interface SimpleGamecastState {
  showCharacterSetup: boolean;
  characterSetupComplete: boolean;
  screenSetupComplete: boolean;
  showMicGuide: boolean;
}

interface SimpleGamecastContextType {
  // 상태
  showCharacterSetup: boolean;
  characterSetupComplete: boolean;
  screenSetupComplete: boolean;
  showMicGuide: boolean;
  
  // 액션
  setShowCharacterSetup: (show: boolean) => void;
  setCharacterSetupComplete: (complete: boolean) => void;
  setScreenSetupComplete: (complete: boolean) => void;
  setShowMicGuide: (show: boolean) => void;
}

const SimpleGamecastContext = createContext<SimpleGamecastContextType | null>(null);

// Provider 컴포넌트
export const SimpleGamecastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showCharacterSetup, setShowCharacterSetup] = useState(false);
  const [characterSetupComplete, setCharacterSetupComplete] = useState(false);
  const [screenSetupComplete, setScreenSetupComplete] = useState(false);
  const [showMicGuide, setShowMicGuide] = useState(false);

  const value = {
    showCharacterSetup,
    characterSetupComplete,
    screenSetupComplete,
    showMicGuide,
    setShowCharacterSetup,
    setCharacterSetupComplete,
    setScreenSetupComplete,
    setShowMicGuide
  };

  return (
    <SimpleGamecastContext.Provider value={value}>
      {children}
    </SimpleGamecastContext.Provider>
  );
};

// Hook
export const useSimpleGamecast = () => {
  const context = useContext(SimpleGamecastContext);
  if (!context) {
    throw new Error('useSimpleGamecast는 SimpleGamecastProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

// 개별 Hook들
export const useGamecastCharacter = () => {
  const context = useSimpleGamecast();
  return {
    showCharacterSetup: context.showCharacterSetup,
    characterSetupComplete: context.characterSetupComplete,
    setShowCharacterSetup: context.setShowCharacterSetup,
    setCharacterSetupComplete: context.setCharacterSetupComplete
  };
};

export const useGamecastUI = () => {
  const context = useSimpleGamecast();
  return {
    showMicGuide: context.showMicGuide,
    screenSetupComplete: context.screenSetupComplete,
    setShowMicGuide: context.setShowMicGuide,
    setScreenSetupComplete: context.setScreenSetupComplete
  };
};