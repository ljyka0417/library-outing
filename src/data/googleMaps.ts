import generated from './google-maps.generated.json';

/**
 * 구글 지도 "장소 카드"가 뜨는 검색어.
 *
 * 구글 지도는 좌표로 열면 이름 없는 숫자 핀만 보여 준다. 그래서 기본은
 * "도서관 이름 + 주소"로 찾는데, 몇 곳은 그 말로는 검색 목록만 뜨거나
 * 같은 이름의 다른 도서관이 열린다. 그런 곳만 여기서 검색어를 바꿔 준다.
 *
 * 검색어 후보(이름+주소, 이름+시·구, 시·구+이름 …)를 차례로 구글 지도에 넣어 보고,
 * 열린 장소의 이름·주소·전화를 책과 대조해 같은 도서관일 때만 채택했다.
 * 이름만으로 찾으면 다른 도서관이 열리기도 한다
 * (상주 두드림 시립도서관 → 상주시립도서관, 운남어린이도서관 → 운남삼성문고).
 * 어떤 후보로도 그 도서관 장소 카드가 안 뜬 곳은 null — 엉뚱한 곳 대신 좌표로 연다.
 */
const QUERIES = (generated as { queries: Record<string, string | null> }).queries;

/** 정해 둔 검색어. 기본값(이름 + 주소)을 쓰면 undefined */
export function googleQueryFor(libraryId: string): string | null | undefined {
  return libraryId in QUERIES ? QUERIES[libraryId] : undefined;
}
