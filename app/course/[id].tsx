import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CourseFlow } from '@/components/CourseFlow';
import { useT } from '@/i18n';

/**
 * 오늘의 나들이 — 도서관을 정하고 들어올 때 (달곰이 "○○도서관 코스 짜 줘").
 * 맛집 고르기부터 시작한다. ?saved=코스ID 면 내 기록에 저장한 코스를 바로 연다. 코스 탭은 app/(tabs)/course.tsx (도서관 고르기부터).
 */
export default function CourseScreen() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const { t } = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('course.title') }} />
      <CourseFlow initialLibraryId={id} initialSavedId={saved} />
    </>
  );
}
