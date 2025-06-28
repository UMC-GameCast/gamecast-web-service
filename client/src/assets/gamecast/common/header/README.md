# Header Assets

헤더 컴포넌트에서 사용하는 이미지 파일들을 저장하는 폴더입니다.

## 필요한 파일들 (3개)

다음 SVG 파일들을 이 폴더에 저장해주세요:

- `logoicon.svg` - 헤더 좌측 로고 아이콘 (32px 높이)
- `logo.svg` - GAMECAST 로고 텍스트 (26px 높이)
- `desgin-1.svg` - 헤더 하단 장식 라인 (1356.83px × 60.49px)

## 사용법

Header 컴포넌트에서 다음과 같이 import합니다:

```javascript
import desgin1 from "../../../assets/gamecast/common/header/desgin-1.svg";
import logo from "../../../assets/gamecast/common/header/logo.svg";
import logoicon from "../../../assets/gamecast/common/header/logoicon.svg";
```

## 컴포넌트 구조 (Tailwind CSS)

```jsx
<div className="flex flex-col items-center py-[45px] px-[166px] relative">
  <div className="h-8 w-[256.2px] relative flex items-center">
    <img className="h-8 w-auto mr-2" alt="Logoicon" src={logoicon} />
    <img className="h-[26px] w-auto flex-1" alt="Logo" src={logo} />
  </div>
  <img className="h-[60.49px] w-[1356.83px] -mt-[10px] relative" alt="Header" src={desgin1} />
</div>
```

## Tailwind 클래스 설명

| 요소 | Tailwind 클래스 | 설명 |
|------|----------------|------|
| **헤더 컨테이너** | `flex flex-col items-center py-[45px] px-[166px] relative` | 세로 플렉스, 중앙 정렬, 패딩 45px/166px |
| **로고 영역** | `h-8 w-[256.2px] relative flex items-center` | 높이 32px, 너비 256.2px, 가로 플렉스 |
| **로고 아이콘** | `h-8 w-auto mr-2` | 높이 32px, 자동 너비, 오른쪽 마진 8px |
| **로고 텍스트** | `h-[26px] w-auto flex-1` | 높이 26px, 자동 너비, 남은 공간 차지 |
| **하단 장식** | `h-[60.49px] w-[1356.83px] -mt-[10px] relative` | 크기 고정, 위쪽 마진 -10px |

## 레이아웃

```
┌─────────────────────────────────────────┐
│                 Header                   │  ← py-[45px] px-[166px]
├─────────────────────────────────────────┤
│  [🎮] [GAMECAST...............]          │  ← h-8 w-[256.2px] flex
│                                         │
│  ═══════════════════════════════════════  │  ← h-[60.49px] w-[1356.83px]
└─────────────────────────────────────────┘
```

## CSS → Tailwind 변환표

| 원본 CSS | 변환된 Tailwind |
|----------|----------------|
| `display: flex; flex-direction: column` | `flex flex-col` |
| `align-items: center` | `items-center` |
| `padding: 45px 166px` | `py-[45px] px-[166px]` |
| `height: 32px` | `h-8` |
| `width: 256.2px` | `w-[256.2px]` |
| `margin-right: 8px` | `mr-2` |
| `height: 26px` | `h-[26px]` |
| `flex: 1` | `flex-1` |
| `height: 60.49px` | `h-[60.49px]` |
| `margin-top: -10px` | `-mt-[10px]` |
| `width: 1356.83px` | `w-[1356.83px]` | 