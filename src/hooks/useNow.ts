import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * 지금 시각. 1분마다, 그리고 앱으로 돌아올 때마다 새로 알려 준다.
 *
 * ⚠️ 왜 필요한가
 *   「운영중 / 운영종료」는 화면을 그리는 그 순간에 판정한다. 그래서 앱을
 *   켜 둔 채로 두면 9시가 지나도 계속 "운영종료" 인 채로 남는다. 도서관
 *   앞에 서 있는데 앱은 닫혔다고 말하는 셈이다.
 *   이 고리를 쓰면 분이 바뀔 때 화면이 저절로 다시 그려진다.
 *
 * ⚠️ 왜 타이머를 하나만 두는가
 *   목록에 카드가 백 개 넘게 깔린다. 카드마다 setInterval 을 걸면 1분에
 *   백 번 넘게 깨어난다. 그래서 타이머는 모듈에 하나만 두고, 쓰는 쪽은
 *   거기에 이름만 올린다.
 *
 * 다음 분이 시작하는 순간에 맞춰 깨운다. 매 60초가 아니라 "정각" 에 맞춰야
 * 09:00 에 문을 여는 도서관이 09:00 에 바뀐다. 60초마다 깨우면 운이 나쁘면
 * 09:00:59 까지 닫힌 걸로 보인다.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | undefined;
let appStateSub: { remove: () => void } | undefined;

function notify() {
  for (const l of listeners) l();
}

function scheduleNextMinute() {
  clearTimeout(timer);
  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  timer = setTimeout(() => {
    notify();
    scheduleNextMinute();
  }, msToNextMinute);
}

function start() {
  scheduleNextMinute();
  // 앱을 내려놨다 다시 열면 그 사이 시간이 많이 흘렀을 수 있다
  appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      notify();
      scheduleNextMinute();
    }
  });
}

function stop() {
  clearTimeout(timer);
  timer = undefined;
  appStateSub?.remove();
  appStateSub = undefined;
}

/** 분이 바뀔 때마다 새로 그려지는 "지금" */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const listener = () => setNow(new Date());
    listeners.add(listener);
    if (listeners.size === 1) start();

    return () => {
      listeners.delete(listener);
      // 아무도 안 보고 있으면 타이머를 끈다
      if (listeners.size === 0) stop();
    };
  }, []);

  return now;
}
