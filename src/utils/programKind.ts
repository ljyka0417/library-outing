import type { MascotPose } from '@/components/Mascot';

/**
 * 운영 프로그램 이름으로 성격을 나눈다 — 카드의 색과 달곰이 자세를 고르는 데만 쓴다.
 *
 * 책에 실린 프로그램 사진은 도서관 홈페이지·블로그에서 온 것이라 앱에 그대로
 * 싣지 않는다. 대신 우리 캐릭터 달곰이를 프로그램 성격에 맞춰 놓는다.
 * 순서가 중요하다: 위에서부터 먼저 걸리는 쪽으로 정한다
 * ("영어 그림책 놀이"는 그림책보다 외국어, "AI 동화 만들기"는 만들기보다 디지털).
 */
export type ProgramKind =
  | 'food' | 'digital' | 'language' | 'craft' | 'stage' | 'media'
  | 'science' | 'travel' | 'kids' | 'talk' | 'reading' | 'other';

const RULES: [ProgramKind, RegExp][] = [
  ['food', /요리|음식|떡|디저트|요알못|향토음식/],
  ['digital', /AI|코딩|로봇|디지털|스마트폰|3D|레고|엑셀|로블록스|메이커|증강현실|SLAM|이모티콘|브릭|큐브|키캡/i],
  ['language', /영어|원어민|English|Book Club|태국어|영문|영미|외국어/i],
  ['craft', /만들기|꾸미기|공예|뜨기|뜨개|굿즈|캘리|드로잉|일러스트|미술|아트|스케치|에코백|파우치|향수|디퓨저|입욕제|목걸이|트레이|팝업|가방|우산|풍선|레터링|오일파스텔|규방|실타래|라인|꽃꽂이|퍼퓸|잉크|명화|그리기|달력|한땀|행잉|메이크업/],
  ['stage', /음악|콘서트|공연|오페라|재즈|클래식|국악|밴드|기타|뮤지컬|연극|인형극|마술|매직|버블|낭독극|가족극|소리|사운드|댄스|극장|앙상블|뮤직/],
  ['media', /미디어|영상|웹툰|스튜디오|사진|SNS|4컷|리포터|영화|리터러시/],
  ['science', /과학|천문|별|곤충|실험|수학|에너지|환경|지구|공룡|생태|식물|숲|농부|유레카|정원|초록/],
  // "문해력 탐험대"·"리딩 산책"은 이름에 탐험·산책이 있어도 읽기 프로그램이다
  ['reading', /문해력|리딩|독후|부커/],
  ['travel', /여행|탐방|기행|탐험|원정|세계|투어|산책|피크닉|북크닉|실크로드|유럽|구룡포|모험|오디세이/],
  ['kids', /동화|그림책|구연|어린이|키즈|꼬꼬마|놀이터|놀이|보물찾기|북스타트|할로윈|꿈돌이|영리더/],
  ['talk', /강연|강좌|특강|아카데미|인문|철학|살롱|토크|톡|작가|만남|초청|명사|시민|역사|한국사|문학|시와|에세이|경제|금융|돈 공부|법의학|범죄|심리|건강|주역|한시|교양|학교|대전망|코칭|자격증/],
  ['reading', /독서|필사|글쓰기|책|북|읽기|쓰기|작법|논술|작명|출판|골든벨|퀴즈|필담|도서관|한글/],
];

export function programKind(name: string): ProgramKind {
  return RULES.find(([, re]) => re.test(name))?.[0] ?? 'other';
}

/** 성격별 달곰이 자세와 카드 색(앱의 주제 색을 빌려 쓴다) */
export const PROGRAM_LOOK: Record<ProgramKind, { pose: MascotPose; palette: string }> = {
  food: { pose: 'coffee', palette: 'food' },
  digital: { pose: 'sparkle', palette: 'science' },
  language: { pose: 'hello', palette: 'language' },
  craft: { pose: 'hatGreen', palette: 'art' },
  stage: { pose: 'wave', palette: 'music' },
  media: { pose: 'camera', palette: 'media' },
  science: { pose: 'hatExplorer', palette: 'nature' },
  travel: { pose: 'backpack', palette: 'travel' },
  kids: { pose: 'read', palette: 'kids' },
  talk: { pose: 'side', palette: 'humanities' },
  reading: { pose: 'reading', palette: 'landmark' },
  other: { pose: 'books', palette: 'education' },
};
