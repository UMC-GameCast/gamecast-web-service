## 1. Project Overview
- **Service Name**: GameCast (가칭)
- **Core Goal**: AI를 사용하여 여러 플레이어의 게임 플레이 영상을 자동으로 편집하고, 재미있는 순간을 하이라이트 영상으로 제작하는 웹 서비스.
- **Target User**: 친구들과 함께 게임을 즐기며, 재미있는 순간을 영상으로 만들어 수익을 창출하고 싶은 게이머.

## 2. Tech Stack
You **MUST** follow this technology stack.
- **Frontend**: React, TypeScript
- **Backend**: Node.js, Express.js
- **Styling**: **Tailwind CSS**. All styling must be done using Tailwind utility classes.
- **State Management**: Zustand (또는 프로젝트에서 사용할 다른 라이브러리)

## 3. Directory Structure
You **MUST** adhere to this directory structure.

### Frontend (`/src`)
- `/components`: 재사용 가능한 UI 컴포넌트
  - `/common`: 버튼, 인풋 등 범용 컴포넌트
  - `/domain`: 특정 기능(e.g., 캐릭터 커스터마이징) 관련 컴포넌트
- `/pages`: 각 페이지를 구성하는 컴포넌트
- `/hooks`: 커스텀 React Hooks
- `/services`: API 호출 로직
- `/store`: 상태 관리 로직 (Zustand)
- `/styles`: `globals.css` 등 전역 CSS 파일. Tailwind CSS 지시어(@tailwind) 외에는 최소한으로 사용한다.
- `/utils`: 유틸리티 함수
- `/assets`: 이미지, 폰트 등 정적 에셋
