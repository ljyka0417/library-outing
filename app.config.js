/**
 * app.json 을 그대로 쓰고, 저장소에 올리면 안 되는 값(키)만 여기서 끼운다.
 *
 *   GOOGLE_MAPS_ANDROID_KEY  안드로이드 "내 주변" 지도(구글 지도 SDK)용 키.
 *                            아이폰·아이패드는 애플 지도라 필요 없다.
 *     - 내 컴퓨터에서 빌드:  .env 에 GOOGLE_MAPS_ANDROID_KEY=… (Expo 가 .env 를 읽는다, .env 는 깃에 안 올라간다)
 *     - EAS 빌드:            eas env:create 로 같은 이름의 환경 변수를 넣는다 (.env 는 EAS 로 올라가지 않는다)
 *   키가 없으면 안드로이드 지도 칸이 회색으로 비고, 목록·거리는 그대로 나온다.
 */
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    android: {
      ...config.android,
      ...(mapsKey ? { config: { ...(config.android?.config ?? {}), googleMaps: { apiKey: mapsKey } } } : {}),
    },
  };
};
