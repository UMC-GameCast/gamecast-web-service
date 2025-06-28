# Participate Page

gamecast 서비스의 참여 페이지입니다. 사용자가 입장코드를 입력하여 게임 방에 참여할 수 있는 페이지입니다.

## 페이지 구조

```tsx
<div className="min-h-screen bg-gradient">
  <Header />                    {/* 공통 헤더 */}
  <main>
    <ParticipationCodeCard />   {/* 참여 코드 입력 카드 */}
  </main>
  <Footer />                    {/* 공통 푸터 */}
</div>
```

## 컴포넌트 구성

### 1. Header
- **위치**: `src/components/gamecast/common/Header.tsx`
- **기능**: GAMECAST 로고 및 상단 네비게이션
- **필요 이미지**: `desgin-1.svg`

### 2. ParticipationCodeCard
- **위치**: `src/components/gamecast/participate/ParticipationCodeCard.tsx`
- **기능**: 
  - 입장코드 입력 폼
  - 참가하기 버튼
  - 새 방 만들기 링크
- **스타일**: 반투명 카드 디자인 (glassmorphism)

### 3. Footer
- **위치**: `src/components/gamecast/common/Footer.tsx`
- **기능**: 
  - 브랜드 정보
  - 약관 링크들
  - 저작권 정보

## 사용법

```tsx
import { ParticipatePage } from './pages';

function App() {
  return <ParticipatePage />;
}
```

## 향후 개발 계획

- [ ] 입장코드 유효성 검사
- [ ] 서버와의 API 연동
- [ ] 로딩 상태 처리
- [ ] 에러 상태 처리
- [ ] 반응형 디자인 최적화 