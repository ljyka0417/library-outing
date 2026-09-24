import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Mascot } from '@/components/Mascot';
import { BookCard } from '@/components/BookCard';
import { LibraryCard } from '@/components/LibraryCard';
import { useAppStore } from '@/store/useAppStore';
import { LIBRARY_COUNT } from '@/data/libraries.mock';
import { ask, starterQuestions, type Answer } from '@/utils/assistant';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, sideSpace, useLayout } from '@/hooks/useLayout';
import { ChipRow } from '@/components/common';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import { openKakaoMap } from '@/utils/mapLinks';

interface Message {
  id: string;
  role: 'user' | 'dalgomi';
  text: string;
  answer?: Answer;
  /**
   * 사람이 물을 때 뽑은 칩 씨앗. 언어를 바꿔 다시 답할 때 같은 씨앗을 써서
   * 같은 칩이 그 말로 바뀌게 한다 (새로 뽑으면 칩이 통째로 바뀐다).
   */
  seed?: number;
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** 이 메시지들 중 사람이 물은 질문 글자들. 칩으로 다시 권하지 않는다 */
const askedTexts = (list: Message[]) => list.filter((m) => m.role === 'user').map((m) => m.text);

/* 인사말은 화면에서 t('chat.greeting') 으로 갈아 끼운다. 말을 바꾸면
   그 자리에서 같이 바뀌어야 하기 때문이다. 여기 text 는 쓰이지 않으므로
   도서관 수도 적지 않는다 — 목록이 바뀌면 곧바로 거짓말이 된다. */
const GREETING: Message = {
  id: 'greeting',
  role: 'dalgomi',
  text: '',
};

/**
 * 달곰이에게 물어보기.
 *
 * 바깥 AI 를 부르지 않는다. 앱에 담긴 도서관 데이터로만 답한다.
 * 그래서 서버도 API 키도 요금도 없고, 비행기 모드에서도 답한다.
 * 무엇보다 확인되지 않은 운영시간을 지어내지 않는다 — 답을 만드는 규칙은
 * src/utils/assistant.ts 에 있다.
 */
export default function ChatScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);

  /*
   * 처음 칩을 고르는 씨앗.
   *
   * 아직 아무것도 묻지 않은 채로 달곰이 탭에 들어올 때마다 바꾼다. 들어올 때마다
   * 다른 질문을 권해서 "이런 것도 물어볼 수 있구나" 를 알게 한다.
   * 대화를 시작한 뒤에는 바꾸지 않는다 (보고 있는 칩이 갑자기 바뀌면 헷갈린다).
   */
  const [starterSeed, setStarterSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const tabPad = useTabBarPadding();
  const layout = useLayout();
  const { t, lang } = useT();

  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || thinking) return;

      setInput('');
      setThinking(true);
      // 질문마다 새 씨앗. 같은 칩을 다시 눌러도 다른 칩이 나온다.
      const seed = newSeed();
      const avoid = askedTexts(messagesRef.current);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text: question, seed },
      ]);

      const answer = await ask(question, lang, { seed, avoid });

      setMessages((prev) => [
        ...prev,
        { id: `d-${Date.now()}`, role: 'dalgomi', text: answer.text, answer },
      ]);
      setThinking(false);
    },
    [thinking, lang]
  );

  /*
   * 말을 바꾸면 지난 답도 새 말로 다시 답한다.
   *
   * 말풍선에는 물어보던 그때 만들어진 글이 그대로 담겨 있다. 그래서 일본어로
   * 바꾸고 달곰이 탭으로 돌아오면 테두리만 일본어가 되고 답과 추천 질문은
   * 한국어로 남아 있었다. 탭은 화면을 살려 두기 때문에 이전 대화가 그대로
   * 보이는데, 인사말만 그릴 때 번역되니 인사말 아래부터 말이 갈렸다.
   *
   * 답은 바깥 AI 가 아니라 앱 안에서 만들어진다. 그러니 같은 질문을 새 말로
   * 다시 물어보면 그만이다. 사람이 친 질문은 친 그대로 둔다 — 그건 우리 말이
   * 아니라 그 사람의 말이다.
   */
  const langRef = useRef(lang);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (langRef.current === lang) return;
    langRef.current = lang;

    const asked = messagesRef.current.filter((m) => m.role === 'user');
    if (asked.length === 0) return; // 인사말뿐이면 그리는 자리에서 이미 바뀐다

    let cancelled = false;
    setThinking(true);

    void (async () => {
      const rebuilt: Message[] = [GREETING];
      for (const q of asked) {
        const answer = await ask(q.text, lang, { seed: q.seed, avoid: askedTexts(rebuilt) });
        rebuilt.push(q, { id: `d-${q.id}`, role: 'dalgomi', text: answer.text, answer });
      }
      if (cancelled) return;
      setMessages(rebuilt);
      setThinking(false);
    })();

    // 다시 바꾸면 앞의 것은 버린다. 늦게 온 옛 답이 새 답을 덮으면 안 된다.
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // 아직 묻지 않았으면 탭에 들어올 때마다 처음 칩을 새로 고른다 (위 starterSeed 참고)
  useFocusEffect(
    useCallback(() => {
      if (messagesRef.current.length === 1) {
        setStarterSeed(Math.floor(Math.random() * 2 ** 31));
      }
    }, [])
  );

  /*
   * 키보드가 올라왔는지.
   *
   * 탭바는 화면 위에 떠 있어서, 입력칸 아래에 탭바 높이만큼(120 남짓) 비워
   * 두고 있었다. 그런데 키보드가 올라오면 탭바는 그 밑에 가려 보이지도 않는데
   * 그 자리는 그대로 남아, 입력칸과 키보드 사이가 손바닥만큼 벌어졌다.
   * 대화는 그만큼 눌려서 말풍선이 잘렸다.
   */
  const [keyboardUp, setKeyboardUp] = useState(false);

  /*
   * 키보드를 피해 올라갈 높이의 기준점.
   *
   * KeyboardAvoidingView 는 "내 자리(부모 기준 y)" 와 "키보드 윗면(화면 기준 y)" 을
   * 빼서 얼마나 올릴지 정한다. 두 값의 기준이 다르면 그 차이만큼 덜 올라가고,
   * 애플 기본 탭바에서는 화면 칸 자체가 상태 표시줄 아래에서 시작하는 탓에
   * 입력칸이 키보드 밑에 깔렸다. 실제 화면에서의 위치를 재서 그 차이를 메운다.
   */
  const kavRef = useRef<View>(null);
  const [kavTop, setKavTop] = useState(0);
  const measureKav = useCallback(() => {
    kavRef.current?.measureInWindow?.((_x, y) => {
      if (Number.isFinite(y)) setKavTop(Math.round(y));
    });
  }, []);
  useEffect(() => {
    /*
     * 웹에는 올라오는 키보드가 없다. react-native-web 의 Keyboard 에는
     * addListener 자체가 없어서, 그냥 부르면 화면이 죽는다.
     */
    if (Platform.OS === 'web') return;

    // iOS 는 will*, 안드로이드는 did* 만 온다. 둘 다 걸어 둔다.
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardUp(true);
        /*
         * 키보드가 올라오면 대화 칸이 그만큼 줄어드는데, 보고 있던 자리는 그대로라
         * 마지막 말풍선의 아래가 잘려 보였다(아이패드에서 눈에 띈다).
         * 줄어든 뒤에 맨 아래로 붙인다 — 줄어들기 전에 부르면 그대로 잘린 채 남는다.
         */
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 250);
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardUp(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 새 말풍선이 생기면 아래로 붙인다
  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const lastSuggestions =
    messages[messages.length - 1]?.answer?.suggestions ??
    (messages.length === 1 ? starterQuestions(lang, starterSeed) : undefined);

  return (
    <TabScreen style={styles.safe} bottomEdge={!keyboardUp}>
      {/*
        태블릿에서 대화는 가운데 칸에 모으고, 위·아래 흰 띠는 화면 끝까지 깐다.

        말풍선이 화면 끝까지 퍼지면 한 줄이 너무 길어 읽기 힘들어서 대화는
        가운데로 모은다. 그런데 예전엔 흰 띠까지 그 칸 안에 넣어 둬서,
        아이패드에서 띠 양옆에 크림색 줄이 남고 대화가 상자 안에 갇힌 것처럼
        보였다. 폰은 칸이 곧 화면이라 드러나지 않던 문제다.
        그래서 띠의 바탕은 끝까지, 안의 글자와 입력칸만 가운데에 둔다.
      */}
      <View style={styles.headerBar}>
        <View style={[styles.header, centered(layout, true), { paddingHorizontal: layout.gutter }]}>
          <Mascot size={38} pose="faceHappy" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('chat.title')}</Text>
            <Text style={styles.headerSub}>{t('chat.sub', { count: LIBRARY_COUNT })}</Text>
          </View>
        </View>
      </View>

      {/* 달곰이는 네 가지 말을 알아듣지만 도서관 이름만은 한글이다.
          "Seoul Library" 라고 치면 못 찾으므로 미리 알려 준다. */}
      {lang !== 'ko' ? (
        <View style={styles.noticeBar}>
          <View style={[styles.notice, centered(layout, true), { paddingHorizontal: layout.gutter }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textSub} />
            <Text style={styles.noticeText}>{t('chat.nameHint')}</Text>
          </View>
        </View>
      ) : null}

      <View ref={kavRef} style={{ flex: 1 }} onLayout={measureKav} collapsable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={kavTop}
      >
        <FlatList
          ref={listRef}
          directionalLockEnabled
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: sideSpace(layout, true) + layout.gutter }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => (
            <Bubble
              /* 첫 인사만은 말을 바꾸면 그 자리에서 같이 바뀌어야 한다.
                 처음 뜰 때 만든 글을 그대로 두면 영어로 바꿔도 한국어
                 인사가 남는다. */
              message={item.id === 'greeting' ? { ...item, text: t('chat.greeting', { count: LIBRARY_COUNT }) } : item}
              onOpenLibrary={(id) => router.push(`/library/${id}`)}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}
        />

        {thinking ? (
          <View style={[styles.thinking, centered(layout, true), { paddingHorizontal: layout.gutter }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.thinkingText}>{t('chat.thinking')}</Text>
          </View>
        ) : null}

        {lastSuggestions && lastSuggestions.length > 0 && !thinking ? (
          <View style={centered(layout, true)}>
            <ChipRow contentStyle={styles.suggestRow}>
              {lastSuggestions.map((s: string) => (
                <Pressable key={s} onPress={() => void send(s)} style={styles.suggestChip}>
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </ChipRow>
          </View>
        ) : null}

        <View style={[styles.inputBar, { paddingBottom: keyboardUp ? spacing.md : tabPad }]}>
        <View style={[styles.inputRow, centered(layout, true), { paddingHorizontal: layout.gutter }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('bot.sugKids')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={() => void send(input)}
            editable={!thinking}
          />
          <Pressable
            onPress={() => void send(input)}
            disabled={!input.trim() || thinking}
            style={[styles.sendButton, (!input.trim() || thinking) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
      </View>
    </TabScreen>
  );
}

interface BubbleProps {
  message: Message;
  onOpenLibrary: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

function Bubble({ message, onOpenLibrary, favorites, onToggleFavorite }: BubbleProps) {
  const mine = message.role === 'user';

  if (mine) {
    return (
      <View style={styles.mineRow}>
        <View style={styles.mineBubble}>
          <Text style={styles.mineText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  const a = message.answer;

  return (
    <View style={styles.theirsRow}>
      {/* 말하는 사람이 누구인지 한눈에 보이도록 달곰이 얼굴을 동그란 판 위에 둔다.
          그림만 놓아 두었더니 기기에서 가끔 안 보였다 — 판이 있으면 자리도 분명하다. */}
      <View style={styles.avatar}>
        <Mascot size={30} pose="face" />
      </View>
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={styles.theirsBubble}>
          <Text style={styles.theirsText}>{message.text}</Text>
        </View>

        {/* 문장만 믿게 하지 않는다. 근거가 되는 카드를 함께 놓아
            누르면 상세로 들어가 직접 확인할 수 있게 한다. */}
        {a?.libraries?.map((lib) => (
          <LibraryCard
            key={lib.id}
            library={lib}
            onPress={() => onOpenLibrary(lib.id)}
            isFavorite={favorites.includes(lib.id)}
            onToggleFavorite={() => onToggleFavorite(lib.id)}
          />
        ))}

        {a?.books && a.books.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookRow}
          >
            {a.books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </ScrollView>
        ) : null}

        {a?.places?.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => void openKakaoMap({ name: p.name, coords: p.coords })}
            style={({ pressed }) => [styles.place, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName}>{p.name}</Text>
              <Text style={styles.placeSub}>
                {p.subCategory} · 걸어서 {walkingMinutes(p.distanceMeters)}분 (
                {formatDistance(p.distanceMeters)})
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  /** 위 흰 띠. 바탕은 화면 끝까지 간다. */
  headerBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  /** 띠 안의 글자. 태블릿에서는 가운데 칸에 모인다. */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  noticeBar: { backgroundColor: colors.surfaceAlt },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  noticeText: { ...typography.tiny, color: colors.textSub, flex: 1 },
  headerTitle: { ...typography.bodyBold, color: colors.text },
  headerSub: { ...typography.tiny, color: colors.textSub },

  list: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl },

  mineRow: { alignItems: 'flex-end' },
  mineBubble: {
    maxWidth: '85%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  mineText: { ...typography.body, color: colors.white },

  theirsRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  /**
   * 달곰이 얼굴 자리.
   *
   * 바탕은 깔지 않는다 — 초록 동그라미를 대 봤더니 배지처럼 튀어서 대화가 시끄러웠다.
   * 대신 자리(36)는 잡아 둔다. 그림이 늦게 뜨거나 안 그려져도 말풍선이 밀리지 않는다.
   */
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theirsBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  theirsText: { ...typography.body, color: colors.text },

  bookRow: { gap: spacing.md, paddingRight: spacing.md },

  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  placeName: { ...typography.bodyBold, color: colors.text },
  placeSub: { ...typography.caption, color: colors.textSub },

  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  thinkingText: { ...typography.caption, color: colors.textSub },

  suggestRow: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  suggestChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  suggestText: { ...typography.caption, color: colors.primary, fontWeight: '600' },

  /** 아래 흰 띠. 바탕은 화면 끝까지, 아래 여백은 탭바·키보드에 따라 바뀐다. */
  inputBar: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // 한글이 잘리지 않도록 최소 높이를 준다
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
