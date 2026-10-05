import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { VisitRecord } from '@/types';
// 타입만 가져온다. 컴파일하면 사라지므로 i18n 과 서로 부르는 고리가 생기지 않는다.
import type { Lang } from '@/i18n';

/**
 * 로그인 없이도 쓸 수 있는 로컬 상태.
 *
 * 즐겨찾기/최근 본 도서관/방문 기록을 전부 기기에 저장한다.
 * 나중에 로그인을 붙이면, 로그인 시점에 이 로컬 상태를 서버로 한 번 밀어 올리고
 * (merge) 이후부터는 서버를 소스로 삼는 식으로 확장하면 된다.
 */

const MAX_RECENT = 10;

export type ThemePref = 'system' | 'light' | 'dark';

/** 달곰이 꾸미기에서 고르는 것 — pose 는 Mascot 의 포즈 이름, bg 는 배경 색 열쇠 */
export interface Buddy {
  pose: string;
  bg: string;
  name: string;
}
export const DEFAULT_BUDDY: Buddy = { pose: 'hello', bg: 'mint', name: '' };

/** 오늘의 나들이에서 저장한 코스 — 장소는 이름·좌표·종류만 (자료가 바뀌어도 그대로 보이게) */
export interface CourseStop {
  name: string;
  coords: { lat: number; lng: number };
  type: 'restaurant' | 'cafe' | 'culture';
  subCategory?: string;
}
export interface SavedCourse {
  id: string;
  libraryId: string;
  food?: CourseStop;
  see?: CourseStop;
  savedAt: string;
}

interface AppState {
  favorites: string[];
  courses: SavedCourse[];
  recentLibraryIds: string[];
  visits: VisitRecord[];
  hasSeenOnboarding: boolean;

  /**
   * 유리 효과 시험 스위치.
   *
   * **일부러 저장하지 않는다.** 유리는 네이티브 기능이라 기기에 따라 화면을
   * 못 그릴 수 있는데, 켜진 상태가 저장되면 앱을 껐다 켜도 계속 죽어서
   * 빠져나올 방법이 없다. 저장하지 않으면 다시 켤 때 꺼진 채로 시작한다.
   */
  glassTest: boolean;

  /**
   * 애플 기본 탭바(NativeTabs)를 쓸까. iOS 에서만 본다. **기본은 켜짐.**
   *
   * iOS 26 부터는 이게 진짜 Liquid Glass 탭바다. 시험 스위치로 며칠 써 보고
   * (위쪽 회색 띠·달곰이 입력칸·키보드 문제를 다 고친 뒤) 기본으로 올렸다.
   *
   * 유리 스위치와 달리 **저장한다.** 기본이 켜짐이라, 저장하지 않으면 꺼 두어도
   * 앱을 껐다 켤 때마다 되살아나 빠져나올 수 없다. 끈 선택은 남아 있어야 한다.
   */
  nativeTabs: boolean;

  /**
   * 화면에 쓰는 말. 유리 스위치와 달리 **저장한다** — 언어는 앱을 껐다 켜도
   * 유지돼야 하고, 글자만 바뀌는 일이라 앱을 죽일 수가 없다.
   */
  language: Lang;

  /** 화면 모드 — 시스템 설정을 따르거나, 늘 밝게·어둡게. 저장한다 */
  themePref: ThemePref;

  /** 달곰이 꾸미기 — 고른 모습·배경 색·이름. 마이 화면 위쪽에 보인다. 저장한다 */
  buddy: Buddy;

  toggleFavorite: (libraryId: string) => void;
  isFavorite: (libraryId: string) => boolean;
  pushRecent: (libraryId: string) => void;
  addVisit: (libraryId: string) => void;
  saveCourse: (c: Omit<SavedCourse, 'id' | 'savedAt'>) => string;
  removeCourse: (id: string) => void;
  completeOnboarding: () => void;
  setGlassTest: (on: boolean) => void;
  setNativeTabs: (on: boolean) => void;
  setLanguage: (lang: Lang) => void;
  setThemePref: (pref: ThemePref) => void;
  setBuddy: (buddy: Buddy) => void;
  resetAll: () => void;

