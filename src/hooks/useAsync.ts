import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 비동기 조회 + 로컬 캐시 훅.
 *
 * cacheKey 를 주면:
 *   1) 마운트 즉시 AsyncStorage 의 지난 결과를 먼저 보여주고 (stale-while-revalidate)
 *   2) 네트워크 조회가 성공하면 화면과 캐시를 갱신하고
 *   3) 실패하면 캐시된 값을 유지한 채 offline 플래그만 켠다.
 *
 * 덕분에 지하철·도서관 지하층처럼 신호가 약한 곳에서도
 * 마지막으로 본 목록을 그대로 다시 볼 수 있다.
 */

interface Options {
  /** 없으면 캐싱하지 않는다 */
  cacheKey?: string;
  /** false 면 실행하지 않는다 (예: id 가 아직 없을 때) */
  enabled?: boolean;
}

interface Result<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** 네트워크 실패로 캐시된 데이터를 보여주는 중 */
  isStale: boolean;
  refetch: () => void;
}

const CACHE_PREFIX = 'cache:';

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  { cacheKey, enabled = true }: Options = {}
): Result<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [nonce, setNonce] = useState(0);

  // fn 은 매 렌더마다 새로 만들어지므로 ref 로 잡아 두고 deps 로만 재실행한다.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // 조회 실패 시 "보여줄 캐시가 있는지"를 setState 업데이터 밖에서 판단하기 위한 ref.
  // (업데이터 함수 안에서 다른 setState 를 호출하면 StrictMode 이중 호출 때
  //  부수효과가 두 번 실행된다)
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsStale(false);
    // deps 가 바뀌면(예: 다른 도서관 id) 이전 결과는 더 이상 이 조회의 캐시가 아니다.
    dataRef.current = null;

    const run = async () => {
      // 1) 캐시 선반영
      if (cacheKey) {
        try {
          const raw = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey);
          if (raw && !cancelled) {
            const cached = JSON.parse(raw) as T;
            dataRef.current = cached;
            setData(cached);
            setLoading(false); // 화면을 먼저 채워 준다
          }
        } catch {
          // 캐시 파싱 실패는 무시하고 네트워크 조회로 넘어간다
        }
      }

      // 2) 실제 조회
      try {
        const result = await fnRef.current();
        if (cancelled) return;
        dataRef.current = result;
        setData(result);
        setIsStale(false);
        if (cacheKey) {
          void AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(result));
        }
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        // 보여줄 캐시가 있으면 에러 화면 대신 stale 배지만 띄우고 그대로 유지한다.
        if (dataRef.current !== null) {
          setIsStale(true);
        } else {
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, cacheKey, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, isStale, refetch };
}
