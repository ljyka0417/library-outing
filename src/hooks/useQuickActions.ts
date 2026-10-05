import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { useT, type MessageKey } from '@/i18n';

/**
 * 앱 아이콘을 길게 누르면 뜨는 메뉴 (알라딘 앱처럼, 2026-10-05).
 *
 * 탭바의 기능으로 바로 들어간다. 아이콘을 그냥 누르면 홈이 열리므로 홈은 넣지 않고,
 * 설정 대신 검색을 넣었다. 아이폰은 앱이 넣을 수 있는 칸이 4개까지다
 * (앱 제거·공유·홈 화면 편집은 아이폰이 붙인다).
 *
 *   아이폰    아이콘은 SF Symbols (애플 기본 아이콘, 탭바와 같은 모양)
 *   안드로이드 assets/quick-actions/*.png (app.json 의 expo-quick-actions androidIcons)
 *
 * 글자는 지금 고른 언어로 — 언어를 바꾸면 메뉴도 다시 적는다.
 * 눌렀을 때 화면 이동은 useQuickActionRouting 이 params.href 를 보고 한다.
 * (라이브러리 안내대로 맨 바깥 _layout 이 아니라 탭 _layout 에서 부른다)
 */
// 위에서부터 보이는 차례 — 탭바처럼 짧은 이름 (2026-10-06). 홈은 아이콘을 그냥 누르면 열리고 아이폰은 4칸뿐이라 뺐다
const ITEMS: { id: string; title: MessageKey; ios: string; android: string; href: string }[] = [
  { id: 'search', title: 'qa.search', ios: 'symbol:magnifyingglass', android: 'qa_search', href: '/search' },
  { id: 'chat', title: 'tab.chat', ios: 'symbol:bubble.left.and.bubble.right', android: 'qa_chat', href: '/chat' },
  { id: 'nearby', title: 'tab.nearby', ios: 'symbol:location', android: 'qa_nearby', href: '/nearby' },
  { id: 'course', title: 'tab.course', ios: 'symbol:map', android: 'qa_course', href: '/course' },
];

export function useQuickActions() {
  const { t, lang } = useT();
  useQuickActionRouting();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    /*
     * 안드로이드는 첫 칸이 맨 위, 아이폰은 첫 칸이 **아이콘에 가장 가까운 칸**이다(아이콘이 화면 아래쪽이면 맨 아래).
     * 아이콘은 대개 아래쪽 독·마지막 줄에 있으니 아이폰은 거꾸로 넣어야 위에서부터 같은 차례로 보인다.
     */
    const ordered = Platform.OS === 'ios' ? [...ITEMS].reverse() : ITEMS;
    void QuickActions.setItems(
      ordered.map((it) => ({
        id: it.id,
        title: t(it.title),
        icon: Platform.OS === 'ios' ? it.ios : it.android,
        params: { href: it.href },
      }))
    ).catch(() => {});
  }, [t, lang]);
}
