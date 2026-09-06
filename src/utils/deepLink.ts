/**
 * 가이드북 QR 코드에 인쇄할 링크를 만드는 유틸.
 *
 * 종이책은 한 번 인쇄하면 고칠 수 없다. 그래서 QR 에는 앱 스킴이 아니라
 * **웹 URL** 을 넣는 것이 안전하다:
 *
 *   QR 인쇄값:  https://library-outing.kr/library/seoul-music
 *                       │
 *                       ├─ 앱 설치됨   → App Link/Universal Link 로 앱이 가로채 상세화면
 *                       └─ 앱 미설치   → 웹 랜딩페이지 → 스토어로 유도 (Deferred Deep Link)
 *
 * 앱 스킴(libraryapp://)을 직접 인쇄하면 미설치 사용자에게는
 * "페이지를 열 수 없음" 오류만 뜨고 끝나 버린다. 절대 그렇게 하지 말 것.
 */

/** 책자 인쇄용 웹 링크 (QR 에 인코딩할 값) */
export const WEB_BASE = 'https://library-outing.kr';

export function printableLibraryUrl(libraryId: string): string {
  return `${WEB_BASE}/library/${libraryId}`;
}

/** 앱 내부/테스트용 스킴 링크 */
export function appSchemeUrl(libraryId: string): string {
  return `libraryapp://library/${libraryId}`;
}

/**
 * 랜딩페이지에 필요한 스토어 링크.
 * 웹 랜딩은 이 앱 저장소 밖(별도 정적 사이트)에 두는 것을 전제로 한다.
 */
export const STORE_LINKS = {
  ios: 'https://apps.apple.com/kr/app/idAPPLE_APP_ID', // TODO: 앱 등록 후 교체
  android: 'https://play.google.com/store/apps/details?id=com.libraryouting.app',
};
