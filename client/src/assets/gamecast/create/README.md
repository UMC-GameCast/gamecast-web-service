# Gamecast Create Page Assets

이 폴더는 gamecast/create 페이지에서 사용하는 모든 이미지 파일들을 포함합니다.

## 폴더 구조

### `/vectors/`
Vector 관련 SVG 파일들을 저장하는 폴더입니다.
다음 파일들을 이 폴더에 넣어주세요:

- `vector-13779-2.svg`
- `vector-13779.svg`
- `vector-13782-2.svg`
- `vector-13782.svg`
- `vector-13783-2.svg`
- `vector-13783.svg`
- `vector-13784-2.svg`
- `vector-13784.svg`
- `vector-13785-2.svg`
- `vector-13785.svg`
- `vector-13786-2.svg`
- `vector-13786.svg`
- `vector-13790.svg`
- `vector-13806.svg`
- `vector-13811.svg`
- `vector-13819.svg`
- `vector-13822.svg`

### `/subtract/`
Subtract 관련 SVG 파일들을 저장하는 폴더입니다.
다음 파일들을 이 폴더에 넣어주세요:

- `subtract.svg`
- `subtract-2.svg`
- `subtract-3.svg`
- `subtract-4.svg`
- `subtract-5.svg`
- `subtract-6.svg`
- `subtract-7.svg`
- `subtract-8.svg`

### `/icons/`
아이콘 및 기타 이미지 파일들을 저장하는 폴더입니다.
다음 파일들을 이 폴더에 넣어주세요:

- `image.svg`
- `union-2.svg` (Property 컴포넌트에서 사용)

## Import 경로 수정 예시

현재 코드에서는 상대 경로로 import하고 있습니다:
```javascript
import vector137792 from "./vector-13779-2.svg";
```

다음과 같이 수정하여 사용하시면 됩니다:
```javascript
import vector137792 from "../../../assets/gamecast/create/vectors/vector-13779-2.svg";
import subtract2 from "../../../assets/gamecast/create/subtract/subtract-2.svg";
import image from "../../../assets/gamecast/create/icons/image.svg";
```

## 컴포넌트 파일들

별도로 생성해야 하는 컴포넌트들:
- `FiChevronLeft` - 뒤로가기 아이콘 컴포넌트
- `Icon` - 하단 아이콘 컴포넌트
- `Property` - 입장하기 버튼 컴포넌트

이 컴포넌트들은 `/src/components/gamecast/common/` 폴더에 생성하는 것을 권장합니다. 