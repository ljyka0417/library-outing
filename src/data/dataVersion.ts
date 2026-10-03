import { MOCK_LIBRARIES } from './libraries.mock';

/**
 * 도서관 데이터의 지문. 기기에 남은 캐시(useAsync)의 열쇠에 섞어 쓴다.
 *
 * 앱은 빨리 열리도록 도서관 목록을 기기에 저장해 두고 먼저 보여 준다. 그런데 데이터를
 * 바꾼 뒤에도 옛 목록이 먼저 떠서, 없앤 주제("역사")를 가진 도서관이 그려지다 앱이 멈췄다
 * (아이패드, 2026-10-03). 데이터가 바뀌면 지문이 바뀌어 옛 캐시는 조회되지 않는다.
 * 손으로 올리는 버전 번호는 잊어버리기 쉬워서 내용으로 계산한다.
 */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const LIBRARY_DATA_VERSION = hash(JSON.stringify(MOCK_LIBRARIES));
