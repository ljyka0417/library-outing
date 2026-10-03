import data from './book-programs.generated.json';

/**
 * 가이드북에 실린 도서관별 운영 프로그램.
 *
 * 프로그램은 철마다 바뀐다. 그래서 화면에서는 "책에 실린 프로그램"이라고 밝히고,
 * 지금 일정은 도서관 홈페이지에서 보도록 안내한다. 책에 없는 도서관은 빈 배열 —
 * 지어내지 않는다.
 */
const BY_ID = (data as { byId: Record<string, { programs: string[] }> }).byId;

export function bookPrograms(libraryId: string): string[] {
  return BY_ID[libraryId]?.programs ?? [];
}
