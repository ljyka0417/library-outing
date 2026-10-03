import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Coordinates } from '@/types';

/**
 * 지도앱 딥링크 유틸.
 *
 * 이 앱은 지도를 직접 렌더링하지 않는다. 사용자가 이미 쓰고 있는 네이버지도 /
 * 카카오맵으로 넘겨주는 편이 길찾기·대중교통·즐겨찾기까지 전부 얻을 수 있어
 * 훨씬 낫기 때문이다. (지도 SDK 키 발급·과금·네이티브 모듈도 불필요)
 *
 * 폴백 순서: 지도앱 → 지도 웹 → 스토어 설치 안내
 *
 * ⚠️ 플랫폼 주의사항
 *  - iOS: canOpenURL 이 동작하려면 app.json 의
 *    ios.infoPlist.LSApplicationQueriesSchemes 에 nmap, kakaomap 이 있어야 한다.
 *  - Android 11+(API 30): 패키지 가시성 제한 때문에 canOpenURL 이 실제 설치
 *    여부와 무관하게 false 를 반환할 수 있다. 그래서 canOpenURL 결과를 맹신하지
 *    않고 openURL 을 한 번 시도한 뒤 예외를 잡아 폴백한다.
 */

export interface MapTarget {
  name: string;
  /**
   * 좌표는 없을 수 있다. 없으면 도서관명으로 검색해서 연다.
   * 실제로 "서울도서관" 같은 고유한 이름은 좌표보다 이름 검색이 더 정확하다.
   */
  coords?: Coordinates;
  address?: string;
  /**
   * 구글 지도 검색어를 따로 정해 둔 곳 (src/data/googleMaps.ts).
   *   문자열 — 이 말로 찾아야 구글이 그 도서관 장소 카드를 연다
   *   null   — 어떤 말로도 장소 카드가 안 떠서 좌표로 연다 (엉뚱한 곳보다 낫다)
   *   없음   — 기본값 "이름 + 주소"
   */
  googleQuery?: string | null;
}

type MapProvider = 'naver' | 'kakao';

const STORE_URLS: Record<MapProvider, { ios: string; android: string }> = {
  naver: {
    ios: 'https://apps.apple.com/kr/app/id311867728',
    android: 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap',
  },
  kakao: {
    ios: 'https://apps.apple.com/kr/app/id304608425',
    android: 'https://play.google.com/store/apps/details?id=net.daum.android.map',
  },
};

const PROVIDER_LABEL: Record<MapProvider, string> = {
  naver: '네이버 지도',
  kakao: '카카오맵',
};

/** 앱 스킴 URL 생성 */
function buildAppUrl(provider: MapProvider, target: MapTarget): string {
  const name = encodeURIComponent(target.name);

  if (provider === 'naver') {
    // appname 은 네이버지도가 "돌아가기" 버튼을 만들 때 쓰는 호출자 식별자.
    const appName =
      Constants.expoConfig?.ios?.bundleIdentifier ??
      Constants.expoConfig?.android?.package ??
      'com.libraryouting.app';

    if (!target.coords) return `nmap://search?query=${name}&appname=${appName}`;

    const { lat, lng } = target.coords;
    return `nmap://place?lat=${lat}&lng=${lng}&name=${name}&appname=${appName}`;
  }

  // 카카오맵
  if (!target.coords) return `kakaomap://search?q=${name}`;
  return `kakaomap://look?p=${target.coords.lat},${target.coords.lng}`;
}

/** 지도앱이 없을 때 열 웹 URL */
function buildWebUrl(provider: MapProvider, target: MapTarget): string {
  const name = encodeURIComponent(target.name);

  // 네이버 지도 웹은 좌표만으로 장소를 특정하지 못해 항상 이름으로 검색시킨다.
  if (provider === 'naver') return `https://map.naver.com/p/search/${name}`;

  if (!target.coords) return `https://map.kakao.com/link/search/${name}`;
  return `https://map.kakao.com/link/map/${name},${target.coords.lat},${target.coords.lng}`;
}

