/**
 * 시험 중인 기능을 켜고 끄는 스위치.
 *
 * false 로 바꾸면 그 기능의 화면만 사라지고 나머지는 그대로다.
 * 코드를 지우지 않고 되돌릴 수 있게 하려고 둔다.
 */
export const FEATURES = {
  /**
   * 도서관 상세의 "운영 프로그램" 칸 (시험 중, 2026-10).
   * 가이드북 『오늘 도서관 갈래?』에 실린 프로그램 이름을 보여 준다.
   * 데이터: src/data/book-programs.generated.json (npm run import-book-programs)
   */
  bookPrograms: true,
} as const;
