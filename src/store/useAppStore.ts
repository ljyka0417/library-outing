import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { VisitRecord } from '@/types';
import type { Language } from '@/i18n';

/**
 * 로그인 없이도 쓸 수 있는 로컬 상태.
 *
 * 즐겨찾기/최근 본 도서관/방문 기록을 전부 기기에 저장한다.
 * 나중에 로그인을 붙이면, 로그인 시점에 이 로컬 상태를 서버로 한 번 밀어 올리고
 * (merge) 이후부터는 서버를 소스로 삼는 식으로 확장하면 된다.
 */

const MAX_RECENT = 10;

interface AppState {
  favorites: string[];
  recentLibraryIds: string[];
  visits: VisitRecord[];
  hasSeenOnboarding: boolean;
  language: Language;

  toggleFavorite: (libraryId: string) => void;
  isFavorite: (libraryId: string) => boolean;
  pushRecent: (libraryId: string) => void;
  addVisit: (libraryId: string) => void;
  completeOnboarding: () => void;
  setLanguage: (language: Language) => void;
  resetAll: () => void;

  /** persist 복원 완료 여부. 스플래시를 언제 내릴지 판단하는 데 쓴다. */
  _hydrated: boolean;
  _setHydrated: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentLibraryIds: [],
      visits: [],
      hasSeenOnboarding: false,
      language: 'ko',
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

      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      setLanguage: (language) => set({ language }),

      resetAll: () =>
        set({ favorites: [], recentLibraryIds: [], visits: [], hasSeenOnboarding: false }),

      _setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'library-outing-store',
      storage: createJSONStorage(() => AsyncStorage),
      // 내부 플래그는 저장하지 않는다.
      partialize: (state) => ({
        favorites: state.favorites,
        recentLibraryIds: state.recentLibraryIds,
        visits: state.visits,
        hasSeenOnboarding: state.hasSeenOnboarding,
        language: state.language,
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