/** 스토어로 보낼지 웹으로 볼지 사용자에게 묻는다. */
function promptFallback(provider: MapProvider, webUrl: string) {
  const label = PROVIDER_LABEL[provider];
  const store = Platform.OS === 'ios' ? STORE_URLS[provider].ios : STORE_URLS[provider].android;

  Alert.alert(
    `${label} 앱이 없어요`,
    `${label} 앱이 설치되어 있지 않은 것 같아요.\n웹으로 위치를 확인하거나, 앱을 설치할 수 있어요.`,
    [
      { text: '취소', style: 'cancel' },
      { text: '웹으로 보기', onPress: () => void Linking.openURL(webUrl) },
      { text: '설치하기', onPress: () => void Linking.openURL(store) },
    ]
  );
}

/**
 * 지도앱으로 위치 열기.
 * @returns 지도앱으로 바로 넘어갔으면 true, 폴백 처리했으면 false
 */
export async function openInMap(provider: MapProvider, target: MapTarget): Promise<boolean> {
  const appUrl = buildAppUrl(provider, target);
  const webUrl = buildWebUrl(provider, target);

  /**
   * 웹에서는 앱 스킴을 시도할 이유가 없다. 브라우저는 nmap:// 를 열 수 없고,
   * 괜히 시도하면 "앱이 없어요" 다이얼로그만 뜬다. 바로 지도 웹으로 보낸다.
   *
   * ⚠️ await 보다 먼저 열어야 한다. 비동기 경계를 넘으면 브라우저가 이걸
   *    사용자 클릭의 결과로 보지 않아 팝업 차단에 걸린다.
   */
  if (Platform.OS === 'web') {
    void Linking.openURL(webUrl);
    return true;
  }

  try {
    // iOS 에서는 정확하다. Android 에서는 false 여도 일단 시도해 본다.
    const supported = await Linking.canOpenURL(appUrl);
    if (supported || Platform.OS === 'android') {
      await Linking.openURL(appUrl);
      return true;
    }
  } catch {
    // 설치돼 있지 않으면 여기로 떨어진다. 아래 폴백으로 이어간다.
  }

  promptFallback(provider, webUrl);
  return false;
}

export const openNaverMap = (target: MapTarget) => openInMap('naver', target);
export const openKakaoMap = (target: MapTarget) => openInMap('kakao', target);

/**
 * 구글 지도.
 *
 * 네이버·카카오와 달리 앱 스킴을 따로 확인하지 않는다. 구글이 공식으로 권하는
 * "Maps URLs"(https://www.google.com/maps/search/?api=1…) 하나로 충분하다.
 * 구글 지도 앱이 있으면 iOS·안드로이드가 알아서 앱으로 열고, 없으면 브라우저로 연다.
 * 그래서 "앱이 없어요" 안내도 필요 없다. 외국인 이용자는 대개 이쪽을 쓴다.
 *
 * 좌표가 아니라 "도서관 이름 + 주소"로 찾는다.
 * 좌표로 열었더니 장소 카드 대신 「37°29'50.7"N …」 같은 숫자 핀만 떠서
 * 도서관 이름·운영시간·전화가 안 나왔다. 이름만 넣으면 "남구도서관"처럼
 * 전국에 같은 이름이 있는 곳에서 엉뚱한 도시가 먼저 나올 수 있어 주소를 붙인다.
 */
export function googleMapsUrl(target: MapTarget): string {
  const query =
    target.googleQuery === null && target.coords
      ? `${target.coords.lat},${target.coords.lng}`
      : target.googleQuery || [target.name, target.address].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function openGoogleMap(target: MapTarget): Promise<boolean> {
  try {
    await Linking.openURL(googleMapsUrl(target));
    return true;
  } catch {
    return false;
  }
}

/** 전화 걸기 (도서관 상세의 전화번호 탭) */
export async function callPhone(phone: string) {
  const url = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('전화를 걸 수 없어요', phone);
  }
}

/** 외부 링크(홈페이지 등) 열기 */
export async function openWeb(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('링크를 열 수 없어요', url);
  }
}
