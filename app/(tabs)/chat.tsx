import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Mascot } from '@/components/Mascot';
import { BookCard } from '@/components/BookCard';
import { LibraryCard } from '@/components/LibraryCard';
import { useAppStore } from '@/store/useAppStore';
import { ask, STARTER_QUESTIONS, type Answer } from '@/utils/assistant';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import { openKakaoMap } from '@/utils/mapLinks';

interface Message {
  id: string;
  role: 'user' | 'dalgomi';
  text: string;
  answer?: Answer;
}

const GREETING: Message = {
  id: 'greeting',
  role: 'dalgomi',
  text: `안녕하세요, 달곰이예요.
전국 도서관 132곳을 알고 있어요. 무엇이든 물어보세요.

저는 이 앱에 담긴 정보로만 답해요. 모르는 건 지어내지 않고 모른다고 말할게요.`,
};

/**
 * 달곰이에게 물어보기.
 *
 * 바깥 AI 를 부르지 않는다. 앱에 담긴 132곳 데이터로 답한다.
 * 그래서 서버도 API 키도 요금도 없고, 비행기 모드에서도 답한다.
 * 무엇보다 확인되지 않은 운영시간을 지어내지 않는다 — 답을 만드는 규칙은
 * src/utils/assistant.ts 에 있다.
 */
export default function ChatScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);
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
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text: question },
      ]);

      const answer = await ask(question);

      setMessages((prev) => [
        ...prev,
        { id: `d-${Date.now()}`, role: 'dalgomi', text: answer.text, answer },
      ]);
      setThinking(false);
    },
    [thinking]
  );

  // 새 말풍선이 생기면 아래로 붙인다
  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const lastSuggestions =
    messages[messages.length - 1]?.answer?.suggestions ??
    (messages.length === 1 ? STARTER_QUESTIONS : undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 태블릿에서는 대화 전체를 가운데로 모은다. 말풍선이 화면 끝까지
          퍼지면 한 줄이 너무 길어 읽기 힘들다. */}
      <View style={[styles.body, centered(layout)]}>
      <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
        <Mascot size={38} pose="faceHappy" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('chat.title')}</Text>
          <Text style={styles.headerSub}>{t('chat.sub')}</Text>
        </View>
      </View>

      {/* 달곰이는 한국어 질문만 알아듣는다. 영어로 물었다가 "모르겠어요" 를
          받으면 고장난 것처럼 보이므로, 묻기 전에 미리 말해 준다. */}
      {lang !== 'ko' ? (
        <View style={[styles.notice, { paddingHorizontal: layout.gutter }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSub} />
          <Text style={styles.noticeText}>{t('chat.koreanOnly')}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          directionalLockEnabled
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: layout.gutter }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => (
            <Bubble
              /* 첫 인사만은 말을 바꾸면 그 자리에서 같이 바뀌어야 한다.
                 처음 뜰 때 만든 글을 그대로 두면 영어로 바꿔도 한국어
                 인사가 남는다. */
              message={item.id === 'greeting' ? { ...item, text: t('chat.greeting') } : item}
              onOpenLibrary={(id) => router.push(`/library/${id}`)}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}
        />

        {thinking ? (
          <View style={styles.thinking}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.thinkingText}>{t('chat.thinking')}</Text>
          </View>
        ) : null}

        {lastSuggestions && lastSuggestions.length > 0 && !thinking ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.suggestRow, { paddingHorizontal: layout.gutter }]}
            style={{ flexGrow: 0, flexShrink: 0 }}
          >
            {lastSuggestions.map((s) => (
              <Pressable key={s} onPress={() => void send(s)} style={styles.suggestChip}>
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.inputRow, { paddingHorizontal: layout.gutter, paddingBottom: tabPad }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="어린이 도서관 추천해줘"
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
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
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
      <Mascot size={30} pose="face" />
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
  /** 태블릿에서 가운데로 모이는 본문 (폰에서는 화면 폭 그대로) */
  body: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  thinkingText: { ...typography.caption, color: colors.textSub },

  suggestRow: {
    paddingHorizontal: spacing.xl,
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

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
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
