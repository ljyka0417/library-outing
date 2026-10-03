/**
 * 대출 가능 여부 중계 서버 주소 (server/loan-proxy 를 Cloudflare Workers 에 올린 곳).
 *
 * 비밀이 아니다 — 정보나루 키는 중계 서버 안에만 있고, 이 주소로는 "이 도서관에 이 책 있나"만
 * 물을 수 있다. 그래서 앱에 그대로 둔다.
 *
 * 비어 있으면 대출 가능 표시를 아예 그리지 않는다 (중계 서버를 올리기 전).
 * 예: 'https://larchive-loan.이름.workers.dev'
 */
export const LOAN_PROXY_URL: string = 'https://larchive-loan.loan-proxy.workers.dev';
