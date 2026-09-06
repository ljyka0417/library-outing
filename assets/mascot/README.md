# 달곰이 (Dalgomi) 에셋

앱에 적용 완료. 원본 캐릭터 시트를 포즈별로 잘라 `poses/` 에 두고,
`src/components/Mascot.tsx` 가 `pose` prop 으로 골라 쓴다.

```
assets/mascot/
├── 달곰이.png          ← 원본 시트 (1536×1024, 투명 배경)
├── poses/              ← 앱이 실제로 쓰는 24개 포즈 (커밋 대상)
├── slices/             ← 분할 원본. 생성물이라 커밋 안 함
└── slices-preview.html ← 분할 결과 확인용. 생성물
```

## 시트를 갱신했을 때

```bash
node scripts/slice-mascot-sheet.mjs "assets/mascot/달곰이.png"
```

1. `slices/` 에 `slice-01.png` … 형태로 분할되고
2. `slices-preview.html` 로 번호와 함께 확인할 수 있다
3. 확인 후 필요한 것만 `poses/dalgomi-*.png` 이름으로 복사한다

분할이 이상하면 `scripts/analyze-sheet.mjs` 로 여백을 재 보고
`slice-mascot-sheet.mjs` 상단의 `NOISE` / `MIN_BAND_H` / `MIN_CELL_W` 를 조정한다.

```bash
node scripts/analyze-sheet.mjs "assets/mascot/달곰이.png"
```

## 포즈 목록과 쓰이는 곳

| pose | 그림 | 앱에서 |
|---|---|---|
| `wave` | 손 흔들며 인사 | 온보딩 1p |
| `read` | 초록 책 읽기 | 온보딩 2p |
| `map` | 지도 펼치기 | 온보딩 3p |
| `hello` | 반갑게 손 들기 | 마이페이지 |
| `faceHappy` | 활짝 웃는 얼굴 | 홈 헤더 |
| `faceHeart` | 하트와 함께 | 즐겨찾기 빈 상태 |
| `faceSleepy` | 눈 감고 미소 | 검색 결과 없음 |
| `faceWink` | 찡긋 | 오류·잘못된 QR |
| `coffee` | 커피 들기 | 주변 카페 빈 상태 |
| `camera` | 카메라 들기 | 문화·볼거리 빈 상태 |

아직 안 쓰고 있는 포즈: `walk` `side` `back` `backpack` `reading` `books`
`flag` `sparkle` `hatGreen` `hatExplorer` `face` `faceTongue` `faceCalm` `faceCheer`

`flag`(깃발)는 방문 체크인 완료, `backpack`(뒷모습)은 최근 본 기록 없음,
`books`는 추천 도서 섹션에 어울린다.

## ⚠️ 해상도

원본 시트가 1536×1024 라서 캐릭터 한 마리가 **180~270px** 밖에 안 된다.
온보딩에서 190pt 로 그리면 3배 디스플레이에서는 570px 이 필요하므로
확대되어 다소 흐릿하다.

또렷하게 하려면 시트를 **3배 크기(4608×3072)로 다시 내보내** 같은 스크립트를
돌리면 된다. 파일명만 같으면 나머지는 자동이다.

## 아직 안 한 것

- [ ] 소품 낱장 분리 — 시트 4번째 줄(책·지도·카메라·커피·깃발·모자·반짝임)은
      서로 붙어 있어 3덩어리로만 잘렸다. 빈 상태 아이콘으로 쓰려면 수동 분리 필요
- [ ] 앱 아이콘 / 스플래시 제작

| 파일 | 크기 | 비고 |
|---|---|---|
| `assets/icon.png` | 1024×1024 | 여백 없이, 투명도 없이 |
| `assets/adaptive-icon.png` | 1024×1024 | 안드로이드. 가장자리 잘림 대비 안전영역 안에 |
| `assets/splash.png` | 1284×2778 | 배경 `#FBF8F3` |

`faceHappy` 나 `wave` 를 아이콘 베이스로 쓰면 좋다.

## 브랜드 컬러

`src/theme/index.ts` 의 `dalgomi` 토큰. 캐릭터 주변 UI가 캐릭터와 따로 놀지
않도록 참조용으로 둔다.

| 이름 | 값 | 쓰임 |
|---|---|---|
| fur | `#F9F2E2` | 몸통 아이보리 |
| line | `#3B3129` | 외곽선 (순검정 아님) |
| moon | `#F6C93F` | 머리 위 초승달 |
| scarf | `#7FA94F` | 초록 스카프 |
| cheek | `#F6B3AC` | 볼터치 |
| pack | `#E6C179` | 배낭 |
