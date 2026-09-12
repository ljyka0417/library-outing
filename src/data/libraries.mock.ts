import type { CategoryId, Coordinates, Library } from '@/types';
import geocodedJson from './libraries.geocoded.json';
import enrichedJson from './libraries.enriched.json';
import standardJson from './libraries.standard.json';
import manualJson from './libraries.manual.json';

/**
 * 졸업작품 선정 도서관 목록.
 *
 * ─────────────────────────────────────────────────────────────
 * 이 파일에 들어 있는 것 / 없는 것
 * ─────────────────────────────────────────────────────────────
 * 있는 것 (선정 자료 그대로)
 *   - 도서관명, 지역 분류, 특화 태그, 주제 분류
 *
 * 없는 것 (확인 전이라 비워 둠)
 *   - 주소, 전화번호, 운영시간, 휴관일
 *   → 지어내면 앱이 틀린 정보를 단정적으로 말하게 된다. 비워 두면 화면이
 *     해당 항목을 조용히 숨기므로, 그 편이 낫다.
 *   → 도서관 정보나루 API 를 붙이면 이름·지역으로 매칭해 채울 수 있다.
 *     (src/api/libraryApi.ts 의 fetchLibrariesFromOpenApi 참고)
 *
 * 좌표는 아래 APPROX_COORDS 에 있는 9곳만 넣었다. 전부 **근사값**이며,
 * "주변 맛집·카페" 기능을 시연하기 위한 것이다. 지도 열기는 좌표가 없으면
 * 도서관명으로 검색해서 여는 방식이라 좌표 없이도 정확하게 동작한다.
 *
 * 사진은 이 파일에서 다루지 않는다. src/data/libraryPhotos.ts 참고.
 */

interface Seed {
  id: string;
  name: string;
  /** 가이드북 지역 분류 */
  sido: string;
  /** 선정 자료에 시/군/구가 명시된 곳만 */
  sigungu?: string;
  /** 원문 특화 태그 */
  specialty: string;
  categories: CategoryId[];
  landmark?: boolean;
}

/**
 * 근사 좌표 (시연용).
 * 널리 알려진 대표 도서관 9곳만, 대략적인 위치로 넣었다.
 * 정확한 좌표는 주소 확보 후 지오코딩으로 채운다.
 */
const APPROX_COORDS: Record<string, Coordinates> = {
  'seoul-library': { lat: 37.5663, lng: 126.9779 },
  'national-library': { lat: 37.4979, lng: 127.0044 },
  'assembly-library': { lat: 37.532, lng: 126.914 },
  'cheongun-lit': { lat: 37.5893, lng: 126.966 },
  'national-children-library': { lat: 37.4979, lng: 127.0276 },
  'seoul-botanic-plant': { lat: 37.5698, lng: 126.8351 },
  'hanbat-library': { lat: 36.3178, lng: 127.3866 },
  'halla-library': { lat: 33.4671, lng: 126.5133 },
  'mudeung-library': { lat: 35.1758, lng: 126.9126 },
};

/**
 * 도서관 목록.
 *
 * 곳 수는 여기서 세어 LIBRARY_COUNT 로 내보낸다. 화면 문구에 숫자를
 * 직접 적으면 목록이 바뀔 때 조용히 틀린 말이 남는다.
 *
 * **주제는 도서관마다 딱 하나다.**
 *   전에는 두 개씩 달 수 있었다. 「어린이」를 눌렀는데 미술 도서관이,
 *   「만화」를 눌렀는데 어린이 도서관이 섞여 나왔다. 고른 주제 하나만
 *   보고 싶은 사람에게는 빠뜨린 목록으로 보인다. 그래서 하나로 줄였다.
 *
 *   둘 다 해당하는 곳은 이렇게 정한다:
 *     1. 이름에 주제어가 있으면 그것을 따른다. 사람들이 읽는 건 이름이다.
 *        (부산진구어린이청소년도서관은 특화가 영화지만 어린이로 둔다)
 *     2. 아니면 specialty 의 첫 낱말을 따른다.
 *   두 번째 성격은 specialty 문자열에 그대로 남아 화면에 나온다.
 *   예: 강릉모루도서관은 주제가 음악, 특화 표기는 '음악·예술'.
 */
