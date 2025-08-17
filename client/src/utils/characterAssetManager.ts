// 캐릭터 에셋 관리자
export interface CharacterAsset {
  id: string;
  name: string;
  category: 'hair' | 'top' | 'bottom' | 'accessory' | 'face';
  defaultImage: string;
  colors: Array<{
    name: string;
    value: string; // 실제 색상값 (헥스 코드)
    image: string;
  }>;
}

// 색상 이름을 헥스 코드로 매핑
const colorMap: Record<string, string> = {
  black: '#000000',
  blue: '#4A90E2',
  green: '#7ED321',
  pink: '#F5A623',
  red: '#D0021B',
  yellow: '#F8E71C',
  white: '#FFFFFF',
  default: '#FFFFFF', // 기본 흰색
  // body 색상 매핑 (파일명 기준)
  '21': '#FFE0BD', // 밝은 살색
  '23': '#F4C2A1', // 중간 살색  
  '27': '#D4A574', // 어두운 살색
  '43': '#8B6F47'  // 가장 어두운 살색
};

// 한글 색상 이름 매핑 (향후 다국어 지원용)
/*
const koreanColorMap: Record<string, string> = {
  '그린': 'green',
  '레드': 'red',
  '블루': 'blue',
  '옐로우': 'yellow',
  '화이트': 'white'
};
*/

// 파일명에서 색상 추출 (향후 캐릭터 커스터마이징용)
/*
const extractColorFromFilename = (filename: string): { name: string; value: string } => {
  const name = filename.toLowerCase().replace(/\.(png|jpg|jpeg)$/i, '');
  
  // 한글 색상명 체크
  for (const [korean, english] of Object.entries(koreanColorMap)) {
    if (filename.includes(korean)) {
      return { name: english, value: colorMap[english] || '#000000' };
    }
  }
  
  // 영문 색상명 체크
  if (colorMap[name]) {
    return { name, value: colorMap[name] };
  }
  
  return { name: 'default', value: colorMap.default };
};
*/

// 에셋 데이터 생성
export const generateAssetData = (): CharacterAsset[] => {
  const assets: CharacterAsset[] = [];
  const basePath = '/src/assets/gamecast/characterCustom/charactorasset';

  // 머리 에셋
  for (let i = 1; i <= 4; i++) {
    const hairColors = i === 1 || i === 3 
      ? ['black', 'blue', 'green', 'pink', 'red', 'yellow']
      : ['default', 'blue', 'green', 'pink', 'red', 'yellow'];
    
    assets.push({
      id: `hair${i}`,
      name: `머리 ${i}`,
      category: 'hair',
      defaultImage: `${basePath}/hair${i}/${hairColors.includes('default') ? 'default' : 'black'}.png`,
      colors: hairColors.map(color => ({
        name: color,
        value: colorMap[color],
        image: `${basePath}/hair${i}/${color}.png`
      }))
    });
  }

  // 상의 에셋
  for (let i = 1; i <= 3; i++) {
    let colors: Array<{ name: string; value: string; image: string }>;
    
    if (i === 3) {
      // top3는 한글 파일명 사용
      colors = [
        { name: 'white', value: colorMap.white, image: `${basePath}/top${i}/상의3_화이트.png` },
        { name: 'green', value: colorMap.green, image: `${basePath}/top${i}/상의3_그린.png` },
        { name: 'red', value: colorMap.red, image: `${basePath}/top${i}/상의3_레드.png` },
        { name: 'blue', value: colorMap.blue, image: `${basePath}/top${i}/상의3_블루.png` },
        { name: 'yellow', value: colorMap.yellow, image: `${basePath}/top${i}/상의3_옐로우.png` }
      ];
    } else {
      colors = ['default', 'blue', 'green', 'red', 'yellow'].map(color => ({
        name: color,
        value: colorMap[color],
        image: `${basePath}/top${i}/${color}.png`
      }));
    }

    assets.push({
      id: `top${i}`,
      name: `상의 ${i}`,
      category: 'top',
      defaultImage: i === 3 ? `${basePath}/top${i}/상의3_화이트.png` : `${basePath}/top${i}/default.png`,
      colors
    });
  }

  // 하의 에셋
  for (let i = 1; i <= 3; i++) {
    const colors = ['default', 'blue', 'green', 'red', 'yellow'].map(color => ({
      name: color,
      value: colorMap[color],
      image: `${basePath}/bottom${i}/${color}.png`
    }));

    assets.push({
      id: `bottom${i}`,
      name: `하의 ${i}`,
      category: 'bottom',
      defaultImage: `${basePath}/bottom${i}/default.png`,
      colors
    });
  }

  // 장식 에셋
  for (let i = 1; i <= 3; i++) {
    let colors: Array<{ name: string; value: string; image: string }>;
    
    if (i === 1) {
      colors = [
        { name: 'default', value: colorMap.default, image: `${basePath}/accessories${i}/default.PNG` },
        { name: 'blue', value: colorMap.blue, image: `${basePath}/accessories${i}/blue.png` },
        { name: 'green', value: colorMap.green, image: `${basePath}/accessories${i}/green.png` },
        { name: 'red', value: colorMap.red, image: `${basePath}/accessories${i}/red.png` },
        { name: 'yellow', value: colorMap.yellow, image: `${basePath}/accessories${i}/yellow.PNG` }
      ];
    } else if (i === 2) {
      colors = ['default', 'blue', 'green', 'red', 'yellow'].map(color => ({
        name: color,
        value: colorMap[color],
        image: `${basePath}/accessories${i}/${color}.png`
      }));
    } else {
      colors = ['white', 'blue', 'green', 'red', 'yellow'].map(color => ({
        name: color,
        value: colorMap[color],
        image: `${basePath}/accessories${i}/${color}.png`
      }));
    }

    assets.push({
      id: `accessories${i}`,
      name: `장식 ${i}`,
      category: 'accessory',
      defaultImage: i === 3 ? `${basePath}/accessories${i}/white.png` : 
                    i === 1 ? `${basePath}/accessories${i}/default.PNG` : 
                    `${basePath}/accessories${i}/default.png`,
      colors
    });
  }

  // 얼굴 에셋
  for (let i = 1; i <= 3; i++) {
    // const faceColors = ['default', 'angry', 'excited', 'sad', 'surprise']; // 향후 표정 에셋용
    
    assets.push({
      id: `face${i}`,
      name: `얼굴 ${i}`,
      category: 'face',
      defaultImage: `${basePath}/face${i}/default.png`,
      // 얼굴 카테고리의 "색상"은 실제로는 몸통 색상
      colors: [
        { name: '21', value: colorMap['21'], image: `${basePath}/body/21.png` },
        { name: '23', value: colorMap['23'], image: `${basePath}/body/23.png` },
        { name: '27', value: colorMap['27'], image: `${basePath}/body/27.png` },
        { name: '43', value: colorMap['43'], image: `${basePath}/body/43.png` }
      ]
    });
  }

  return assets;
};

// 카테고리별 에셋 필터링
export const getAssetsByCategory = (category: 'hair' | 'top' | 'bottom' | 'accessory' | 'face'): CharacterAsset[] => {
  return generateAssetData().filter(asset => asset.category === category);
};

// 특정 에셋의 색상 옵션 취득
export const getAssetColors = (assetId: string): Array<{ name: string; value: string; image: string }> => {
  const asset = generateAssetData().find(a => a.id === assetId);
  return asset?.colors || [];
};