  /** persist 복원 완료 여부. 스플래시를 언제 내릴지 판단하는 데 쓴다. */
  _hydrated: boolean;
  _setHydrated: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      favorites: [],
      courses: [],
      recentLibraryIds: [],
      visits: [],
      hasSeenOnboarding: false,
      glassTest: false,
      nativeTabs: true,
      language: 'ko',
      themePref: 'system',
      buddy: DEFAULT_BUDDY,
      _hydrated: false,

      toggleFavorite: (libraryId) =>
        set((state) => ({
          favorites: state.favorites.includes(libraryId)
            ? state.favorites.filter((id) => id !== libraryId)
            : [libraryId, ...state.favorites],
        })),

      isFavorite: (libraryId) => get().favorites.includes(libraryId),

      pushRecent: (libraryId) =>
        set((state) => ({
          // 중복 제거 후 맨 앞으로. 최대 MAX_RECENT 개 유지.
          recentLibraryIds: [
            libraryId,
            ...state.recentLibraryIds.filter((id) => id !== libraryId),
          ].slice(0, MAX_RECENT),
        })),

      addVisit: (libraryId) =>
        set((state) => ({
          visits: [{ libraryId, visitedAt: new Date().toISOString() }, ...state.visits],
        })),

      // 같은 코스(도서관·맛집·볼거리 같음)는 한 번만 — 맨 앞으로 올린다. 최대 30개
      saveCourse: (c) => {
        const key = (x: Omit<SavedCourse, 'id' | 'savedAt'>) => `${x.libraryId}|${x.food?.name ?? ''}|${x.see?.name ?? ''}`;
        const id = `${Date.now()}`;
        set((state) => ({
          courses: [{ ...c, id, savedAt: new Date().toISOString() }, ...state.courses.filter((x) => key(x) !== key(c))].slice(0, 30),
        }));
        return id;
      },
      removeCourse: (id) => set((state) => ({ courses: state.courses.filter((x) => x.id !== id) })),

      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      /**
       * 유리 효과를 켜고 끈다.
       *
       * **일부러 저장하지 않는다.** 유리는 네이티브 기능이라 기기에 따라
       * 화면을 못 그릴 수 있는데, 그 상태가 저장되면 앱을 껐다 켜도 계속
       * 죽어서 빠져나올 방법이 없다. 저장하지 않으면 다시 켤 때 꺼진 상태로
       * 시작하므로 언제든 되돌아온다.
       */
      setGlassTest: (on) => set({ glassTest: on }),

      setNativeTabs: (on) => set({ nativeTabs: on }),

      setLanguage: (lang) => set({ language: lang }),

      setThemePref: (pref) => set({ themePref: pref }),

      setBuddy: (buddy) => set({ buddy }),

      resetAll: () =>
        set({ favorites: [], courses: [], recentLibraryIds: [], visits: [], hasSeenOnboarding: false }),

      _setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'library-outing-store',
      storage: createJSONStorage(() => AsyncStorage),
      // 내부 플래그는 저장하지 않는다.
      partialize: (state) => ({
        favorites: state.favorites,
        courses: state.courses,
        recentLibraryIds: state.recentLibraryIds,
        visits: state.visits,
        hasSeenOnboarding: state.hasSeenOnboarding,
        language: state.language,
        // 애플 탭바를 끈 선택은 남긴다 (기본이 켜짐이라 저장하지 않으면 다시 켜진다)
        nativeTabs: state.nativeTabs,
        themePref: state.themePref,
        buddy: state.buddy,
      }),
      // 복원에 실패하더라도 반드시 hydrated 를 켠다.
      // 그러지 않으면 루트 레이아웃이 null 을 계속 반환해 스플래시에서 멈춘다.
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[useAppStore] 로컬 저장소 복원 실패', error);
        }
        useAppStore.getState()._setHydrated();
      },
    }
  )
);
