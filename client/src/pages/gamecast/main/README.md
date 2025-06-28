# Main Page

gamecast 서비스의 메인 페이지입니다. 사용자가 처음 접속했을 때 보이는 랜딩 페이지로, 주요 기능으로 이동할 수 있는 네비게이션을 제공합니다.

## 페이지 구조

```tsx
<div className="min-h-screen bg-gradient">
  <Header />                 {/* 공통 헤더 */}
  <main>
    <환영 메시지 />
    <NavigationCard />       {/* 주요 기능 네비게이션 */}
  </main>
  <Footer />                 {/* 공통 푸터 */}
</div>
```

## 주요 기능

### 1. 환영 메시지
- **제목**: "GAMECAST에 오신 것을 환영합니다"
- **설명**: 서비스 소개 및 안내 메시지
- **스타일**: 대형 텍스트, 중앙 정렬

### 2. NavigationCard - 메인 네비게이션
- **방 참여하기**: 입장코드로 기존 방에 참여
  - 파란색 카드 디자인
  - 로그인 아이콘
  - participate 페이지로 이동
  
- **새 방 만들기**: 새로운 게임 방 생성
  - 초록색 카드 디자인  
  - 플러스 아이콘
  - create 페이지로 이동 (개발 예정)

### 3. 추가 안내
- 서비스 소개 카드
- 반투명 디자인

## 페이지 전환 시스템

현재는 React state 기반의 간단한 SPA 네비게이션을 사용합니다:

```tsx
// App.tsx
const [currentPage, setCurrentPage] = useState<PageType>('main')

// 페이지 전환
<MainPage onNavigate={setCurrentPage} />
<ParticipatePage onBack={() => setCurrentPage('main')} />
```

### 지원하는 페이지
- `main`: 메인 페이지
- `participate`: 참여 페이지 (완성됨)
- `create`: 방 만들기 페이지 (개발 예정)

## 향후 개발 계획

- [ ] React Router 도입
- [ ] Create 페이지 개발 완료
- [ ] 애니메이션 효과 추가
- [ ] 반응형 디자인 최적화
- [ ] SEO 최적화

## 사용법

```tsx
import { MainPage } from './pages';

function App() {
  return <MainPage onNavigate={handlePageChange} />;
}
``` 