const SEEDS: Seed[] = [
  /* ── 서울 ──────────────────────────────────────────────── */
  { id: 'seoul-library', name: '서울도서관', sido: '서울', specialty: '서울 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'national-library', name: '국립중앙도서관', sido: '서울', specialty: '국가대표 도서관', categories: ['landmark'], landmark: true },
  { id: 'assembly-library', name: '국회도서관', sido: '서울', specialty: '정치·의회', categories: ['humanities'] },
  { id: 'seoul-botanic-plant', name: '서울식물원 식물전문도서관', sido: '서울', specialty: '식물·자연', categories: ['nature'] },
  { id: 'nongshim-food', name: '농심식문화전문도서관', sido: '서울', specialty: '음식·식문화', categories: ['food'] },
  { id: 'urisori-library', name: '우리소리도서관', sido: '서울', specialty: '국악·우리 소리', categories: ['music'] },
  { id: 'national-children-library', name: '국립어린이청소년도서관', sido: '서울', specialty: '어린이·청소년', categories: ['kids'] },
  { id: 'nonhyeon-maru', name: '논현마루도서관', sido: '서울', specialty: '예술·디자인', categories: ['art'] },
  { id: 'cheongun-lit', name: '청운문학도서관', sido: '서울', specialty: '한옥·문학', categories: ['nature'] },
  { id: 'songpa-kids-english', name: '송파어린이영어도서관', sido: '서울', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'brighton-library', name: '브라이튼도서관', sido: '서울', specialty: '복합문화 공간', categories: ['landmark'] },
  // 특화 분류에 '환경' 은 따로 두지 않았다. 한 곳만 담기는 분류는 필터로 쓸모가
  // 없어서다(이 파일 위 설계 원칙). 가장 가까운 '자연' 에 넣고, 환경이라는 말은
  // specialty 에 그대로 남겨 카드와 상세에 보이게 한다.
  { id: 'gangseo-gayang', name: '강서도서관 가양관', sido: '서울', sigungu: '강서구', specialty: '환경·생태', categories: ['nature'] },

  /* ── 경기 ──────────────────────────────────────────────── */
  { id: 'gyeonggi-library', name: '경기도서관', sido: '경기', specialty: '경기 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'goyang-hwajeong', name: '고양화정도서관', sido: '경기', specialty: '꽃', categories: ['nature'] },
  { id: 'court-library', name: '법원도서관', sido: '경기', specialty: '법률', categories: ['humanities'] },
  { id: 'ansan-media', name: '안산시미디어도서관', sido: '경기', specialty: '영화·미디어', categories: ['comics'] },
  { id: 'leeseokyoung-media', name: '이석영뉴미디어도서관', sido: '경기', specialty: '뉴미디어', categories: ['comics'] },
  { id: 'uijeongbu-english', name: '의정부영어도서관', sido: '경기', specialty: '영어', categories: ['language'] },
  { id: 'gwacheon-it', name: '과천정보과학도서관', sido: '경기', specialty: '정보과학·IT', categories: ['science'] },
  { id: 'juyeop-kids', name: '주엽어린이도서관', sido: '경기', specialty: '그림책·어린이', categories: ['kids'] },
  { id: 'pangyo-kids', name: '판교어린이도서관', sido: '경기', specialty: '어린이·로봇', categories: ['kids'] },
  { id: 'goyang-aramnuri', name: '고양아람누리도서관', sido: '경기', specialty: '예술', categories: ['art'] },
  { id: 'hwaseong-jinan', name: '화성 진안도서관', sido: '경기', specialty: '음식', categories: ['food'] },

  /* ── 인천 ──────────────────────────────────────────────── */
  { id: 'incheon-library', name: '인천도서관', sido: '인천', specialty: '인천 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'songdo-intl', name: '송도국제도서관', sido: '인천', specialty: '국제·랜드마크', categories: ['landmark'], landmark: true },
  { id: 'michuhol-library', name: '미추홀도서관', sido: '인천', specialty: '랜드마크·역사', categories: ['landmark'], landmark: true },
  { id: 'majeon-library', name: '마전도서관', sido: '인천', specialty: '음악', categories: ['music'] },
  { id: 'dream-kids-english', name: '드림어린이영어도서관', sido: '인천', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'cheongna-intl', name: '청라국제도서관', sido: '인천', specialty: '국제·세계문화', categories: ['humanities'] },
  { id: 'yeongjong-sky', name: '영종하늘도서관', sido: '인천', specialty: '미술·그림책', categories: ['art'] },
  { id: 'yulmok-library', name: '율목도서관', sido: '인천', specialty: '디지털', categories: ['science'] },
  { id: 'dongchun-narae', name: '동춘나래도서관', sido: '인천', specialty: '웹툰', categories: ['comics'] },
  { id: 'songdo-kids', name: '송도국제어린이도서관', sido: '인천', specialty: '어린이', categories: ['kids'] },
  { id: 'kkumdream-kids-english', name: '꿈드림어린이영어도서관', sido: '인천', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'cheongna-lake', name: '청라호수도서관', sido: '인천', specialty: '자연', categories: ['nature'] },
  { id: 'seonhak-starlight', name: '선학별빛도서관', sido: '인천', specialty: '천문학', categories: ['science'] },

  /* ── 강원 ──────────────────────────────────────────────── */
  { id: 'wonju-central', name: '원주시립중앙도서관', sido: '강원', specialty: '강원 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'jungcheon-philosophy', name: '중천철학도서관', sido: '강원', specialty: '철학', categories: ['humanities'] },
  { id: 'gangneung-moru', name: '강릉모루도서관', sido: '강원', specialty: '음악·예술', categories: ['music'] },
  { id: 'chuncheon-city', name: '춘천시립도서관', sido: '강원', specialty: '음식', categories: ['food'] },
  { id: 'sokcho-kids-english', name: '속초 어린이영어도서관', sido: '강원', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'knu-future', name: '강원대학교 KNU미래도서관', sido: '강원', specialty: 'IT·미래', categories: ['science'] },
  { id: 'inje-miracle', name: '인제 기적의도서관', sido: '강원', specialty: '어린이', categories: ['kids'] },
  { id: 'wondeok-library', name: '원덕도서관', sido: '강원', specialty: '자연', categories: ['nature'] },
  { id: 'mangsang-beach', name: '망상해뜰책뜰 바닷가작은도서관', sido: '강원', specialty: '바닷가·여행', categories: ['travel'] },

  /* ── 대전 ──────────────────────────────────────────────── */
  { id: 'hanbat-library', name: '한밭도서관', sido: '대전', specialty: '대전 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'dongdaejeon-library', name: '동대전도서관', sido: '대전', specialty: '음악', categories: ['music'] },
  { id: 'kids-english-village', name: '어린이영어마을도서관', sido: '대전', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'munhak-village', name: '문학마을도서관', sido: '대전', specialty: '문학', categories: ['humanities'] },
  { id: 'munhak-village-small', name: '문학마을작은도서관', sido: '대전', specialty: '역사', categories: ['history'] },
  { id: 'byeoldongbyeol-science', name: '별똥별과학도서관', sido: '대전', specialty: '과학·우주', categories: ['science'] },

  /* ── 충청 ──────────────────────────────────────────────── */
  { id: 'chungnam-library', name: '충남도서관', sido: '충청', specialty: '충남 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'baebang-library', name: '배방도서관', sido: '충청', specialty: '문화예술', categories: ['art'] },
  { id: 'asan-central', name: '아산중앙도서관', sido: '충청', specialty: '영어', categories: ['language'] },
  { id: 'cheongju-ochang-lake', name: '청주오창호수도서관', sido: '충청', specialty: '예술·디지털', categories: ['art'] },
  { id: 'eumbong-eoulsaem', name: '음봉어울샘도서관', sido: '충청', specialty: '미래과학', categories: ['science'] },
  { id: 'kkumsaem-kids', name: '꿈샘어린이청소년도서관', sido: '충청', specialty: '어린이·그림책', categories: ['kids'] },
  { id: 'chungju-city', name: '충주시립도서관', sido: '충청', specialty: '역사', categories: ['history'] },
  { id: 'cheonan-jiksan', name: '천안 직산도서관', sido: '충청', specialty: '환경', categories: ['nature'] },
  { id: 'dunpo-library', name: '둔포도서관', sido: '충청', specialty: '경제', categories: ['humanities'] },
  { id: 'baebang-wolcheon', name: '배방월천도서관', sido: '충청', specialty: '교육', categories: ['humanities'] },

  /* ── 세종 ──────────────────────────────────────────────── */
  { id: 'sejong-city-library', name: '세종시립도서관', sido: '세종', specialty: '세종 랜드마크', categories: ['landmark'], landmark: true },

  /* ── 경상 ──────────────────────────────────────────────── */
  { id: 'gyeongbuk-library', name: '경북도서관', sido: '경상', specialty: '경북 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'gyeongnam-library', name: '경남도서관', sido: '경상', specialty: '경남 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'gyeongju-city', name: '경주시립도서관', sido: '경상', specialty: '역사', categories: ['history'] },
  { id: 'buksam-kids-youth', name: '북삼어린이청소년도서관', sido: '경상', specialty: '어린이·청소년', categories: ['kids'] },
  { id: 'poeun-heunghae', name: '포은흥해도서관', sido: '경상', specialty: '음악', categories: ['music'] },
  { id: 'sangju-dodream', name: '상주 두드림 시립도서관', sido: '경상', specialty: '만화·웹툰', categories: ['comics'] },
  { id: 'hadong-library', name: '하동도서관', sido: '경상', specialty: '녹차', categories: ['food'] },
  { id: 'namhaegak-sea', name: '남해각 바다도서관', sido: '경상', specialty: '바다·여행', categories: ['travel'] },
  { id: 'kkumirang-library', name: '꿈이랑도서관', sido: '경상', specialty: '미각·음식', categories: ['food'] },
  { id: 'haman-library', name: '함안도서관', sido: '경상', specialty: '아라가야 정신·지역문화', categories: ['history'] },
  { id: 'sancheong-jirisan', name: '산청지리산도서관', sido: '경상', specialty: '자연', categories: ['nature'] },

  /* ── 울산 ──────────────────────────────────────────────── */
  { id: 'ulsan-library', name: '울산도서관', sido: '울산', specialty: '울산 대표', categories: ['landmark'], landmark: true },
  { id: 'ulju-cheonsang', name: '울주천상도서관', sido: '울산', specialty: '미래교육', categories: ['science'] },
  { id: 'dosan-library', name: '도산도서관', sido: '울산', specialty: '역사', categories: ['history'] },
  { id: 'sinbok-library', name: '신복도서관', sido: '울산', specialty: '여행', categories: ['travel'] },
  { id: 'okhyeon-kids', name: '옥현어린이도서관', sido: '울산', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'wolbong-library', name: '월봉도서관', sido: '울산', specialty: '미술', categories: ['art'] },
  { id: 'cheolsae-village', name: '철새마을도서관', sido: '울산', specialty: '동화·동화작가 양성', categories: ['kids'] },
  { id: 'sanjeon-comics', name: '산전만화도서관', sido: '울산', specialty: '만화·웹툰', categories: ['comics'] },
  { id: 'ulsan-jonggatjip', name: '울산종갓집도서관', sido: '울산', specialty: '음악·LP', categories: ['music'] },
  { id: 'ulsan-kids-youth', name: '울산어린이청소년도서관', sido: '울산', specialty: '어린이·청소년·AI', categories: ['kids'] },
  { id: 'gangdong-sea', name: '강동바다도서관', sido: '울산', specialty: '바다·힐링', categories: ['travel'] },

  /* ── 부산 ──────────────────────────────────────────────── */
  { id: 'busan-library', name: '부산도서관', sido: '부산', specialty: '부산 대표', categories: ['landmark'], landmark: true },
  { id: 'donggu-library', name: '동구도서관', sido: '부산', sigungu: '동구', specialty: '레저스포츠·관광', categories: ['travel'] },
  { id: 'yeongdo-library', name: '영도도서관', sido: '부산', sigungu: '영도구', specialty: '해양·수산', categories: ['travel'] },
  // 특화는 영화지만 이름이 「어린이청소년」이다. 어린이를 눌렀는데 이름에
  // 어린이가 든 도서관이 안 나오면 빠뜨린 것처럼 보인다. 이름을 따른다.
  { id: 'busanjin-kids-youth', name: '부산진구어린이청소년도서관', sido: '부산', sigungu: '부산진구', specialty: '영화', categories: ['kids'] },
  { id: 'dongnae-eupseong', name: '동래읍성도서관', sido: '부산', sigungu: '동래구', specialty: '동래 역사', categories: ['history'] },
  { id: 'busan-namgu-library', name: '남구도서관', sido: '부산', sigungu: '남구', specialty: '청소년', categories: ['kids'] },
  { id: 'mandeok-library', name: '만덕도서관', sido: '부산', specialty: '정보화·AI', categories: ['science'] },
  { id: 'haeundae-humanities', name: '해운대인문학도서관', sido: '부산', sigungu: '해운대구', specialty: '인문학', categories: ['humanities'] },
  { id: 'geumjeong-library', name: '금정도서관', sido: '부산', sigungu: '금정구', specialty: '다문화', categories: ['humanities'] },
  { id: 'jeonggwan-library', name: '정관도서관', sido: '부산', specialty: '에너지', categories: ['science'] },
  { id: 'seogu-ami-dream', name: '서구아미드림도서관', sido: '부산', sigungu: '서구', specialty: '의학', categories: ['science'] },

  /* ── 대구 ──────────────────────────────────────────────── */
  { id: 'daegu-library', name: '대구도서관', sido: '대구', specialty: '대구 대표', categories: ['landmark'], landmark: true },
  { id: 'dalseong-gunlib', name: '달성군립도서관', sido: '대구', sigungu: '달성군', specialty: '다양성·다문화', categories: ['humanities'] },
  { id: 'suseongmot-picturebook', name: '수성못그림책도서관', sido: '대구', sigungu: '수성구', specialty: '그림책', categories: ['kids'] },
  { id: 'daegu-seogu-english', name: '서구영어도서관', sido: '대구', sigungu: '서구', specialty: '영어', categories: ['language'] },
  { id: 'daegu-seogu-kids-english', name: '서구어린이영어도서관', sido: '대구', sigungu: '서구', specialty: '어린이 영어', categories: ['kids'] },
  { id: 'dalseong-kids-forest', name: '달성어린이숲도서관', sido: '대구', sigungu: '달성군', specialty: '어린이·숲', categories: ['kids'] },
  { id: 'dalseo-family', name: '달서가족문화도서관', sido: '대구', sigungu: '달서구', specialty: '가족문화', categories: ['humanities'] },
  { id: 'gukchae-library', name: '국채보상운동기념도서관', sido: '대구', specialty: '국채보상운동·역사', categories: ['history'] },
  { id: 'feb28-library', name: '2·28민주운동기념회관 도서관', sido: '대구', specialty: '민주주의·2·28민주운동', categories: ['humanities'] },
  { id: 'dowon-library', name: '도원도서관', sido: '대구', specialty: '테마형 특성화', categories: ['humanities'] },
  { id: 'wagle-kids', name: '와글와글아이세상 어린이도서관', sido: '대구', specialty: '영유아·어린이', categories: ['kids'] },

  /* ── 제주 ──────────────────────────────────────────────── */
  { id: 'halla-library', name: '한라도서관', sido: '제주', specialty: '제주 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'tamna-library', name: '탐라도서관', sido: '제주', specialty: '독립출판', categories: ['humanities'] },
  { id: 'kimyoungsu-library', name: '김영수도서관', sido: '제주', specialty: '학교도서관', categories: ['kids'] },
  { id: 'soraui-seong', name: '소라의성', sido: '제주', specialty: '자연', categories: ['nature'] },

  /* ── 전라 ──────────────────────────────────────────────── */
  { id: 'jeonbuk-provincial', name: '전북특별자치도청도서관', sido: '전라', specialty: '전북 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'hanok-village-library', name: '한옥마을도서관', sido: '전라', specialty: '한옥', categories: ['history'] },
  { id: 'yeonhwajeong-library', name: '연화정도서관', sido: '전라', specialty: '역사', categories: ['history'] },
  { id: 'gochang-hwangyunseok', name: '고창황윤석도서관', sido: '전라', specialty: '문예원 픽', categories: ['humanities'] },
  { id: 'dongmun-usedbook', name: '동문헌책도서관', sido: '전라', specialty: '헌책·기록문화', categories: ['humanities'] },
  { id: 'dunsan-english', name: '둔산영어도서관', sido: '전라', specialty: '영어', categories: ['language'] },
  { id: 'galdaesup-small', name: '갈대숲 작은도서관', sido: '전라', specialty: '자연', categories: ['nature'] },
  { id: 'muju-manna-small', name: '무주만나작은도서관', sido: '전라', specialty: '농촌', categories: ['nature'] },
  { id: 'jeonnam-library', name: '전남도서관', sido: '전라', specialty: '전남 랜드마크', categories: ['landmark'], landmark: true },
  { id: 'jorye-lake', name: '조례호수도서관', sido: '전라', specialty: '자연', categories: ['nature'] },
  { id: 'jindo-cheolma', name: '진도철마도서관', sido: '전라', specialty: '역사', categories: ['history'] },

  /* ── 광주 ──────────────────────────────────────────────── */
  { id: 'mudeung-library', name: '무등도서관', sido: '광주', specialty: '광주 대표', categories: ['landmark'], landmark: true },
  { id: 'iyagikkot-library', name: '이야기꽃도서관', sido: '광주', sigungu: '광산구', specialty: '그림책·그림책 창작', categories: ['kids'] },
  { id: 'kids-eco-library', name: '어린이생태학습도서관', sido: '광주', sigungu: '서구', specialty: '생태·환경·어린이', categories: ['kids'] },
  { id: 'chaekdori-library', name: '책돌이도서관', sido: '광주', sigungu: '북구', specialty: '그림책·독서문화', categories: ['kids'] },
  { id: 'unam-library', name: '운암도서관', sido: '광주', sigungu: '북구', specialty: '정보과학·어린이', categories: ['science'] },
  { id: 'jangdeok-library', name: '장덕도서관', sido: '광주', sigungu: '광산구', specialty: '미술·전시·문화예술', categories: ['art'] },
  { id: 'seochang-hanok', name: '서창한옥작은도서관', sido: '광주', sigungu: '서구', specialty: '한옥·전통·마을', categories: ['history'] },
  { id: 'gwangju-braille', name: '광주광역시립점자도서관', sido: '광주', sigungu: '북구', specialty: '점자·시각장애인 독서', categories: ['humanities'] },
  { id: 'unnam-kids', name: '운남어린이도서관', sido: '광주', sigungu: '광산구', specialty: '어린이·아동독서', categories: ['kids'] },
  { id: 'pureungil-library', name: '푸른길도서관', sido: '광주', sigungu: '남구', specialty: '푸른길·공원·지역밀착', categories: ['nature'] },
  { id: 'uknow-yunho', name: '유노윤호 작은도서관', sido: '광주', sigungu: '광산구', specialty: '문화예술·팬기부형', categories: ['art'] },
];

/**
 * 상세 정보 병합
 *
 * 네 곳에서 오고, 뒤쪽이 앞쪽을 덮는다:
 *   1) APPROX_COORDS  — 시연용 근사 좌표 (임시)
 *   2) geocoded.json  — 카카오 로컬 API 자동 수집 (npm run geocode)
 *   3) enriched.json  — 정보나루 API 자동 수집 (npm run enrich).
 *                       공식 데이터이므로 카카오 검색 결과보다 우선한다.
 *   4) manual.json    — 손으로 채운 값. 사람이 확인한 것이므로 가장 우선.
 *
 * 편집 정보(이름·지역·특화 태그·분류)는 위 SEEDS 에서 사람이 관리하고,
 * 사실 정보(주소·전화·운영시간·좌표)는 파일에서 온다. 이렇게 나눠 두면
 * 수집을 다시 돌려도 편집 결정이 날아가지 않는다.
 */
interface Enrichment {
  address?: string;
  phone?: string;
  homepage?: string;
  coords?: { lat: number; lng: number };
  closedDays?: string;
  hours?: { label: string; byDay: ({ open: number; close: number } | null)[] };
  sourceApiId?: string;
}

type EntryMap = { entries?: Record<string, Enrichment> };
const geocodedEntries = (geocodedJson as EntryMap).entries ?? {};
const enrichedEntries = (enrichedJson as EntryMap).entries ?? {};
const standardEntries = (standardJson as EntryMap).entries ?? {};
const manualEntries = (manualJson as EntryMap).entries ?? {};

function toLibrary(seed: Seed): Library {
  const extra: Enrichment = {
    ...geocodedEntries[seed.id],
    ...enrichedEntries[seed.id],
    /*
     * 전국도서관표준데이터가 정보나루보다 뒤에 온다 = 우선한다.
     *
     * 정보나루의 운영시간은 자유 문장이라 해석이 필요하고 실제로 틀린 적이
     * 있다. 표준데이터는 평일/토요일 시각이 칸으로 나뉘어 있어 해석할 것이
     * 없다. 같은 도서관이면 이쪽을 믿는다.
     * 손으로 넣은 manual 은 여전히 맨 뒤 — 사람이 확인한 것이 제일 세다.
     */
    ...standardEntries[seed.id],
    ...manualEntries[seed.id],
  };

  return {
    id: seed.id,
    name: seed.name,
    categories: seed.categories,
    region: { sido: seed.sido, sigungu: seed.sigungu },
    specialty: seed.specialty,
    isLandmark: seed.landmark ?? false,

    address: extra.address,
    phone: extra.phone,
    homepage: extra.homepage,
    closedDays: extra.closedDays,
    hours: extra.hours,
    sourceApiId: extra.sourceApiId,
    // 수집한 좌표가 있으면 그걸 쓰고, 없으면 시연용 근사값으로 떨어진다.
    coords: extra.coords ?? APPROX_COORDS[seed.id],

    // 사진은 여기서 다루지 않는다. src/data/libraryPhotos.ts 에 등록된
    // 실사진이 있으면 쓰고, 없으면 주제 색 플레이스홀더가 나온다.
    // (예전엔 picsum 랜덤 사진을 넣었는데, 우리소리도서관에 해변 사진이 뜨는 등
    //  엉뚱한 곳을 그 도서관인 양 보여주게 되어 걷어냈다)
  };
}

export const MOCK_LIBRARIES: Library[] = SEEDS.map(toLibrary);

/**
 * 달곰이가 "전국 도서관 몇 곳을 알고 있어요" 라고 말할 때 쓰는 숫자.
 *
 * 예전엔 네 가지 언어의 문구에 132 를 직접 적어 두었다. 목록에서 한 곳을
 * 빼자마자 열여섯 군데가 한꺼번에 틀렸고, 그중 하나는 아무도 모르게
 * 오래전 숫자(72)로 남아 있었다. 숫자는 데이터에서 센다.
 */
export const LIBRARY_COUNT = MOCK_LIBRARIES.length;

/** 그중 운영시간을 확인해 "지금 열려 있는지" 판단할 수 있는 곳 */
export const LIBRARY_HOURS_COUNT = MOCK_LIBRARIES.filter(
  (l) => l.hours?.byDay?.length === 7
).length;

/** 상세 정보가 얼마나 채워졌는지. 개발 중 진행률 확인용. */
export function dataCompleteness() {
  const total = MOCK_LIBRARIES.length;
  const count = (pick: (l: Library) => unknown) => MOCK_LIBRARIES.filter((l) => pick(l)).length;
  return {
    total,
    address: count((l) => l.address),
    phone: count((l) => l.phone),
    hours: count((l) => l.hours),
    coords: count((l) => l.coords),
  };
}
