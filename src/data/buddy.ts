import { translate, type Lang } from '@/i18n';
import { getPhoto, photoLibraryIds } from '@/data/libraryPhotos';

/**
 * 달곰이 꾸미기 — 고를 수 있는 모습·배경과, 도서관을 다녀올수록 열리는 것들.
 *
 * 그림은 원본 캐릭터 시트의 모습(Mascot 포즈)을 그대로 쓴다. 새 그림을 지어내지 않는다.
 * need = 열리려면 필요한 방문 기록 수 ("여기 다녀왔어요"). label·say 는 i18n 열쇠다.
 */
export interface BuddyPose {
  pose: string;
  label: string;
  need: number;
}
export const BUDDY_POSES: BuddyPose[] = [
  { pose: 'hello', label: 'dress.p.hello', need: 0 },
  { pose: 'read', label: 'dress.p.read', need: 0 },
  { pose: 'coffee', label: 'dress.p.coffee', need: 0 },
  { pose: 'walk', label: 'dress.p.walk', need: 0 },
  { pose: 'hatGreen', label: 'dress.p.hatGreen', need: 1 },
  { pose: 'camera', label: 'dress.p.camera', need: 1 },
  { pose: 'map', label: 'dress.p.map', need: 2 },
  { pose: 'books', label: 'dress.p.books', need: 3 },
  { pose: 'hatExplorer', label: 'dress.p.hatExplorer', need: 3 },
  { pose: 'backpack', label: 'dress.p.backpack', need: 5 },
  { pose: 'flag', label: 'dress.p.flag', need: 7 },
  { pose: 'sparkle', label: 'dress.p.sparkle', need: 10 },
];

/** 배경 색 — 밝은 파스텔이라 다크 모드에서도 달곰이가 또렷하다. 위·아래 두 색으로 은은하게 */
export const BUDDY_BG: Record<string, { color: string; deep: string; label: string }> = {
  mint: { color: '#DDF0EA', deep: '#BFE3D6', label: 'dress.bg.mint' },
  cream: { color: '#F8EED8', deep: '#EFDDB6', label: 'dress.bg.cream' },
  sky: { color: '#DCEAF8', deep: '#BCD6F1', label: 'dress.bg.sky' },
  pink: { color: '#F9E0E4', deep: '#F1C3CC', label: 'dress.bg.pink' },
  butter: { color: '#FBF1C7', deep: '#F4E19A', label: 'dress.bg.butter' },
  lavender: { color: '#E7E2F7', deep: '#CFC6EE', label: 'dress.bg.lavender' },
};

/** 도서관 사진 배경의 열쇠는 "lib:도서관id" */
export const sceneKey = (libraryId: string) => `lib:${libraryId}`;
export const sceneLibrary = (bg: string) => (bg.startsWith('lib:') ? bg.slice(4) : undefined);

/**
 * 배경으로 쓸 수 있는 도서관 사진 — 다녀온 도서관이 먼저(열림), 그 밖은 잠김으로 몇 곳 보여 준다.
 * 사진은 한국관광공사(공공누리)라 화면에 출처를 함께 적는다.
 */
export function buddyScenes(visitedIds: string[], limit = 8): { libraryId: string; uri: string; open: boolean }[] {
  const withPhoto = photoLibraryIds.filter((id) => getPhoto(id)?.uri);
  const open = withPhoto.filter((id) => visitedIds.includes(id));
  const locked = withPhoto.filter((id) => !visitedIds.includes(id)).slice(0, Math.max(0, limit - open.length));
  return [...open, ...locked].map((id) => ({ libraryId: id, uri: getPhoto(id)!.uri!, open: visitedIds.includes(id) }));
}

/** 다녀온 수에 따른 칭호 (i18n 열쇠) */
export function buddyTitle(visits: number): string {
  if (visits >= 10) return 'dress.rank.5';
  if (visits >= 6) return 'dress.rank.4';
  if (visits >= 3) return 'dress.rank.3';
  if (visits >= 1) return 'dress.rank.2';
  return 'dress.rank.1';
}

/** 화면에 보일 이름 — 비워 두면 그 언어의 "달곰이" */
export function buddyName(name: string, lang: Lang): string {
  return name.trim() || translate(lang, 'dress.defaultName');
}
