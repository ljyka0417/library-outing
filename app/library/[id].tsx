import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LibraryDetail } from '@/components/LibraryDetail';

/**
 * 도서관 상세 화면.
 *
 * 이 화면이 QR 딥링크의 착지점이다: libraryapp://library/{id}
 * expo-router 의 파일 기반 라우팅 덕분에 별도 링킹 설정 없이
 * app.json 의 scheme 만으로 곧바로 연결된다.
 *
 * 내용은 LibraryDetail 이 그린다. 아이패드 검색 화면이 목록 옆 칸에 같은
 * 상세를 띄우기 때문에 화면과 내용을 나눠 두었다.
 */
export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LibraryDetail id={id} />;
}
